import { DetailEnrichmentError } from "./detail-enrichment-summary.js";
import {
  TourApiBudgetDeferredError,
  TourApiPolicy,
} from "./tour-api-policy.js";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";

import type { ApiEnvironment } from "../config/environment.js";
import { TourismSyncService } from "./tourism-sync.service.js";
import {
  NotionBatchRecorder,
  type NotionBatchReason,
  type NotionBatchStatus,
} from "./notion-batch-recorder.js";
import type { DetailEnrichmentSummary } from "./detail-enrichment-summary.js";

@Injectable()
export class TourismSyncScheduler {
  private readonly logger = new Logger(TourismSyncScheduler.name);

  constructor(
    private readonly config: ConfigService<ApiEnvironment, true>,
    private readonly sync: TourismSyncService,
    private readonly policy: TourApiPolicy,
    private readonly notion: NotionBatchRecorder,
  ) {}

  @Cron("0 30 3 * * *", {
    name: "tourism-daily-sync",
    timeZone: "Asia/Seoul",
    waitForCompletion: true,
  })
  async runDailySync(): Promise<void> {
    if (!this.config.get("TOURISM_SYNC_ENABLED", { infer: true })) return;

    const startedAt = new Date();
    let status: NotionBatchStatus = "FAILED";
    let stage: "list" | "details" = "list";
    let reason: NotionBatchReason | null = "LIST_FAILED";
    let details: DetailEnrichmentSummary | null = null;
    let requestCount = 0;
    try {
      await this.policy.batch(async () => {
        try {
          await this.sync.incrementalSync();
          stage = "details";
          reason = "DETAILS_FAILED";
          details = await this.sync.enrichPendingPlaceDetails();
          if (details.failedCount > 0)
            throw new Error(
              `Tourism detail sync failed for ${details.failedCount} places`,
            );
          if (details.status === "DEFERRED" && details.deferredReason)
            throw new TourApiBudgetDeferredError(details.deferredReason);
        } finally {
          requestCount = this.policy.currentBatchRequestCount();
        }
      }, "tourism");

      this.logger.log("[BATCH_SUCCESS] tour-api-sync");
      status = "SUCCEEDED";
      reason = null;
    } catch (error) {
      if (error instanceof DetailEnrichmentError) {
        stage = "details";
        reason = "DETAILS_FAILED";
        details = error.summary;
      }
      if (error instanceof TourApiBudgetDeferredError) {
        status = "DEFERRED";
        reason = error.reason;
        this.logger.warn(`[BATCH_DEFERRED] tour-api-sync ${error.reason}`);
        return;
      }
      status = "FAILED";
      reason = stage === "details" ? "DETAILS_FAILED" : "LIST_FAILED";
      this.logger.error(
        "[BATCH_FAILED] tour-api-sync",
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    } finally {
      try {
        await this.notion.record({
          batchName: "tourism-daily-sync",
          status,
          stage,
          reason,
          startedAt,
          finishedAt: new Date(),
          requestCount,
          details,
        });
      } catch {
        this.logger.warn("[NOTION_BATCH_RECORD_FAILED] Unexpected rejection");
      }
    }
  }
}
