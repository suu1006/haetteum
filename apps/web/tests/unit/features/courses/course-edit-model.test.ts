import type { GeneratedCourseStop, PlaceListItem, SavedCourseItem } from "@haetteum/contracts";
import { describe, expect, it } from "vitest";

import {
  appendUntimedSlots,
  appendUniqueCoursePlaces,
  formatMoveAnnouncement,
  mapSavedCourseToEditData,
  buildStopsFromDraft,
  movePlace,
  removePlace,
} from "@/features/courses/course-edit-model";
import {
  courseEditMock,
  getEditableCourseById,
} from "../../../fixtures/course-edit.mock";

const searchedPlaces = [
  {
    id: "icheon-city-museum",
    title: "이천 시립박물관",
    region: "gyeonggi",
    district: "이천시",
    address: "경기 이천시 경충대로2697번길 172",
    longitude: 127.44,
    latitude: 37.27,
    primaryImageUrl: null,
    imageCopyrightType: null,
  },
  {
    id: "icheon-rice-breakfast",
    title: "임금님 쌀밥집",
    region: "gyeonggi",
    district: "이천시",
    address: "경기 이천시 신둔면 경충대로 3134",
    longitude: 127.45,
    latitude: 37.28,
    primaryImageUrl: null,
    imageCopyrightType: null,
  },
  {
    id: "cafe-oncheon",
    title: "카페 온천",
    region: "gyeonggi",
    district: "이천시",
    address: "경기 이천시 온천로 1",
    longitude: 127.46,
    latitude: 37.29,
    primaryImageUrl: "https://images.example.test/cafe-oncheon.jpg",
    imageCopyrightType: null,
  },
] as const satisfies readonly PlaceListItem[];

