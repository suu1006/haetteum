import { Module } from "@nestjs/common";

import { TourismModule } from "../tourism/tourism.module.js";
import { CourseSyncService } from "./course-sync.service.js";
import { PlaceCoursesController } from "./place-courses.controller.js";
import { PlaceCoursesService } from "./place-courses.service.js";

@Module({
  imports: [TourismModule],
  controllers: [PlaceCoursesController],
  providers: [PlaceCoursesService, CourseSyncService],
  exports: [CourseSyncService],
})
export class PlaceCoursesModule {}
