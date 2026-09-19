import { TourApiClient } from "../src/tourism/tour-api.client.js";
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
    await pool.query("DELETE FROM tour_api_job_daily_usage");
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

  it.each([
    { failFirst: false, failTimingWrite: false },
    { failFirst: true, failTimingWrite: false },
    { failFirst: false, failTimingWrite: true },
    { failFirst: true, failTimingWrite: true },
  ])(
    "spaces actual HTTP starts after delayed commit (work failure=$failFirst, timing failure=$failTimingWrite)",
    async ({ failFirst, failTimingWrite }) => {
      // The first reservation timestamp is already committed before the injected
      // delay. A second policy instance has no local timing state to inherit.
      const delayedPool = {
        on: pool.on.bind(pool),
        connect: async () => {
          const client = await pool.connect();
          return {
            on: client.on.bind(client),
            removeListener: client.removeListener.bind(client),
            release: client.release.bind(client),
            query: async (sql: string, values?: unknown[]) => {
              if (
                failTimingWrite &&
                sql.startsWith("UPDATE tour_api_daily_usage")
              )
                throw new Error("timing write failed");
              const result = await client.query(sql, values);
              if (sql === "COMMIT")
                await new Promise((resolve) => setTimeout(resolve, 120));
              return result;
            },
          };
        },
      };
      const delayed = new TourApiPolicy(config as never, delayedPool as never);
      const starts: number[] = [];
      const workError = new Error("HTTP failed after delayed reservation");
      const attempt = delayed.batch(() =>
        delayed.request(async () => {
          starts.push(performance.now());
          if (failFirst) throw workError;
        }),
      );
      if (failFirst) await expect(attempt).rejects.toBe(workError);
      else if (failTimingWrite)
        await expect(attempt).rejects.toThrow("TOUR_API_REQUEST_TIMING_FAILED");
      else await attempt;
      await second.batch(() =>
        second.request(async () => {
          starts.push(performance.now());
        }),
      );
      expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(60);
      expect(
        (await pool.query("SELECT calls FROM tour_api_daily_usage")).rows,
      ).toEqual([{ calls: 2 }]);
      expect(
        (await pool.query("SELECT calls FROM tour_api_job_daily_usage")).rows,
      ).toEqual([{ calls: 2 }]);
    },
  );

  it("uses a new KST calendar day budget without deleting prior usage", async () => {
    await pool.query(`INSERT INTO tour_api_daily_usage VALUES
      ((clock_timestamp() AT TIME ZONE 'Asia/Seoul')::date - 1, 3, clock_timestamp() - interval '1 day')`);
    await first.batch(() => first.request(async () => undefined));
    const result = await pool.query<{ calls: number }>(
      "SELECT calls FROM tour_api_daily_usage ORDER BY day",
    );
    expect(result.rows).toEqual([{ calls: 3 }, { calls: 1 }]);
  });
  it("preserves the festival reserve across restarts and charges retries within a global 1000 calls", async () => {
    const settings = {
      get: (key: string) =>
        ({
          TOUR_API_DAILY_LIMIT: 1000,
          TOUR_API_MIN_INTERVAL_MS: 1,
          TOUR_API_TOURISM_DAILY_BUDGET: 700,
          TOUR_API_FESTIVAL_DAILY_BUDGET: 300,
        })[key],
    };
    const tourism = new TourApiPolicy(settings as never, pool);
    const festival = new TourApiPolicy(settings as never, secondPool);
    let attempts = 0;
    await tourism.batch(async () => {
      for (let i = 0; i < 700; i++) {
        await tourism
          .request(async () => {
            attempts++;
            if (i === 1) throw new Error("retry");
          })
          .catch((error: Error) => {
            if (error.message !== "retry") throw error;
          });
      }
      await expect(
        tourism.request(async () => {
          attempts++;
        }),
      ).rejects.toThrow("JOB_DAILY_LIMIT");
    });
    const restarted = new TourApiPolicy(settings as never, pool);
    await restarted.batch(async () => {
      await expect(
        restarted.request(async () => {
          attempts++;
        }),
      ).rejects.toThrow("JOB_DAILY_LIMIT");
    });
    await festival.batch(async () => {
      for (let i = 0; i < 300; i++)
        await festival.request(async () => {
          attempts++;
        });
      await expect(
        festival.request(async () => {
          attempts++;
        }),
      ).rejects.toThrow("DAILY_LIMIT");
    }, "festival");
    expect(attempts).toBe(1000);
    expect(
      (await pool.query("SELECT calls FROM tour_api_daily_usage")).rows,
    ).toEqual([{ calls: 1000 }]);
    expect(
      (
        await pool.query(
          "SELECT job, calls FROM tour_api_job_daily_usage ORDER BY job",
        )
      ).rows,
    ).toEqual([
      { job: "festival", calls: 300 },
      { job: "tourism", calls: 700 },
    ]);
  });

  it("preflights minimum detail requests without charging and resets job usage on a new KST day", async () => {
    const settings = {
      get: (key: string) =>
        ({
          TOUR_API_DAILY_LIMIT: 1000,
          TOUR_API_MIN_INTERVAL_MS: 1,
          TOUR_API_TOURISM_DAILY_BUDGET: 700,
          TOUR_API_FESTIVAL_DAILY_BUDGET: 300,
        })[key],
    };
    const policy = new TourApiPolicy(settings as never, pool);
    await pool.query(`INSERT INTO tour_api_daily_usage VALUES
      ((clock_timestamp() AT TIME ZONE 'Asia/Seoul')::date, 697, clock_timestamp() - interval '1 second')`);
    await pool.query(`INSERT INTO tour_api_job_daily_usage VALUES
      ((clock_timestamp() AT TIME ZONE 'Asia/Seoul')::date, 'tourism', 697),
      ((clock_timestamp() AT TIME ZONE 'Asia/Seoul')::date - 1, 'festival', 300)`);
    await policy.batch(async () => {
      await expect(policy.ensureCapacity(4)).rejects.toThrow("JOB_DAILY_LIMIT");
      await expect(policy.ensureCapacity(3)).resolves.toBeUndefined();
      expect(policy.currentBatchRequestCount()).toBe(0);
    });
    await policy.batch(async () => {
      await policy.request(async () => undefined);
      expect(policy.currentBatchRequestCount()).toBe(1);
    }, "festival");
    expect(
      (await pool.query("SELECT calls FROM tour_api_daily_usage")).rows,
    ).toEqual([{ calls: 698 }]);
    expect(
      (
        await pool.query(
          "SELECT calls FROM tour_api_job_daily_usage WHERE job='festival' ORDER BY day",
        )
      ).rows,
    ).toEqual([{ calls: 300 }, { calls: 1 }]);
  });

  it("counts actual TourApiClient retries and rolls back the global reservation when job quota denies", async () => {
    const settings = {
      get: (key: string) =>
        ({
          TOUR_API_DAILY_LIMIT: 1000,
          TOUR_API_MIN_INTERVAL_MS: 1,
          TOUR_API_TOURISM_DAILY_BUDGET: 2,
          TOUR_API_FESTIVAL_DAILY_BUDGET: 300,
          TOUR_API_ENDPOINT: "https://apis.data.go.kr/B551011/KorService2",
          TOUR_API_SERVICE_KEY: "test",
        })[key],
    };
    const policy = new TourApiPolicy(settings as never, pool);
    let attempts = 0;
    const client = new TourApiClient(
      settings as never,
      async () => {
        attempts++;
        return new Response("unavailable", { status: 503 });
      },
      async () => undefined,
      policy,
    );
    await policy.batch(async () => {
      await expect(client.getPlaceCommonDetail("1")).rejects.toThrow(
        "JOB_DAILY_LIMIT",
      );
      expect(policy.currentBatchRequestCount()).toBe(2);
    });
    expect(attempts).toBe(2);
    expect(
      (await pool.query("SELECT calls FROM tour_api_daily_usage")).rows,
    ).toEqual([{ calls: 2 }]);
    expect(
      (await pool.query("SELECT calls FROM tour_api_job_daily_usage")).rows,
    ).toEqual([{ calls: 2 }]);
  });
});
