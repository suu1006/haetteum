import { Module } from "@nestjs/common";

import { TourismModule } from "../tourism/tourism.module.js";
import { PlaceCoursesController } from "./place-courses.controller.js";
import { PlaceCoursesService } from "./place-courses.service.js";

@Module({
  imports: [TourismModule],
  controllers: [PlaceCoursesController],
  providers: [PlaceCoursesService],
  exports: [TourismModule],
})
export class PlaceCoursesModule {}
