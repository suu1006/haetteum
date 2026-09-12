import { z } from "zod";
import { PlaceListItemSchema } from "./places.js";

export const WeeklyPlaceItemSchema = PlaceListItemSchema.extend({
  region: z.string().regex(/^[a-z]+(?:-[a-z]+)*$/),
});

export const WeeklyRecommendationsResponseSchema = z.object({
  week: z.iso.date().nullable(),
  items: z.array(WeeklyPlaceItemSchema).max(20),
});

export type WeeklyPlaceItem = z.infer<typeof WeeklyPlaceItemSchema>;
export type WeeklyRecommendationsResponse = z.infer<typeof WeeklyRecommendationsResponseSchema>;
