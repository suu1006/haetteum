import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";

import { TourismModule } from "../tourism/tourism.module.js";
import { HealthController } from "./health.controller.js";

@Module({
  imports: [TerminusModule, TourismModule],
  controllers: [HealthController],
})
export class HealthModule {}
