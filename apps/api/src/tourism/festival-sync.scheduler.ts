import { TourApiPolicy } from "./tour-api-policy.js";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";

import type { ApiEnvironment } from "../config/environment.js";
import { FestivalSyncService } from "./festival-sync.service.js";
import { FESTIVAL_SYNC_RANGE } from "./tourism.constants.js";

@Injectable()
export class FestivalSyncScheduler {
  private readonly logger = new Logger(FestivalSyncScheduler.name);
  constructor(
    private readonly config: ConfigService<ApiEnvironment, true>,
    private readonly sync: FestivalSyncService,
    private readonly policy: TourApiPolicy,
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

    const summary = await this.policy.batch(
      () => this.sync.fullSync(FESTIVAL_SYNC_RANGE),
      "festival",
    );
    if (summary.failedCount > 0)
      throw new Error(
        `Festival detail sync failed for ${summary.failedCount} festivals`,
      );
    if (summary.status === "DEFERRED")
      this.logger.warn(
        `[BATCH_DEFERRED] festival-sync ${summary.deferredReason}`,
      );
  }
}
