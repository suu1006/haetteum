import { inspect } from "node:util";
import { jest } from "@jest/globals";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiEnvironment } from "../config/environment.js";
import {
  DetailEnrichmentError,
  type DetailEnrichmentSummary,
} from "./detail-enrichment-summary.js";
import type { FestivalSyncSummary } from "./festival.repository.js";
import type { FestivalSyncService } from "./festival-sync.service.js";
import { FestivalSyncScheduler } from "./festival-sync.scheduler.js";
import type {
  NotionBatchRecorder,
  NotionBatchResult,
} from "./notion-batch-recorder.js";
import type { TourApiPolicy } from "./tour-api-policy.js";
import { FESTIVAL_SYNC_RANGE } from "./tourism.constants.js";

function details(
  overrides: Partial<DetailEnrichmentSummary> = {},
): DetailEnrichmentSummary {
  return {
    status: "SUCCEEDED",
    requestedCount: 2,
    succeededCount: 2,
    failedCount: 0,
    remainingCount: 0,
    ...overrides,
  };
}

function summary(
  overrides: Partial<FestivalSyncSummary> = {},
): FestivalSyncSummary {
  return {
    runId: "run-1",
    status: "SUCCEEDED",
    fetchedCount: 2,
    insertedCount: 2,
    updatedCount: 0,
    deactivatedCount: 0,
    failedCount: 0,
    details: details(),
    ...overrides,
  };
}

function createScheduler(
  options: {
    enabled?: boolean;
    fullSync?: () => Promise<FestivalSyncSummary>;
    requestCount?: number;
    record?: (result: NotionBatchResult) => Promise<void>;
  } = {},
) {
  const calls: unknown[] = [];
  const records: NotionBatchResult[] = [];
  let inBatch = false;
  const scheduler = new FestivalSyncScheduler(
    {
      get: () => options.enabled ?? true,
    } as unknown as ConfigService<ApiEnvironment, true>,
    {
      fullSync: async (range: unknown) => {
        calls.push(range);
        return await (options.fullSync?.() ?? Promise.resolve(summary()));
      },
    } as unknown as FestivalSyncService,
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
        return options.requestCount ?? 7;
      },
    } as unknown as TourApiPolicy,
    {
      record: async (record: NotionBatchResult) => {
        records.push(record);
        await (options.record?.(record) ?? Promise.resolve());
      },
    } as unknown as NotionBatchRecorder,
  );
  return { calls, records, scheduler };
}

describe("FestivalSyncScheduler", () => {
  it("does not run or record when tourism sync is disabled", async () => {
    const fixture = createScheduler({ enabled: false });

    await expect(fixture.scheduler.runDailySync()).resolves.toBeUndefined();

    expect(fixture.calls).toEqual([]);
    expect(fixture.records).toEqual([]);
  });

  it("records a successful fixed-range run and its request count", async () => {
    const fixture = createScheduler({ requestCount: 14 });

    await expect(fixture.scheduler.runDailySync()).resolves.toBeUndefined();

    expect(fixture.calls).toEqual([FESTIVAL_SYNC_RANGE]);
    expect(fixture.records[0]).toMatchObject({
      batchName: "festival-daily-sync",
      status: "SUCCEEDED",
      stage: "details",
      reason: null,
      requestCount: 14,
      details: details(),
    });
  });

  it("records a list budget stop as deferred with unknown detail counts", async () => {
    const fixture = createScheduler({
      fullSync: () =>
        Promise.resolve(
          summary({
            status: "DEFERRED",
            deferredReason: "TOUR_API_DAILY_LIMIT",
            details: undefined,
          }),
        ),
      requestCount: 3,
    });

    await expect(fixture.scheduler.runDailySync()).resolves.toBeUndefined();

    expect(fixture.records[0]).toMatchObject({
      status: "DEFERRED",
      stage: "list",
      reason: "TOUR_API_DAILY_LIMIT",
      requestCount: 3,
      details: null,
    });
  });

  it("keeps FAILED precedence when detail failures are followed by deferral", async () => {
    const progress = details({
      status: "FAILED",
      succeededCount: 0,
      failedCount: 1,
      remainingCount: 2,
      deferredReason: "TOUR_API_JOB_DAILY_LIMIT",
    });
    const fixture = createScheduler({
      fullSync: () =>
        Promise.resolve(
          summary({
            status: "FAILED",
            failedCount: 1,
            deferredReason: "TOUR_API_JOB_DAILY_LIMIT",
            details: progress,
          }),
        ),
    });

    await expect(fixture.scheduler.runDailySync()).rejects.toThrow(
      "DETAILS_FAILED",
    );

    expect(fixture.records[0]).toMatchObject({
      status: "FAILED",
      stage: "details",
      reason: "DETAILS_FAILED",
      details: progress,
    });
  });

  it("records fatal detail progress when terminal persistence also failed", async () => {
    const progress = details({
      status: "FAILED",
      succeededCount: 1,
      failedCount: 1,
      remainingCount: 1,
    });
    const rootCause = new Error("secret serviceKey=private");
    const persistenceFailure = new Error("run persistence unavailable");
    const failure = new DetailEnrichmentError(progress, rootCause);
    failure.retainPersistenceFailure(persistenceFailure);
    const fixture = createScheduler({
      fullSync: () => Promise.reject(failure),
      requestCount: 6,
    });

    await expect(fixture.scheduler.runDailySync()).rejects.toMatchObject({
      originalError: failure,
    });

    expect(failure.cause).toBe(rootCause);
    expect(failure.persistenceFailure).toBe(persistenceFailure);

    expect(fixture.records[0]).toMatchObject({
      status: "FAILED",
      stage: "details",
      reason: "DETAILS_FAILED",
      requestCount: 6,
      details: progress,
    });
  });

  it("records list failures without invented detail counts and recorder rejection cannot mask them", async () => {
    const failure = new Error("secret SERVICE_KEY=private");
    const fixture = createScheduler({
      fullSync: () => Promise.reject(failure),
      requestCount: 1,
      record: () => Promise.reject(new Error("unexpected recorder rejection")),
    });

    await expect(fixture.scheduler.runDailySync()).rejects.toMatchObject({
      originalError: failure,
    });

    expect(fixture.records[0]).toMatchObject({
      status: "FAILED",
      stage: "list",
      reason: "LIST_FAILED",
      requestCount: 1,
      details: null,
    });
  });
});

