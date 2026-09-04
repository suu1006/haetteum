import { z } from "zod";

const RatingSchema = z.number().int().min(1).max(5);
const ReviewTitleSchema = z.string().trim().min(1).max(30);
/// 기존에 작성된 후기(10자 미만 포함)를 조회 시 깨뜨리지 않기 위해 출력 스키마는 완화된 하한을 쓴다.
const ReviewContentSchema = z.string().trim().min(1).max(500);
const ReviewContentInputSchema = z.string().trim().min(10).max(500);
const ReviewImagesSchema = z.array(z.string().url()).max(5);

export const ReviewIdParamsSchema = z.object({
  reviewId: z.string().uuid(),
});

export const CreateReviewRequestSchema = z
  .object({
    placeId: z.string().uuid(),
    rating: RatingSchema,
    title: ReviewTitleSchema,
    content: ReviewContentInputSchema,
    images: ReviewImagesSchema.default([]),
  })
  .strict();

export const UpdateReviewRequestSchema = z
  .object({
    rating: RatingSchema,
    title: ReviewTitleSchema,
    content: ReviewContentInputSchema,
    images: ReviewImagesSchema.default([]),
  })
  .strict();

export const ReviewItemSchema = z.object({
  id: z.string().uuid(),
  placeId: z.string().uuid(),
  placeTitle: z.string().min(1),
  location: z.string().min(1),
  rating: RatingSchema,
  title: ReviewTitleSchema,
  content: ReviewContentSchema,
  images: ReviewImagesSchema,
  primaryImageUrl: z.string().url().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const MyReviewsResponseSchema = z.object({
  items: z.array(ReviewItemSchema),
});

export const PlaceReviewAuthorSchema = z.object({
  displayName: z.string().min(1),
  profileImageUrl: z.string().url().nullable(),
});

export const PlaceReviewItemSchema = z.object({
  id: z.string().uuid(),
  rating: RatingSchema,
  content: ReviewContentSchema,
  author: PlaceReviewAuthorSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const PlaceReviewRatingBucketSchema = z.object({
  score: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  count: z.number().int().nonnegative(),
});

export const PlaceReviewsResponseSchema = z.object({
  placeId: z.string().uuid(),
  reviewCount: z.number().int().nonnegative(),
  /// 후기가 없으면 null
  averageRating: z.number().min(1).max(5).nullable(),
  /// 5점부터 1점까지 내림차순 5개 구간
  ratingDistribution: z.array(PlaceReviewRatingBucketSchema).length(5),
  items: z.array(PlaceReviewItemSchema),
});

export type ReviewIdParams = z.infer<typeof ReviewIdParamsSchema>;
export type CreateReviewRequest = z.infer<typeof CreateReviewRequestSchema>;
export type UpdateReviewRequest = z.infer<typeof UpdateReviewRequestSchema>;
export type ReviewItem = z.infer<typeof ReviewItemSchema>;
export type MyReviewsResponse = z.infer<typeof MyReviewsResponseSchema>;
export type PlaceReviewAuthor = z.infer<typeof PlaceReviewAuthorSchema>;
export type PlaceReviewItem = z.infer<typeof PlaceReviewItemSchema>;
export type PlaceReviewRatingBucket = z.infer<
  typeof PlaceReviewRatingBucketSchema
>;
export type PlaceReviewsResponse = z.infer<typeof PlaceReviewsResponseSchema>;
