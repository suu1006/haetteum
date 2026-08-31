import type { HotPlaceRankingItem, PlaceRankingItem } from "@haetteum/contracts";

import type { HotPlaceRankingLoadState } from "@/features/discovery/hot-place-ranking-api";
import type { PlaceRankingLoadState } from "@/features/discovery/place-ranking-api";

export type RandomCourseCandidate = { placeId: string; title: string };

function toCandidate(
  item: PlaceRankingItem | HotPlaceRankingItem,
): RandomCourseCandidate | null {
  return item.placeId == null
    ? null
    : { placeId: item.placeId, title: item.title };
}

// 코스 생성 API가 placeId 하나를 anchor로 받으므로, 홈에 이미 떠 있는
// 인기관광지·핫플레이스 랭킹에서 좌표가 연결된(placeId != null) 항목만 후보로 쓴다.
function collectRandomCourseCandidates(
  ranking: PlaceRankingLoadState | null | undefined,
  hotRanking: HotPlaceRankingLoadState | null | undefined,
): RandomCourseCandidate[] {
  const items = [
    ...(ranking?.status === "ready" ? ranking.data.items : []),
    ...(hotRanking?.status === "ready" ? hotRanking.data.items : []),
  ];
  const seen = new Set<string>();
  const candidates: RandomCourseCandidate[] = [];
  for (const item of items) {
    const candidate = toCandidate(item);
    if (candidate == null || seen.has(candidate.placeId)) continue;
    seen.add(candidate.placeId);
    candidates.push(candidate);
  }
  return candidates;
}

function pickRandomCandidate(
  candidates: readonly RandomCourseCandidate[],
  exclude: ReadonlySet<string>,
): RandomCourseCandidate | null {
  const pool = candidates.filter(
    (candidate) => !exclude.has(candidate.placeId),
  );
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export { collectRandomCourseCandidates, pickRandomCandidate };
