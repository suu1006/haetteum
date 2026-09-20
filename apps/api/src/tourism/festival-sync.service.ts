import {
  TourApiRecovery,
  TourApiRecoverySelectionChangedError,
  TourApiListReplayRefreshError,
  isDatabaseSystemError,
} from "./tour-api-recovery.js";
import {
  DetailEnrichmentError,
  type DetailEnrichmentSummary,
} from "./detail-enrichment-summary.js";
import { Inject, Injectable, Logger } from "@nestjs/common";

import {
  FestivalRepository,
  type FestivalSyncCounters,
  type FestivalSyncSummary,
} from "./festival.repository.js";
import { createFestivalDetailSnapshot } from "./festival-detail-snapshot.js";
import { TourApiError } from "./tour-api.client.js";
import {
  TourApiBudgetDeferredError,
  TourApiPolicy,
  TourApiPolicyError,
} from "./tour-api-policy.js";
import { mapFestival } from "./tour-api.mapper.js";
import type { FestivalApiPort, TourApiPort } from "./tour-api.types.js";
import { FESTIVAL_API_PORT, TOUR_API_PORT } from "./tourism.constants.js";

export type FestivalSyncRange = {
  eventStartDate: string;
  eventEndDate: string;
};

class SafeFestivalSyncError extends Error {}

@Injectable()
export class FestivalSyncService {
  private readonly logger = new Logger(FestivalSyncService.name);

  constructor(
    @Inject(FESTIVAL_API_PORT) private readonly provider: FestivalApiPort,
    @Inject(TOUR_API_PORT) private readonly details: TourApiPort,
    private readonly repository: FestivalRepository,
    private readonly policy: TourApiPolicy,
    private readonly recovery: TourApiRecovery,
  ) {}

  async fullSync(range: FestivalSyncRange): Promise<FestivalSyncSummary> {
    const work = () =>
      this.recovery.list("festival", JSON.stringify(range), () =>
        this.fullSyncRun(range),
      );
    try {
      return (await work()).value;
    } catch (error) {
      if (error instanceof TourApiListReplayRefreshError)
        return (await work()).value;
      throw error;
    }
  }

  private async fullSyncRun(
    range: FestivalSyncRange,
  ): Promise<FestivalSyncSummary> {
    const rangeStart = parseRangeDate(range.eventStartDate);
    const rangeEnd = parseRangeDate(range.eventEndDate);
    if (rangeEnd < rangeStart) {
      throw new SafeFestivalSyncError("Invalid festival synchronization range");
    }

    const counters: FestivalSyncCounters = {
      fetchedCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      deactivatedCount: 0,
      failedCount: 0,
    };
    const seenExternalIds = new Set<string>();
    const lastSyncedAt = new Date();
    const run = await this.repository.createSyncRun(rangeStart);
    let details: DetailEnrichmentSummary | undefined;

    try {
      let pageNo = 1;
      let expectedTotalCount: number | undefined;

      for (;;) {
        const page = await this.provider.getFestivalPage({ ...range, pageNo });
        expectedTotalCount ??= page.totalCount;

        if (
          page.pageNo !== pageNo ||
          page.totalCount !== expectedTotalCount ||
          (page.numOfRows === 0 && page.totalCount > 0) ||
          (page.items.length === 0 &&
            counters.fetchedCount < expectedTotalCount) ||
          counters.fetchedCount + page.items.length > expectedTotalCount
        ) {
          throw new SafeFestivalSyncError(
            "TourAPI returned invalid pagination metadata",
          );
        }

        const festivals = page.items.map((item) =>
          mapFestival(item, lastSyncedAt),
        );
        const delta = await this.repository.upsertPage(festivals);
        for (const festival of festivals)
          seenExternalIds.add(festival.externalId);
        counters.fetchedCount += page.items.length;
        counters.insertedCount += delta.insertedCount;
        counters.updatedCount += delta.updatedCount;
        await this.recovery.completePage();

        if (counters.fetchedCount === expectedTotalCount) break;
        pageNo += 1;
      }

      if (counters.fetchedCount === 0) {
        throw new SafeFestivalSyncError("TourAPI returned zero festivals");
      }

      if (this.recovery.current()?.replayed)
        throw new TourApiListReplayRefreshError();

      counters.deactivatedCount = await this.repository.deactivateMissing({
        rangeStart,
        rangeEnd,
        seenExternalIds,
        lastSyncedAt,
      });

      await this.recovery.reconcileCommitted("festival");
      const allPending = await this.repository.findPendingDetails();
      const pendingDetails = await this.recovery.eligible(
        "festival",
        allPending,
      );
      details = {
        status: "SUCCEEDED",
        requestedCount: allPending.length,
        succeededCount: 0,
        failedCount: 0,
        remainingCount: allPending.length,
      };
      for (const festival of pendingDetails) {
        try {
          await this.enrichDetail(festival);
          details.succeededCount++;
          details.remainingCount--;
        } catch (error) {
          if (error instanceof TourApiBudgetDeferredError) throw error;
          if (isFatalTourApiError(error)) {
            details.failedCount++;
            details.status = "FAILED";
            throw new DetailEnrichmentError({ ...details }, error);
          }
          counters.failedCount += 1;
          details.failedCount++;
          details.status = "FAILED";
          this.logger.warn(
            `Festival detail synchronization failed for content ${festival.externalId}`,
          );
        }
      }

      if (details.status === "SUCCEEDED" && details.remainingCount > 0) {
        details.status = "DEFERRED";
        details.deferredReason = "TOUR_API_RECOVERY_WAIT";
        return {
          ...(await this.repository.deferSyncRun(
            run.id,
            counters,
            "TOUR_API_RECOVERY_WAIT",
          )),
          details,
        };
      }
      return {
        ...(await this.repository.completeSyncRun(run.id, counters)),
        details,
      };
    } catch (error) {
      if (error instanceof DetailEnrichmentError) {
        throw await this.retainDetailFailure(run.id, counters, error, true);
      }
      if (error instanceof TourApiBudgetDeferredError) {
        if (details) {
          details.status = details.failedCount > 0 ? "FAILED" : "DEFERRED";
          details.deferredReason = error.reason;
        }
        try {
          return {
            ...(await this.repository.deferSyncRun(
              run.id,
              counters,
              error.reason,
            )),
            ...(details ? { details } : {}),
          };
        } catch (persistenceFailure) {
          if (details) {
            const terminalError = new DetailEnrichmentError(
              { ...details, status: "FAILED" },
              persistenceFailure,
            );
            throw await this.retainDetailFailure(
              run.id,
              counters,
              terminalError,
              false,
            );
          }
          throw sanitizeFestivalSyncError(persistenceFailure);
        }
      }
      if (details) {
        const terminalError = new DetailEnrichmentError(
          { ...details, status: "FAILED" },
          error,
        );
        throw await this.retainDetailFailure(
          run.id,
          counters,
          terminalError,
          false,
        );
      }
      const sanitized = sanitizeFestivalSyncError(error);
      await this.repository.failSyncRun(run.id, counters, sanitized.message);
      if (error instanceof TourApiPolicyError) throw error;
      throw sanitized;
    }
  }

