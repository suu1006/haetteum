/* eslint-disable @typescript-eslint/require-await */
import { EventEmitter } from "node:events";
import { jest } from "@jest/globals";
import { TourApiPolicy } from "./tour-api-policy.js";

function harness() {
  let count = 0;
  const queries: string[] = [];
  const connection = Object.assign(new EventEmitter(), {
    query: jest.fn(async (sql: string) => {
      queries.push(sql);
      if (sql.includes("pg_try_advisory_lock"))
        return { rows: [{ locked: true }] };
      if (sql.includes("tour_api_job_daily_usage"))
        return { rows: [{ calls: 1 }] };
      if (sql.includes("RETURNING"))
        return { rows: count++ < 2 ? [{ calls: count }] : [] };
      if (sql.includes("wait_ms")) return { rows: [{ wait_ms: 0 }] };
      return { rows: [] };
    }),
    release: jest.fn(),
  });
  const pool = Object.assign(new EventEmitter(), {
    connect: jest.fn(async () => connection),
    query: jest.fn(async () => ({ rows: [] })),
    end: jest.fn(),
  });
  const config = {
    get: (key: string) => (key === "TOUR_API_DAILY_LIMIT" ? 2 : 1000),
  };
  const policy = new TourApiPolicy(config as never, pool as never);
  return { policy, pool, connection, queries };
}

