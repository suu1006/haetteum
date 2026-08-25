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

export type ExploreCategory = {
  id: string;
  label: string;
  href: string;
  tone: "purple" | "blue" | "green" | "amber";
  image: ExploreImage;
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
  categories: readonly ExploreCategory[];
  trending: readonly ExploreDestination[];
  regions: ReadonlyArray<{ id: ExploreRegionId; label: string }>;
  regionalDestinations: Record<
    ExploreRegionId,
    readonly ExploreDestination[]
  >;
};

export type ExploreSearchParams = {
  region?: string | string[];
};

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
