import { describe, expect, it } from "vitest";

import {
  appendFollowingTimeSlots,
  appendUniqueCoursePlaces,
  formatMoveAnnouncement,
  movePlace,
} from "@/features/courses/course-edit-model";
import {
  courseEditMock,
  getEditableCourseById,
} from "@/features/courses/course-edit.mock";
import { nearbyPlaceSearchMock } from "@/features/places/nearby-place-search.mock";

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
    const selected = [nearbyPlaceSearchMock[0], nearbyPlaceSearchMock[2]];

    const next = appendUniqueCoursePlaces(current, selected);

    expect(next).toHaveLength(current.length + 1);
    expect(next.at(-1)).toMatchObject({
      id: "cafe-oncheon",
      title: "카페 온천",
      category: "카페",
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
      [nearbyPlaceSearchMock[2]],
    );
    expect(withCafe.at(-1)?.detail).toMatchObject({
      rating: 4.5,
      reviewCount: 642,
      description: "온천을 테마로 한 편안한 감성 카페",
    });
  });

  it("appends a duplicated selected place only once", () => {
    const current = courseEditMock.courses.ai.places;
    const cafe = nearbyPlaceSearchMock[2];

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

  it("keeps the same slots when a following time cannot be created", () => {
    const empty = [] as const;
    const invalid = [{ id: "bad-slot", time: "25:99" }] as const;
    const midnightOverflow = [{ id: "late-slot", time: "23:30" }] as const;
    const slots = courseEditMock.courses.ai.slots;

    expect(appendFollowingTimeSlots("ai", empty, 1, 90)).toBe(empty);
    expect(appendFollowingTimeSlots("ai", invalid, 1, 90)).toBe(invalid);
    expect(appendFollowingTimeSlots("ai", midnightOverflow, 1, 90)).toBe(
      midnightOverflow,
    );
    expect(appendFollowingTimeSlots("ai", slots, 0, 90)).toBe(slots);
    expect(appendFollowingTimeSlots("ai", slots, 1, 0)).toBe(slots);
  });

  it("announces the moved place and its one-based position", () => {
    const place = courseEditMock.courses.ai.places[2];
    expect(place).toBeDefined();
    if (!place) return;

    expect(formatMoveAnnouncement(place, 0)).toBe(
      "설봉공원이 1번째 일정으로 이동했습니다.",
    );
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
