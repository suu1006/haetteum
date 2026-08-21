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
] as const;

export type DiscoveryTabId = (typeof discoveryTabIds)[number];
export type RegionId = (typeof regionIds)[number];
export type SearchParamValue = string | string[] | undefined;
export type DiscoverySearchParams = Record<string, SearchParamValue>;

export type DiscoveryQuery = {
  q: string;
  region: RegionId;
  tab: DiscoveryTabId;
};

export const defaultDiscoveryQuery: DiscoveryQuery = {
  q: "",
  region: "jeju",
  tab: "recommended",
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
  title: string;
  dateLabel: string;
  region: RegionId;
  location: string;
  image: DiscoveryImage;
};
export type MainDiscoveryData = {
  hero: DiscoveryImage;
  aiCourse: DiscoveryImage;
  regions: ReadonlyArray<{ id: RegionId; label: string }>;
  places: readonly PlaceRankingItem[];
  festivals: readonly FestivalItem[];
};
export type DiscoveryView = {
  places: readonly PlaceRankingItem[];
  festivals: readonly FestivalItem[];
  showPlaces: boolean;
  showAiCourse: boolean;
  showFestivals: boolean;
};

function firstValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseDiscoveryQuery(
  searchParams: DiscoverySearchParams,
): DiscoveryQuery {
  const tab = firstValue(searchParams.tab);
  const region = firstValue(searchParams.region);

  return {
    q: (firstValue(searchParams.q) ?? "").trim(),
    region: regionIds.includes(region as RegionId)
      ? (region as RegionId)
      : defaultDiscoveryQuery.region,
    tab: discoveryTabIds.includes(tab as DiscoveryTabId)
      ? (tab as DiscoveryTabId)
      : defaultDiscoveryQuery.tab,
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
  return `/?${params.toString()}${fragment ? `#${fragment}` : ""}`;
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
  const festivals = data.festivals.filter(
    (festival) =>
      festival.region === query.region &&
      (!normalizedQuery ||
        matchesQuery([festival.title, festival.location], normalizedQuery)),
  );

  return {
    places,
    festivals,
    showPlaces: query.tab === "recommended" || query.tab === "places",
    showAiCourse: query.tab === "recommended" || query.tab === "ai-course",
    showFestivals: query.tab === "recommended" || query.tab === "festivals",
  };
}
