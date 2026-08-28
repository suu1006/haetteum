import { render, screen } from "@testing-library/react";
import type { PlaceRankingResponse } from "@haetteum/contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DiscoveryContent } from "@/features/discovery/discovery-content";

const previousApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

const placeRankingResponse = {
  source: "KTO_DATALAB",
  scope: "national",
  periodStart: "2025-08-01",
  periodEnd: "2026-07-31",
  audience: "all",
  items: Array.from({ length: 10 }, (_, index) => ({
    rank: index + 1,
    sourcePlaceId: `${String(index + 1).padStart(2, "0")}${"a".repeat(30)}`,
    title: index === 0 ? "에버랜드" : `관광지 ${index + 1}`,
    category: "레저/스포츠",
    sharePercent: 9 - index / 10,
    placeId: null,
    primaryImageUrl: null,
    imageCopyrightType: null,
  })),
} satisfies PlaceRankingResponse;

afterEach(() => {
  vi.unstubAllGlobals();
  if (previousApiBaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_API_BASE_URL = previousApiBaseUrl;
  }
});

describe("DiscoveryContent", () => {
  it("loads the default all-audience ranking for the recommended page", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(placeRankingResponse), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(await DiscoveryContent({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", { name: "세대별 인기관광지 순위" }),
    ).toBeVisible();
    expect(screen.getByRole("article", { name: "1위 에버랜드" })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/place-rankings?audience=all&limit=10",
      { cache: "no-store" },
    );
  });

  it("loads the selected audience ranking from URL search params", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({ ...placeRankingResponse, audience: "30s" }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      await DiscoveryContent({
        searchParams: Promise.resolve({ audience: "30s" }),
      }),
    );

    expect(screen.getByRole("link", { name: "30대" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/place-rankings?audience=30s&limit=10",
      { cache: "no-store" },
    );
  });

  it("assembles the popular-place tab from URL search params", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(
      await DiscoveryContent({
        searchParams: Promise.resolve({ tab: "places", region: "jeju" }),
      }),
    );

    expect(screen.getByRole("link", { name: "인기 관광지" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("heading", { name: "릴스형 인기 관광지" })).toBeVisible();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("renders the live YouTube reel rail on the popular-place tab", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1";
    const reelsResponse = {
      source: "YOUTUBE",
      audience: "all",
      items: [
        {
          provider: "YOUTUBE",
          videoId: "dQw4w9WgXcQ",
          title: "성산일출봉 브이로그",
          channelTitle: "여행 채널",
          thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/oardefault.jpg",
          durationSeconds: 42,
          viewCount: 12000,
          publishedAt: "2026-08-20T21:00:00.000Z",
          embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
          placeId: "84549352-0c20-4e11-af50-2d4f278f41ef",
          placeTitle: "성산일출봉",
          region: "제주특별자치도",
        },
      ],
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify(reelsResponse), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      await DiscoveryContent({
        searchParams: Promise.resolve({ tab: "places", region: "jeju" }),
      }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/place-reels?audience=all&limit=12",
      { cache: "no-store" },
    );
    const reelLink = screen.getByRole("link", {
      name: /성산일출봉 릴스 미리보기/,
    });
    expect(reelLink).toHaveAttribute(
      "href",
      "/reels/place/84549352-0c20-4e11-af50-2d4f278f41ef",
    );
  });

  it("loads live festival discovery data only for the festival tab", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1";
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          asOfDate: "2026-08-25",
          region: "jeju",
          ranking: [
            {
              id: "84549352-0c20-4e11-af50-2d4f278f41ef",
              externalId: "141268",
              rank: 1,
              title: "제주 DB 실데이터 축제",
              status: "ONGOING",
              eventStartDate: "2026-08-22",
              eventEndDate: "2026-09-06",
              address: "제주특별자치도 제주시",
              categoryLabel: "문화관광축제",
              primaryImageUrl: null,
            },
          ],
          items: [],
          page: 1,
          pageSize: 20,
          totalCount: 1,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      await DiscoveryContent({
        searchParams: Promise.resolve({ tab: "festivals", region: "jeju" }),
      }),
    );

    expect(screen.getAllByText("제주 DB 실데이터 축제").length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText("제주 여름빛 정원축제")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/festivals/discovery?region=jeju&page=1&pageSize=20",
      { cache: "no-store" },
    );
  });
});
