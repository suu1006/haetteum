import { Module } from "@nestjs/common";

import { FestivalsController } from "./festivals.controller.js";
import { FestivalsService } from "./festivals.service.js";

@Module({
  controllers: [FestivalsController],
  providers: [FestivalsService],
})
export class FestivalsModule {}
