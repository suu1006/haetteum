import { queryOptions } from "@tanstack/react-query";

import { loadHotPlaceRankings } from "@/features/discovery/hot-place-ranking-api";
import { loadPlaceRankings } from "@/features/discovery/place-ranking-api";

// 홈 탭 밖(내 일정/마이페이지)에서 랜덤 코스 추천 후보를 뽑을 때 쓰는 랭킹 조회.
// 홈과 동일하게 전체 연령대("all") 랭킹을 anchor 후보로 사용한다.
const RANDOM_COURSE_RANKING_STALE_TIME_MS = 60_000;

export function placeRankingsQueryOptions() {
  return queryOptions({
    queryKey: ["place-rankings", "all"] as const,
    queryFn: () => loadPlaceRankings("all"),
    staleTime: RANDOM_COURSE_RANKING_STALE_TIME_MS,
  });
}

export function hotPlaceRankingsQueryOptions() {
  return queryOptions({
    queryKey: ["hot-place-rankings", "all"] as const,
    queryFn: () => loadHotPlaceRankings("all"),
    staleTime: RANDOM_COURSE_RANKING_STALE_TIME_MS,
  });
}
