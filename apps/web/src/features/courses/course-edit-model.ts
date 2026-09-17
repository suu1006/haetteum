import type {
  GeneratedCourseStop,
  PlaceListItem,
  SavedCourseItem,
} from "@haetteum/contracts";

import type { DiscoveryImage } from "@/features/discovery/discovery-model";
import { resolveOfficialImageSource } from "@/lib/official-image";

export type CourseSource = "ai" | "custom";

export type CoursePlaceDetail = {
  rating: number | null;
  reviewCount: number | null;
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
  latitude: number | null;
  longitude: number | null;
  originalStop?: GeneratedCourseStop;
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

export type CourseEditData = {
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

export type RemovePlaceResult = {
  places: readonly CoursePlace[];
  slots: readonly CourseTimeSlot[];
};

export function removePlace(
  places: readonly CoursePlace[],
  slots: readonly CourseTimeSlot[],
  placeId: string,
): RemovePlaceResult {
  if (!places.some(({ id }) => id === placeId)) return { places, slots };

  const nextPlaces = places.filter(({ id }) => id !== placeId);
  return { places: nextPlaces, slots: slots.slice(0, nextPlaces.length) };
}

export function toCoursePlace(place: PlaceListItem): CoursePlace {
  const location = place.district ?? place.address ?? "위치 정보 준비 중";

  return {
    id: place.id,
    title: place.title,
    category: "장소",
    image: {
      src: resolveOfficialImageSource(place.primaryImageUrl),
      alt: place.title,
    },
    latitude: place.latitude,
    longitude: place.longitude,
    detail: {
      rating: null,
      reviewCount: null,
      addressLabel: place.address ?? location,
      hoursLabel: "운영시간 확인 필요",
      description: "상세 정보를 준비 중이에요.",
      highlights: ["일정 추가 장소", "방문 전 정보 확인"],
      recommendationReasons: [`${location}에 위치한 장소예요.`],
      reviews: [],
    },
  };
}

export function toCoursePlaceFromGeneratedStop(
  stop: GeneratedCourseStop,
): CoursePlace {
  const location = stop.address ?? "위치 정보 준비 중";

  return {
    id: stop.placeId ?? `generated-stop-${stop.sequence}`,
    originalStop: stop,
    title: stop.title,
    category: stop.categoryLabel ?? "장소",
    image: {
      src: resolveOfficialImageSource(null),
      alt: stop.title,
    },
    latitude: stop.latitude,
    longitude: stop.longitude,
    detail: {
      rating: null,
      reviewCount: null,
      addressLabel: stop.address ?? location,
      hoursLabel: "운영시간 확인 필요",
      description: "상세 정보를 준비 중이에요.",
      highlights: ["일정 장소", "방문 전 정보 확인"],
      recommendationReasons: [`${location}에 위치한 장소예요.`],
      reviews: [],
    },
  };
}

export function buildCourseDraftFromGeneratedStops(
  source: CourseSource,
  stops: readonly GeneratedCourseStop[],
): { places: readonly CoursePlace[]; slots: readonly CourseTimeSlot[] } {
  const places = [...stops]
    .sort((a, b) => a.sequence - b.sequence)
    .map(toCoursePlaceFromGeneratedStop);

  return {
    places,
    slots: appendUntimedSlots(source, [], places.length),
  };
}

export function mapSavedCourseToEditData(
  item: SavedCourseItem,
): CourseEditData {
  const places = [...item.stops]
    .sort((a, b) => a.sequence - b.sequence)
    .map(toCoursePlaceFromGeneratedStop);

  function buildCourse(source: CourseSource): EditableCourse {
    return {
      source,
      slots: appendUntimedSlots(source, [], places.length),
      places,
      recommendedOrder: places.map(({ id }) => id),
    };
  }

  return {
    id: item.id,
    title: item.title,
    courses: { ai: buildCourse("ai"), custom: buildCourse("custom") },
  };
}

export function appendUniqueCoursePlaces(
  current: readonly CoursePlace[],
  selected: readonly PlaceListItem[],
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

export function formatMoveAnnouncement(place: CoursePlace, index: number) {
  return `${place.title}이 ${index + 1}번째 일정으로 이동했습니다.`;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 편집 화면의 장소 목록(CoursePlace[])을 저장 API가 받는 GeneratedCourseStop[]로 변환한다.
 * 저장된 경유지의 출처 필드는 유지하고 새 장소에만 기본 역할을 부여한다.
 * 좌표가 없는 장소는 저장 요청 스키마를 만족할 수 없어 제외한다.
 */
export function buildStopsFromDraft(
  places: readonly CoursePlace[],
): GeneratedCourseStop[] {
  const eligible = places.filter(
    (place): place is CoursePlace & { latitude: number; longitude: number } =>
      place.latitude !== null && place.longitude !== null,
  );

  return eligible.map((place, index) => ({
    role: place.originalStop?.role ?? (index === 0 ? "anchor" : "attraction"),
    sequence: index + 1,
    placeId: UUID_PATTERN.test(place.id) ? place.id : null,
    title: place.title,
    categoryLabel: place.originalStop ? place.originalStop.categoryLabel : place.category,
    address: place.originalStop ? place.originalStop.address : place.detail.addressLabel,
    longitude: place.longitude,
    latitude: place.latitude,
    distanceMeters: place.originalStop?.distanceMeters ?? null,
    placeUrl: place.originalStop?.placeUrl ?? null,
  }));
}

export function createEmptyCourse(): CourseEditData {
  return {
    id: "new",
    title: "새 일정",
    courses: {
      ai: { source: "ai", slots: [], places: [], recommendedOrder: [] },
      custom: { source: "custom", slots: [], places: [], recommendedOrder: [] },
    },
  };
}

/** The API stores stop order, not visit times. Keep unknown times empty. */
export function appendUntimedSlots(
  source: CourseSource,
  slots: readonly CourseTimeSlot[],
  count: number,
): readonly CourseTimeSlot[] {
  if (count <= 0) return slots;
  return [...slots, ...Array.from({ length: count }, (_, index) => ({
    id: `${source}-slot-${slots.length + index + 1}`,
    time: "",
  }))];
}
