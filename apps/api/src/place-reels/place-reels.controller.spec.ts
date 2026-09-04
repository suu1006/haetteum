import {
  METHOD_METADATA,
  PATH_METADATA,
  ROUTE_ARGS_METADATA,
  VERSION_METADATA,
} from "@nestjs/common/constants.js";
import { RequestMethod } from "@nestjs/common";
import { jest } from "@jest/globals";

import type {
  PlaceReelListResponse,
  PopularReelsResponse,
} from "@haetteum/contracts";

import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { PlaceReelsController } from "./place-reels.controller.js";

const popular: PopularReelsResponse = {
  source: "YOUTUBE",
  audience: "all",
  region: "all",
  items: [],
  nextCursor: null,
};

const forPlace: PlaceReelListResponse = {
  placeId: "22222222-2222-4222-8222-222222222222",
  source: "YOUTUBE",
  fetchedAt: null,
  items: [],
};

describe("PlaceReelsController", () => {
  it("delegates the aggregate feed query to the service", async () => {
    const reels = {
      listPopular: jest
        .fn<() => Promise<PopularReelsResponse>>()
        .mockResolvedValue(popular),
      listForPlace: jest.fn(),
    };
    const controller = new PlaceReelsController(reels as never);

    await expect(
      controller.popular({ audience: "all", region: "all", limit: 12 }),
    ).resolves.toEqual(popular);
    expect(reels.listPopular).toHaveBeenCalledWith({
      audience: "all",
      region: "all",
      limit: 12,
    });
  });

  it("delegates the per-place lookup to the service", async () => {
    const reels = {
      listPopular: jest.fn(),
      listForPlace: jest
        .fn<() => Promise<PlaceReelListResponse>>()
        .mockResolvedValue(forPlace),
    };
    const controller = new PlaceReelsController(reels as never);

    await expect(
      controller.forPlace("22222222-2222-4222-8222-222222222222"),
    ).resolves.toEqual(forPlace);
  });

  it("rejects a service result that violates the response contract", async () => {
    const reels = {
      listPopular: jest.fn(),
      listForPlace: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        ...forPlace,
        items: [{ provider: "YOUTUBE", videoId: "bad" }],
      }),
    };
    const controller = new PlaceReelsController(reels as never);

    await expect(
      controller.forPlace("22222222-2222-4222-8222-222222222222"),
    ).rejects.toThrow();
  });

  it("registers versioned place reels routes with validation pipes", () => {
    const popularHandler = Object.getOwnPropertyDescriptor(
      PlaceReelsController.prototype,
      "popular",
    )?.value as (...args: unknown[]) => unknown;

    expect(Reflect.getMetadata(PATH_METADATA, PlaceReelsController)).toBe(
      "place-reels",
    );
    expect(Reflect.getMetadata(VERSION_METADATA, PlaceReelsController)).toBe(
      "1",
    );
    expect(Reflect.getMetadata(METHOD_METADATA, popularHandler)).toBe(
      RequestMethod.GET,
    );

    const popularArgs = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      PlaceReelsController,
      "popular",
    ) as Record<string, { pipes: unknown[] }>;
    expect(Object.values(popularArgs)[0]?.pipes[0]).toBeInstanceOf(
      ZodValidationPipe,
    );

    const forPlaceArgs = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      PlaceReelsController,
      "forPlace",
    ) as Record<string, { pipes: unknown[] }>;
    const forPlacePipe = Object.values(forPlaceArgs)[0]?.pipes[0];
    expect(forPlacePipe).toBeInstanceOf(ZodValidationPipe);
    expect(() =>
      (forPlacePipe as ZodValidationPipe<string>).transform("not-a-uuid", {
        type: "param",
        metatype: String,
        data: "placeId",
      }),
    ).toThrow();
  });
});
