import type { DiscoveryImage } from "@/features/discovery/discovery-model";

export type NearbyPlaceCategory =
  | "attraction"
  | "restaurant"
  | "cafe"
  | "accommodation";

export type NearbyPlaceCategoryFilter = "all" | NearbyPlaceCategory;
export type NearbyPlaceTravelMode = "car" | "walk";
export type NearbyPlaceSort = "recommended" | "distance" | "rating";

export type NearbyPlaceResult = {
  id: string;
  title: string;
  category: NearbyPlaceCategory;
  categoryLabel: string;
  distanceKm: number;
  travelMode: NearbyPlaceTravelMode;
  travelMinutes: number;
  description: string;
  rating: number;
  reviewCount: number;
  image: DiscoveryImage;
};

type NearbyPlaceSearchOptions = {
  query: string;
  category: NearbyPlaceCategoryFilter;
  sort: NearbyPlaceSort;
};

export function filterAndSortNearbyPlaces(
  places: readonly NearbyPlaceResult[],
  { query, category, sort }: NearbyPlaceSearchOptions,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  const filtered = places.filter((place) => {
    const text = `${place.title} ${place.description} ${place.categoryLabel}`
      .toLocaleLowerCase("ko-KR");
    return (
      (category === "all" || place.category === category) &&
      (!normalizedQuery || text.includes(normalizedQuery))
    );
  });

  if (sort === "distance") {
    return [...filtered].sort((left, right) =>
      left.distanceKm - right.distanceKm
    );
  }

  if (sort === "rating") {
    return [...filtered].sort(
      (left, right) =>
        right.rating - left.rating || right.reviewCount - left.reviewCount,
    );
  }

  return filtered;
}
