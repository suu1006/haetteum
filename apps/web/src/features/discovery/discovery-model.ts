import type { ThemeTravelData } from "@/features/themes/theme-travel-model";

export const discoveryTabIds = [
  "recommended",
  "places",
  "festivals",
  "ai-course",
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
export const festivalFilterKeys = [
  "ongoing",
  "thisWeek",
  "free",
  "family",
] as const;

export type DiscoveryTabId = (typeof discoveryTabIds)[number];
export type RegionId = (typeof regionIds)[number];
export type FestivalBrowseRegionId = "all" | RegionId;
export type FestivalFilterKey = (typeof festivalFilterKeys)[number];
export type FestivalFilters = Record<FestivalFilterKey, boolean>;
export type FestivalStatus = "ongoing" | "upcoming";
export type FestivalAudience = "family" | "friends" | "couple";
export type SearchParamValue = string | string[] | undefined;
export type DiscoverySearchParams = Record<string, SearchParamValue>;

export type DiscoveryQuery = {
  q: string;
  region: FestivalBrowseRegionId;
  tab: DiscoveryTabId;
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
  festivalFilters: defaultFestivalFilters,
};

export type DiscoveryImage = { src: string; alt: string };
export type PopularVideoMedia = {
  src: string;
  posterSrc: string;
  durationSeconds: number;
  hasAudio: boolean;
};
export type PopularVideoItem = {
  id: string;
  title: string;
  region: RegionId;
  location: string;
  address: string;
  description: string;
  creatorLabel: string;
  soundLabel: string;
  badgeLabel: string;
  durationLabel: string;
  viewCountLabel: string;
  likeCountLabel: string;
  commentCountLabel: string;
  shareCountLabel: string;
  image: DiscoveryImage;
  video: PopularVideoMedia;
};
export type TravelThemeItem = {
  id: string;
  label: string;
  image: DiscoveryImage;
};
export type VideoCourseItem = {
  id: string;
  title: string;
  summary: string;
  region: RegionId;
  location: string;
  durationLabel: string;
  image: DiscoveryImage;
};
export type PopularPlacesData = {
  videos: readonly PopularVideoItem[];
  themes: readonly TravelThemeItem[];
  courses: readonly VideoCourseItem[];
};
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
  rank: 1 | 2 | 3;
  title: string;
  location: string;
  popularityLabel: string;
  savedCountLabel: string;
  reviewCountLabel?: string;
  image: DiscoveryImage;
};
export type FestivalDiscoveryListItem = {
  id: string;
  title: string;
  description: string;
  dateLabel: string;
  endDate: string;
  location: string;
  savedCountLabel: string;
  tags: readonly string[];
  image: DiscoveryImage;
};
export type FestivalDiscoveryData = {
  regions: ReadonlyArray<{
    id: FestivalBrowseRegionId;
    label: string;
  }>;
  ranking: readonly FestivalDiscoveryRankingItem[];
  festivals: readonly FestivalDiscoveryListItem[];
};
export type MainDiscoveryData = {
  aiCourse: DiscoveryImage;
  themeTravel: ThemeTravelData;
  festivalFeature: FestivalFeature;
  festivalDiscovery: FestivalDiscoveryData;
  regions: ReadonlyArray<{ id: RegionId; label: string }>;
  places: readonly PlaceRankingItem[];
  festivals: readonly FestivalItem[];
  popularPlaces: PopularPlacesData;
};
export type DiscoveryView = {
  places: readonly PlaceRankingItem[];
  festivals: readonly FestivalItem[];
  popularVideos: readonly PopularVideoItem[];
  travelThemes: readonly TravelThemeItem[];
  videoCourses: readonly VideoCourseItem[];
  showRankedPlaces: boolean;
  showPopularPlaces: boolean;
  showAiCourse: boolean;
  showThemeTravel: boolean;
  showFestivals: boolean;
  showFestivalDiscovery: boolean;
};

function firstValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseDiscoveryQuery(
  searchParams: DiscoverySearchParams,
): DiscoveryQuery {
  const tab = firstValue(searchParams.tab);
  const region = firstValue(searchParams.region);
  // 테마 여행은 데이터 연동 전까지 직접 URL 접근도 추천 탭으로 처리한다.
  const parsedTab =
    tab !== "ai-course" && discoveryTabIds.includes(tab as DiscoveryTabId)
    ? (tab as DiscoveryTabId)
    : defaultDiscoveryQuery.tab;
  const parsedRegion =
    parsedTab === "festivals" && region === "all"
      ? "all"
      : regionIds.includes(region as RegionId)
        ? (region as RegionId)
        : defaultDiscoveryQuery.region;

  return {
    q: (firstValue(searchParams.q) ?? "").trim(),
    region: parsedRegion,
    tab: parsedTab,
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
  const festivalFilters = query.festivalFilters ?? defaultFestivalFilters;
  const places = data.places.filter(
    (place) =>
      place.region === query.region &&
      (!normalizedQuery ||
        matchesQuery([place.title, place.location], normalizedQuery)),
  );
  const festivals = data.festivals.filter(
    (festival) =>
      festival.region === query.region &&
      (!normalizedQuery ||
        matchesQuery([festival.title, festival.location], normalizedQuery)) &&
      (!festivalFilters.ongoing || festival.status === "ongoing") &&
      (!festivalFilters.thisWeek || festival.isThisWeek) &&
      (!festivalFilters.free || festival.isFree) &&
      (!festivalFilters.family ||
        festival.audiences.includes("family")),
  );
  const popularVideos = data.popularPlaces.videos.filter(
    (video) =>
      video.region === query.region &&
      (!normalizedQuery ||
        matchesQuery([video.title, video.location], normalizedQuery)),
  );
  const videoCourses = data.popularPlaces.courses.filter(
    (course) =>
      course.region === query.region &&
      (!normalizedQuery ||
        matchesQuery(
          [course.title, course.summary, course.location],
          normalizedQuery,
        )),
  );

  return {
    places,
    festivals,
    popularVideos,
    travelThemes: data.popularPlaces.themes,
    videoCourses,
    showRankedPlaces: query.tab === "recommended",
    showPopularPlaces: query.tab === "places",
    showAiCourse: query.tab === "recommended",
    // TODO: 테마 여행 데이터 연동 후 query.tab 조건을 다시 활성화한다.
    showThemeTravel: false,
    showFestivals: query.tab === "recommended",
    showFestivalDiscovery: query.tab === "festivals",
  };
}
