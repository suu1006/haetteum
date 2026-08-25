import { describe, expect, it } from "vitest";

import { parseExploreRegion } from "@/features/explore/explore-model";

describe("parseExploreRegion", () => {
  it.each([
    [undefined, "gyeonggi"],
    ["unknown", "gyeonggi"],
    [["jeju", "seoul"], "jeju"],
    ["busan", "busan"],
  ])("normalizes %j to %s", (value, expected) => {
    expect(parseExploreRegion(value)).toBe(expected);
  });
});
