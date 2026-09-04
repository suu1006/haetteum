import type {
  PlaceReelListResponse,
  PopularReelsResponse,
} from "@haetteum/contracts";
import { describe, expect, it, vi } from "vitest";

import {
  loadPlaceReels,
  loadPopularReels,
  orderPlaceReelItemsFrom,
} from "@/features/discovery/place-reels-api";

const BASE_URL = "http://localhost:4000/api/v1";

const reel = {
  provider: "YOUTUBE",
  videoId: "dQw4w9WgXcQ",
  title: "성산일출봉 브이로그",
  channelTitle: "여행 채널",
  thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/oardefault.jpg",
  durationSeconds: 42,
  viewCount: 12000,
  publishedAt: "2026-08-20T21:00:00.000Z",
  embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
} as const;

const popularResponse = {
  source: "YOUTUBE",
  audience: "all",
  region: "all",
  items: [
    {
      ...reel,
      placeId: "84549352-0c20-4e11-af50-2d4f278f41ef",
      placeTitle: "성산일출봉",
      region: "제주특별자치도",
    },
  ],
  nextCursor: null,
} as const satisfies PopularReelsResponse;

const placeResponse = {
  placeId: "84549352-0c20-4e11-af50-2d4f278f41ef",
  source: "YOUTUBE",
  fetchedAt: "2026-08-28T00:00:00.000Z",
  items: [reel],
} as const satisfies PlaceReelListResponse;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status });
}

describe("loadPopularReels", () => {
  it("requests the aggregate feed for the audience without caching", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(popularResponse));

    const result = await loadPopularReels("30s", "all", fetchMock, BASE_URL);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/place-reels?audience=30s&region=all&limit=12",
      { cache: "no-store" },
    );
    expect(result).toEqual({ status: "ready", data: popularResponse });
  });

  it("requests the aggregate feed scoped to the given region", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ ...popularResponse, region: "jeju" }));

    await loadPopularReels("all", "jeju", fetchMock, BASE_URL);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/place-reels?audience=all&region=jeju&limit=12",
      { cache: "no-store" },
    );
  });

  it("requests a subsequent page using the given cursor and limit", async () => {
    const nextPage = { ...popularResponse, nextCursor: 24 };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse(nextPage));

    const result = await loadPopularReels("30s", "all", fetchMock, BASE_URL, {
      cursor: 12,
      limit: 12,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/place-reels?audience=30s&region=all&limit=12&cursor=12",
      { cache: "no-store" },
    );
    expect(result).toEqual({ status: "ready", data: nextPage });
  });

  it("reports an empty state when the feed has no items", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ ...popularResponse, items: [] }));

    await expect(
      loadPopularReels("all", "all", fetchMock, BASE_URL),
    ).resolves.toEqual({ status: "empty" });
  });

  it.each([
    { label: "no base URL", baseUrl: "", result: undefined },
    {
      label: "an upstream failure",
      baseUrl: BASE_URL,
      result: new Response("boom", { status: 502 }),
    },
    {
      label: "a schema mismatch",
      baseUrl: BASE_URL,
      result: jsonResponse({ ...popularResponse, items: [{}] }),
    },
  ])("returns a safe error state for $label", async ({ baseUrl, result }) => {
    const fetchMock = vi.fn<typeof fetch>();
    if (result) fetchMock.mockResolvedValue(result);

    await expect(
      loadPopularReels("all", "all", fetchMock, baseUrl),
    ).resolves.toEqual({ status: "error" });
  });
});

describe("loadPlaceReels", () => {
  it("fetches a single place feed and returns the ready state", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse(placeResponse));

    const result = await loadPlaceReels(
      "84549352-0c20-4e11-af50-2d4f278f41ef",
      fetchMock,
      BASE_URL,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/place-reels/84549352-0c20-4e11-af50-2d4f278f41ef",
      { cache: "no-store" },
    );
    expect(result).toEqual({ status: "ready", data: placeResponse });
  });

  it("maps a 404 to a not-found state and an empty item list to empty", async () => {
    const notFound = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("nope", { status: 404 }));
    await expect(
      loadPlaceReels("missing", notFound, BASE_URL),
    ).resolves.toEqual({ status: "not-found" });

    const empty = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ ...placeResponse, items: [] }));
    await expect(
      loadPlaceReels("84549352-0c20-4e11-af50-2d4f278f41ef", empty, BASE_URL),
    ).resolves.toEqual({ status: "empty" });
  });

  it("returns a safe error state for a thrown network error", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("socket reset"));

    await expect(
      loadPlaceReels("84549352-0c20-4e11-af50-2d4f278f41ef", fetchMock, BASE_URL),
    ).resolves.toEqual({ status: "error" });
  });
});

describe("orderPlaceReelItemsFrom", () => {
  const items = [
    { videoId: "a" },
    { videoId: "b" },
    { videoId: "c" },
  ];

  it("rotates the list so the given video leads", () => {
    expect(orderPlaceReelItemsFrom(items, "b")).toEqual([
      { videoId: "b" },
      { videoId: "c" },
      { videoId: "a" },
    ]);
  });

  it("leaves the order untouched when the video already leads or is absent", () => {
    expect(orderPlaceReelItemsFrom(items, "a")).toEqual(items);
    expect(orderPlaceReelItemsFrom(items, "missing")).toEqual(items);
    expect(orderPlaceReelItemsFrom(items, undefined)).toEqual(items);
  });
});
