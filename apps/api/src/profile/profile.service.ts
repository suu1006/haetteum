import type {
  PlaceRegion,
  ProfilePhotoResponse,
  ProfilePreferencesResponse,
  TravelStyle,
  UpdateProfilePreferencesRequest,
} from "@haetteum/contracts";
import { Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async updatePreferences(
    userId: string,
    input: UpdateProfilePreferencesRequest,
  ): Promise<ProfilePreferencesResponse> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        travelStyles: input.travelStyles,
        interestedRegions: input.interestedRegions,
      },
      select: { travelStyles: true, interestedRegions: true },
    });

    return {
      travelStyles: updated.travelStyles as TravelStyle[],
      interestedRegions: updated.interestedRegions as PlaceRegion[],
    };
  }

  async updatePhoto(
    userId: string,
    profileImageUrl: string,
  ): Promise<ProfilePhotoResponse> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { profileImageUrl },
      select: { id: true },
    });

    return { profileImageUrl };
  }
}
