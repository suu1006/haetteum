/* eslint-disable @typescript-eslint/require-await */
import { Pool } from "pg";
import { TourApiPolicy } from "../src/tourism/tour-api-policy.js";

// Must run in a disposable test database: this suite clears only the usage ledger.
const describeIsolated =
  process.env.DATABASE_URL &&
  new URL(process.env.DATABASE_URL).pathname.includes("tourapi_test")
    ? describe
    : describe.skip;
describeIsolated("TourAPI PostgreSQL execution policy", () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 6 });
  const secondPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
  });
  const config = {
    get: (key: string) => (key === "TOUR_API_DAILY_LIMIT" ? 3 : 60),
  };
  const first = new TourApiPolicy(config as never, pool);
  const second = new TourApiPolicy(config as never, secondPool);

  beforeAll(() => {
    if (!new URL(process.env.DATABASE_URL!).pathname.includes("tourapi_test"))
      throw new Error("Use a dedicated tourapi_test database");
  });
  beforeEach(async () => {
    await pool.query("DELETE FROM tour_api_daily_usage");
  });
  afterAll(async () => {
    await first.onModuleDestroy();
    await second.onModuleDestroy();
  });

  it("rejects another process batch and releases the lock after failures", async () => {
    await expect(
      first.batch(async () => {
        await expect(second.batch(async () => undefined)).rejects.toThrow(
          "BATCH_ALREADY_RUNNING",
        );
        throw new Error("batch failed");
      }),
    ).rejects.toThrow("batch failed");
    await expect(second.batch(async () => "recovered")).resolves.toBe(
      "recovered",
    );
  });

  it("serializes HTTP starts and persists failed attempts across policy instances", async () => {
    const starts: number[] = [];
    await first.batch(async () => {
      await Promise.all(
        [1, 2].map(() =>
          first.request(async () => {
            starts.push(Date.now());
          }),
        ),
      );
      await expect(
        first.request(async () => {
          starts.push(Date.now());
          throw new Error("HTTP 503");
        }),
      ).rejects.toThrow("HTTP 503");
    });
    expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(50);
    expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(50);
    let invoked = false;
    await second.batch(async () => {
      await expect(
        second.request(async () => {
          invoked = true;
        }),
      ).rejects.toThrow("DAILY_LIMIT");
    });
    expect(invoked).toBe(false);
    const result = await pool.query<{ calls: number }>(
      "SELECT calls FROM tour_api_daily_usage",
    );
    expect(result.rows).toEqual([{ calls: 3 }]);
  });

  it("uses a new KST calendar day budget without deleting prior usage", async () => {
    await pool.query(`INSERT INTO tour_api_daily_usage VALUES
      ((clock_timestamp() AT TIME ZONE 'Asia/Seoul')::date - 1, 3, clock_timestamp() - interval '1 day')`);
    await first.batch(() => first.request(async () => undefined));
    const result = await pool.query<{ calls: number }>(
      "SELECT calls FROM tour_api_daily_usage ORDER BY day",
    );
    expect(result.rows).toEqual([{ calls: 3 }, { calls: 1 }]);
  });
});
