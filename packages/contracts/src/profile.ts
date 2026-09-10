import { z } from "zod";

import { PlaceRegionSchema } from "./places.js";

export const TravelStyleSchema = z.enum([
  "nature_healing",
  "food_tour",
  "culture_history",
  "activity",
  "shopping",
  "etc",
]);
export type TravelStyle = z.infer<typeof TravelStyleSchema>;

export const UpdateProfilePreferencesRequestSchema = z
  .object({
    travelStyles: z.array(TravelStyleSchema).max(6),
    interestedRegions: z.array(PlaceRegionSchema).max(5),
  })
  .strict();
export type UpdateProfilePreferencesRequest = z.infer<
  typeof UpdateProfilePreferencesRequestSchema
>;

export const ProfilePreferencesResponseSchema = z.object({
  travelStyles: z.array(TravelStyleSchema),
  interestedRegions: z.array(PlaceRegionSchema),
});
export type ProfilePreferencesResponse = z.infer<
  typeof ProfilePreferencesResponseSchema
>;

export const ProfilePhotoResponseSchema = z.object({
  profileImageUrl: z.string().url(),
});
export type ProfilePhotoResponse = z.infer<typeof ProfilePhotoResponseSchema>;
