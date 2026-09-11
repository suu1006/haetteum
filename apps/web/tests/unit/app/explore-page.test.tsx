import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type {
  PlaceRankingResponse,
  PopularReelsResponse,
} from "@haetteum/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import ExplorePage, { metadata } from "@/app/explore/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const previousApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

const placeRankingResponse: PlaceRankingResponse = {
  source: "KTO_DATALAB",
  scope: "national",
  periodStart: "2025-08-01",
  periodEnd: "2026-07-31",
  audience: "all",
  items: [
    {
      rank: 1,
      sourcePlaceId: "a".repeat(32),
      title: "에버랜드",
      category: "레저/스포츠",
      sharePercent: 9,
      placeId: null,
      primaryImageUrl: null,
      imageCopyrightType: null,
      imageAttribution: null,
      imageAttributionUrl: null,
    },
  ],
};

const popularReelsResponse: PopularReelsResponse = {
  source: "YOUTUBE",
  audience: "all",
  region: "jeju",
  nextCursor: null,
  items: [
    {
      provider: "YOUTUBE",
      videoId: "aaaaaaaaaaa",
      title: "성산일출봉 브이로그",
      channelTitle: "여행채널",
      thumbnailUrl: "https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg",
      durationSeconds: 30,
      viewCount: 1000,
      publishedAt: "2026-01-01T00:00:00.000Z",
      embedUrl: "https://www.youtube.com/embed/aaaaaaaaaaa",
      placeId: "11111111-1111-4111-8111-111111111111",
      placeTitle: "성산일출봉",
      region: "제주",
    },
  ],
};

function explorePageFetchMock() {
  return vi.fn<typeof fetch>().mockImplementation((input) => {
    const url = String(input);
    if (url.includes("/place-reels")) {
      return Promise.resolve(
        new Response(JSON.stringify(popularReelsResponse), { status: 200 }),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify(placeRankingResponse), { status: 200 }),
    );
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  if (previousApiBaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_API_BASE_URL = previousApiBaseUrl;
  }
});

describe("explore page", () => {
  it("uses exploration metadata", () => {
    expect(metadata).toMatchObject({
      title: "탐색 | 해뜸",
    });
  });

  it("selects the regional recommendations from URL search params", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1";
    vi.stubGlobal("fetch", explorePageFetchMock());

    render(
      <QueryClientProvider client={new QueryClient()}>{await ExplorePage({
        searchParams: Promise.resolve({ region: "jeju" }),
      })}</QueryClientProvider>,
    );

    expect(screen.getByRole("link", { name: "제주" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("list", { name: "릴스형 인기 관광지 목록" })).toBeVisible();
  });
});
