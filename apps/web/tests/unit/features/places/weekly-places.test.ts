import { describe, expect, it, vi } from "vitest";
import { loadWeeklyPlaces } from "@/features/places/weekly-places";

const items = Array.from({ length: 20 }, (_, i) => ({
  id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  title: `장소 ${i}`, region: "chungnam", address: "충남", district: null,
  latitude: null, longitude: null, primaryImageUrl: "https://media.example.com/weekly/a.webp", imageCopyrightType: "Type1",
}));

describe("weekly place recommendations", () => {
  it("loads the published nationwide twenty in server order with one fresh request", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ week: "2026-09-07", items })));
    expect(await loadWeeklyPlaces(fetchMock, "https://example.com/api/v1/")).toEqual({ status: "ready", items });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("https://example.com/api/v1/places/recommendations/weekly", { cache: "no-store" });
  });
  it("handles an unpublished week as empty", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ week: null, items: [] })));
    expect(await loadWeeklyPlaces(fetchMock, "https://example.com")).toEqual({ status: "ready", items: [] });
  });
  it.each([{ week: "bad", items }, { week: null, items: [{ ...items[0], id: "invalid" }] }, { week: null, items: Array(21).fill(items[0]) }])("rejects invalid responses", async (payload) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(payload)));
    expect(await loadWeeklyPlaces(fetchMock, "https://example.com")).toEqual({ status: "error" });
  });
  it("reports API failures without a fallback request", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 503 }));
    expect(await loadWeeklyPlaces(fetchMock, "https://example.com")).toEqual({ status: "error" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
