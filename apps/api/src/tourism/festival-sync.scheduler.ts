import {
  TourApiBudgetDeferredError,
  TourApiPolicy,
} from "./tour-api-policy.js";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";

import type { ApiEnvironment } from "../config/environment.js";
import { FestivalSyncService } from "./festival-sync.service.js";
import { FESTIVAL_SYNC_RANGE } from "./tourism.constants.js";
import { DetailEnrichmentError } from "./detail-enrichment-summary.js";
import {
  NotionBatchRecorder,
  type NotionBatchReason,
  type NotionBatchStatus,
} from "./notion-batch-recorder.js";
import type { DetailEnrichmentSummary } from "./detail-enrichment-summary.js";

@Injectable()
export class FestivalSyncScheduler {
  private readonly logger = new Logger(FestivalSyncScheduler.name);
  constructor(
    private readonly config: ConfigService<ApiEnvironment, true>,
    private readonly sync: FestivalSyncService,
    private readonly policy: TourApiPolicy,
    private readonly notion: NotionBatchRecorder,
  ) {}

  /**
   * 관광지 증분 동기화(03:30)가 끝난 뒤에 돈다 —
   * 축제는 증분 API가 없어 매번 2년 범위를 페이지 끝까지 훑으므로
   * 같은 시각에 겹치면 TourAPI 일일 호출 한도를 함께 밀어붙이게 된다.
   */
  @Cron("0 30 4 * * *", {
    name: "festival-daily-sync",
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
      const summary = await this.policy.batch(async () => {
        try {
          return await this.sync.fullSync(FESTIVAL_SYNC_RANGE);
        } finally {
          requestCount = this.policy.currentBatchRequestCount();
        }
      }, "festival");
      details = summary.details ?? null;
      stage = details ? "details" : "list";
      status = summary.status;
      if (summary.status === "FAILED") {
        reason = details ? "DETAILS_FAILED" : "LIST_FAILED";
        throw new Error(
          `Festival detail sync failed for ${summary.failedCount} festivals`,
        );
      }
      if (summary.status === "DEFERRED" && summary.deferredReason) {
        reason = summary.deferredReason;
        this.logger.warn(
          `[BATCH_DEFERRED] festival-sync ${summary.deferredReason}`,
        );
        return;
      }
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
        this.logger.warn(`[BATCH_DEFERRED] festival-sync ${error.reason}`);
        return;
      }
      status = "FAILED";
      reason = stage === "details" ? "DETAILS_FAILED" : "LIST_FAILED";
      this.logger.error(
        "[BATCH_FAILED] festival-sync",
        `${reason}; list=${stage === "details" ? "COMPLETE" : "INCOMPLETE"}; details=${JSON.stringify(details)}`,
      );
      throw error;
    } finally {
      this.logger.log(
        `[BATCH_RESULT] ${JSON.stringify({ status, listStatus: stage === "details" ? "COMPLETE" : "INCOMPLETE", reason, requestCount, details })}`,
      );
      try {
        await this.notion.record({
          batchName: "festival-daily-sync",
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
