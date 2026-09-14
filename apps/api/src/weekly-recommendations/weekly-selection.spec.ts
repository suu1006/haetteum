import {
  balancedSelection,
  placeKind,
  recommendationWeek,
  visitAvailability,
} from "./weekly-selection.js";

describe("weekly selection", () => {
  it.each([
    ["NA", "nature"],
    ["HS", "culture"],
    ["VE", "culture"],
    [" VE ", "culture"],
    ["LS", "unknown"],
    ["unrecognized", "unknown"],
    ["EV", "unknown"],
    ["", "unknown"],
    [null, "unknown"],
    ["A01", "unknown"],
    ["A02", "unknown"],
    ["A03", "unknown"],
  ])("classifies current TourAPI category %s as %s", (category, expected) => {
    expect(placeKind(category)).toBe(expected);
  });
  const pool = Array.from({ length: 100 }, (_, i) => ({
    id: String(i),
    region: `r${i % 17}`,
    kind: i % 2 ? "culture" : "nature",
    title: `Place ${i}`,
    latitude: i,
    longitude: i,
  }));
  it("uses Monday Korea date at the UTC boundary", () => {
    expect(recommendationWeek(new Date("2026-09-13T14:59:59Z"))).toBe(
      "2026-09-07",
    );
    expect(recommendationWeek(new Date("2026-09-13T15:00:00Z"))).toBe(
      "2026-09-14",
    );
    expect(recommendationWeek(new Date("2026-09-12T00:00:00Z"), true)).toBe(
      "2026-09-14",
    );
  });
  it("selects twenty reproducibly across regions and kinds without recent repeats", () => {
    const selected = balancedSelection(pool, "2026-09-14", 20, new Set(["0"]));
    expect(selected).toHaveLength(20);
    expect(selected.some((p) => p.id === "0")).toBe(false);
    expect(new Set(selected.map((p) => p.region)).size).toBeGreaterThanOrEqual(
      5,
    );
    expect(selected).toEqual(
      balancedSelection([...pool].reverse(), "2026-09-14", 20, new Set(["0"])),
    );
  });
  it("relaxes diversity quotas without returning duplicates", () => {
    expect(
      balancedSelection([...pool, ...pool], "2026-09-14", 20),
    ).toHaveLength(20);
    expect(
      balancedSelection(
        pool.map((p) => ({ ...p, region: "one" })),
        "2026-09-14",
        20,
      ),
    ).toHaveLength(20);
  });
  it("reuses recent places when a small pool cannot fill the next week", () => {
    const small = pool.slice(0, 16);
    const selected = balancedSelection(
      small,
      "2026-09-21",
      20,
      new Set(small.map((p) => p.id)),
    );
    expect(selected).toHaveLength(16);
    expect(new Set(selected.map((p) => p.id)).size).toBe(16);
  });
  it("distinguishes explicit unavailability from missing free-form operating data", () => {
    expect(visitAvailability("연중무휴", "", "2026-09-14")).toBe("OPEN");
    expect(visitAvailability("", "", "2026-09-14")).toBe("UNKNOWN");
    expect(visitAvailability("임시휴업", "", "2026-09-14")).toBe("CLOSED");
    expect(visitAvailability("매주 월요일", "", "2026-09-14")).toBe("UNKNOWN");
    expect(visitAvailability("", "2026.09.01 ~ 2026.09.30", "2026-10-05")).toBe(
      "CLOSED",
    );
  });
});
