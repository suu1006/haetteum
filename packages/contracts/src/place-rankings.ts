import { z } from "zod";

export const PlaceRankingAudienceSchema = z.enum([
  "all",
  "20s",
  "30s",
  "40s",
  "50s",
  "60s-plus",
]);

export const ListPlaceRankingsQuerySchema = z.object({
  audience: PlaceRankingAudienceSchema.default("all"),
  limit: z.coerce.number().int().min(1).max(10).default(10),
});

export const PlaceRankingItemSchema = z.object({
  rank: z.number().int().min(1).max(30),
  sourcePlaceId: z.string().regex(/^[0-9a-f]{32}$/i),
  title: z.string().min(1),
  category: z.string().min(1),
  sharePercent: z.number().positive().max(100),
  placeId: z.string().uuid().nullable(),
  primaryImageUrl: z.string().url().nullable(),
  imageCopyrightType: z.string().nullable(),
  imageAttribution: z.string().nullable(),
  imageAttributionUrl: z.string().url().nullable(),
});

export const PlaceRankingResponseSchema = z.object({
  source: z.literal("KTO_DATALAB"),
  scope: z.literal("national"),
  periodStart: z.iso.date(),
  periodEnd: z.iso.date(),
  audience: PlaceRankingAudienceSchema,
  items: z.array(PlaceRankingItemSchema).max(10),
});

export type PlaceRankingAudience = z.infer<typeof PlaceRankingAudienceSchema>;
export type ListPlaceRankingsQuery = z.infer<
  typeof ListPlaceRankingsQuerySchema
>;
export type PlaceRankingItem = z.infer<typeof PlaceRankingItemSchema>;
export type PlaceRankingResponse = z.infer<typeof PlaceRankingResponseSchema>;
