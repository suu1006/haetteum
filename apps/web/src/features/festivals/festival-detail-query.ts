import { queryOptions } from "@tanstack/react-query";

import { loadFestivalDetail } from "@/features/festivals/festival-detail-api";

/**
 * 상세 응답의 소개글·행사 정보·사진은 요청마다 TourAPI를 실시간으로 호출해 만든다.
 * 축제 정보가 분 단위로 바뀌지는 않으므로 5분은 캐시에서 그대로 돌려준다.
 */
const FESTIVAL_DETAIL_STALE_TIME_MS = 5 * 60_000;
const FESTIVAL_DETAIL_GC_TIME_MS = 30 * 60_000;

export function festivalDetailQueryKey(festivalId: string) {
  return ["festivals", "detail", festivalId] as const;
}

export function festivalDetailQueryOptions(festivalId: string) {
  return queryOptions({
    queryKey: festivalDetailQueryKey(festivalId),
    queryFn: () => loadFestivalDetail(festivalId),
    staleTime: FESTIVAL_DETAIL_STALE_TIME_MS,
    gcTime: FESTIVAL_DETAIL_GC_TIME_MS,
  });
}
