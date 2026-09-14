import {
  METHOD_METADATA,
  PATH_METADATA,
  VERSION_METADATA,
  GUARDS_METADATA,
} from "@nestjs/common/constants.js";
import { BadRequestException, RequestMethod } from "@nestjs/common";
import { jest } from "@jest/globals";
import type { ImagesService } from "../images/images.service.js";
import type { AuthUser } from "@haetteum/contracts";

import { SameOriginGuard } from "../auth/same-origin.guard.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { ReviewImagesController } from "./review-images.controller.js";

const user = { id: "10000000-0000-4000-8000-000000000001" } as AuthUser;
function setup() {
  const store = jest.fn<ImagesService["store"]>().mockResolvedValue({
    id: "id",
    url: "http://localhost:4001/api/v1/images/id",
  });
  return {
    controller: new ReviewImagesController({
      store,
    } as unknown as ImagesService),
    store,
  };
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

  it("rejects the request when no file was uploaded", async () => {
    const { controller } = setup();
    await expect(controller.upload(undefined, user)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("uses the authenticated owner and returns the stored image URL", async () => {
    const { controller, store } = setup();
    const file = { buffer: Buffer.from("image") } as Express.Multer.File;
    await expect(controller.upload(file, user)).resolves.toEqual({
      url: "http://localhost:4001/api/v1/images/id",
    });
    expect(store).toHaveBeenCalledWith(user.id, file, "REVIEW");
  });
});
