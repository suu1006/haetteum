import { Module } from "@nestjs/common";

import { TourismModule } from "../tourism/tourism.module.js";
import { HotPlaceRankingImportService } from "./hot-place-ranking-import.service.js";
import { HotPlaceRankingsController } from "./hot-place-rankings.controller.js";
import { HotPlaceRankingsService } from "./hot-place-rankings.service.js";

@Module({
  imports: [TourismModule],
  controllers: [HotPlaceRankingsController],
  providers: [HotPlaceRankingImportService, HotPlaceRankingsService],
  exports: [HotPlaceRankingImportService],
})
export class HotPlaceRankingsModule {}
