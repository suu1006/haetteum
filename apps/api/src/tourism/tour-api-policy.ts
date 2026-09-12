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

export const TOUR_API_POLICY_POOL = Symbol("TOUR_API_POLICY_POOL");
const BATCH_LOCK = 74812001;
const REQUEST_LOCK = 74812002;

/** Only scheduler/CLI entrypoints establish this context. Network calls fail closed. */
@Injectable()
export class TourApiPolicy implements OnModuleDestroy {
  private readonly logger = new Logger(TourApiPolicy.name);
  private readonly context = new AsyncLocalStorage<{ active: boolean }>();

  constructor(
    private readonly config: ConfigService<ApiEnvironment, true>,
    @Inject(TOUR_API_POLICY_POOL) private readonly pool: Pool,
  ) {
    this.pool.on("error", () => {
      this.logger.error("TourAPI policy database connection lost");
    });
  }

  async batch<T>(work: () => Promise<T>): Promise<T> {
    const connection = await this.pool.connect();
    let locked = false;
    const state = { active: true };
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
      // Autocommit before HTTP: network errors and process crashes still consume a call.
      const reserved = await connection.query(
        `INSERT INTO tour_api_daily_usage (day, calls, last_started_at)
         VALUES ((clock_timestamp() AT TIME ZONE 'Asia/Seoul')::date, 1, clock_timestamp())
         ON CONFLICT (day) DO UPDATE SET calls = tour_api_daily_usage.calls + 1,
           last_started_at = clock_timestamp()
         WHERE tour_api_daily_usage.calls < $1 RETURNING calls`,
        [limit],
      );
      if (reserved.rows.length === 0)
        throw new TourApiPolicyError("TOUR_API_DAILY_LIMIT");
      this.assertBatch();
      const result = await work();
      this.assertBatch();
      return result;
    } finally {
      await this.release(connection, locked ? REQUEST_LOCK : null);
      connection.removeListener("error", lost);
    }
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

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
