import { queryOptions } from "@tanstack/react-query";

import { loadGeneratedCourse } from "@/features/places/place-detail-api";

/// 카카오 즉석 생성 코스는 nearby()와 같은 이유로 10분 캐시한다.
const GENERATED_COURSE_STALE_TIME_MS = 10 * 60_000;
const GENERATED_COURSE_GC_TIME_MS = 30 * 60_000;

export function generatedCourseQueryKey(placeId: string) {
  return ["places", "generated-course", placeId] as const;
}

export function generatedCourseQueryOptions(placeId: string) {
  return queryOptions({
    queryKey: generatedCourseQueryKey(placeId),
    queryFn: () => loadGeneratedCourse(placeId),
    staleTime: GENERATED_COURSE_STALE_TIME_MS,
    gcTime: GENERATED_COURSE_GC_TIME_MS,
  });
}
