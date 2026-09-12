import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron } from "@nestjs/schedule";

import type { ApiEnvironment } from "../config/environment.js";
import { WeeklyRecommendationsService } from "./weekly-recommendations.service.js";

type WeeklyOperation = "prepare" | "validate" | "publish" | "repair";

@Injectable()
export class WeeklyRecommendationsScheduler {
  private readonly logger = new Logger(WeeklyRecommendationsScheduler.name);

  constructor(
    private readonly config: ConfigService<ApiEnvironment, true>,
    private readonly recommendations: WeeklyRecommendationsService,
  ) {}

  @Cron("0 0 6 * * 6", {
    name: "weekly-recommendations-prepare",
    timeZone: "Asia/Seoul",
    waitForCompletion: true,
  })
  async runPreparation(): Promise<void> {
    await this.run("prepare");
  }

  @Cron("0 0 6 * * 0", {
    name: "weekly-recommendations-validate",
    timeZone: "Asia/Seoul",
    waitForCompletion: true,
  })
  async runValidation(): Promise<void> {
    await this.run("validate");
  }

  @Cron("0 0 0 * * 1", {
    name: "weekly-recommendations-publish",
    timeZone: "Asia/Seoul",
    waitForCompletion: true,
  })
  async runPublication(): Promise<void> {
    await this.run("publish");
  }

  @Cron("0 0 8 * * *", {
    name: "weekly-recommendations-repair",
    timeZone: "Asia/Seoul",
    waitForCompletion: true,
  })
  async runRepair(): Promise<void> {
    await this.run("repair");
  }

  private async run(operation: WeeklyOperation): Promise<void> {
    if (!this.config.get("WEEKLY_RECOMMENDATIONS_ENABLED", { infer: true }))
      return;

    try {
      await this.recommendations[operation]();
    } catch {
      this.logger.error(
        JSON.stringify({
          event: "weekly_recommendations_job_failed",
          operation,
          reason: "UNEXPECTED_ERROR",
        }),
      );
    }
  }
}
