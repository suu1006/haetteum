import { BadRequestException, RequestMethod } from "@nestjs/common";
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
  VERSION_METADATA,
} from "@nestjs/common/constants.js";
import { jest } from "@jest/globals";
import type { Request } from "express";

import type { AuthUser } from "@haetteum/contracts";

import { SameOriginGuard } from "../auth/same-origin.guard.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { ProfileController } from "./profile.controller.js";
import type { ProfileService } from "./profile.service.js";

const currentUser: AuthUser = {
  id: "10000000-0000-4000-8000-000000000006",
  displayName: "traveler",
  profileImageUrl: null,
};

function fakeRequest(): Request {
  return {
    protocol: "http",
    get: (name: string) => (name === "host" ? "localhost:4000" : undefined),
  } as unknown as Request;
}

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
  const updatePreferences = jest.fn().mockResolvedValue(
    options?.preferencesResult ?? {
      travelStyles: ["nature_healing"],
      interestedRegions: ["seoul"],
    },
  );
  const updatePhoto = jest
    .fn()
    .mockResolvedValue({ profileImageUrl: "http://localhost:4000/x.jpg" });
  const profile = {
    updatePreferences,
    updatePhoto,
  } as unknown as ProfileService;

  return {
    controller: new ProfileController(profile),
    updatePreferences,
    updatePhoto,
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
      controller.uploadPhoto(currentUser, undefined, fakeRequest()),
    ).rejects.toThrow(BadRequestException);
  });

  it("uploads a photo and persists the absolute URL for the current user", async () => {
    const { controller, updatePhoto } = createController();
    const file = {
      filename: "22222222-2222-4222-8222-222222222222.jpg",
    } as Express.Multer.File;

    await expect(
      controller.uploadPhoto(currentUser, file, fakeRequest()),
    ).resolves.toEqual({ profileImageUrl: "http://localhost:4000/x.jpg" });
    expect(updatePhoto).toHaveBeenCalledWith(
      currentUser.id,
      "http://localhost:4000/uploads/profile-photos/22222222-2222-4222-8222-222222222222.jpg",
    );
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
