import type {
  PlaceRankingAudience,
  PlaceRegion,
  PopularReelRegion,
} from "@haetteum/contracts";

export const discoveryTabIds = [
  "recommended",
  "places",
  "festivals",
] as const;
export const regionIds = [
  "seoul",
  "gyeonggi",
  "gangwon",
  "busan",
  "jeju",
  "gyeongju",
  "jeonju",
] as const;
const placeSearchRegionIds = [
  "seoul",
  "gyeonggi",
  "gangwon",
  "busan",
  "jeju",
] as const satisfies readonly PlaceRegion[];
export const festivalBrowseRegionIds = [
  "all",
  "jeju",
  "seoul",
  "busan",
  "gangwon",
  "gyeongju",
  "jeonju",
] as const;
export const festivalFilterKeys = [
  "ongoing",
  "thisWeek",
  "free",
  "family",
] as const;
export const placeRankingAudienceIds = [
  "all",
  "20s",
  "30s",
  "40s",
  "50s",
  "60s-plus",
] as const satisfies readonly PlaceRankingAudience[];
export const popularReelRegionIds = [
  "all",
  "seoul",
  "gyeonggi",
  "gangwon",
  "busan",
  "jeju",
] as const satisfies readonly PopularReelRegion[];

export type DiscoveryTabId = (typeof discoveryTabIds)[number];
export type RegionId = (typeof regionIds)[number];
type ApprovedFestivalBrowseRegionId = (typeof festivalBrowseRegionIds)[number];
export type FestivalBrowseRegionId = "all" | RegionId;
export type FestivalFilterKey = (typeof festivalFilterKeys)[number];
export type FestivalFilters = Record<FestivalFilterKey, boolean>;
export type DiscoveryAudience = PlaceRankingAudience;
export type FestivalStatus = "ongoing" | "upcoming";
export type FestivalAudience = "family" | "friends" | "couple";
export type SearchParamValue = string | string[] | undefined;
export type DiscoverySearchParams = Record<string, SearchParamValue>;

export type DiscoveryQuery = {
  q: string;
  region: FestivalBrowseRegionId;
  tab: DiscoveryTabId;
  audience: DiscoveryAudience;
  hotAudience: DiscoveryAudience;
  reelRegion: PopularReelRegion;
  festivalFilters: FestivalFilters;
};

export const defaultFestivalFilters: FestivalFilters = {
  ongoing: false,
  thisWeek: false,
  free: false,
  family: false,
};

export const defaultDiscoveryQuery: DiscoveryQuery = {
  q: "",
  region: "gyeonggi",
  tab: "recommended",
  audience: "all",
  hotAudience: "all",
  reelRegion: "all",
  festivalFilters: defaultFestivalFilters,
};

export type DiscoveryImage = { src: string; alt: string };
export type PlaceRankingItem = {
  id: string;
  rank: 1 | 2 | 3;
  title: string;
  region: RegionId;
  location: string;
  rating: number;
  reviewCount: number;
  image: DiscoveryImage;
};
export type FestivalItem = {
  id: string;
  rank: number;
  title: string;
  dateLabel: string;
  region: RegionId;
  location: string;
  status: FestivalStatus;
  isThisWeek: boolean;
  isFree: boolean;
  audiences: readonly FestivalAudience[];
  tags: readonly string[];
  image: DiscoveryImage;
};
export type FestivalFeature = {
  eyebrow: string;
  title: string;
  description: string;
  dateLabel: string;
  tags: readonly string[];
  image: DiscoveryImage;
};
export type FestivalDiscoveryRankingItem = {
  id: string;
  rank: 1 | 2 | 3 | 4 | 5;
  title: string;
  status: FestivalStatus;
  statusLabel: "진행 중" | "곧 시작";
  dateLabel: string;
  location: string;
  categoryLabel: string;
  image: { src: string | null; alt: string };
};
export type FestivalDiscoveryListItem = {
  id: string;
  title: string;
  status: FestivalStatus;
  statusLabel: "진행 중" | "곧 시작";
  dateLabel: string;
  location: string;
  categoryLabel: string;
  image: { src: string | null; alt: string };
};
export type FestivalDiscoveryData = {
  regions: ReadonlyArray<{
    id: FestivalBrowseRegionId;
    label: string;
  }>;
  ranking: readonly FestivalDiscoveryRankingItem[];
  festivals: readonly FestivalDiscoveryListItem[];
  loadState: "ready" | "error";
};
export type MainDiscoveryData = {
  aiCourse: DiscoveryImage;
  festivalFeature: FestivalFeature;
  festivalDiscovery: FestivalDiscoveryData;
  regions: ReadonlyArray<{ id: RegionId; label: string }>;
  places: readonly PlaceRankingItem[];
};
export type DiscoveryView = {
  places: readonly PlaceRankingItem[];
  showRankedPlaces: boolean;
  showAiCourse: boolean;
  showFestivals: boolean;
  showFestivalDiscovery: boolean;
  showSearchResults: boolean;
};

/** 탐색탭 검색이 넘긴 지역이 `/places` 검색 API가 지원하는 5개 지역인지 확인한다. */
export function isPlaceSearchRegion(
  region: string,
): region is PlaceRegion {
  return (placeSearchRegionIds as readonly string[]).includes(region);
}

function firstValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseDiscoveryQuery(
  searchParams: DiscoverySearchParams,
): DiscoveryQuery {
  const tab = firstValue(searchParams.tab);
  const region = firstValue(searchParams.region);
  const audience = firstValue(searchParams.audience);
  const hotAudience = firstValue(searchParams.hotAudience);
  const reelRegion = firstValue(searchParams.reelRegion);
  const parsedTab =
    discoveryTabIds.includes(tab as DiscoveryTabId)
    ? (tab as DiscoveryTabId)
    : defaultDiscoveryQuery.tab;
  const parsedRegion =
    parsedTab === "festivals"
      ? (festivalBrowseRegionIds as readonly string[]).includes(region ?? "")
        ? (region as ApprovedFestivalBrowseRegionId)
        : "all"
      : regionIds.includes(region as RegionId)
        ? (region as RegionId)
        : defaultDiscoveryQuery.region;

  return {
    q: (firstValue(searchParams.q) ?? "").trim(),
    region: parsedRegion,
    tab: parsedTab,
    audience: placeRankingAudienceIds.includes(
      audience as DiscoveryAudience,
    )
      ? (audience as DiscoveryAudience)
      : defaultDiscoveryQuery.audience,
    hotAudience: placeRankingAudienceIds.includes(
      hotAudience as DiscoveryAudience,
    )
      ? (hotAudience as DiscoveryAudience)
      : defaultDiscoveryQuery.hotAudience,
    reelRegion: popularReelRegionIds.includes(
      reelRegion as PopularReelRegion,
    )
      ? (reelRegion as PopularReelRegion)
      : defaultDiscoveryQuery.reelRegion,
    festivalFilters: {
      ongoing: firstValue(searchParams.festivalStatus) === "ongoing",
      thisWeek: firstValue(searchParams.festivalPeriod) === "week",
      free: firstValue(searchParams.festivalPrice) === "free",
      family: firstValue(searchParams.festivalAudience) === "family",
    },
  };
}

export function buildDiscoveryHref(
  current: DiscoveryQuery,
  changes: Partial<DiscoveryQuery>,
  fragment?: "places" | "ai-course" | "festivals",
) {
  const next = { ...current, ...changes };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  params.set("region", next.region);
  params.set("tab", next.tab);
  if (next.audience !== defaultDiscoveryQuery.audience) {
    params.set("audience", next.audience);
  }
  if (next.hotAudience && next.hotAudience !== defaultDiscoveryQuery.hotAudience) {
    params.set("hotAudience", next.hotAudience);
  }
  if (next.reelRegion !== defaultDiscoveryQuery.reelRegion) {
    params.set("reelRegion", next.reelRegion);
  }
  if (next.festivalFilters.ongoing) {
    params.set("festivalStatus", "ongoing");
  }
  if (next.festivalFilters.thisWeek) {
    params.set("festivalPeriod", "week");
  }
  if (next.festivalFilters.free) {
    params.set("festivalPrice", "free");
  }
  if (next.festivalFilters.family) {
    params.set("festivalAudience", "family");
  }
  return `/?${params.toString()}${fragment ? `#${fragment}` : ""}`;
}

/** 탐색탭(/explore)에서는 홈과 무관한 region/tab을 URL에 싣지 않고 릴스 지역·세대 필터만 보존한다. */
export function buildExploreHref(
  current: DiscoveryQuery,
  changes: Partial<
    Pick<DiscoveryQuery, "reelRegion" | "audience" | "hotAudience">
  >,
) {
  const next = { ...current, ...changes };
  const params = new URLSearchParams();
  if (next.reelRegion !== defaultDiscoveryQuery.reelRegion) {
    params.set("reelRegion", next.reelRegion);
  }
  if (next.audience !== defaultDiscoveryQuery.audience) {
    params.set("audience", next.audience);
  }
  if (next.hotAudience !== defaultDiscoveryQuery.hotAudience) {
    params.set("hotAudience", next.hotAudience);
  }
  const qs = params.toString();
  return `/explore${qs ? `?${qs}` : ""}`;
}

export function buildFestivalFilterHref(
  query: DiscoveryQuery,
  filter: FestivalFilterKey,
) {
  return buildDiscoveryHref(
    query,
    {
      festivalFilters: {
        ...query.festivalFilters,
        [filter]: !query.festivalFilters[filter],
      },
    },
    "festivals",
  );
}

export function buildFestivalResetHref(query: DiscoveryQuery) {
  return buildDiscoveryHref(
    query,
    { festivalFilters: defaultFestivalFilters },
    "festivals",
  );
}

export function buildFestivalRegionHref(
  query: DiscoveryQuery,
  region: FestivalBrowseRegionId,
) {
  return buildDiscoveryHref(query, {
    q: "",
    region,
    tab: "festivals",
    festivalFilters: defaultFestivalFilters,
  });
}

function matchesQuery(values: readonly string[], query: string) {
  return values.some((value) =>
    value.toLocaleLowerCase("ko-KR").includes(query),
  );
}

export function selectDiscoveryView(
  data: MainDiscoveryData,
  query: DiscoveryQuery,
): DiscoveryView {
  const normalizedQuery = query.q.trim().toLocaleLowerCase("ko-KR");
  const places = data.places.filter(
    (place) =>
      place.region === query.region &&
      (!normalizedQuery ||
        matchesQuery([place.title, place.location], normalizedQuery)),
  );
  // 추천 탭에서 검색어가 있으면 랭킹 대신 검색 결과 섹션을 보여준다.
  const isSearchingRecommended =
    query.tab === "recommended" && normalizedQuery !== "";

  return {
    places,
    showRankedPlaces: query.tab === "places",
    showAiCourse: query.tab === "recommended" && !isSearchingRecommended,
    showFestivals: query.tab === "recommended" && !isSearchingRecommended,
    showSearchResults: isSearchingRecommended,
    showFestivalDiscovery: query.tab === "festivals",
  };
}
