import { z } from "zod";

export const PlaceCourseStopSchema = z.object({
  /// 코스 내 방문 순서(1부터 시작)
  sequence: z.number().int().positive(),
  /// 내부 관광지와 연결되면 그 식별자이며 아니면 null
  placeId: z.string().uuid().nullable(),
  title: z.string().min(1),
  overview: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
});

export const PlaceCourseItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  overview: z.string().nullable(),
  /// TourAPI가 제공하는 총 소요시간 안내 문구
  takeTime: z.string().nullable(),
  /// TourAPI가 제공하는 총 이동거리 안내 문구
  distance: z.string().nullable(),
  /// TourAPI 코스 일정 구분
  schedule: z.string().nullable(),
  /// TourAPI 코스 테마
  theme: z.string().nullable(),
  imageUrl: z.string().url().nullable(),
  stops: z.array(PlaceCourseStopSchema),
});

export const PlaceCoursesResponseSchema = z.object({
  placeId: z.string().uuid(),
  source: z.literal("TOUR_API"),
  items: z.array(PlaceCourseItemSchema),
});

export type PlaceCourseStop = z.infer<typeof PlaceCourseStopSchema>;
export type PlaceCourseItem = z.infer<typeof PlaceCourseItemSchema>;
export type PlaceCoursesResponse = z.infer<typeof PlaceCoursesResponseSchema>;
