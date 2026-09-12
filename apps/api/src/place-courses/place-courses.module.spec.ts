import { MODULE_METADATA } from "@nestjs/common/constants.js";

import { AppModule } from "../app.module.js";
import { TourismModule } from "../tourism/tourism.module.js";
import { COURSE_API_PORT } from "../tourism/tourism.constants.js";
import { CourseSyncService } from "./course-sync.service.js";
import { PlaceCoursesController } from "./place-courses.controller.js";
import { PlaceCoursesModule } from "./place-courses.module.js";
import { PlaceCoursesService } from "./place-courses.service.js";

describe("PlaceCoursesModule", () => {
  it("registers the course controller and services on top of the tourism module", () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, PlaceCoursesModule),
    ).toEqual([PlaceCoursesController]);
    expect(
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, PlaceCoursesModule),
    ).toEqual([PlaceCoursesService]);
    expect(
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, PlaceCoursesModule),
    ).toEqual([TourismModule]);
  });

  it("exposes the collector service without exposing its external provider port", () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, TourismModule),
    ).not.toContain(COURSE_API_PORT);
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, TourismModule),
    ).toContain(CourseSyncService);
  });

  it("is imported by the application module", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule)).toContain(
      PlaceCoursesModule,
    );
  });
});
