import { Controller, Get, Param } from "@nestjs/common";
import { z } from "zod";

import {
  PlaceCoursesResponseSchema,
  type PlaceCoursesResponse,
} from "@haetteum/contracts";

import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { PlaceCoursesService } from "./place-courses.service.js";

@Controller({ path: "place-courses", version: "1" })
export class PlaceCoursesController {
  constructor(private readonly courses: PlaceCoursesService) {}

  @Get(":placeId")
  async forPlace(
    @Param("placeId", new ZodValidationPipe(z.string().uuid()))
    placeId: string,
  ): Promise<PlaceCoursesResponse> {
    return PlaceCoursesResponseSchema.parse(
      await this.courses.listForPlace(placeId),
    );
  }
}
