import {
  METHOD_METADATA,
  PATH_METADATA,
  ROUTE_ARGS_METADATA,
  VERSION_METADATA,
} from "@nestjs/common/constants.js";
import { RequestMethod } from "@nestjs/common";
import { jest } from "@jest/globals";

import type { PlaceCoursesResponse } from "@haetteum/contracts";

import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { PlaceCoursesController } from "./place-courses.controller.js";

const placeId = "22222222-2222-4222-8222-222222222222";
const response: PlaceCoursesResponse = {
  placeId,
  source: "TOUR_API",
  items: [],
};

describe("PlaceCoursesController", () => {
  it("delegates the place course query to the service", async () => {
    const courses = {
      listForPlace: jest
        .fn<() => Promise<PlaceCoursesResponse>>()
        .mockResolvedValue(response),
    };
    const controller = new PlaceCoursesController(courses as never);

    await expect(controller.forPlace(placeId)).resolves.toEqual(response);
    expect(courses.listForPlace).toHaveBeenCalledWith(placeId);
  });

  it("exposes a versioned public GET route keyed by place id", () => {
    const handler = Object.getOwnPropertyDescriptor(
      PlaceCoursesController.prototype,
      "forPlace",
    )?.value as (...args: unknown[]) => unknown;

    expect(Reflect.getMetadata(PATH_METADATA, PlaceCoursesController)).toBe(
      "place-courses",
    );
    expect(Reflect.getMetadata(VERSION_METADATA, PlaceCoursesController)).toBe(
      "1",
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(":placeId");
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.GET,
    );
  });

  it("validates the place id as a UUID", () => {
    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      PlaceCoursesController,
      "forPlace",
    ) as Record<string, { pipes: unknown[] }>;
    const pipes = Object.values(args).flatMap((arg) => arg.pipes);

    expect(pipes.some((pipe) => pipe instanceof ZodValidationPipe)).toBe(true);
  });
});
