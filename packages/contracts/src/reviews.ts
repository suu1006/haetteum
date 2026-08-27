import { z } from "zod";

const RatingSchema = z.number().int().min(1).max(5);
const ReviewContentSchema = z.string().trim().min(1).max(500);

export const ReviewIdParamsSchema = z.object({
  reviewId: z.string().uuid(),
});

export const CreateReviewRequestSchema = z
  .object({
    placeId: z.string().uuid(),
    rating: RatingSchema,
    content: ReviewContentSchema,
  })
  .strict();

export const UpdateReviewRequestSchema = z
  .object({
    rating: RatingSchema,
    content: ReviewContentSchema,
  })
  .strict();

export const ReviewItemSchema = z.object({
  id: z.string().uuid(),
  placeId: z.string().uuid(),
  placeTitle: z.string().min(1),
  location: z.string().min(1),
  rating: RatingSchema,
  content: ReviewContentSchema,
  primaryImageUrl: z.string().url().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const MyReviewsResponseSchema = z.object({
  items: z.array(ReviewItemSchema),
});

export type ReviewIdParams = z.infer<typeof ReviewIdParamsSchema>;
export type CreateReviewRequest = z.infer<typeof CreateReviewRequestSchema>;
export type UpdateReviewRequest = z.infer<typeof UpdateReviewRequestSchema>;
export type ReviewItem = z.infer<typeof ReviewItemSchema>;
export type MyReviewsResponse = z.infer<typeof MyReviewsResponseSchema>;
