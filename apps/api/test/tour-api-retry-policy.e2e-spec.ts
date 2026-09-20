/* eslint-disable @typescript-eslint/require-await */
import { TourApiClient } from "../src/tourism/tour-api.client.js";
import { TourApiRecovery } from "../src/tourism/tour-api-recovery.js";
import { MemoryRecoveryRepository } from "./tour-api-recovery-fixture.js";
import { jest } from "@jest/globals";
import { Pool } from "pg";
import { TourApiPolicy } from "../src/tourism/tour-api-policy.js";
const isolated = process.env.DATABASE_URL?.includes("tourapi_test")
  ? describe
  : describe.skip;
isolated("durable retry quota and cooldown", () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 8 });
  const config = {
    get: (key: string) =>
      ({
        TOUR_API_DAILY_LIMIT: 1000,
        TOUR_API_TOURISM_DAILY_BUDGET: 700,
        TOUR_API_FESTIVAL_DAILY_BUDGET: 300,
        TOUR_API_MIN_INTERVAL_MS: 1,
        TOUR_API_ENDPOINT: "https://example.test",
        TOUR_API_SERVICE_KEY: "secret",
      })[key],
  };
  const policy = () => new TourApiPolicy(config as never, pool);
  const retry = (p: TourApiPolicy) =>
    (
      p.request as (
        work: () => Promise<void>,
        options: { retry: boolean },
      ) => Promise<void>
    )(async () => {}, { retry: true });
  beforeEach(async () => {
    await pool.query(
      "TRUNCATE tour_api_daily_usage, tour_api_job_daily_usage, tour_api_provider_cooldown",
    );
  });
  afterAll(async () => pool.end());
  afterEach(() => {
    pool.removeAllListeners("error");
    jest.restoreAllMocks();
  });
  it.each([
    ["tourism", 70],
    ["festival", 30],
  ] as const)(
    "enforces %s recovery allocation across restart without charging denied requests",
    async (job, limit) => {
      const a = policy();
      await a.batch(async () => {
        for (let i = 0; i < limit; i++) await retry(a);
      }, job);
      const b = policy();
      await b.batch(async () => {
        await expect(retry(b)).rejects.toThrow("RETRY_DAILY_LIMIT");
        await b.request(async () => {});
        expect(b.currentBatchRequestCount()).toBe(1);
      }, job);
      expect(
        (
          await pool.query(
            "SELECT calls, retry_calls FROM tour_api_job_daily_usage",
          )
        ).rows,
      ).toEqual([{ calls: limit + 1, retry_calls: limit }]);
      expect(
        (await pool.query("SELECT calls FROM tour_api_daily_usage")).rows,
      ).toEqual([{ calls: limit + 1 }]);
    },
  );
  it("serializes concurrent final retry slots without overspending", async () => {
    const p = policy();
    await p.batch(async () => {
      for (let i = 0; i < 69; i++) await retry(p);
      const results = await Promise.allSettled([retry(p), retry(p)]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(p.currentBatchRequestCount()).toBe(70);
    });
  });
  it("persists provider cooldown across restart while allowing local work", async () => {
    const p = policy();
    await p.batch(async () => {
      await expect(
        (
          p as unknown as {
            stopProvider: (reason: string, ms: number) => Promise<void>;
          }
        ).stopProvider("THROTTLE", 1_200_000),
      ).rejects.toThrow();
    });
    const next = policy();
    await next.batch(async () => {
      next.assertBatch();
      await expect(next.request(async () => {})).rejects.toThrow(
        "PROVIDER_COOLDOWN",
      );
      expect(next.currentBatchRequestCount()).toBe(0);
    });
  });

  it("counts each failed-version HTTP attempt once, new versions fresh, and local replay zero", async () => {
    const p = policy(),
      repo = new MemoryRecoveryRepository(),
      recovery = new TourApiRecovery(repo as never, p);
    const item = {
      job: "tourism" as const,
      contentId: "1",
      sourceVersion: "2026-09-01T00:00:00.000Z",
    };
    let calls = 0;
    const ok = JSON.stringify({
      response: {
        header: { resultCode: "0000", resultMsg: "OK" },
        body: { items: "", pageNo: 1, numOfRows: 100, totalCount: 0 },
      },
    });
    const client = new TourApiClient(
      config as never,
      async () => {
        calls++;
        return calls === 1
          ? new Response("", { status: 503 })
          : new Response(ok);
      },
      async () => {},
      p,
      recovery,
    );
    await p.batch(async () => {
      await recovery
        .item(item, [], async () => {
          throw new Error("mapping");
        })
        .catch(() => {});
      await recovery
        .item(item, ["detailImage2"], async () => {
          await client.getPlaceImages("1");
          throw new Error("persist");
        })
        .catch(() => {});
      expect(
        (
          await pool.query(
            "SELECT calls,retry_calls FROM tour_api_job_daily_usage",
          )
        ).rows,
      ).toEqual([{ calls: 2, retry_calls: 2 }]);
      await recovery.item(item, ["detailImage2"], () =>
        client.getPlaceImages("1"),
      );
      expect(calls).toBe(2);
      await recovery.item(
        { ...item, sourceVersion: "2026-09-02T00:00:00.000Z" },
        ["detailImage2"],
        () => client.getPlaceImages("1"),
      );
    });
    expect(
      (
        await pool.query(
          "SELECT calls,retry_calls FROM tour_api_job_daily_usage",
        )
      ).rows,
    ).toEqual([{ calls: 3, retry_calls: 2 }]);
  });
  it.each(["AUTH", "QUOTA", "THROTTLE"] as const)(
    "stores %s cooldown, blocks further HTTP, preserves local replay",
    async (reason) => {
      const p = policy();
      const repo = new MemoryRecoveryRepository();
      const recovery = new TourApiRecovery(repo as never, p);
      const item = {
        job: "tourism" as const,
        contentId: "1",
        sourceVersion: "2026-09-01T00:00:00.000Z",
      };
      await p.batch(async () => {
        await recovery
          .item(item, [], async () => {
            await recovery.capture("detailImage2", {}, "{}", 200, "");
            await recovery.mark("VALIDATED");
            throw new Error("persist");
          })
          .catch(() => {});
        await expect(
          p.request(() => p.stopProvider(reason, 0)),
        ).rejects.toThrow(
          reason === "AUTH" ? "PROVIDER_AUTH" : "PROVIDER_COOLDOWN",
        );
        await expect(p.request(async () => {})).rejects.toThrow();
        await recovery.local({ fetchMissing: false, maxRequests: 0 }, () =>
          recovery.item(item, ["detailImage2"], async () => {
            expect(await recovery.replay("detailImage2", {})).not.toBeNull();
          }),
        );
        expect(p.currentBatchRequestCount()).toBe(1);
      });
      const result = await pool.query<{
        reason: string;
        next_day: boolean;
        long_enough: boolean;
      }>(`SELECT reason, until_at >= clock_timestamp() + interval '14 minutes' AS long_enough,
     until_at = ((clock_timestamp() AT TIME ZONE 'Asia/Seoul')::date + 1)::timestamp AT TIME ZONE 'Asia/Seoul' AS next_day FROM tour_api_provider_cooldown`);
      expect(result.rows[0].reason).toBe(reason);
      if (reason === "QUOTA") expect(result.rows[0].next_day).toBe(true);
      else expect(result.rows[0].long_enough).toBe(true);
    },
  );
  it("preflights retry quota without charging and permits fresh work", async () => {
    await pool.query(
      `INSERT INTO tour_api_job_daily_usage (day,job,calls,retry_calls) VALUES ((clock_timestamp() AT TIME ZONE 'Asia/Seoul')::date,'tourism',69,69)`,
    );
    const p = policy();
    await p.batch(async () => {
      await expect(p.ensureCapacity(2, { retry: true })).rejects.toThrow(
        "RETRY_DAILY_LIMIT",
      );
      await p.ensureCapacity(4);
      expect(p.currentBatchRequestCount()).toBe(0);
    });
    expect(
      (
        await pool.query(
          "SELECT calls,retry_calls FROM tour_api_job_daily_usage",
        )
      ).rows,
    ).toEqual([{ calls: 69, retry_calls: 69 }]);
    expect(
      (await pool.query("SELECT calls FROM tour_api_daily_usage")).rows,
    ).toEqual([]);
  });

  it("bounds a contended request lock by remaining batch time without charging or item failure", async () => {
    const holder = await pool.connect();
    await holder.query("SELECT pg_advisory_lock(74812002)");
    const p = policy(),
      repo = new MemoryRecoveryRepository(),
      recovery = new TourApiRecovery(repo as never, p);
    const start = Date.now();
    const clock = jest.spyOn(Date, "now").mockReturnValue(start);
    try {
      await p.batch(async () => {
        clock.mockReturnValue(start + 2_399_950);
        await expect(
          recovery.item(
            { job: "tourism", contentId: "9", sourceVersion: "v1" },
            ["detailImage2"],
            async () => {},
          ),
        ).rejects.toBeInstanceOf(Error);
        expect(repo.failuresByKey.size).toBe(0);
        expect(p.currentBatchRequestCount()).toBe(0);
      });
    } finally {
      clock.mockRestore();
      await holder.query("SELECT pg_advisory_unlock(74812002)");
      holder.release();
    }
  }, 1500);
  it.each(["23", "429"])(
    "exhausted %s stores all evidence, defers without an item failure, and blocks later HTTP",
    async (code) => {
      const p = policy(),
        repo = new MemoryRecoveryRepository(),
        recovery = new TourApiRecovery(repo as never, p);
      let calls = 0;
      const client = new TourApiClient(
        config as never,
        async () => {
          calls++;
          return code === "429"
            ? new Response("rate limit", { status: 429 })
            : new Response(
                JSON.stringify({
                  response: { header: { resultCode: "23", resultMsg: "busy" } },
                }),
              );
        },
        async () => {},
        p,
        recovery,
      );
      const item = {
        job: "tourism" as const,
        contentId: "12",
        sourceVersion: "2026-09-01T00:00:00.000Z",
      };
      await p.batch(async () => {
        await expect(
          recovery.item(item, ["detailImage2"], () =>
            client.getPlaceImages("12"),
          ),
        ).rejects.toMatchObject({
          reason: "TOUR_API_PROVIDER_COOLDOWN",
          cause: { providerCode: code === "429" ? "HTTP_429" : "23" },
        });
        await expect(client.getPlaceImages("99")).rejects.toThrow(
          "PROVIDER_COOLDOWN",
        );
        expect(p.currentBatchRequestCount()).toBe(3);
      });
      expect(calls).toBe(3);
      expect(repo.failuresByKey.size).toBe(0);
      expect(
        repo.rows.map((row) => ({
          state: row.state,
          version: row.sourceVersion,
        })),
      ).toEqual(
        Array.from({ length: 3 }, () => ({
          state: "REJECTED",
          version: "2026-09-01T00:00:00.000Z",
        })),
      );
      expect(
        (
          await pool.query(
            "SELECT calls,retry_calls FROM tour_api_job_daily_usage",
          )
        ).rows,
      ).toEqual([{ calls: 3, retry_calls: 2 }]);
    },
  );
});
