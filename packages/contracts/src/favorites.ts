import { z } from "zod";

export const FavoritePlaceParamsSchema = z.object({
  placeId: z.string().uuid(),
});

export const FavoritePlaceItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  location: z.string().min(1),
  primaryImageUrl: z.string().url().nullable(),
  favoritedAt: z.iso.datetime(),
});

export const MyFavoritesResponseSchema = z.object({
  items: z.array(FavoritePlaceItemSchema),
});

export type FavoritePlaceParams = z.infer<typeof FavoritePlaceParamsSchema>;
export type FavoritePlaceItem = z.infer<typeof FavoritePlaceItemSchema>;
export type MyFavoritesResponse = z.infer<typeof MyFavoritesResponseSchema>;
