import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { SavedCoursesController } from "./saved-courses.controller.js";
import { SavedCoursesService } from "./saved-courses.service.js";

@Module({
  imports: [AuthModule],
  controllers: [SavedCoursesController],
  providers: [SavedCoursesService],
})
export class SavedCoursesModule {}
