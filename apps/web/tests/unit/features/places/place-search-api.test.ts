import type { PlaceListItem } from "@haetteum/contracts";
import { describe, expect, it, vi } from "vitest";

import { searchPlaces } from "@/features/places/place-search-api";

const place = {
  id: "84549352-0c20-4e11-af50-2d4f278f41ef",
  title: "경복궁",
  region: "seoul",
  district: "종로구",
  address: "서울특별시 종로구 사직로 161",
  longitude: 126.977,
  latitude: 37.579,
  primaryImageUrl: null,
  imageCopyrightType: null,
} as const satisfies PlaceListItem;

describe("searchPlaces", () => {
  it("fetches a decoded regional search URL without caching and validates the page", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ items: [place], page: 1, pageSize: 20, totalCount: 1 }),
        { status: 200 },
      ),
    );

    await expect(
      searchPlaces("seoul", "경복궁", fetchImpl, "http://api.test/api/v1/"),
    ).resolves.toEqual({ status: "ready", items: [place] });

    const [requestUrl, options] = fetchImpl.mock.calls[0]!;
    const url = new URL(requestUrl.toString());
    expect(url.pathname).toBe("/api/v1/places");
    expect(url.searchParams.get("region")).toBe("seoul");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("pageSize")).toBe("20");
    expect(url.searchParams.get("q")).toBe("경복궁");
    expect(options).toEqual({ cache: "no-store", credentials: "include" });
  });

  it("allows an empty query to browse every place in the region", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ items: [place], page: 1, pageSize: 20, totalCount: 1 }),
        { status: 200 },
      ),
    );

    await searchPlaces("seoul", "", fetchImpl, "http://api.test/api/v1");

    const [requestUrl] = fetchImpl.mock.calls[0]!;
    expect(new URL(requestUrl.toString()).searchParams.get("q")).toBe("");
  });

  it("returns an error for malformed successful place JSON", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ items: [{}] }), { status: 200 }),
    );

    await expect(
      searchPlaces("seoul", "경복궁", fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error" });
  });

  it("returns an error for a non-success response", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("upstream failure", { status: 503 }),
    );

    await expect(
      searchPlaces("seoul", "경복궁", fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error" });
  });

  it("returns an error for a thrown fetch", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("socket closed"));

    await expect(
      searchPlaces("seoul", "경복궁", fetchImpl, "http://api.test/api/v1"),
    ).resolves.toEqual({ status: "error" });
  });

  it("does not call fetch when the API base URL is blank", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(searchPlaces("seoul", "경복궁", fetchImpl, "   ")).resolves.toEqual(
      { status: "error" },
    );
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
