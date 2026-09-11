import { describe, expect, it } from "vitest";
import { shortenCourse, replaceCoursePlaces } from "@/features/courses/course-alternatives";
import { courseEditMock } from "@/features/courses/course-edit.mock";

const base = courseEditMock.courses.ai.places[0]!;
const places = [0, 3, 1, 2].map((longitude, index) => ({
  ...base, id: String(index), title: String(index), latitude: 37, longitude: 127 + longitude / 100,
}));

describe("course alternatives", () => {
  it("keeps the start and all places while removing a detour", () => {
    expect(shortenCourse(places)?.map(p => p.id)).toEqual(["0", "2", "3", "1"]);
    expect(places.map(p => p.id)).toEqual(["0", "1", "2", "3"]);
  });
  it("does not advertise an unchanged or unmeasurable route", () => {
    expect(shortenCourse([places[0]!, places[2]!, places[3]!, places[1]!])).toBeNull();
    expect(shortenCourse([{ ...places[0]!, latitude: null }, ...places.slice(1)])).toBeNull();
  });
  it("keeps the start and count, excluding current places and duplicate candidates", () => {
    const fresh = { ...base, id: "fresh", title: "새 카페", latitude: 37.5, longitude: 127.5 };
    const result = replaceCoursePlaces(places, [places[1]!, fresh, fresh]);
    expect(result?.map(p => p.id)).toEqual(["0", "fresh", "2", "3"]);
  });
  it("retains the lookup anchor after the start has been reordered", () => {
    const anchor = { ...places[1]!, id: "20000000-0000-4000-8000-000000000001" };
    const fresh = { ...base, id: "fresh" };
    expect(replaceCoursePlaces([places[0]!, anchor, places[2]!], [fresh])?.map(p => p.id))
      .toEqual(["0", "20000000-0000-4000-8000-000000000001", "fresh"]);
  });
  it("returns no alternative when every nearby place is already present", () => {
    expect(replaceCoursePlaces(places, places)).toBeNull();
  });
});
