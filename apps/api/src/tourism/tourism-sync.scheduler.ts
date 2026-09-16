import { TourApiPolicy } from "./tour-api-policy.js";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";

import type { ApiEnvironment } from "../config/environment.js";
import { TourismSyncService } from "./tourism-sync.service.js";
import { NotionBatchRecorder } from "./notion-batch-recorder.js";

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
    let success = false;
    try {
      await this.policy.batch(async () => {
        await this.sync.incrementalSync();
        const details = await this.sync.enrichPendingPlaceDetails();
        if (details.failedCount > 0)
          throw new Error(
            `Tourism detail sync failed for ${details.failedCount} places`,
          );
      });

      this.logger.log("[BATCH_SUCCESS] tour-api-sync");
      success = true;
    } catch (error) {
      this.logger.error(
        "[BATCH_FAILED] tour-api-sync",
        error instanceof Error ? error.stack : String(error),
      );

      throw error;
    } finally {
      await this.notion.record({ success, startedAt, finishedAt: new Date() });
    }
  }
}
