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
      if (sql.includes("RETURNING"))
        return { rows: count++ < 2 ? [{ calls: count }] : [] };
      if (sql.includes("wait_ms")) return { rows: [{ wait_ms: 0 }] };
      return { rows: [] };
    }),
    release: jest.fn(),
  });
  const pool = Object.assign(new EventEmitter(), {
    connect: jest.fn(async () => connection),
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

  it("does not start HTTP if the batch lock is lost while reserving quota", async () => {
    const { policy, connection } = harness();
    const original = connection.query.getMockImplementation()!;
    connection.query.mockImplementation(async (sql) => {
      const result = await original(sql);
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
});
