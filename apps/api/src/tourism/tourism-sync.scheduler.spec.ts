import { ConfigService } from "@nestjs/config";

import type { ApiEnvironment } from "../config/environment.js";
import {
  DetailEnrichmentError,
  type DetailEnrichmentSummary,
} from "./detail-enrichment-summary.js";
import type {
  NotionBatchRecorder,
  NotionBatchResult,
} from "./notion-batch-recorder.js";
import { TourApiError } from "./tour-api.client.js";
import type { TourApiPolicy } from "./tour-api-policy.js";
import type { TourismSyncService } from "./tourism-sync.service.js";
import { TourismSyncScheduler } from "./tourism-sync.scheduler.js";

function details(
  overrides: Partial<DetailEnrichmentSummary> = {},
): DetailEnrichmentSummary {
  return {
    status: "SUCCEEDED",
    requestedCount: 3,
    succeededCount: 3,
    failedCount: 0,
    remainingCount: 0,
    ...overrides,
  };
}

function createScheduler(
  options: {
    enabled?: boolean;
    incrementalSync?: () => Promise<void>;
    enrich?: () => Promise<DetailEnrichmentSummary>;
    requestCount?: number;
    record?: (result: NotionBatchResult) => Promise<void>;
  } = {},
) {
  const records: NotionBatchResult[] = [];
  let incrementalCalls = 0;
  let inBatch = false;
  const scheduler = new TourismSyncScheduler(
    {
      get: () => options.enabled ?? true,
    } as unknown as ConfigService<ApiEnvironment, true>,
    {
      incrementalSync: async () => {
        incrementalCalls += 1;
        await (options.incrementalSync?.() ?? Promise.resolve());
      },
      enrichPendingPlaceDetails:
        options.enrich ?? (() => Promise.resolve(details())),
    } as unknown as TourismSyncService,
    {
      batch: async (work: () => Promise<unknown>) => {
        inBatch = true;
        try {
          return await work();
        } finally {
          inBatch = false;
        }
      },
      currentBatchRequestCount: () => {
        if (!inBatch) throw new Error("request count read outside batch");
        return options.requestCount ?? 9;
      },
    } as unknown as TourApiPolicy,
    {
      record: async (record: NotionBatchResult) => {
        records.push(record);
        await (options.record?.(record) ?? Promise.resolve());
      },
    } as unknown as NotionBatchRecorder,
  );
  return {
    scheduler,
    records,
    get incrementalCalls() {
      return incrementalCalls;
    },
  };
}

describe("TourismSyncScheduler", () => {
  it("does not run or record when tourism sync is disabled", async () => {
    const fixture = createScheduler({ enabled: false });

    await expect(fixture.scheduler.runDailySync()).resolves.toBeUndefined();

    expect(fixture.incrementalCalls).toBe(0);
    expect(fixture.records).toEqual([]);
  });

  it("records a successful detail run with the request count read inside the batch", async () => {
    const fixture = createScheduler({ requestCount: 13 });

    await expect(fixture.scheduler.runDailySync()).resolves.toBeUndefined();

    expect(fixture.records).toHaveLength(1);
    expect(fixture.records[0]).toMatchObject({
      batchName: "tourism-daily-sync",
      status: "SUCCEEDED",
      stage: "details",
      reason: null,
      requestCount: 13,
      details: details(),
    });
  });

  it("records budget exhaustion as deferred without throwing", async () => {
    const progress = details({
      status: "DEFERRED",
      succeededCount: 2,
      remainingCount: 1,
      deferredReason: "TOUR_API_JOB_DAILY_LIMIT",
    });
    const fixture = createScheduler({
      enrich: () => Promise.resolve(progress),
      requestCount: 700,
    });

    await expect(fixture.scheduler.runDailySync()).resolves.toBeUndefined();

    expect(fixture.records[0]).toMatchObject({
      status: "DEFERRED",
      stage: "details",
      reason: "TOUR_API_JOB_DAILY_LIMIT",
      requestCount: 700,
      details: progress,
    });
  });

  it("keeps FAILED precedence when failed details are followed by deferral", async () => {
    const progress = details({
      status: "FAILED",
      succeededCount: 1,
      failedCount: 1,
      remainingCount: 2,
      deferredReason: "TOUR_API_JOB_DAILY_LIMIT",
    });
    const fixture = createScheduler({
      enrich: () => Promise.resolve(progress),
    });

    await expect(fixture.scheduler.runDailySync()).rejects.toThrow("1 places");

    expect(fixture.records[0]).toMatchObject({
      status: "FAILED",
      stage: "details",
      reason: "DETAILS_FAILED",
      details: progress,
    });
  });

  it("records list failure with unknown detail counts and preserves the original error", async () => {
    const failure = new TourApiError("areaBasedSyncList2", "NETWORK_ERROR");
    const fixture = createScheduler({
      incrementalSync: () => Promise.reject(failure),
      requestCount: 2,
    });

    await expect(fixture.scheduler.runDailySync()).rejects.toBe(failure);

    expect(fixture.records[0]).toMatchObject({
      status: "FAILED",
      stage: "list",
      reason: "LIST_FAILED",
      requestCount: 2,
      details: null,
    });
  });

  it("records fatal detail progress and a recorder rejection cannot mask it", async () => {
    const rootCause = new Error("secret serviceKey=private");
    const progress = details({
      status: "FAILED",
      succeededCount: 1,
      failedCount: 1,
      remainingCount: 2,
    });
    const failure = new DetailEnrichmentError(progress, rootCause);
    const fixture = createScheduler({
      enrich: () => Promise.reject(failure),
      requestCount: 8,
      record: () => Promise.reject(new Error("unexpected recorder rejection")),
    });

    await expect(fixture.scheduler.runDailySync()).rejects.toBe(failure);

    expect(fixture.records[0]).toMatchObject({
      status: "FAILED",
      stage: "details",
      reason: "DETAILS_FAILED",
      requestCount: 8,
      details: progress,
    });
  });
});
