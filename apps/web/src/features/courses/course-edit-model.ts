import type { DiscoveryImage } from "@/features/discovery/discovery-model";
import type { NearbyPlaceResult } from "@/features/places/nearby-place-search-model";

export type CourseSource = "ai" | "custom";

export type CoursePlaceDetail = {
  rating: number;
  reviewCount: number;
  addressLabel: string;
  hoursLabel: string;
  description: string;
  highlights: readonly string[];
  recommendationReasons: readonly string[];
  reviews: readonly {
    id: string;
    rating: number;
    content: string;
  }[];
};

export type CoursePlace = {
  id: string;
  title: string;
  category: string;
  image: DiscoveryImage;
  detail: CoursePlaceDetail;
};

export type CourseTimeSlot = {
  id: string;
  time: string;
};

export type EditableCourse = {
  source: CourseSource;
  slots: readonly CourseTimeSlot[];
  places: readonly CoursePlace[];
  recommendedOrder: readonly string[];
};

export type CourseEditFixture = {
  id: string;
  title: string;
  courses: Readonly<Record<CourseSource, EditableCourse>>;
};

export function movePlace(
  places: readonly CoursePlace[],
  activeId: string,
  overId: string,
): readonly CoursePlace[] {
  const from = places.findIndex(({ id }) => id === activeId);
  const to = places.findIndex(({ id }) => id === overId);

  if (from < 0 || to < 0 || from === to) return places;

  const next = [...places];
  const [moved] = next.splice(from, 1);
  if (!moved) return places;
  next.splice(to, 0, moved);
  return next;
}

export function toCoursePlace(place: NearbyPlaceResult): CoursePlace {
  const travelModeLabel = place.travelMode === "walk" ? "도보" : "차로";

  return {
    id: place.id,
    title: place.title,
    category: place.categoryLabel,
    image: place.image,
    detail: {
      rating: place.rating,
      reviewCount: place.reviewCount,
      addressLabel: "경기 이천시",
      hoursLabel: "운영시간 확인 필요",
      description: place.description,
      highlights: [
        `${travelModeLabel} ${place.travelMinutes}분`,
        "일정 추가 장소",
        "방문 전 정보 확인",
      ],
      recommendationReasons: [
        `현재 코스에서 ${place.distanceKm}km 거리에 있어 이동하기 편해요.`,
        `방문자 평점 ${place.rating.toFixed(1)}점으로 좋은 평가를 받고 있어요.`,
      ],
      reviews: [
        {
          id: `${place.id}-review-1`,
          rating: place.rating,
          content: `${place.title}의 분위기와 접근성이 좋았어요.`,
        },
        {
          id: `${place.id}-review-2`,
          rating: Math.max(1, place.rating - 0.2),
          content: "일정 중간에 여유롭게 들르기 좋은 장소예요.",
        },
      ],
    },
  };
}

export function appendUniqueCoursePlaces(
  current: readonly CoursePlace[],
  selected: readonly NearbyPlaceResult[],
): readonly CoursePlace[] {
  const seenIds = new Set(current.map(({ id }) => id));
  const additions = selected
    .filter(({ id }) => {
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    })
    .map(toCoursePlace);

  return additions.length > 0 ? [...current, ...additions] : current;
}

export function appendFollowingTimeSlots(
  source: CourseSource,
  slots: readonly CourseTimeSlot[],
  count: number,
  intervalMinutes: number,
): readonly CourseTimeSlot[] {
  const lastSlot = slots.at(-1);
  const match = lastSlot?.time.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  const hoursLabel = match?.[1];
  const minutesLabel = match?.[2];

  if (!hoursLabel || !minutesLabel || count <= 0 || intervalMinutes <= 0) {
    return slots;
  }

  const baseMinutes = Number(hoursLabel) * 60 + Number(minutesLabel);
  const additions: CourseTimeSlot[] = [];

  for (let index = 0; index < count; index += 1) {
    const totalMinutes = baseMinutes + intervalMinutes * (index + 1);
    if (totalMinutes >= 24 * 60) return slots;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    additions.push({
      id: `${source}-slot-${slots.length + index + 1}`,
      time: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    });
  }

  return [...slots, ...additions];
}

export function formatMoveAnnouncement(place: CoursePlace, index: number) {
  return `${place.title}이 ${index + 1}번째 일정으로 이동했습니다.`;
}
