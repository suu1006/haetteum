import { queryOptions } from "@tanstack/react-query";

import { loadPlaceCourses } from "@/features/places/place-detail-api";

/// 한국관광공사 여행코스는 자주 갱신되지 않으므로 넉넉히 캐시한다.
const PLACE_COURSES_STALE_TIME_MS = 10 * 60_000;
const PLACE_COURSES_GC_TIME_MS = 30 * 60_000;

export function placeCoursesQueryKey(placeId: string) {
  return ["places", "courses", placeId] as const;
}

export function placeCoursesQueryOptions(placeId: string) {
  return queryOptions({
    queryKey: placeCoursesQueryKey(placeId),
    queryFn: () => loadPlaceCourses(placeId),
    staleTime: PLACE_COURSES_STALE_TIME_MS,
    gcTime: PLACE_COURSES_GC_TIME_MS,
  });
}
