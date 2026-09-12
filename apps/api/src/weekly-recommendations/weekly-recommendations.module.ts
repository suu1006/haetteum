import { Module } from "@nestjs/common";
import { TourismModule } from "../tourism/tourism.module.js";
import { WeeklyThumbnailService } from "./weekly-thumbnail.service.js";
import { WeeklyRecommendationsController } from "./weekly-recommendations.controller.js";
import { WeeklyRecommendationsService } from "./weekly-recommendations.service.js";
import { WeeklyRecommendationsScheduler } from "./weekly-recommendations.scheduler.js";

@Module({
  imports: [TourismModule],
  controllers: [WeeklyRecommendationsController],
  providers: [
    WeeklyThumbnailService,
    WeeklyRecommendationsService,
    WeeklyRecommendationsScheduler,
  ],
})
export class WeeklyRecommendationsModule {}
