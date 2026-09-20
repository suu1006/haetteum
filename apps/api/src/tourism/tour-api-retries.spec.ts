/* eslint-disable @typescript-eslint/require-await */
import { jest } from "@jest/globals";
import { TourApiPolicyError } from "./tour-api-policy.js";
import { TourApiClient } from "./tour-api.client.js";
import {
  recoveryPolicy,
  testRecovery,
} from "../../test/tour-api-recovery-fixture.js";
const ok = JSON.stringify({
  response: {
    header: { resultCode: "0000", resultMsg: "OK" },
    body: { items: "", pageNo: 1, numOfRows: 1, totalCount: 0 },
  },
});
function harness(responses: (() => Promise<Response>)[]) {
  let calls = 0;
  const delays: number[] = [],
    retries: boolean[] = [],
    stops: unknown[] = [];
  const policy = Object.assign(recoveryPolicy(), {
    request: async <T>(
      work: () => Promise<T>,
      options?: { retry?: boolean },
    ) => {
      retries.push(options?.retry ?? false);
      return work();
    },
    remainingMs: () => 2_400_000,
    stopProvider: async (...args: unknown[]) => {
      stops.push(args);
      throw new TourApiPolicyError("PROVIDER_STOP");
    },
  });
  const client = new TourApiClient(
    {
      get: (key: string) =>
        key === "TOUR_API_SERVICE_KEY" ? "secret" : "https://example.test",
    } as never,
    async () => {
      const response = responses[Math.min(calls++, responses.length - 1)];
      return response();
    },
    async (ms) => {
      delays.push(ms);
    },
    policy,
    testRecovery(policy),
  );
  return {
    policy,
    run: () => client.getPlaceImages("1"),
    delays,
    retries,
    stops,
    calls: () => calls,
  };
}
describe("bounded retries", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });
  it.each(["01", "05", "23"])(
    "retries provider %s with bounded backoff and charges only extra attempts",
    async (code) => {
      jest.spyOn(Math, "random").mockReturnValue(0);
      const h = harness([
        async () =>
          new Response(
            JSON.stringify({
              response: { header: { resultCode: code, resultMsg: code } },
            }),
          ),
        async () => new Response("", { status: 503 }),
        async () => new Response(ok),
      ]);
      await expect(h.run()).resolves.toEqual([]);
      expect(h.delays).toEqual([2000, 10000]);
      expect(h.retries).toEqual([false, true, true]);
    },
  );
  it.each(["20", "30", "31", "22"])(
    "never retries fatal body %s even on HTTP503",
    async (code) => {
      const h = harness([
        async () =>
          new Response(
            JSON.stringify({
              response: { header: { resultCode: code, resultMsg: code } },
            }),
            { status: 503 },
          ),
      ]);
      await expect(h.run()).rejects.toThrow();
      expect(h.calls()).toBe(1);
      expect(h.stops).toHaveLength(1);
    },
  );
  it("honors Retry-After seconds and dates, defers long waits", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-09-20T00:00:00Z"));
    jest.spyOn(Math, "random").mockReturnValue(0);
    const h = harness([
      async () =>
        new Response("", { status: 503, headers: { "Retry-After": "8" } }),
      async () =>
        new Response("", {
          status: 503,
          headers: { "Retry-After": "Sun, 20 Sep 2026 00:00:20 GMT" },
        }),
      async () => new Response(ok),
    ]);
    await h.run();
    expect(h.delays).toEqual([8000, 20000]);
    const long = harness([
      async () =>
        new Response("", { status: 503, headers: { "Retry-After": "61" } }),
    ]);
    await expect(long.run()).rejects.toThrow();
    expect(long.calls()).toBe(1);
    expect(long.delays).toEqual([]);
    expect(long.stops).toHaveLength(1);
  });
  it("bounds hanging response body and cancels before releasing the attempt", async () => {
    jest.useFakeTimers();
    let cancellations = 0;
    const h = harness([
      async () =>
        new Response(
          new ReadableStream({
            cancel() {
              cancellations++;
              return new Promise(() => {});
            },
          }),
        ),
    ]);
    const result = h.run().catch((e: unknown) => e);
    await jest.advanceTimersByTimeAsync(60_001);
    expect(await result).toMatchObject({ providerCode: "TIMEOUT" });
    expect(h.calls()).toBe(3);
    expect(cancellations).toBe(3);
  });
  it("rejects oversized response without retry", async () => {
    const h = harness([
      async () => new Response("x".repeat(2 * 1024 * 1024 + 1)),
    ]);
    await expect(h.run()).rejects.toMatchObject({
      providerCode: "RESPONSE_TOO_LARGE",
    });
    expect(h.calls()).toBe(1);
  });
  it("aborts a hanging response at the remaining batch deadline without retry", async () => {
    jest.useFakeTimers();
    let cancelled = false;
    const h = harness([
      async () =>
        new Response(
          new ReadableStream({
            cancel() {
              cancelled = true;
            },
          }),
        ),
    ]);
    h.policy.remainingMs = () => 5000;
    const result = h.run().catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(5001);
    expect(await result).toMatchObject({ reason: "TOUR_API_BATCH_DEADLINE" });
    expect(h.calls()).toBe(1);
    expect(cancelled).toBe(true);
    expect(h.delays).toEqual([]);
  });
  it("bounds a fetch promise that ignores abort", async () => {
    jest.useFakeTimers();
    const h = harness([() => new Promise(() => {})]);
    const result = h.run().catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(60001);
    expect(await result).toMatchObject({ providerCode: "TIMEOUT" });
    expect(h.calls()).toBe(3);
  });
});
