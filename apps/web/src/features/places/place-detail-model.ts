import type {
  DiscoveryImage,
  PlaceRankingItem,
  SearchParamValue,
} from "@/features/discovery/discovery-model";

export const placeDetailTabIds = [
  "introduction",
  "course",
  "reviews",
  "information",
] as const;
export const reviewSourceIds = ["all", "kakao", "google", "naver"] as const;

export type PlaceDetailTabId = (typeof placeDetailTabIds)[number];
export type ReviewSourceId = (typeof reviewSourceIds)[number];
export type ReviewProviderId = Exclude<ReviewSourceId, "all">;
export type PlaceDetailSearchParams = Record<string, SearchParamValue>;
export type PlaceDetailQuery = {
  tab: PlaceDetailTabId;
  source: ReviewSourceId;
};
export type PlaceReview = {
  id: string;
  provider: ReviewProviderId;
  author: string;
  rating: number;
  content: string;
  date: string;
  likeCount: number;
  avatar?: DiscoveryImage;
  images: readonly DiscoveryImage[];
};
export type PlaceReviewDetail = {
  placeId: string;
  ratingDistribution: readonly {
    score: 1 | 2 | 3 | 4 | 5;
    count: number;
  }[];
  reviews: readonly PlaceReview[];
};
export type PlaceFacilityIconId =
  | "spa"
  | "water-park"
  | "sauna"
  | "restaurant"
  | "attraction"
  | "nature";
export type PlaceIntroductionDetail = {
  placeId: string;
  introduction: {
    addressLabel: string;
    description: string;
    heroImages: readonly DiscoveryImage[];
    facilities: readonly {
      id: string;
      icon: PlaceFacilityIconId;
      label: string;
    }[];
    recommendationPoints: readonly string[];
    facilityPreviews?: readonly {
      label: string;
      image: DiscoveryImage;
    }[];
    operatingHours?: readonly {
      id: string;
      icon: PlaceFacilityIconId;
      label: string;
      value: string;
    }[];
    prices?: readonly {
      label: string;
      value: string;
    }[];
    priceNotice?: string;
  };
};
export type PlaceTransportationIconId = "car" | "bus" | "train";
export type PlaceNearbyItem = {
  id: string;
  title: string;
  travelTimeLabel: string;
  categoryLabel: string;
  image: DiscoveryImage;
  href?: string;
};
export type PlaceInformationDetail = {
  placeId: string;
  information: {
    addressLabel: string;
    contactLabel?: string;
    homepageUrl?: string;
    facilitySummary?: string;
    parkingLabel?: string;
    transportation: readonly {
      id: string;
      icon: PlaceTransportationIconId;
      label: string;
      description: string;
    }[];
    usageGuides: readonly string[];
    nearbyAttractions?: readonly PlaceNearbyItem[];
    nearbyRestaurants?: readonly PlaceNearbyItem[];
  };
};
export type PlaceCourseStop = {
  id: string;
  sequence: number;
  periodLabel?: string;
  timeLabel?: string;
  title: string;
  categoryLabel: string;
  image: DiscoveryImage;
  distanceLabel: string;
  travelTimeLabel: string;
};
export type PlaceCourseDay = {
  id: string;
  label: string;
  title: string;
  totalDurationLabel: string;
  totalDistanceLabel: string;
  mapImage: DiscoveryImage;
  stops: readonly PlaceCourseStop[];
};
export type PlaceCourseDetail = {
  placeId: string;
  course: {
    optimizationLabel: string;
    daySlotCount: number;
    days: readonly PlaceCourseDay[];
  };
};
export type ResolvedPlaceDetail = PlaceRankingItem &
  PlaceReviewDetail &
  PlaceIntroductionDetail &
  PlaceInformationDetail &
  Partial<Pick<PlaceCourseDetail, "course">>;

export const defaultPlaceDetailQuery: PlaceDetailQuery = {
  tab: "reviews",
  source: "all",
};

function firstValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePlaceDetailQuery(
  searchParams: PlaceDetailSearchParams,
): PlaceDetailQuery {
  const tab = firstValue(searchParams.tab);
  const source = firstValue(searchParams.source);

  return {
    tab: placeDetailTabIds.includes(tab as PlaceDetailTabId)
      ? (tab as PlaceDetailTabId)
      : defaultPlaceDetailQuery.tab,
    source: reviewSourceIds.includes(source as ReviewSourceId)
      ? (source as ReviewSourceId)
      : defaultPlaceDetailQuery.source,
  };
}

export function buildPlaceDetailHref(
  placeId: string,
  query?: PlaceDetailQuery,
) {
  const pathname = `/places/${encodeURIComponent(placeId)}`;

  if (!query || (query.tab === "reviews" && query.source === "all")) {
    return pathname;
  }

  const params = new URLSearchParams({ tab: query.tab });
  if (query.tab === "reviews" && query.source !== "all") {
    params.set("source", query.source);
  }

  return `${pathname}?${params.toString()}`;
}

export function selectPlaceReviews(
  reviews: readonly PlaceReview[],
  source: ReviewSourceId,
) {
  return source === "all"
    ? reviews
    : reviews.filter((review) => review.provider === source);
}
