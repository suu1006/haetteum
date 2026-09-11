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
  it("shows search results below the retained input without leaving explore", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      items: [{ id: "84549352-0c20-4e11-af50-2d4f278f41ef", title: "경복궁", region: "seoul", district: "종로구", address: "서울 종로구", longitude: 126.977, latitude: 37.579, primaryImageUrl: null, imageCopyrightType: null }],
      page: 1, pageSize: 20, totalCount: 1,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<QueryClientProvider client={new QueryClient()}>{await ExplorePage({
      searchParams: Promise.resolve({ region: "seoul", reelRegion: "jeju", q: "경복궁" }),
    })}</QueryClientProvider>);
    const input = screen.getByRole("searchbox", { name: "여행지 검색" });
    expect(input).toHaveValue("경복궁");
    expect(screen.getByRole("search")).toHaveAttribute("action", "/explore");
    const results = screen.getByRole("list", { name: "'경복궁' 검색 결과" });
    expect(results).toBeVisible();
    expect(input.compareDocumentPosition(results) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "릴스형 인기 관광지" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "검색 초기화" })).toHaveAttribute("href", "/explore?region=seoul&reelRegion=jeju");
    const url = new URL(String(fetchMock.mock.calls[0]![0]));
    expect(url.pathname).toBe("/api/v1/places");
    expect(url.searchParams.get("q")).toBe("경복궁");
    expect(url.searchParams.get("region")).toBe("seoul");
  });

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
