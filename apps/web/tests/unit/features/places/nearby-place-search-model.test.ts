import { describe, expect, it } from "vitest";

import {
  filterAndSortNearbyPlaces,
  type NearbyPlaceResult,
} from "@/features/places/nearby-place-search-model";
import { nearbyPlaceSearchMock } from "@/features/places/nearby-place-search.mock";

const places = [
  {
    id: "museum",
    title: "이천 시립박물관",
    category: "attraction",
    categoryLabel: "관광지",
    distanceKm: 3.1,
    travelMode: "car",
    travelMinutes: 8,
    description: "이천의 역사와 문화를 한눈에 볼 수 있는 박물관",
    rating: 4.6,
    reviewCount: 1_234,
    image: { src: "/images/museum.png", alt: "박물관" },
  },
  {
    id: "cafe",
    title: "카페 온천",
    category: "cafe",
    categoryLabel: "카페",
    distanceKm: 1.2,
    travelMode: "car",
    travelMinutes: 4,
    description: "온천을 테마로 한 감성 카페",
    rating: 4.8,
    reviewCount: 642,
    image: { src: "/images/cafe.png", alt: "카페" },
  },
  {
    id: "rice",
    title: "임금님 쌀밥집",
    category: "restaurant",
    categoryLabel: "맛집",
    distanceKm: 0.8,
    travelMode: "car",
    travelMinutes: 3,
    description: "건강한 한정식과 쌀밥이 맛있는 곳",
    rating: 4.8,
    reviewCount: 856,
    image: { src: "/images/rice.png", alt: "한정식" },
  },
] as const satisfies readonly NearbyPlaceResult[];

describe("nearby place search model", () => {
  it("matches a trimmed query against title, description, and category", () => {
    expect(
      filterAndSortNearbyPlaces(places, {
        query: "  온천 ",
        category: "all",
        sort: "recommended",
      }).map(({ id }) => id),
    ).toEqual(["cafe"]);

    expect(
      filterAndSortNearbyPlaces(places, {
        query: "맛집",
        category: "all",
        sort: "recommended",
      }).map(({ id }) => id),
    ).toEqual(["rice"]);
  });

  it("filters categories and sorts without mutating recommendation order", () => {
    const originalIds = places.map(({ id }) => id);

    expect(
      filterAndSortNearbyPlaces(places, {
        query: "",
        category: "cafe",
        sort: "recommended",
      }).map(({ id }) => id),
    ).toEqual(["cafe"]);
    expect(
      filterAndSortNearbyPlaces(places, {
        query: "",
        category: "all",
        sort: "distance",
      }).map(({ id }) => id),
    ).toEqual(["rice", "cafe", "museum"]);
    expect(
      filterAndSortNearbyPlaces(places, {
        query: "",
        category: "all",
        sort: "rating",
      }).map(({ id }) => id),
    ).toEqual(["rice", "cafe", "museum"]);
    expect(places.map(({ id }) => id)).toEqual(originalIds);
  });

  it("provides unique local-image mock results", () => {
    expect(nearbyPlaceSearchMock).toHaveLength(6);
    expect(new Set(nearbyPlaceSearchMock.map(({ id }) => id)).size).toBe(6);

    for (const place of nearbyPlaceSearchMock) {
      expect(place.image.src).toMatch(/^\/images\//);
    }
  });
});
