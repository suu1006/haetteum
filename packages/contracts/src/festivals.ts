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
  primaryImageUrl: z
    .url()
    .refine((value) => {
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        url.hostname === "tong.visitkorea.or.kr"
      );
    })
    .nullable(),
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

export type FestivalBrowseRegion = z.infer<typeof FestivalBrowseRegionSchema>;
export type FestivalDiscoveryQuery = z.infer<
  typeof FestivalDiscoveryQuerySchema
>;
export type FestivalStatus = z.infer<typeof FestivalStatusSchema>;
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
