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
  "TOUR_API_DAILY_LIMIT" | "TOUR_API_JOB_DAILY_LIMIT";
export class TourApiBudgetDeferredError extends TourApiPolicyError {
  constructor(readonly reason: TourApiDeferredReason) {
    super(reason);
  }
}

export const TOUR_API_POLICY_POOL = Symbol("TOUR_API_POLICY_POOL");
const BATCH_LOCK = 74812001;
const REQUEST_LOCK = 74812002;

/** Only scheduler/CLI entrypoints establish this context. Network calls fail closed. */
@Injectable()
export class TourApiPolicy implements OnModuleDestroy {
  private readonly logger = new Logger(TourApiPolicy.name);
  private readonly context = new AsyncLocalStorage<{
    active: boolean;
    job: TourApiJob;
    calls: number;
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
    const connection = await this.pool.connect();
    let locked = false;
    const state = { active: true, job, calls: 0 };
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

  async request<T>(work: () => Promise<T>): Promise<T> {
    this.assertBatch();
    const state = this.context.getStore()!;
    const connection = await this.pool.connect();
    const lost = () => {
      state.active = false;
    };
    connection.on("error", lost);
    let locked = false;
    try {
      // Session lock spans the actual HTTP attempt, so delayed workers cannot bunch up.
      await connection.query("SELECT pg_advisory_lock($1)", [REQUEST_LOCK]);
      locked = true;
      this.assertBatch();
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
          `INSERT INTO tour_api_job_daily_usage (day, job, calls)
           VALUES ((transaction_timestamp() AT TIME ZONE 'Asia/Seoul')::date, $1, 1)
           ON CONFLICT (day, job) DO UPDATE SET calls = tour_api_job_daily_usage.calls + 1
           WHERE tour_api_job_daily_usage.calls < $2 RETURNING calls`,
          [state.job, this.jobLimit(state.job)],
        );
        if (jobReserved.rows.length === 0)
          throw new TourApiBudgetDeferredError("TOUR_API_JOB_DAILY_LIMIT");
        await connection.query("COMMIT");
        state.calls++;
      } catch (error) {
        await connection.query("ROLLBACK");
        throw error;
      }
      this.assertBatch();
      const result = await work();
      this.assertBatch();
      return result;
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
  async ensureCapacity(minimumCalls: number): Promise<void> {
    this.assertBatch();
    if (!Number.isInteger(minimumCalls) || minimumCalls < 1)
      throw new TourApiPolicyError("TOUR_API_INVALID_CAPACITY");
    const state = this.context.getStore()!;
    const connection = await this.pool.connect();
    const lost = () => {
      state.active = false;
    };
    connection.on("error", lost);
    let locked = false;
    try {
      await connection.query("SELECT pg_advisory_lock($1)", [REQUEST_LOCK]);
      locked = true;
      this.assertBatch();
      const usage = await connection.query<{
        global_calls: number;
        job_calls: number;
      }>(
        `SELECT COALESCE((SELECT calls FROM tour_api_daily_usage WHERE day =
           (clock_timestamp() AT TIME ZONE 'Asia/Seoul')::date), 0) AS global_calls,
         COALESCE((SELECT calls FROM tour_api_job_daily_usage WHERE day =
           (clock_timestamp() AT TIME ZONE 'Asia/Seoul')::date AND job = $1), 0) AS job_calls`,
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
    } finally {
      await this.release(connection, locked ? REQUEST_LOCK : null);
      connection.removeListener("error", lost);
    }
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

  private assertBatch(): void {
    if (!this.context.getStore()?.active)
      throw new TourApiPolicyError("TOUR_API_BATCH_REQUIRED");
  }

  private async release(
    connection: PoolClient,
    lock: number | null,
  ): Promise<void> {
    try {
      if (lock !== null)
        await connection.query("SELECT pg_advisory_unlock($1)", [lock]);
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
