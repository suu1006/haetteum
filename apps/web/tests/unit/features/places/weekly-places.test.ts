import { describe, expect, it, vi } from "vitest";
import type { PlaceListItem } from "@haetteum/contracts";
import { getRecommendationWeek, selectWeeklyPlaces, loadWeeklyPlaces } from "@/features/places/weekly-places";

const items: PlaceListItem[] = Array.from({ length: 20 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  title: `장소 ${i}`, region: "jeju", address: "제주", district: null,
  latitude: null, longitude: null, primaryImageUrl: null, imageCopyrightType: null,
}));

describe("weekly place recommendations", () => {
  it("switches the week at Monday midnight in Korea including year boundaries", () => {
    expect(getRecommendationWeek(new Date("2026-09-13T14:59:59Z"))).toBe("2026-09-07");
    expect(getRecommendationWeek(new Date("2026-09-13T15:00:00Z"))).toBe("2026-09-14");
    expect(getRecommendationWeek(new Date("2026-01-01T00:00:00Z"))).toBe("2025-12-29");
  });
  it("keeps four unique choices stable within a week regardless of input order", () => {
    const chosen = selectWeeklyPlaces(items, "2026-09-07");
    expect(chosen).toHaveLength(4);
    expect(new Set(chosen.map(item => item.id)).size).toBe(4);
    expect(selectWeeklyPlaces([...items].reverse().concat(items), "2026-09-07")).toEqual(chosen);
    expect(selectWeeklyPlaces(items, "2026-09-14")).not.toEqual(chosen);
    expect(items[0].title).toBe("장소 0");
  });
  it("handles small and empty pools", () => {
    expect(selectWeeklyPlaces([], "2026-09-07")).toEqual([]);
    expect(selectWeeklyPlaces(items.slice(0, 2), "2026-09-07")).toHaveLength(2);
  });
  it("loads real places with a cache key that changes only at the week boundary", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify({ items, page: 1, pageSize: 100, totalCount: 20 })));
    const first = await loadWeeklyPlaces("jeju", new Date("2026-09-07T00:00:00Z"), fetchMock, "https://example.com/api/v1");
    const second = await loadWeeklyPlaces("jeju", new Date("2026-09-13T14:59:59Z"), fetchMock, "https://example.com/api/v1");
    expect(first).toEqual(second);
    expect(first.status).toBe("ready");
    expect(fetchMock.mock.calls[0]).toEqual(fetchMock.mock.calls[1]);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ cache: "force-cache", headers: { "X-Recommendation-Week": "2026-09-07" }, next: { revalidate: 604800 } });
    await loadWeeklyPlaces("jeju", new Date("2026-09-13T15:00:00Z"), fetchMock, "https://example.com/api/v1");
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ headers: { "X-Recommendation-Week": "2026-09-14" } });
  });
  it("reports API failures without substituting festival data", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 503 }));
    expect(await loadWeeklyPlaces("jeju", new Date(), fetchMock, "https://example.com")).toEqual({ status: "error" });
  });
});
