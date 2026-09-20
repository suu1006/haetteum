import { AsyncLocalStorage } from "node:async_hooks";
import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Pool, PoolClient } from "pg";
import type { ApiEnvironment } from "../config/environment.js";

export class TourApiPolicyError extends Error {}

export type TourApiJob = "tourism" | "festival";
export type TourApiDeferredReason =
  | "TOUR_API_DAILY_LIMIT"
  | "TOUR_API_JOB_DAILY_LIMIT"
  | "TOUR_API_RECOVERY_WAIT"
  | "TOUR_API_RETRY_DAILY_LIMIT"
  | "TOUR_API_PROVIDER_COOLDOWN"
  | "TOUR_API_BATCH_DEADLINE";
export class TourApiBudgetDeferredError extends TourApiPolicyError {
  constructor(
    readonly reason: TourApiDeferredReason,
    options?: ErrorOptions,
  ) {
    super(reason, options);
  }
}

export const TOUR_API_POLICY_POOL = Symbol("TOUR_API_POLICY_POOL");
const BATCH_LOCK = 74812001;
const REQUEST_LOCK = 74812002;

/** Only scheduler/CLI entrypoints establish this context. Network calls fail closed. */
@Injectable()
export class TourApiPolicy implements OnModuleDestroy {
  private readonly requestContext = new AsyncLocalStorage<PoolClient>();
  private readonly logger = new Logger(TourApiPolicy.name);
  private readonly context = new AsyncLocalStorage<{
    active: boolean;
    job: TourApiJob;
    calls: number;
    deadline: number;
    httpStop?: TourApiPolicyError;
  }>();

  constructor(
    private readonly config: ConfigService<ApiEnvironment, true>,
    @Inject(TOUR_API_POLICY_POOL) private readonly pool: Pool,
  ) {
    this.pool.on("error", () => {
      this.logger.error("TourAPI policy database connection lost");
    });
  }

  async batch<T>(
    work: () => Promise<T>,
    job: TourApiJob = "tourism",
  ): Promise<T> {
    if (job !== "tourism" && job !== "festival")
      throw new TourApiPolicyError("TOUR_API_INVALID_JOB");
    const connection = await this.pool.connect().catch((cause: unknown) => {
      throw new TourApiPolicyError("TOUR_API_POLICY_CONNECTION_FAILED", {
        cause,
      });
    });
    let locked = false;
    const state = {
      active: true,
      job,
      calls: 0,
      deadline: Date.now() + 40 * 60_000,
    };
    const lost = () => {
      state.active = false;
    };
    connection.on("error", lost);
    try {
      const result = await connection.query<{ locked: boolean }>(
        "SELECT pg_try_advisory_lock($1) AS locked",
        [BATCH_LOCK],
      );
      locked = result.rows[0]?.locked === true;
      if (!locked)
        throw new TourApiPolicyError("TOUR_API_BATCH_ALREADY_RUNNING");
      return await this.context.run(state, work);
    } finally {
      state.active = false;
      await this.release(connection, locked ? BATCH_LOCK : null);
      connection.removeListener("error", lost);
    }
  }

