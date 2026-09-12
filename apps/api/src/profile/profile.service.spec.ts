import { jest } from "@jest/globals";

import type { PrismaService } from "../prisma/prisma.service.js";
import { ProfileService } from "./profile.service.js";

const userId = "10000000-0000-4000-8000-000000000005";

function createService(options?: {
  updateResult?: { travelStyles: string[]; interestedRegions: string[] };
}) {
  const update = jest
    .fn<
      () => Promise<{ travelStyles: string[]; interestedRegions: string[] }>
    >()
    .mockResolvedValue(
      options?.updateResult ?? {
        travelStyles: ["nature_healing"],
        interestedRegions: ["seoul"],
      },
    );
  const prisma = { user: { update } } as unknown as PrismaService;

  return { service: new ProfileService(prisma), update };
}

describe("ProfileService", () => {
  describe("updatePreferences", () => {
    it("persists the given travel styles and interested regions for the user", async () => {
      const { service, update } = createService();

      const result = await service.updatePreferences(userId, {
        travelStyles: ["nature_healing", "food_tour"],
        interestedRegions: ["seoul", "busan"],
      });

      expect(update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          travelStyles: ["nature_healing", "food_tour"],
          interestedRegions: ["seoul", "busan"],
        },
        select: { travelStyles: true, interestedRegions: true },
      });
      expect(result).toEqual({
        travelStyles: ["nature_healing"],
        interestedRegions: ["seoul"],
      });
    });

    it("clears preferences when given empty lists", async () => {
      const { service, update } = createService({
        updateResult: { travelStyles: [], interestedRegions: [] },
      });

      const result = await service.updatePreferences(userId, {
        travelStyles: [],
        interestedRegions: [],
      });

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { travelStyles: [], interestedRegions: [] },
        }),
      );
      expect(result).toEqual({ travelStyles: [], interestedRegions: [] });
    });
  });

  describe("updatePhoto", () => {
    it("sets the user's profileImageUrl and echoes it back", async () => {
      const { service, update } = createService();

      const result = await service.updatePhoto(
        userId,
        "http://localhost:4000/uploads/profile-photos/abc.jpg",
      );

      expect(update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          profileImageUrl:
            "http://localhost:4000/uploads/profile-photos/abc.jpg",
        },
        select: { id: true },
      });
      expect(result).toEqual({
        profileImageUrl: "http://localhost:4000/uploads/profile-photos/abc.jpg",
      });
    });
  });
});
