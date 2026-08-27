import { Module } from "@nestjs/common";

import { PlaceRankingImportService } from "./place-ranking-import.service.js";
import { PlaceRankingsController } from "./place-rankings.controller.js";
import { PlaceRankingsService } from "./place-rankings.service.js";

@Module({
  controllers: [PlaceRankingsController],
  providers: [PlaceRankingImportService, PlaceRankingsService],
  exports: [PlaceRankingImportService],
})
export class PlaceRankingsModule {}
