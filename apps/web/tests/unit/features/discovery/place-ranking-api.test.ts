import type { PlaceRankingResponse } from "@haetteum/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { loadPlaceRankings } from "@/features/discovery/place-ranking-api";

const previousApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

const response = {
  source: "KTO_DATALAB",
  scope: "national",
  periodStart: "2026-07-01",
  periodEnd: "2026-07-31",
  audience: "20s",
  items: [
    {
      rank: 1,
      sourcePlaceId: "0123456789abcdef0123456789abcdef",
      title: "성산일출봉",
      category: "자연관광",
      sharePercent: 12.34,
      placeId: "84549352-0c20-4e11-af50-2d4f278f41ef",
      primaryImageUrl: "https://tong.visitkorea.or.kr/ranking.jpg",
      imageCopyrightType: "공공누리",
      imageAttribution: null,
      imageAttributionUrl: null,
    },
  ],
} as const satisfies PlaceRankingResponse;

afterEach(() => {
  vi.unstubAllGlobals();
  if (previousApiBaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_API_BASE_URL = previousApiBaseUrl;
  }
});

describe("loadPlaceRankings", () => {
  it("fetches the requested audience ranking with a 30-second revalidation window and validates the contract", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(response), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadPlaceRankings("20s");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/place-rankings?audience=20s&limit=10",
      { next: { revalidate: 30 } },
    );
    expect(result).toEqual({ status: "ready", data: response });
  });

  it.each([
    {
      label: "a missing API base URL",
      baseUrl: "",
      fetchResult: undefined,
    },
    {
      label: "a non-success response",
      baseUrl: "http://localhost:4000/api/v1",
      fetchResult: new Response("upstream failure body", { status: 503 }),
    },
    {
      label: "malformed JSON",
      baseUrl: "http://localhost:4000/api/v1",
      fetchResult: new Response("not-json", { status: 200 }),
    },
    {
      label: "a schema mismatch",
      baseUrl: "http://localhost:4000/api/v1",
      fetchResult: new Response(JSON.stringify({ ...response, items: [{}] }), {
        status: 200,
      }),
    },
  ])("returns a safe error state for $label", async ({ baseUrl, fetchResult }) => {
    process.env.NEXT_PUBLIC_API_BASE_URL = baseUrl;
    const fetchMock = vi.fn<typeof fetch>();
    if (fetchResult) fetchMock.mockResolvedValue(fetchResult);
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadPlaceRankings("20s")).resolves.toEqual({
      status: "error",
    });
  });

  it("returns a safe error state for a thrown network error", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1";
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("raw socket failure"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(loadPlaceRankings("20s")).resolves.toEqual({
      status: "error",
    });
  });
});
