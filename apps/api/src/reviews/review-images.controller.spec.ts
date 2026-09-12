import {
  METHOD_METADATA,
  PATH_METADATA,
  VERSION_METADATA,
  GUARDS_METADATA,
} from "@nestjs/common/constants.js";
import { BadRequestException, RequestMethod } from "@nestjs/common";
import type { Request } from "express";

import { SameOriginGuard } from "../auth/same-origin.guard.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { ReviewImagesController } from "./review-images.controller.js";

function fakeRequest(): Request {
  return {
    protocol: "http",
    get: (name: string) => (name === "host" ? "localhost:4000" : undefined),
  } as unknown as Request;
}

describe("ReviewImagesController", () => {
  it("registers the versioned, guarded upload route", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ReviewImagesController)).toBe(
      "reviews/images",
    );
    expect(Reflect.getMetadata(VERSION_METADATA, ReviewImagesController)).toBe(
      "1",
    );
    expect(
      Reflect.getMetadata(GUARDS_METADATA, ReviewImagesController),
    ).toEqual([SessionAuthGuard, SameOriginGuard]);

    const handler = Object.getOwnPropertyDescriptor(
      ReviewImagesController.prototype,
      "upload",
    )?.value as (...args: unknown[]) => unknown;
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe("/");
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.POST,
    );
  });

  it("rejects the request when no file was uploaded", () => {
    const controller = new ReviewImagesController();

    expect(() => controller.upload(undefined, fakeRequest())).toThrow(
      BadRequestException,
    );
  });

  it("returns an absolute URL built from the request origin and stored filename", () => {
    const controller = new ReviewImagesController();
    const file = {
      filename: "11111111-1111-4111-8111-111111111111.jpg",
    } as Express.Multer.File;

    expect(controller.upload(file, fakeRequest())).toEqual({
      url: "http://localhost:4000/uploads/reviews/11111111-1111-4111-8111-111111111111.jpg",
    });
  });
});
