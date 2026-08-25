import { z } from "zod";

export const PlaceRegionSchema = z.enum([
  "seoul",
  "gyeonggi",
  "gangwon",
  "busan",
  "jeju",
]);

export const ListPlacesQuerySchema = z.object({
  region: PlaceRegionSchema,
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).default(""),
});

export const PlaceListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  region: PlaceRegionSchema,
  district: z.string().nullable(),
  address: z.string().nullable(),
  longitude: z.number().nullable(),
  latitude: z.number().nullable(),
  primaryImageUrl: z.string().url().nullable(),
  imageCopyrightType: z.string().nullable(),
});

export const PlacesPageSchema = z.object({
  items: z.array(PlaceListItemSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalCount: z.number().int().nonnegative(),
});

export type PlaceRegion = z.infer<typeof PlaceRegionSchema>;
export type ListPlacesQuery = z.infer<typeof ListPlacesQuerySchema>;
export type PlaceListItem = z.infer<typeof PlaceListItemSchema>;
export type PlacesPage = z.infer<typeof PlacesPageSchema>;
