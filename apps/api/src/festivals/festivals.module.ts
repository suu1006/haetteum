import { Module } from "@nestjs/common";

import { TourismModule } from "../tourism/tourism.module.js";
import { FestivalsController } from "./festivals.controller.js";
import { FestivalsService } from "./festivals.service.js";

@Module({
  imports: [TourismModule],
  controllers: [FestivalsController],
  providers: [FestivalsService],
})
export class FestivalsModule {}
