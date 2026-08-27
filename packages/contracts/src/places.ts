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

export const PlaceDetailImageSchema = z.object({
  url: z.string().url(),
  thumbnailUrl: z.string().url().nullable(),
  alt: z.string().min(1),
  copyrightType: z.string().nullable(),
});

export const PlaceDetailInformationItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  text: z.string().min(1),
});

export const PlaceDetailResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  category: z.object({
    primary: z.string().nullable(),
    secondary: z.string().nullable(),
    tertiary: z.string().nullable(),
  }),
  region: PlaceRegionSchema,
  district: z.string().nullable(),
  address: z.string().nullable(),
  longitude: z.number().nullable(),
  latitude: z.number().nullable(),
  telephone: z.string().nullable(),
  homepage: z.string().url().nullable(),
  overview: z.string().nullable(),
  images: z.array(PlaceDetailImageSchema),
  introduction: z.object({
    infoCenter: z.string().nullable(),
    restDate: z.string().nullable(),
    useSeason: z.string().nullable(),
    useTime: z.string().nullable(),
    parking: z.string().nullable(),
    experienceAgeRange: z.string().nullable(),
    experienceGuide: z.string().nullable(),
    babyCarriage: z.string().nullable(),
    creditCard: z.string().nullable(),
    pet: z.string().nullable(),
  }),
  information: z.array(PlaceDetailInformationItemSchema),
  detailSyncedAt: z.iso.datetime().nullable(),
});

export const NearbyPlaceCategorySchema = z.enum([
  "attraction",
  "restaurant",
  "cafe",
]);

export const NearbyPlacesQuerySchema = z.object({
  category: NearbyPlaceCategorySchema.default("attraction"),
  limit: z.coerce.number().int().min(1).max(15).default(10),
});

const KakaoPlaceUrlSchema = z.string().url().refine((value) => {
  const url = new URL(value);
  return (
    (url.protocol === "http:" || url.protocol === "https:") &&
    url.hostname === "place.map.kakao.com"
  );
});

export const NearbyPlaceItemSchema = z.object({
  provider: z.literal("KAKAO_LOCAL"),
  providerPlaceId: z.string().min(1),
  title: z.string().min(1),
  categoryLabel: z.string().min(1),
  telephone: z.string().nullable(),
  address: z.string().nullable(),
  roadAddress: z.string().nullable(),
  longitude: z.number(),
  latitude: z.number(),
  distanceMeters: z.number().int().nonnegative().nullable(),
  placeUrl: KakaoPlaceUrlSchema,
});

export const NearbyPlacesResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ready"),
    category: NearbyPlaceCategorySchema,
    partial: z.boolean(),
    items: z.array(NearbyPlaceItemSchema),
  }),
  z.object({
    status: z.literal("unavailable"),
    reason: z.enum([
      "coordinates_missing",
      "provider_not_configured",
      "provider_unavailable",
    ]),
  }),
]);

export type PlaceRegion = z.infer<typeof PlaceRegionSchema>;
export type ListPlacesQuery = z.infer<typeof ListPlacesQuerySchema>;
export type PlaceListItem = z.infer<typeof PlaceListItemSchema>;
export type PlacesPage = z.infer<typeof PlacesPageSchema>;
export type PlaceDetailImage = z.infer<typeof PlaceDetailImageSchema>;
export type PlaceDetailInformationItem = z.infer<
  typeof PlaceDetailInformationItemSchema
>;
export type PlaceDetailResponse = z.infer<typeof PlaceDetailResponseSchema>;
export type NearbyPlaceCategory = z.infer<typeof NearbyPlaceCategorySchema>;
export type NearbyPlacesQuery = z.infer<typeof NearbyPlacesQuerySchema>;
export type NearbyPlaceItem = z.infer<typeof NearbyPlaceItemSchema>;
export type NearbyPlacesResponse = z.infer<typeof NearbyPlacesResponseSchema>;
