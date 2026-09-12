import { TourApiPolicy } from "./tour-api-policy.js";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";

import type { ApiEnvironment } from "../config/environment.js";
import { TourismSyncService } from "./tourism-sync.service.js";

@Injectable()
export class TourismSyncScheduler {
  constructor(
    private readonly config: ConfigService<ApiEnvironment, true>,
    private readonly sync: TourismSyncService,
    private readonly policy: TourApiPolicy,
  ) {}

  @Cron("0 30 3 * * *", {
    name: "tourism-daily-sync",
    timeZone: "Asia/Seoul",
    waitForCompletion: true,
  })
  async runDailySync(): Promise<void> {
    if (!this.config.get("TOURISM_SYNC_ENABLED", { infer: true })) return;

    await this.policy.batch(async () => {
      await this.sync.incrementalSync();
      const details = await this.sync.enrichPendingPlaceDetails();
      if (details.failedCount > 0)
        throw new Error(
          `Tourism detail sync failed for ${details.failedCount} places`,
        );
    });
  }
}
