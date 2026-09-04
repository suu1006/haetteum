import { z } from "zod";

import { PlaceRankingAudienceSchema } from "./place-rankings.js";
import { PlaceRegionSchema } from "./places.js";

export const PopularReelRegionSchema = z.union([
  z.literal("all"),
  PlaceRegionSchema,
]);

const YOUTUBE_VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export const PlaceReelItemSchema = z.object({
  provider: z.literal("YOUTUBE"),
  videoId: z.string().regex(YOUTUBE_VIDEO_ID),
  title: z.string().min(1),
  channelTitle: z.string().min(1),
  thumbnailUrl: z.string().url(),
  durationSeconds: z.number().int().positive().max(60),
  viewCount: z.number().int().nonnegative().nullable(),
  publishedAt: z.iso.datetime(),
  embedUrl: z.string().url(),
});

export const PlaceReelListResponseSchema = z.object({
  placeId: z.string().uuid(),
  source: z.literal("YOUTUBE"),
  fetchedAt: z.iso.datetime().nullable(),
  items: z.array(PlaceReelItemSchema).max(10),
});

export const PopularReelItemSchema = PlaceReelItemSchema.extend({
  placeId: z.string().uuid(),
  placeTitle: z.string().min(1),
  region: z.string().min(1),
});

export const ListPopularReelsQuerySchema = z.object({
  audience: PlaceRankingAudienceSchema.default("all"),
  region: PopularReelRegionSchema.default("all"),
  limit: z.coerce.number().int().min(1).max(30).default(12),
  cursor: z.coerce.number().int().nonnegative().optional(),
});

export const PopularReelsResponseSchema = z.object({
  source: z.literal("YOUTUBE"),
  audience: PlaceRankingAudienceSchema,
  region: PopularReelRegionSchema,
  items: z.array(PopularReelItemSchema).max(30),
  nextCursor: z.number().int().nonnegative().nullable(),
});

export type PlaceReelItem = z.infer<typeof PlaceReelItemSchema>;
export type PlaceReelListResponse = z.infer<typeof PlaceReelListResponseSchema>;
export type PopularReelItem = z.infer<typeof PopularReelItemSchema>;
export type PopularReelRegion = z.infer<typeof PopularReelRegionSchema>;
export type ListPopularReelsQuery = z.infer<typeof ListPopularReelsQuerySchema>;
export type PopularReelsResponse = z.infer<typeof PopularReelsResponseSchema>;