  private async retainDetailFailure(
    runId: string,
    counters: FestivalSyncCounters,
    error: DetailEnrichmentError,
    incrementFailedCount: boolean,
  ): Promise<DetailEnrichmentError> {
    try {
      await this.repository.failSyncRun(runId, counters, error.message, {
        incrementFailedCount,
      });
    } catch (persistenceFailure) {
      error.retainPersistenceFailure(persistenceFailure);
    }
    return error;
  }

  async enrichContentId(
    contentId: string,
    expectedVersion?: string,
  ): Promise<void> {
    const festival = await this.repository.findDetailTarget(contentId);
    if (!festival) {
      if (expectedVersion !== undefined)
        throw new TourApiRecoverySelectionChangedError();
      return;
    }
    const identity = {
      job: "festival" as const,
      contentId,
      sourceVersion: festival.providerModifiedAt.toISOString(),
    };
    if (
      expectedVersion !== undefined &&
      expectedVersion !== identity.sourceVersion
    )
      throw new TourApiRecoverySelectionChangedError();
    if (
      festival.detailSourceModifiedAt?.getTime() ===
      festival.providerModifiedAt.getTime()
    ) {
      await this.recovery.reconcile(identity);
      return;
    }
    if (!festival.isVisible) {
      if (expectedVersion !== undefined)
        throw new TourApiRecoverySelectionChangedError();
      return;
    }
    if (expectedVersion !== undefined)
      await this.recovery.assertSelected(identity);
    await this.enrichDetail(festival);
  }

  async enrichDetail(festival: {
    id: string;
    externalId: string;
    providerModifiedAt: Date;
  }): Promise<void> {
    await this.recovery.item(
      {
        job: "festival",
        contentId: festival.externalId,
        sourceVersion: festival.providerModifiedAt.toISOString(),
      },
      ["detailCommon2", "detailIntro2", "detailImage2"],
      async () => {
        const common = await this.details.getPlaceCommonDetail(
          festival.externalId,
        );
        const intro = await this.details.getFestivalIntro(festival.externalId);
        const images = await this.details.getPlaceImages(festival.externalId);
        this.recovery.stage("MAPPING");
        const snapshot = createFestivalDetailSnapshot({
          contentId: festival.externalId,
          common,
          intro,
          images,
        });
        this.recovery.stage("PERSISTENCE");
        await this.repository.saveDetailSnapshot({
          id: festival.id,
          providerModifiedAt: festival.providerModifiedAt,
          snapshot,
          detailSyncedAt: new Date(),
        });
      },
    );
  }
}

function isFatalTourApiError(error: unknown): boolean {
  return (
    error instanceof TourApiPolicyError ||
    isDatabaseSystemError(error) ||
    (error instanceof TourApiError && error.providerCode === "22")
  );
}

function parseRangeDate(value: string): Date {
  if (!/^\d{8}$/.test(value)) {
    throw new SafeFestivalSyncError("Invalid festival synchronization range");
  }

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  const roundTrip = [
    date.getUTCFullYear().toString().padStart(4, "0"),
    (date.getUTCMonth() + 1).toString().padStart(2, "0"),
    date.getUTCDate().toString().padStart(2, "0"),
  ].join("");
  if (roundTrip !== value) {
    throw new SafeFestivalSyncError("Invalid festival synchronization range");
  }
  return date;
}

function sanitizeFestivalSyncError(error: unknown): Error {
  if (error instanceof TourApiError) {
    return new SafeFestivalSyncError(
      `Festival synchronization failed (${error.providerCode})`,
    );
  }
  if (error instanceof SafeFestivalSyncError) {
    return new SafeFestivalSyncError(
      `Festival synchronization failed: ${error.message}`,
    );
  }
  if (error instanceof Error && error.message.startsWith("Invalid TourAPI")) {
    return new SafeFestivalSyncError(
      `Festival synchronization failed: ${error.message}`,
    );
  }
  return new SafeFestivalSyncError("Festival synchronization failed");
}
