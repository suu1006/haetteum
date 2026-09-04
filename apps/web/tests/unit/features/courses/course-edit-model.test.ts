import type { GeneratedCourseStop, PlaceListItem, SavedCourseItem } from "@haetteum/contracts";
import { describe, expect, it } from "vitest";

import {
  appendFollowingTimeSlots,
  appendUniqueCoursePlaces,
  formatMoveAnnouncement,
  mapSavedCourseToEditFixture,
  movePlace,
  removePlace,
} from "@/features/courses/course-edit-model";
import {
  courseEditMock,
  getEditableCourseById,
} from "@/features/courses/course-edit.mock";

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
      rating: 0,
      reviewCount: 0,
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

  it("appends stable time slots at ninety-minute intervals", () => {
    const slots = courseEditMock.courses.ai.slots;

    const next = appendFollowingTimeSlots("ai", slots, 2, 90);

    expect(next.slice(-2)).toEqual([
      { id: "ai-slot-6", time: "18:00" },
      { id: "ai-slot-7", time: "19:30" },
    ]);
    expect(slots).toHaveLength(5);
  });

  it("starts a blank schedule at 09:00 instead of leaving it empty", () => {
    const empty = [] as const;

    const next = appendFollowingTimeSlots("custom", empty, 2, 90);

    expect(next).toEqual([
      { id: "custom-slot-1", time: "09:00" },
      { id: "custom-slot-2", time: "10:30" },
    ]);
  });

  it("keeps the same slots when a following time cannot be created", () => {
    const invalid = [{ id: "bad-slot", time: "25:99" }] as const;
    const midnightOverflow = [{ id: "late-slot", time: "23:30" }] as const;
    const slots = courseEditMock.courses.ai.slots;

    expect(appendFollowingTimeSlots("ai", invalid, 1, 90)).toBe(invalid);
    expect(appendFollowingTimeSlots("ai", midnightOverflow, 1, 90)).toBe(
      midnightOverflow,
    );
    expect(appendFollowingTimeSlots("ai", slots, 0, 90)).toBe(slots);
    expect(appendFollowingTimeSlots("ai", slots, 1, 0)).toBe(slots);
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

    const fixture = mapSavedCourseToEditFixture(savedCourse);

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
