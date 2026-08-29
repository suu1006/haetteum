import { z } from "zod";

export const FestivalBrowseRegionSchema = z.enum([
  "all",
  "jeju",
  "seoul",
  "busan",
  "gangwon",
  "gyeongju",
  "jeonju",
]);

export const FestivalDiscoveryQuerySchema = z.object({
  region: FestivalBrowseRegionSchema.default("all"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(40).default(20),
});

export const FestivalStatusSchema = z.enum(["ONGOING", "UPCOMING"]);

export const FestivalDetailStatusSchema = z.enum([
  "ONGOING",
  "UPCOMING",
  "ENDED",
]);

const ProviderImageUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return (
    url.protocol === "https:" && url.hostname === "tong.visitkorea.or.kr"
  );
});

export const FestivalCategoryLabelSchema = z.enum([
  "문화관광축제",
  "문화예술축제",
  "지역특산물축제",
  "전통역사축제",
  "생태자연축제",
  "기타축제",
  "축제",
]);

export const FestivalDiscoveryItemSchema = z.object({
  id: z.string().uuid(),
  externalId: z.string().min(1),
  title: z.string().min(1),
  status: FestivalStatusSchema,
  eventStartDate: z.iso.date(),
  eventEndDate: z.iso.date(),
  address: z.string().min(1).nullable(),
  categoryLabel: FestivalCategoryLabelSchema,
  primaryImageUrl: ProviderImageUrlSchema.nullable(),
});

export const FestivalDiscoveryRankingItemSchema =
  FestivalDiscoveryItemSchema.extend({
    rank: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  });

export const FestivalDiscoveryResponseSchema = z.object({
  asOfDate: z.iso.date(),
  region: FestivalBrowseRegionSchema,
  ranking: z.array(FestivalDiscoveryRankingItemSchema).max(3),
  items: z.array(FestivalDiscoveryItemSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(40),
  totalCount: z.number().int().nonnegative(),
});

export const FestivalDetailImageSchema = z.object({
  url: ProviderImageUrlSchema,
  alt: z.string().min(1),
});

export const FestivalDetailResponseSchema = z.object({
  id: z.string().uuid(),
  externalId: z.string().min(1),
  title: z.string().min(1),
  status: FestivalDetailStatusSchema,
  eventStartDate: z.iso.date(),
  eventEndDate: z.iso.date(),
  address: z.string().min(1).nullable(),
  categoryLabel: FestivalCategoryLabelSchema,
  telephone: z.string().min(1).nullable(),
  longitude: z.number().nullable(),
  latitude: z.number().nullable(),
  primaryImageUrl: ProviderImageUrlSchema.nullable(),
  homepage: z.url().nullable(),
  overview: z.string().min(1).nullable(),
  eventPlace: z.string().min(1).nullable(),
  eventTime: z.string().min(1).nullable(),
  feeInfo: z.string().min(1).nullable(),
  program: z.string().min(1).nullable(),
  organizer: z.string().min(1).nullable(),
  organizerTel: z.string().min(1).nullable(),
  hostAgency: z.string().min(1).nullable(),
  hostAgencyTel: z.string().min(1).nullable(),
  images: z.array(FestivalDetailImageSchema),
});

export type FestivalBrowseRegion = z.infer<typeof FestivalBrowseRegionSchema>;
export type FestivalDiscoveryQuery = z.infer<
  typeof FestivalDiscoveryQuerySchema
>;
export type FestivalStatus = z.infer<typeof FestivalStatusSchema>;
export type FestivalDetailStatus = z.infer<typeof FestivalDetailStatusSchema>;
export type FestivalDetailImage = z.infer<typeof FestivalDetailImageSchema>;
export type FestivalDetailResponse = z.infer<
  typeof FestivalDetailResponseSchema
>;
export type FestivalCategoryLabel = z.infer<
  typeof FestivalCategoryLabelSchema
>;
export type FestivalDiscoveryItem = z.infer<
  typeof FestivalDiscoveryItemSchema
>;
export type FestivalDiscoveryRankingItem = z.infer<
  typeof FestivalDiscoveryRankingItemSchema
>;
export type FestivalDiscoveryResponse = z.infer<
  typeof FestivalDiscoveryResponseSchema
>;