  async request<T>(
    work: () => Promise<T>,
    options: { retry?: boolean } = {},
  ): Promise<T> {
    this.assertBatch();
    const state = this.context.getStore()!;
    const connection = await this.pool.connect().catch((cause: unknown) => {
      throw new TourApiPolicyError("TOUR_API_POLICY_CONNECTION_FAILED", {
        cause,
      });
    });
    const lost = () => {
      state.active = false;
    };
    connection.on("error", lost);
    let locked = false;
    let invoked = false;
    try {
      // Session lock spans the actual HTTP attempt, so delayed workers cannot bunch up.
      await connection.query(
        "SELECT set_config('lock_timeout', $1, false), set_config('statement_timeout', $1, false)",
        [String(Math.max(1, Math.min(20_000, this.remainingMs())))],
      );
      await connection.query("SELECT pg_advisory_lock($1)", [REQUEST_LOCK]);
      locked = true;
      this.assertBatch();
      await this.assertHttpCapacity(connection);
      const interval = this.config.get("TOUR_API_MIN_INTERVAL_MS", {
        infer: true,
      });
      const limit = this.config.get("TOUR_API_DAILY_LIMIT", { infer: true });
      if (
        !Number.isInteger(interval) ||
        interval < 1 ||
        !Number.isInteger(limit) ||
        limit < 1
      )
        throw new TourApiPolicyError("TOUR_API_INVALID_LIMIT_CONFIGURATION");
      const delay = await connection.query<{ wait_ms: number }>(
        `SELECT GREATEST(0, $1 - EXTRACT(EPOCH FROM
          (clock_timestamp() - MAX(last_started_at))) * 1000)::float8 AS wait_ms
         FROM tour_api_daily_usage`,
        [interval],
      );
      const wait = Number(delay.rows[0]?.wait_ms ?? 0);
      if (wait >= this.remainingMs()) this.deadlineExceeded();
      if (wait > 0)
        await new Promise<void>((resolve) =>
          setTimeout(resolve, Math.ceil(wait)),
        );
      this.assertBatch();
      // Commit both ledgers before HTTP: failures/retries/crashes consume a call.
      // The existing session lock serializes reservations across processes.
      await connection.query("BEGIN");
      try {
        const reserved = await connection.query(
          `INSERT INTO tour_api_daily_usage (day, calls, last_started_at)
           VALUES ((transaction_timestamp() AT TIME ZONE 'Asia/Seoul')::date, 1, clock_timestamp())
           ON CONFLICT (day) DO UPDATE SET calls = tour_api_daily_usage.calls + 1,
             last_started_at = clock_timestamp()
           WHERE tour_api_daily_usage.calls < $1 RETURNING calls`,
          [limit],
        );
        if (reserved.rows.length === 0)
          throw new TourApiBudgetDeferredError("TOUR_API_DAILY_LIMIT");
        const jobReserved = await connection.query(
          `INSERT INTO tour_api_job_daily_usage (day, job, calls, retry_calls)
           VALUES ((transaction_timestamp() AT TIME ZONE 'Asia/Seoul')::date, $1, 1, $3)
           ON CONFLICT (day, job) DO UPDATE SET calls = tour_api_job_daily_usage.calls + 1,
             retry_calls = tour_api_job_daily_usage.retry_calls + $3
           WHERE tour_api_job_daily_usage.calls < $2 AND
             ($3 = 0 OR tour_api_job_daily_usage.retry_calls < $4) RETURNING calls`,
          [
            state.job,
            this.jobLimit(state.job),
            options.retry ? 1 : 0,
            this.retryLimit(state.job),
          ],
        );
        if (jobReserved.rows.length === 0) {
          const usage = await connection.query<{ calls: number }>(
            `SELECT calls FROM tour_api_job_daily_usage WHERE day = (transaction_timestamp() AT TIME ZONE 'Asia/Seoul')::date AND job = $1`,
            [state.job],
          );
          throw new TourApiBudgetDeferredError(
            Number(usage.rows[0]?.calls ?? 0) >= this.jobLimit(state.job)
              ? "TOUR_API_JOB_DAILY_LIMIT"
              : "TOUR_API_RETRY_DAILY_LIMIT",
          );
        }
        await connection.query("COMMIT");
        state.calls++;
      } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
      }
      this.assertBatch();
      let outcome: { result: T } | { error: unknown };
      try {
        invoked = true;
        const result = await this.requestContext.run(connection, work);
        this.assertBatch();
        outcome = { result };
      } catch (error) {
        outcome = { error };
      }
      try {
        // Reservation/COMMIT latency must not consume the HTTP spacing window.
        // Persist completion while still holding REQUEST_LOCK, also on failure.
        // Reuse the latest ledger row if the attempt crossed KST midnight.
        await connection.query(
          `UPDATE tour_api_daily_usage SET last_started_at = clock_timestamp()
           WHERE day = (SELECT MAX(day) FROM tour_api_daily_usage)`,
        );
        this.assertBatch();
      } catch (error) {
        state.active = false;
        // If the session still owns its lock, protect the next batch even when
        // the timestamp cannot be persisted. A lost session is already closed.
        await new Promise<void>((resolve) => setTimeout(resolve, interval));
        if (!("error" in outcome))
          outcome = {
            error: new TourApiPolicyError("TOUR_API_REQUEST_TIMING_FAILED", {
              cause: error,
            }),
          };
      }
      if ("error" in outcome) throw outcome.error;
      return outcome.result;
    } catch (error) {
      if (!invoked && !(error instanceof TourApiPolicyError)) {
        this.assertBatch();
        throw new TourApiPolicyError("TOUR_API_RESERVATION_FAILED", {
          cause: error,
        });
      }
      throw error;
    } finally {
      await this.release(connection, locked ? REQUEST_LOCK : null);
      connection.removeListener("error", lost);
    }
  }

  currentBatchRequestCount(): number {
    const state = this.context.getStore();
    if (!state) throw new TourApiPolicyError("TOUR_API_BATCH_REQUIRED");
    return state.calls;
  }

  /** Avoid starting a detail bundle that cannot fit its minimum requests.
   * Actual attempts (including retries) still reserve under request()'s lock.
   */
  async ensureCapacity(
    minimumCalls: number,
    options: { retry?: boolean } = {},
  ): Promise<void> {
    this.assertBatch();
    if (!Number.isInteger(minimumCalls) || minimumCalls < 1)
      throw new TourApiPolicyError("TOUR_API_INVALID_CAPACITY");
    const state = this.context.getStore()!;
    const connection = await this.pool.connect().catch((cause: unknown) => {
      throw new TourApiPolicyError("TOUR_API_POLICY_CONNECTION_FAILED", {
        cause,
      });
    });
    const lost = () => {
      state.active = false;
    };
    connection.on("error", lost);
    let locked = false;
    try {
      await connection.query(
        "SELECT set_config('lock_timeout', $1, false), set_config('statement_timeout', $1, false)",
        [String(Math.max(1, Math.min(20_000, this.remainingMs())))],
      );
      await connection.query("SELECT pg_advisory_lock($1)", [REQUEST_LOCK]);
      locked = true;
      this.assertBatch();
      await this.assertHttpCapacity(connection);
      const usage = await connection.query<{
        global_calls: number;
        job_calls: number;
        retry_calls: number;
      }>(
        `SELECT COALESCE((SELECT calls FROM tour_api_daily_usage WHERE day =
           (clock_timestamp() AT TIME ZONE 'Asia/Seoul')::date), 0) AS global_calls,
         COALESCE((SELECT calls FROM tour_api_job_daily_usage WHERE day =
           (clock_timestamp() AT TIME ZONE 'Asia/Seoul')::date AND job = $1), 0) AS job_calls,
         COALESCE((SELECT retry_calls FROM tour_api_job_daily_usage WHERE day =
           (clock_timestamp() AT TIME ZONE 'Asia/Seoul')::date AND job = $1), 0) AS retry_calls`,
        [state.job],
      );
      this.assertBatch();
      const row = usage.rows[0];
      if (
        Number(row.global_calls) + minimumCalls >
        this.config.get("TOUR_API_DAILY_LIMIT", { infer: true })
      )
        throw new TourApiBudgetDeferredError("TOUR_API_DAILY_LIMIT");
      if (Number(row.job_calls) + minimumCalls > this.jobLimit(state.job))
        throw new TourApiBudgetDeferredError("TOUR_API_JOB_DAILY_LIMIT");
      if (
        options.retry &&
        Number(row.retry_calls) + minimumCalls > this.retryLimit(state.job)
      )
        throw new TourApiBudgetDeferredError("TOUR_API_RETRY_DAILY_LIMIT");
    } catch (error) {
      if (error instanceof TourApiPolicyError) throw error;
      throw new TourApiPolicyError("TOUR_API_PREFLIGHT_FAILED", {
        cause: error,
      });
    } finally {
      await this.release(connection, locked ? REQUEST_LOCK : null);
      connection.removeListener("error", lost);
    }
  }

  remainingMs(): number {
    this.assertBatch();
    return this.context.getStore()!.deadline - Date.now();
  }
  deadlineExceeded(): never {
    throw new TourApiBudgetDeferredError("TOUR_API_BATCH_DEADLINE");
  }
  private retryLimit(job: TourApiJob): number {
    return job === "tourism" ? 70 : 30;
  }
  private async assertHttpCapacity(connection: PoolClient): Promise<void> {
    this.assertBatch();
    const state = this.context.getStore()!;
    if (state.httpStop) throw state.httpStop;
    const result = await connection.query(
      `SELECT reason FROM tour_api_provider_cooldown WHERE id = 1 AND until_at > clock_timestamp()`,
    );
    if (result.rows.length)
      throw new TourApiBudgetDeferredError("TOUR_API_PROVIDER_COOLDOWN");
  }
  /** Called under the request lock after rejected response evidence was persisted. */
  async stopProvider(
    reason: "AUTH" | "QUOTA" | "THROTTLE",
    retryAfterMs: number,
    cause?: Error,
  ): Promise<never> {
    this.assertBatch();
    const error =
      reason === "AUTH"
        ? new TourApiPolicyError("TOUR_API_PROVIDER_AUTH", { cause })
        : new TourApiBudgetDeferredError("TOUR_API_PROVIDER_COOLDOWN", {
            cause,
          });
    this.context.getStore()!.httpStop = error;
    try {
      await (this.requestContext.getStore() ?? this.pool).query(
        `INSERT INTO tour_api_provider_cooldown (id, until_at, reason)
        VALUES (1, CASE WHEN $1 = 'QUOTA' THEN ((clock_timestamp() AT TIME ZONE 'Asia/Seoul')::date + 1)::timestamp AT TIME ZONE 'Asia/Seoul'
          ELSE clock_timestamp() + ($2 * interval '1 millisecond') END, $1)
        ON CONFLICT (id) DO UPDATE SET until_at = GREATEST(tour_api_provider_cooldown.until_at, EXCLUDED.until_at), reason = EXCLUDED.reason`,
        [reason, Math.max(900_000, retryAfterMs)],
      );
    } catch (cause) {
      throw new TourApiPolicyError("TOUR_API_COOLDOWN_STORAGE_FAILED", {
        cause,
      });
    }
    throw error;
  }

  private jobLimit(job: TourApiJob): number {
    const limit = this.config.get(
      job === "festival"
        ? "TOUR_API_FESTIVAL_DAILY_BUDGET"
        : "TOUR_API_TOURISM_DAILY_BUDGET",
      { infer: true },
    );
    if (!Number.isInteger(limit) || limit < 1)
      throw new TourApiPolicyError("TOUR_API_INVALID_LIMIT_CONFIGURATION");
    return limit;
  }

  currentJob(): TourApiJob {
    this.assertBatch();
    return this.context.getStore()!.job;
  }

  assertBatch(): void {
    if (!this.context.getStore()?.active)
      throw new TourApiPolicyError("TOUR_API_BATCH_REQUIRED");
    if (Date.now() >= this.context.getStore()!.deadline)
      this.deadlineExceeded();
  }

  private async release(
    connection: PoolClient,
    lock: number | null,
  ): Promise<void> {
    try {
      if (lock !== null)
        await connection.query("SELECT pg_advisory_unlock($1)", [lock]);
      await connection.query(
        "SELECT set_config('lock_timeout', '20000', false), set_config('statement_timeout', '20000', false)",
      );
      connection.release();
    } catch {
      connection.release(true);
    }
  }

  /** 헬스체크 전용: 락/배치 상태와 무관하게 풀 연결만 확인한다. */
  async ping(timeoutMs: number): Promise<void> {
    await withTimeout(timeoutMs, this.pool.query("SELECT 1"));
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

function withTimeout<T>(ms: number, promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`timeout of ${ms}ms exceeded`)),
      ms,
    );

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