describe("TourAPI execution policy", () => {
  it("handles idle connection errors and rejects results after losing the request connection", async () => {
    const { policy, pool, connection } = harness();
    expect(() =>
      pool.emit("error", new Error("idle disconnect")),
    ).not.toThrow();
    await policy.batch(async () => {
      await expect(
        policy.request(async () => {
          connection.emit("error", new Error("connection lost"));
          return "must not persist";
        }),
      ).rejects.toThrow("BATCH_REQUIRED");
    });
  });

  it("retains charged attempt counts for reporting after the request connection is lost", async () => {
    const { policy, connection } = harness();
    await policy.batch(async () => {
      await expect(
        policy.request(async () => {
          connection.emit("error", new Error("connection lost"));
        }),
      ).rejects.toThrow("BATCH_REQUIRED");
      expect(policy.currentBatchRequestCount()).toBe(1);
    });
  });

  it("does not start HTTP if the batch lock is lost while reserving quota", async () => {
    const { policy, connection } = harness();
    const original = connection.query.getMockImplementation()!;
    connection.query.mockImplementation(async (sql) => {
      const result = await original(sql);
      if (sql.includes("tour_api_job_daily_usage"))
        return { rows: [{ calls: 1 }] };
      if (sql.includes("RETURNING"))
        connection.emit("error", new Error("lock lost"));
      return result;
    });
    const work = jest.fn(async () => "must not call");
    await policy.batch(async () => {
      await expect(policy.request(work)).rejects.toThrow("BATCH_REQUIRED");
    });
    expect(work).not.toHaveBeenCalled();
  });

  it.each(["lock-reject", "usage-reject", "usage-resolve"] as const)(
    "handles a distinct preflight connection loss (%s), blocks HTTP, and cleans up",
    async (failure) => {
      const socketError = new Error("preflight socket lost");
      let queryStarted!: () => void;
      const started = new Promise<void>((resolve) => {
        queryStarted = resolve;
      });
      let settleQuery!: () => void;
      let disconnected = false;
      const batchConnection = Object.assign(new EventEmitter(), {
        query: jest.fn(async () => ({ rows: [{ locked: true }] })),
        release: jest.fn(),
      });
      const preflightConnection = Object.assign(new EventEmitter(), {
        query: jest.fn((sql: string) => {
          if (disconnected) return Promise.reject(socketError);
          if (
            sql.includes(
              failure === "lock-reject"
                ? "pg_advisory_lock"
                : "SELECT COALESCE",
            )
          ) {
            return new Promise((resolve, reject) => {
              settleQuery = () =>
                failure === "usage-resolve"
                  ? resolve({ rows: [{ global_calls: 0, job_calls: 0 }] })
                  : reject(socketError);
              queryStarted();
            });
          }
          return Promise.resolve({ rows: [] });
        }),
        release: jest.fn(),
      });
      const pool = Object.assign(new EventEmitter(), {
        connect: jest
          .fn<() => Promise<unknown>>()
          .mockResolvedValueOnce(batchConnection)
          .mockResolvedValueOnce(preflightConnection),
      });
      const policy = new TourApiPolicy(
        { get: () => 1000 } as never,
        pool as never,
      );
      let httpCalls = 0;
      await policy.batch(async () => {
        const result = policy
          .ensureCapacity(4)
          .catch((error: unknown) => error);
        await started;
        disconnected = true;
        let uncaught: unknown;
        try {
          preflightConnection.emit("error", socketError);
        } catch (error) {
          uncaught = error;
        }
        settleQuery();
        const error = await result;
        expect(uncaught).toBeUndefined();
        if (failure === "usage-resolve")
          expect(error).toEqual(new Error("TOUR_API_BATCH_REQUIRED"));
        else expect(error).toBe(socketError);
        await expect(
          policy.request(async () => {
            httpCalls++;
          }),
        ).rejects.toThrow("BATCH_REQUIRED");
        expect(httpCalls).toBe(0);
        expect(pool.connect).toHaveBeenCalledTimes(2);
        expect(preflightConnection.release).toHaveBeenCalledTimes(1);
        if (failure !== "lock-reject")
          expect(preflightConnection.release).toHaveBeenCalledWith(true);
        expect(preflightConnection.listenerCount("error")).toBe(0);
        expect(batchConnection.listenerCount("error")).toBe(1);
      });
      expect(batchConnection.listenerCount("error")).toBe(0);
      expect(batchConnection.release).toHaveBeenCalledTimes(1);
    },
  );

  it("rejects calls outside a batch before touching the network or DB", async () => {
    const { policy, pool } = harness();
    const request = jest.fn(async () => "response");
    await expect(policy.request(request)).rejects.toThrow("BATCH_REQUIRED");
    expect(request).not.toHaveBeenCalled();
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it("charges failed HTTP attempts and stops at the persistent daily limit", async () => {
    const { policy, connection } = harness();
    let attempts = 0;
    await policy.batch(async () => {
      await expect(
        policy.request(async () => {
          attempts++;
          throw new Error("HTTP failed");
        }),
      ).rejects.toThrow("HTTP failed");
      await expect(
        policy.request(async () => {
          attempts++;
          return "ok";
        }),
      ).resolves.toBe("ok");
      await expect(
        policy.request(async () => {
          attempts++;
        }),
      ).rejects.toThrow("DAILY_LIMIT");
    });
    expect(attempts).toBe(2);
    expect(connection.release).toHaveBeenCalled();
  });

  it("does not execute a duplicate batch", async () => {
    const { policy, connection } = harness();
    connection.query.mockResolvedValueOnce({
      rows: [{ locked: false }],
    });
    const work = jest.fn(async () => undefined);
    await expect(policy.batch(work)).rejects.toThrow("BATCH_ALREADY_RUNNING");
    expect(work).not.toHaveBeenCalled();
  });

  describe("ping", () => {
    it("resolves when the pool responds before the timeout", async () => {
      const { policy, pool } = harness();
      await expect(policy.ping(1000)).resolves.toBeUndefined();
      expect(pool.query).toHaveBeenCalledWith("SELECT 1");
    });

    it("rejects when the pool query fails", async () => {
      const { policy, pool } = harness();
      pool.query.mockRejectedValueOnce(new Error("connection refused"));
      await expect(policy.ping(1000)).rejects.toThrow("connection refused");
    });

    it("rejects when the pool does not respond before the timeout", async () => {
      const { policy, pool } = harness();
      pool.query.mockReturnValueOnce(new Promise(() => {}));
      await expect(policy.ping(5)).rejects.toThrow("timeout of 5ms exceeded");
    });
  });
});
