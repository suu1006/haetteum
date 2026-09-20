import { describe, expect, it, vi } from "vitest";
import { searchDiscoveryPlaces } from "@/features/places/discovery-place-search-api";

const place = {
  id: "84549352-0c20-4e11-af50-2d4f278f41ef",
  title: "경복궁",
  region: "seoul",
  district: "종로구",
  address: "서울 종로구",
  longitude: 126.977,
  latitude: 37.579,
  primaryImageUrl: null,
  imageCopyrightType: null,
};
const external = {
  provider: "KAKAO_LOCAL",
  providerPlaceId: "123",
  title: "경복궁",
  categoryLabel: "관광명소",
  telephone: null,
  address: "서울 종로구",
  roadAddress: null,
  longitude: 126.977,
  latitude: 37.579,
  distanceMeters: null,
  placeUrl: "https://place.map.kakao.com/123",
  imageUrl: null,
  matchedPlaceId: null,
};
const base = "http://api.test/api/v1";
const json = (value: unknown) => new Response(JSON.stringify(value));
function db(items: unknown[]) {
  return json({ items, page: 1, pageSize: 20, totalCount: items.length });
}

describe("searchDiscoveryPlaces", () => {
  it("keeps a successful DB result without spending an external search request", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValueOnce(db([place]));
    const result = await searchDiscoveryPlaces(
      undefined,
      "경복궁",
      false,
      fetchImpl,
      base,
    );
    expect(result).toEqual({ status: "ready", items: [place] });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it("automatically finds external places when the DB has no results", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(db([]))
      .mockResolvedValueOnce(json({ status: "ready", items: [external] }));
    const result = await searchDiscoveryPlaces(
      "seoul",
      " 경복궁 ",
      false,
      fetchImpl,
      base,
    );
    expect(result).toEqual({
      status: "ready",
      items: [],
      external: { status: "ready", items: [external] },
    });
    const url = new URL(String(fetchImpl.mock.calls[1]![0]));
    expect(url.pathname).toBe("/api/v1/places/external-search");
    expect(url.searchParams.get("region")).toBe("seoul");
    expect(url.searchParams.get("q")).toBe("경복궁");
  });
  it("lets users expand nonempty DB results", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(db([place]))
      .mockResolvedValueOnce(json({ status: "ready", items: [external] }));
    expect(
      await searchDiscoveryPlaces(undefined, "경복궁", true, fetchImpl, base),
    ).toEqual({
      status: "ready",
      items: [place],
      external: { status: "ready", items: [external] },
    });
  });
  it.each(["http", "json", "network"])(
    "retains DB results when external search has a %s failure",
    async (failure) => {
      const fetchImpl = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(db([place]));
      if (failure === "network")
        fetchImpl.mockRejectedValueOnce(new Error("network"));
      else
        fetchImpl.mockResolvedValueOnce(
          failure === "http"
            ? new Response(null, { status: 503 })
            : json({ items: [{}] }),
        );
      expect(
        await searchDiscoveryPlaces(undefined, "경복궁", true, fetchImpl, base),
      ).toEqual({
        status: "ready",
        items: [place],
        external: { status: "unavailable", reason: "provider_unavailable" },
      });
    },
  );
  it("does not treat a DB outage as an empty catalog", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    expect(
      await searchDiscoveryPlaces(undefined, "경복궁", false, fetchImpl, base),
    ).toEqual({ status: "error" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
  it.each(["   ", "x".repeat(101)])(
    "rejects invalid queries before requesting providers",
    async (query) => {
      const fetchImpl = vi.fn<typeof fetch>();
      expect(
        await searchDiscoveryPlaces(undefined, query, true, fetchImpl, base),
      ).toEqual({ status: "error" });
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );
});
