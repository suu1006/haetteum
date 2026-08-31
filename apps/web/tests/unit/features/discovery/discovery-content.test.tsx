import { render, screen, within } from "@testing-library/react";
import type {
  HotPlaceRankingResponse,
  PlaceRankingResponse,
} from "@haetteum/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DiscoveryContent } from "@/features/discovery/discovery-content";

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

const routerMocks = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

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
    imageAttribution: null,
    imageAttributionUrl: null,
  })),
} satisfies PlaceRankingResponse;

const hotPlaceRankingResponse = {
  source: "KTO_DATALAB",
  scope: "national",
  baseYearMonth: "202607",
  periodStart: "2026-07-01",
  periodEnd: "2026-07-31",
  audience: "all",
  items: Array.from({ length: 10 }, (_, index) => ({
    rank: index + 1,
    sourcePlaceId: `${String(index + 1).padStart(2, "0")}${"b".repeat(30)}`,
    title: index === 0 ? "장릉" : `핫플레이스 ${index + 1}`,
    category: "관광명소",
    provinceName: "강원특별자치도",
    districtName: "영월군",
    growthPercent: 400 - index * 10,
    placeId: null,
    primaryImageUrl: null,
    imageCopyrightType: null,
    imageAttribution: null,
    imageAttributionUrl: null,
  })),
} satisfies HotPlaceRankingResponse;

function rankingFetchMock(
  overrides: {
    place?: PlaceRankingResponse;
    hot?: HotPlaceRankingResponse;
  } = {},
) {
  return vi.fn<typeof fetch>().mockImplementation((input) => {
    const url = String(input);
    if (url.includes("/hot-place-rankings")) {
      return Promise.resolve(
        new Response(
          JSON.stringify(overrides.hot ?? hotPlaceRankingResponse),
          { status: 200 },
        ),
      );
    }
    return Promise.resolve(
      new Response(
        JSON.stringify(overrides.place ?? placeRankingResponse),
        { status: 200 },
      ),
    );
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  routerMocks.refresh.mockReset();
  if (previousApiBaseUrl === undefined) {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  } else {
    process.env.NEXT_PUBLIC_API_BASE_URL = previousApiBaseUrl;
  }
});

describe("DiscoveryContent", () => {
  it("loads the default all-audience rankings for the recommended page", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1";
    const fetchMock = rankingFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(
      await DiscoveryContent({ searchParams: Promise.resolve({}) }),
    );

    expect(
      screen.getByRole("heading", { name: "세대별 인기관광지 순위" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "세대별 핫플레이스" }),
    ).toBeVisible();
    expect(screen.getByRole("article", { name: "1위 에버랜드" })).toBeVisible();
    expect(screen.getByRole("article", { name: "1위 장릉" })).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/place-rankings?audience=all&limit=10",
      { cache: "no-store" },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/hot-place-rankings?audience=all&limit=10",
      { cache: "no-store" },
    );
  });

  it("loads the selected place-ranking audience from URL search params", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1";
    const fetchMock = rankingFetchMock({
      place: { ...placeRankingResponse, audience: "30s" },
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(
      await DiscoveryContent({
        searchParams: Promise.resolve({ audience: "30s" }),
      }),
    );

    const audienceNav = screen.getByRole("navigation", { name: "세대 필터" });
    expect(
      within(audienceNav).getByRole("link", { name: "30대" }),
    ).toHaveAttribute("aria-current", "true");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/place-rankings?audience=30s&limit=10",
      { cache: "no-store" },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/hot-place-rankings?audience=all&limit=10",
      { cache: "no-store" },
    );
  });

  it("loads the selected hot-place audience independently from URL search params", async () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000/api/v1";
    const fetchMock = rankingFetchMock({
      hot: { ...hotPlaceRankingResponse, audience: "40s" },
    });
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(
      await DiscoveryContent({
        searchParams: Promise.resolve({ hotAudience: "40s" }),
      }),
    );

    const hotNav = screen.getByRole("navigation", {
      name: "핫플레이스 세대 필터",
    });
    expect(
      within(hotNav).getByRole("link", { name: "40대" }),
    ).toHaveAttribute("aria-current", "true");
    const audienceNav = screen.getByRole("navigation", { name: "세대 필터" });
    expect(
      within(audienceNav).getByRole("link", { name: "전체" }),
    ).toHaveAttribute("aria-current", "true");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/hot-place-rankings?audience=40s&limit=10",
      { cache: "no-store" },
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/v1/place-rankings?audience=all&limit=10",
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
