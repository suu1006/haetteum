import { describe, expect, it } from "vitest";

import {
  getSavedCourseById,
  savedCourseMock,
} from "@/features/courses/saved-course.mock";
import type { SavedCourseStop } from "@/features/courses/saved-course-model";

describe("saved course mock", () => {
  it("provides the complete Icheon day-trip summary and ordered itinerary", () => {
    expect(savedCourseMock).toMatchObject({
      id: "icheon-day-trip",
      title: "이천 테르메덴 중심 1일 코스",
      recommendationLabel: "AI 추천",
      totalDurationLabel: "8시간 30분",
      totalDistanceLabel: "18.7km",
      estimatedCostLabel: "1인 약 45,000원",
    });
    expect(savedCourseMock.stops).toHaveLength(5);
    expect(savedCourseMock.stops.map(({ time, title }) => [time, title])).toEqual([
      ["08:30", "임금님 쌀밥집"],
      ["09:30", "이천 테르메덴"],
      ["12:30", "이천 시립박물관"],
      ["15:00", "해주냉면"],
      ["17:00", "설봉공원"],
    ]);
    const finalStop: SavedCourseStop | undefined = savedCourseMock.stops.at(-1);
    expect(finalStop?.transfer).toBeUndefined();
  });

  it("returns no fixture for an unknown course ID", () => {
    expect(getSavedCourseById("missing-course")).toBeUndefined();
  });
});
