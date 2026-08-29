import { z } from "zod";

export const HotPlaceRankingAudienceSchema = z.enum([
  "all",
  "20s",
  "30s",
  "40s",
  "50s",
  "60s-plus",
]);

export const ListHotPlaceRankingsQuerySchema = z.object({
  audience: HotPlaceRankingAudienceSchema.default("all"),
  limit: z.coerce.number().int().min(1).max(10).default(10),
});

export const HotPlaceRankingItemSchema = z.object({
  rank: z.number().int().min(1).max(10),
  sourcePlaceId: z.string().regex(/^[0-9a-f]{32}$/i),
  title: z.string().min(1),
  category: z.string().min(1),
  provinceName: z.string().min(1),
  districtName: z.string().min(1),
  growthPercent: z.number().positive(),
  placeId: z.string().uuid().nullable(),
  primaryImageUrl: z.string().url().nullable(),
  imageCopyrightType: z.string().nullable(),
  imageAttribution: z.string().nullable(),
  imageAttributionUrl: z.string().url().nullable(),
});

export const HotPlaceRankingResponseSchema = z.object({
  source: z.literal("KTO_DATALAB"),
  scope: z.literal("national"),
  baseYearMonth: z.string().regex(/^\d{6}$/),
  periodStart: z.iso.date(),
  periodEnd: z.iso.date(),
  audience: HotPlaceRankingAudienceSchema,
  items: z.array(HotPlaceRankingItemSchema).max(10),
});

export type HotPlaceRankingAudience = z.infer<
  typeof HotPlaceRankingAudienceSchema
>;
export type ListHotPlaceRankingsQuery = z.infer<
  typeof ListHotPlaceRankingsQuerySchema
>;
export type HotPlaceRankingItem = z.infer<typeof HotPlaceRankingItemSchema>;
export type HotPlaceRankingResponse = z.infer<
  typeof HotPlaceRankingResponseSchema
>;