describe("sanitized scheduler reporting", () => {
  it("logs measured counters and never raw fatal cause/stack", async () => {
    const log = jest
      .spyOn(Logger.prototype, "log")
      .mockImplementation(() => {});
    const errorLog = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => {});
    const fatal = new DetailEnrichmentError(
      details({
        status: "FAILED",
        succeededCount: 1,
        failedCount: 1,
        remainingCount: 1,
        waitingCount: 1,
        quarantinedCount: 0,
        locallyReplayedCount: 1,
      }),
      new Error("https://private?serviceKey=secret raw db value"),
    );
    const fixture = createScheduler({ fullSync: () => Promise.reject(fatal) });
    try {
      await expect(fixture.scheduler.runDailySync()).rejects.toMatchObject({
        originalError: fatal,
      });
      const logs = JSON.stringify([...log.mock.calls, ...errorLog.mock.calls]);
      expect(logs).toContain("locallyReplayedCount");
      expect(logs).toContain("BATCH_RESULT");
      expect(logs).not.toMatch(/private|serviceKey|raw db value/);
      expect(fixture.records[0].details).toMatchObject({
        locallyReplayedCount: 1,
        waitingCount: 1,
      });
    } finally {
      jest.restoreAllMocks();
    }
  });
});

describe("Nest cron wrapper boundary", () => {
  it.each(["list", "details"] as const)(
    "keeps %s errors and nested causes out of the wrapper logger",
    async (stage) => {
      const cause = new Error(
        "https://provider.test?serviceKey=secret-value raw-db-value",
      );
      const original =
        stage === "details"
          ? new DetailEnrichmentError(
              details({ status: "FAILED", failedCount: 1 }),
              cause,
            )
          : new Error("secret-value list-response", { cause });
      const fixture = createScheduler({
        fullSync: () => Promise.reject(original),
      });
      const errorLog = jest
        .spyOn(Logger.prototype, "error")
        .mockImplementation(() => {});
      const wrapperLogger = new Logger("Scheduler");
      try {
        // Same catch/log contract as installed ScheduleExplorer.wrapFunctionInTryCatchBlocks.
        try {
          await fixture.scheduler.runDailySync();
        } catch (error) {
          wrapperLogger.error(error);
        }
        const logged: unknown = errorLog.mock.calls.at(-1)?.[0];
        expect(logged).toBeInstanceOf(Error);
        expect(logged).not.toBe(original);
        expect(logged).toMatchObject({ originalError: original });
        expect(inspect(logged, { depth: 10, showHidden: true })).not.toMatch(
          /secret-value|raw-db-value|provider\.test|list-response/,
        );
        expect(JSON.stringify(logged)).not.toMatch(/secret-value|raw-db-value/);
        expect(fixture.records[0]).toMatchObject({ status: "FAILED", stage });
      } finally {
        jest.restoreAllMocks();
      }
    },
  );
});
