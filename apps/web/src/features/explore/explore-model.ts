import type {
  PlaceRankingResponse,
  PopularReelsResponse,
} from "@haetteum/contracts";

import { resolveOfficialImageSource } from "@/lib/official-image";

export const exploreRegionIds = [
  "seoul",
  "gyeonggi",
  "gangwon",
  "busan",
  "jeju",
] as const;

export type ExploreRegionId = (typeof exploreRegionIds)[number];

export type ExploreImage = {
  src: string;
  alt: string;
};

export type ExploreDestination = {
  id: string;
  title: string;
  location?: string;
  href: string;
  rank?: 1 | 2 | 3;
  image: ExploreImage;
};

export type ExploreData = {
  regions: ReadonlyArray<{ id: ExploreRegionId; label: string }>;
};

export type ExploreSearchParams = {
  region?: string | string[];
};

function placeDetailHref(placeId: string) {
  return `/places/${encodeURIComponent(placeId)}?tab=introduction`;
}

/** 세대별 인기관광지 순위(전국) 상위 항목을 탐색탭 "지금 뜨는 여행지" 카드로 변환한다. */
export function mapTrendingDestinations(
  ranking: PlaceRankingResponse,
  limit = 3,
): ExploreDestination[] {
  return ranking.items.slice(0, limit).map((item) => ({
    id: item.sourcePlaceId,
    title: item.title,
    href: item.placeId
      ? placeDetailHref(item.placeId)
      : `/?q=${encodeURIComponent(item.title)}&tab=places`,
    rank: item.rank as 1 | 2 | 3,
    image: {
      src: resolveOfficialImageSource(item.primaryImageUrl),
      alt: `${item.title} 대표 이미지`,
    },
  }));
}

/** 지역별 인기 릴스가 달린 관광지를 탐색탭 "지역별 추천 여행지" 카드로 변환한다. */
export function mapRegionalDestinations(
  reels: PopularReelsResponse,
  limit = 3,
): ExploreDestination[] {
  const seenPlaceIds = new Set<string>();
  const destinations: ExploreDestination[] = [];

  for (const item of reels.items) {
    if (seenPlaceIds.has(item.placeId)) continue;
    seenPlaceIds.add(item.placeId);

    destinations.push({
      id: item.placeId,
      title: item.placeTitle,
      href: placeDetailHref(item.placeId),
      image: {
        src: item.thumbnailUrl,
        alt: `${item.placeTitle} 영상 썸네일`,
      },
    });

    if (destinations.length >= limit) break;
  }

  return destinations;
}

export function parseExploreRegion(
  value: ExploreSearchParams["region"],
): ExploreRegionId {
  const firstValue = Array.isArray(value) ? value[0] : value;

  return exploreRegionIds.includes(firstValue as ExploreRegionId)
    ? (firstValue as ExploreRegionId)
    : "gyeonggi";
}

export function buildExploreRegionHref(region: ExploreRegionId) {
  return `/explore?region=${region}#regional-destinations`;
}
