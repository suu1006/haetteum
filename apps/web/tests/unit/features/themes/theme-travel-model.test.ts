import { describe, expect, it } from "vitest";

import { themeTravelMock } from "@/features/themes/theme-travel.mock";
import { selectThemeCourses } from "@/features/themes/theme-travel-model";

describe("selectThemeCourses", () => {
  it("filters one theme without mutating the fixture", () => {
    const originalIds = themeTravelMock.courses.map((course) => course.id);

    const result = selectThemeCourses(
      themeTravelMock.courses,
      "healing",
      "popular",
    );

    expect(result.map((course) => course.id)).toEqual(["jeju-healing"]);
    expect(themeTravelMock.courses.map((course) => course.id)).toEqual(
      originalIds,
    );
  });

  it("sorts all courses by rating and then review count", () => {
    expect(
      selectThemeCourses(themeTravelMock.courses, "all", "rating").map(
        (course) => course.id,
      ),
    ).toEqual(["gyeongju-history", "jeju-healing", "jeonju-food"]);
  });
});
