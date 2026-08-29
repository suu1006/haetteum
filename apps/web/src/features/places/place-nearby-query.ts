import { queryOptions } from "@tanstack/react-query";

import type { NearbyPlaceCategory } from "@haetteum/contracts";

import { loadNearbyPlaces } from "@/features/places/place-detail-api";

/**
 * 관광지 좌표는 자주 바뀌지 않으므로 카카오 주변 검색 결과를 길게 캐시한다.
 * 같은 관광지를 재방문하거나 탭을 오갈 때 브라우저 캐시에서 바로 돌려준다.
 */
const NEARBY_PLACES_STALE_TIME_MS = 10 * 60_000;
const NEARBY_PLACES_GC_TIME_MS = 30 * 60_000;

export function placeNearbyQueryKey(
  placeId: string,
  category: NearbyPlaceCategory,
) {
  return ["places", "nearby", placeId, category] as const;
}

export function placeNearbyQueryOptions(
  placeId: string,
  category: NearbyPlaceCategory,
) {
  return queryOptions({
    queryKey: placeNearbyQueryKey(placeId, category),
    queryFn: () => loadNearbyPlaces(placeId, category),
    staleTime: NEARBY_PLACES_STALE_TIME_MS,
    gcTime: NEARBY_PLACES_GC_TIME_MS,
  });
}