describe("course edit model", () => {
  it("moves a place into the selected time slot without mutating the fixture", () => {
    const aiCourse = courseEditMock.courses.ai;
    const originalIds = aiCourse.places.map(({ id }) => id);

    const moved = movePlace(
      aiCourse.places,
      "seolbong-park",
      "icheon-rice-breakfast",
    );

    expect(moved.map(({ id }) => id)).toEqual([
      "seolbong-park",
      "icheon-rice-breakfast",
      "icheon-termeden",
      "icheon-city-museum",
      "haeju-cold-noodles",
    ]);
    expect(aiCourse.places.map(({ id }) => id)).toEqual(originalIds);
  });

  it("keeps the same array when a drag target is invalid", () => {
    const places = courseEditMock.courses.ai.places;

    expect(movePlace(places, "missing", "icheon-termeden")).toBe(places);
    expect(movePlace(places, "seolbong-park", "missing")).toBe(places);
    expect(movePlace(places, "seolbong-park", "seolbong-park")).toBe(places);
  });

  it("appends only selected place IDs not already in the course", () => {
    const current = courseEditMock.courses.ai.places;
    const selected = [searchedPlaces[0], searchedPlaces[2]];

    const next = appendUniqueCoursePlaces(current, selected);

    expect(next).toHaveLength(current.length + 1);
    expect(next.at(-1)).toMatchObject({
      id: "cafe-oncheon",
      title: "카페 온천",
      category: "장소",
    });
  });

  it("provides modal details for fixture and newly selected places", () => {
    expect(
      courseEditMock.courses.ai.places.map((place) => [
        place.title,
        place.detail.addressLabel,
      ]),
    ).toEqual([
      ["임금님 쌀밥집", "경기 이천시 신둔면 경충대로 3134"],
      ["이천 테르메덴", "경기 이천시 모가면 사실로 984"],
      ["설봉공원", "경기 이천시 경충대로2709번길 128"],
      ["이천 시립박물관", "경기 이천시 경충대로2697번길 172"],
      ["해주냉면", "경기 이천시 영창로 300"],
    ]);

    const withCafe = appendUniqueCoursePlaces(
      courseEditMock.courses.ai.places,
      [searchedPlaces[2]],
    );
    expect(withCafe.at(-1)?.detail).toMatchObject({
      rating: null,
      reviewCount: null,
      addressLabel: "경기 이천시 온천로 1",
    });
  });

  it("appends a duplicated selected place only once", () => {
    const current = courseEditMock.courses.ai.places;
    const cafe = searchedPlaces[2];

    const next = appendUniqueCoursePlaces(current, [cafe, cafe]);

    expect(next.filter(({ id }) => id === "cafe-oncheon")).toHaveLength(1);
    expect(next).toHaveLength(current.length + 1);
  });

  it("adds empty time slots without fabricating visit times", () => {
    const slots = courseEditMock.courses.ai.slots;
    expect(appendUntimedSlots("ai", slots, 2).slice(-2)).toEqual([
      { id: "ai-slot-6", time: "" }, { id: "ai-slot-7", time: "" },
    ]);
    expect(appendUntimedSlots("custom", [], 1)).toEqual([{ id: "custom-slot-1", time: "" }]);
    expect(appendUntimedSlots("ai", slots, 0)).toBe(slots);
    expect(slots).toHaveLength(5);
  });

  it("removes a place and drops one slot to keep the arrays in sync", () => {
    const { places, slots } = courseEditMock.courses.ai;

    const next = removePlace(places, slots, "icheon-termeden");

    expect(next.places.map(({ id }) => id)).toEqual([
      "icheon-rice-breakfast",
      "seolbong-park",
      "icheon-city-museum",
      "haeju-cold-noodles",
    ]);
    expect(next.slots).toHaveLength(4);
    expect(places).toHaveLength(5);
    expect(slots).toHaveLength(5);
  });

  it("keeps the same arrays when removing a place that is not in the course", () => {
    const { places, slots } = courseEditMock.courses.ai;

    const next = removePlace(places, slots, "missing-place");

    expect(next.places).toBe(places);
    expect(next.slots).toBe(slots);
  });

  it("announces the moved place and its one-based position", () => {
    const place = courseEditMock.courses.ai.places[2];
    expect(place).toBeDefined();
    if (!place) return;

    expect(formatMoveAnnouncement(place, 0)).toBe(
      "설봉공원이 1번째 일정으로 이동했습니다.",
    );
  });

  it("maps a saved course's stops into an editable fixture with both tabs populated", () => {
    const stops: GeneratedCourseStop[] = [
      {
        role: "restaurant",
        sequence: 2,
        placeId: "20000000-0000-4000-8000-000000000002",
        title: "해주냉면",
        categoryLabel: "식당",
        address: "경기 이천시 영창로 300",
        longitude: 127.47,
        latitude: 37.3,
        distanceMeters: 900,
        placeUrl: null,
      },
      {
        role: "anchor",
        sequence: 1,
        placeId: null,
        title: "예술의전당",
        categoryLabel: null,
        address: null,
        longitude: 127.01,
        latitude: 37.48,
        distanceMeters: null,
        placeUrl: null,
      },
    ];
    const savedCourse: SavedCourseItem = {
      id: "40000000-0000-4000-8000-000000000001",
      title: "예술의전당 근처 코스",
      savedAt: "2026-09-01T03:00:00.000Z",
      stops,
    };

    const fixture = mapSavedCourseToEditData(savedCourse);

    expect(fixture.id).toBe(savedCourse.id);
    expect(fixture.title).toBe(savedCourse.title);
    for (const source of ["ai", "custom"] as const) {
      const course = fixture.courses[source];
      expect(course.places.map(({ id, title, category }) => ({
        id,
        title,
        category,
      }))).toEqual([
        {
          id: "generated-stop-1",
          title: "예술의전당",
          category: "장소",
        },
        {
          id: "20000000-0000-4000-8000-000000000002",
          title: "해주냉면",
          category: "식당",
        },
      ]);
      expect(course.slots).toHaveLength(2);
      expect(course.recommendedOrder).toEqual(
        course.places.map(({ id }) => id),
      );
    }
  });

  it("provides unique fixtures only for the approved mock route", () => {
    expect(getEditableCourseById("icheon-day-trip")).toBe(courseEditMock);
    expect(getEditableCourseById("missing-course")).toBeUndefined();

    for (const course of Object.values(courseEditMock.courses)) {
      expect(course.slots).toHaveLength(course.places.length);
      expect(new Set(course.places.map(({ id }) => id)).size).toBe(
        course.places.length,
      );
      expect(new Set(course.slots.map(({ id }) => id)).size).toBe(
        course.slots.length,
      );
    }
  });
});

it("does not invent ratings, review counts or visit times for a persisted stop", () => {
  const stop: GeneratedCourseStop = {
    role: "cafe", sequence: 1, placeId: null, title: "저장된 카페", categoryLabel: null,
    address: null, latitude: 37.5, longitude: 127, distanceMeters: 320,
    placeUrl: "https://place.map.kakao.com/123",
  };
  const course = mapSavedCourseToEditData({ id: "40000000-0000-4000-8000-000000000001", title: "코스", savedAt: "2026-09-17T00:00:00Z", stops: [stop] });
  expect(course.courses.custom.places[0].detail.rating).toBeNull();
  expect(course.courses.custom.places[0].detail.reviewCount).toBeNull();
  expect(course.courses.custom.slots[0].time).toBe("");
  expect(buildStopsFromDraft(course.courses.custom.places)).toEqual([stop]);
});
