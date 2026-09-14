import { BadRequestException, RequestMethod } from "@nestjs/common";
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  VERSION_METADATA,
} from "@nestjs/common/constants.js";
import { jest } from "@jest/globals";

import type { AuthUser } from "@haetteum/contracts";

import { SameOriginGuard } from "../auth/same-origin.guard.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { ProfileController } from "./profile.controller.js";
import type { ProfilePhotoStorageService } from "./profile-photo-storage.service.js";
import type { ProfileService } from "./profile.service.js";

const currentUser: AuthUser = {
  id: "10000000-0000-4000-8000-000000000006",
  displayName: "traveler",
  profileImageUrl: null,
  provider: "KAKAO",
};

function handler(
  method: keyof ProfileController,
): (...args: never[]) => unknown {
  return Object.getOwnPropertyDescriptor(ProfileController.prototype, method)
    ?.value as (...args: never[]) => unknown;
}

function createController(options?: {
  preferencesResult?: {
    travelStyles: string[];
    interestedRegions: string[];
  };
}) {
  const updatePreferences = jest
    .fn<
      () => Promise<{ travelStyles: string[]; interestedRegions: string[] }>
    >()
    .mockResolvedValue(
      options?.preferencesResult ?? {
        travelStyles: ["nature_healing"],
        interestedRegions: ["seoul"],
      },
    );
  const updatePhoto = jest
    .fn<() => Promise<{ profileImageUrl: string }>>()
    .mockResolvedValue({ profileImageUrl: "http://localhost:4000/x.jpg" });
  const profile = {
    updatePreferences,
    updatePhoto,
  } as unknown as ProfileService;

  const store = jest
    .fn<() => Promise<{ profileImageUrl: string }>>()
    .mockResolvedValue({
      profileImageUrl:
        "http://localhost:4001/api/v1/images/22222222-2222-4222-8222-222222222222",
    });
  const photoStorage = { store } as unknown as ProfilePhotoStorageService;

  return {
    controller: new ProfileController(profile, photoStorage),
    updatePreferences,
    updatePhoto,
    store,
  };
}

describe("ProfileController", () => {
  it("updates the current user's preferences", async () => {
    const { controller, updatePreferences } = createController();

    await expect(
      controller.updatePreferences(currentUser, {
        travelStyles: ["nature_healing"],
        interestedRegions: ["seoul"],
      }),
    ).resolves.toEqual({
      travelStyles: ["nature_healing"],
      interestedRegions: ["seoul"],
    });
    expect(updatePreferences).toHaveBeenCalledWith(currentUser.id, {
      travelStyles: ["nature_healing"],
      interestedRegions: ["seoul"],
    });
  });

  it("rejects the photo upload when no file was provided", async () => {
    const { controller } = createController();

    await expect(
      controller.uploadPhoto(currentUser, undefined),
    ).rejects.toThrow(BadRequestException);
  });

  it("uploads a photo and persists the absolute URL for the current user", async () => {
    const { controller, store } = createController();
    const file = {
      buffer: Buffer.from("fake-image-bytes"),
      mimetype: "image/jpeg",
      originalname: "photo.jpg",
    } as Express.Multer.File;

    await expect(controller.uploadPhoto(currentUser, file)).resolves.toEqual({
      profileImageUrl:
        "http://localhost:4001/api/v1/images/22222222-2222-4222-8222-222222222222",
    });
    expect(store).toHaveBeenCalledWith(currentUser.id, file);
  });

  it("registers exact versioned routes and guards", () => {
    expect(Reflect.getMetadata(PATH_METADATA, ProfileController)).toBe(
      "profile",
    );
    expect(Reflect.getMetadata(VERSION_METADATA, ProfileController)).toBe("1");
    expect(Reflect.getMetadata(GUARDS_METADATA, ProfileController)).toEqual([
      SessionAuthGuard,
      SameOriginGuard,
    ]);

    expect(
      Reflect.getMetadata(METHOD_METADATA, handler("updatePreferences")),
    ).toBe(RequestMethod.PATCH);

    expect(Reflect.getMetadata(PATH_METADATA, handler("uploadPhoto"))).toBe(
      "photo",
    );
    expect(Reflect.getMetadata(METHOD_METADATA, handler("uploadPhoto"))).toBe(
      RequestMethod.POST,
    );
  });
});
