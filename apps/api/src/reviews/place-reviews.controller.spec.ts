import {
  METHOD_METADATA,
  PATH_METADATA,
  VERSION_METADATA,
  GUARDS_METADATA,
} from "@nestjs/common/constants.js";
import { RequestMethod } from "@nestjs/common";
import { jest } from "@jest/globals";

import type { PlaceReviewsResponse } from "@haetteum/contracts";

import { PlaceReviewsController } from "./place-reviews.controller.js";

const PLACE_ID = "20000000-0000-4000-8000-000000000001";
const response: PlaceReviewsResponse = {
  placeId: PLACE_ID,
  reviewCount: 0,
  averageRating: null,
  ratingDistribution: [
    { score: 5, count: 0 },
    { score: 4, count: 0 },
    { score: 3, count: 0 },
    { score: 2, count: 0 },
    { score: 1, count: 0 },
  ],
  items: [],
};

describe("PlaceReviewsController", () => {
  it("delegates the place review query to the service", async () => {
    const reviews = {
      listForPlace: jest
        .fn<() => Promise<PlaceReviewsResponse>>()
        .mockResolvedValue(response),
    };
    const controller = new PlaceReviewsController(reviews as never);

    await expect(controller.forPlace(PLACE_ID)).resolves.toEqual(response);
    expect(reviews.listForPlace).toHaveBeenCalledWith(PLACE_ID);
  });

  it("exposes a versioned GET route keyed by place id", () => {
    expect(Reflect.getMetadata(PATH_METADATA, PlaceReviewsController)).toBe(
      "place-reviews",
    );
    expect(Reflect.getMetadata(VERSION_METADATA, PlaceReviewsController)).toBe(
      "1",
    );
    const handler = Object.getOwnPropertyDescriptor(
      PlaceReviewsController.prototype,
      "forPlace",
    )?.value as (...args: unknown[]) => unknown;

    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(":placeId");
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.GET,
    );
  });

  it("stays readable without a session so the detail tab works logged out", () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, PlaceReviewsController),
    ).toBeUndefined();
  });
});
