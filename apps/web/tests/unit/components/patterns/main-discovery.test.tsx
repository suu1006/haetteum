import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type {
  HotPlaceRankingResponse,
  PlaceRankingResponse,
} from "@haetteum/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { DiscoverySearchPanel } from "@/components/patterns/discovery-search-panel";
import { FestivalSection } from "@/components/patterns/festival-section";
import { HotPlaceSection } from "@/components/patterns/hot-place-section";
import { MainDiscovery } from "@/components/patterns/main-discovery";
import { PopularPlacesTab } from "@/components/patterns/popular-places-tab";
import { RankedPlaceSection } from "@/components/patterns/ranked-place-section";
import {
  defaultDiscoveryQuery,
  parseDiscoveryQuery,
  selectDiscoveryView,
} from "@/features/discovery/discovery-model";
import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";
import type { HotPlaceRankingLoadState } from "@/features/discovery/hot-place-ranking-api";
import type { PlaceRankingLoadState } from "@/features/discovery/place-ranking-api";
import type { MonthlyFestivalsLoadState } from "@/features/festivals/festival-discovery-api";

const routerMocks = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

const rankingResponse = {
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
    placeId:
      index === 0 ? "84549352-0c20-4e11-af50-2d4f278f41ef" : null,
    primaryImageUrl: null,
    imageCopyrightType: null,
    imageAttribution: null,
    imageAttributionUrl: null,
  })),
} satisfies PlaceRankingResponse;

const readyRanking: PlaceRankingLoadState = {
  status: "ready",
  data: rankingResponse,
};

const hotRankingResponse = {
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
    placeId: index === 0 ? "84549352-0c20-4e11-af50-2d4f278f41ef" : null,
    primaryImageUrl: null,
    imageCopyrightType: null,
    imageAttribution: null,
    imageAttributionUrl: null,
  })),
} satisfies HotPlaceRankingResponse;

const readyHotRanking: HotPlaceRankingLoadState = {
  status: "ready",
  data: hotRankingResponse,
};

const readyMonthlyFestivals: MonthlyFestivalsLoadState = {
  status: "ready",
  items: [
    {
      id: "9f0c1e2a-1111-4aaa-8bbb-000000000001",
      title: "이천 도자기 축제",
      status: "ongoing",
      statusLabel: "진행 중",
      dateLabel: "2026. 8. 1. – 8. 31.",
      location: "경기 이천시",
      categoryLabel: "지역특산물축제",
      image: { src: null, alt: "이천 도자기 축제 대표 이미지" },
    },
  ],
};

describe("MainDiscovery", () => {
  it("renders the five approved main-page regions in order", () => {
    const view = selectDiscoveryView(mainDiscoveryMock, defaultDiscoveryQuery);

    renderWithQueryClient(
      <MainDiscovery
        data={mainDiscoveryMock}
        query={defaultDiscoveryQuery}
        view={view}
        ranking={readyRanking}
        hotRanking={readyHotRanking}
        weeklyPlaces={{ status: "ready", items: [{ id: "9f0c1e2a-1111-4aaa-8bbb-000000000001", title: "이천 도자기 마을", region: "gyeonggi", address: "경기 이천시", district: null, latitude: null, longitude: null, primaryImageUrl: null, imageCopyrightType: null }] }}
      />,
    );

    const landmarks = screen.getAllByTestId("main-region");
    expect(landmarks.map((node) => node.dataset.region)).toEqual([
      "hero",
      "tabs",
      "list",
      "banner",
      "navigation",
    ]);
    expect(
      screen.getByRole("heading", { name: "지금 만날 수 있는 축제 ✨" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "어디로 떠나볼까요?" }),
    ).toBeVisible();
    expect(screen.queryByRole("heading", { name: "세대별 인기관광지 순위" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "세대별 핫플레이스" })).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "지금 만날 수 있는 축제 순위" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "지역별 축제 둘러보기" })).not.toBeInTheDocument();
    expect(screen.getByText("여행자님, 반가워요")).toBeVisible();
    expect(screen.getByRole("button", { name: "알림" })).toBeVisible();
    const appHeader = screen
      .getByRole("heading", { name: "어디로 떠나볼까요?" })
      .closest("header");
    expect(appHeader).toHaveClass("pt-[25px]");
    expect(appHeader).not.toHaveClass("safe-area-top");
    expect(
      screen.queryByRole("img", { name: /풍경|해안|여행지/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "이번 주 가볼만한 곳" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("list", { name: "이번 주 추천 장소" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: "이천 도자기 마을" }),
    ).toHaveAttribute(
      "href",
      "/places/9f0c1e2a-1111-4aaa-8bbb-000000000001?tab=introduction",
    );
    expect(screen.getByRole("navigation", { name: "주요 메뉴" })).toBeVisible();
    expect(screen.getByRole("link", { name: "탐색" })).toHaveAttribute(
      "href",
      "/explore",
    );
    expect(screen.getByRole("link", { name: "내 일정" })).toHaveAttribute(
      "href",
      "/trips",
    );
    expect(screen.getByRole("link", { name: "마이페이지" })).toHaveAttribute(
      "href",
      "/mypage",
    );
  });

  it("places the moved festival slider before the AI banner and monthly festivals", () => {
    const view = selectDiscoveryView(mainDiscoveryMock, defaultDiscoveryQuery);

    renderWithQueryClient(
      <MainDiscovery
        data={mainDiscoveryMock}
        query={defaultDiscoveryQuery}
        view={view}
        ranking={readyRanking}
        hotRanking={readyHotRanking}
      />,
    );

    const listRegion = screen
      .getAllByTestId("main-region")
      .find((node) => node.dataset.region === "list");

    expect(listRegion).toBeDefined();
    expect(
      Array.from(listRegion?.children ?? []).map(
        (node) =>
          node.getAttribute("data-section") ?? node.getAttribute("data-region"),
      ),
    ).toEqual(["festival-ranking", "banner", "weekly-places"]);
  });

  it("falls back to recommendations when the disabled theme URL is requested", () => {
    const query = parseDiscoveryQuery({
      tab: "ai-course",
      region: "gyeonggi",
    });
    const view = selectDiscoveryView(mainDiscoveryMock, query);
    renderWithQueryClient(
      <MainDiscovery data={mainDiscoveryMock} query={query} view={view} />,
    );

    expect(
      screen.queryByRole("link", { name: "테마 여행" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "테마로 떠나는 여행" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "지금 만날 수 있는 축제 ✨" }),
    ).toBeVisible();
  });

  it("has no detectable accessibility violations on the assembled discovery surface", async () => {
    const view = selectDiscoveryView(mainDiscoveryMock, defaultDiscoveryQuery);

    const { container } = renderWithQueryClient(
      <MainDiscovery
        data={mainDiscoveryMock}
        query={defaultDiscoveryQuery}
        view={view}
        ranking={readyRanking}
        hotRanking={readyHotRanking}
      />,
    );
    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });

  it("keeps the shared discovery chrome above the festival page", () => {
    const query = parseDiscoveryQuery({ tab: "festivals", region: "jeju" });
    const view = selectDiscoveryView(mainDiscoveryMock, query);

    render(<MainDiscovery data={mainDiscoveryMock} query={query} view={view} />);

    expect(
      screen.queryByRole("heading", { name: "지금 만날 수 있는 축제 ✨" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "어디로 떠나볼까요?" }),
    ).toBeVisible();
    expect(screen.getByText("여행자님, 반가워요")).toBeVisible();
    expect(screen.getByRole("button", { name: "알림" })).toBeVisible();
    expect(screen.getByRole("link", { name: "관광 축제" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getAllByTestId("main-region").map((node) => node.dataset.region),
    ).toEqual(["hero", "tabs", "list", "navigation"]);
    expect(
      screen.queryByRole("heading", { name: "지역별 인기 관광지 TOP 3" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "지금 만날 수 있는 축제 순위" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "지역별 축제 둘러보기" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("list", { name: "지역별 축제" }))
        .getAllByRole("article")
        .map((item) => item.getAttribute("aria-label")),
    ).toEqual([
      "제주 여름빛 정원축제",
      "서귀포 등불 물빛축제",
      "제주 바다불꽃 문화제",
      "한림 수국 여름축제",
    ]);
    expect(
      screen.queryByRole("link", { name: "축제 보기" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the festival tab at the same shell width as the other tabs", () => {
    const popularQuery = parseDiscoveryQuery({
      tab: "places",
      region: "jeju",
    });
    const festivalQuery = parseDiscoveryQuery({
      tab: "festivals",
      region: "jeju",
    });
    const { container, rerender } = render(
      <MainDiscovery
        data={mainDiscoveryMock}
        query={popularQuery}
        view={selectDiscoveryView(mainDiscoveryMock, popularQuery)}
      />,
    );

    expect(container.firstElementChild).toHaveClass("max-w-[30rem]");

    rerender(
      <MainDiscovery
        data={mainDiscoveryMock}
        query={festivalQuery}
        view={selectDiscoveryView(mainDiscoveryMock, festivalQuery)}
      />,
    );

    expect(container.firstElementChild).toHaveClass("max-w-[30rem]");
    expect(
      screen
        .getAllByTestId("main-region")
        .find((node) => node.dataset.region === "navigation"),
    ).toHaveClass("max-w-[30rem]");
  });

  it("shows both rankings without reels on the popular-place tab", () => {
    const query = parseDiscoveryQuery({ q: "", region: "jeju", tab: "places" });
    const view = selectDiscoveryView(mainDiscoveryMock, query);

    render(<MainDiscovery data={mainDiscoveryMock} query={query} view={view} />);

    expect(screen.queryByRole("heading", { name: "릴스형 인기 관광지" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "세대별 인기관광지 순위" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "세대별 핫플레이스" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "지역별 인기 관광지 TOP 3" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "이번 달 인기 축제" }),
    ).not.toBeInTheDocument();
  });

  it("does not expose unpersisted festival engagement controls", () => {
    const query = parseDiscoveryQuery({ tab: "festivals", region: "jeju" });
    const view = selectDiscoveryView(mainDiscoveryMock, query);

    render(<MainDiscovery data={mainDiscoveryMock} query={query} view={view} />);

    expect(
      screen.queryByRole("button", { name: /축제.*저장/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/인기 98%/)).not.toBeInTheDocument();
  });

  it("offers the reference region order and marks Jeju as selected", () => {
    const query = parseDiscoveryQuery({ tab: "festivals", region: "jeju" });
    const view = selectDiscoveryView(mainDiscoveryMock, query);

    render(<MainDiscovery data={mainDiscoveryMock} query={query} view={view} />);

    expect(
      within(screen.getByRole("navigation", { name: "축제 지역" }))
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["전체", "제주", "서울", "부산", "강원", "경주", "전주"]);
    expect(screen.getByRole("link", { name: "제주" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("distinguishes festival loading errors from valid empty results", () => {
    const query = parseDiscoveryQuery({ tab: "festivals", region: "jeju" });
    const errorData = {
      ...mainDiscoveryMock,
      festivalDiscovery: {
        ...mainDiscoveryMock.festivalDiscovery,
        ranking: [],
        festivals: [],
        loadState: "error" as const,
      },
    };
    const { rerender } = render(
      <MainDiscovery
        data={errorData}
        query={query}
        view={selectDiscoveryView(errorData, query)}
      />,
    );

    expect(screen.getByText("축제 정보를 불러오지 못했어요.")).toBeVisible();
    expect(screen.getByText("잠시 후 다시 시도해 주세요.")).toBeVisible();

    const emptyData = {
      ...errorData,
      festivalDiscovery: {
        ...errorData.festivalDiscovery,
        loadState: "ready" as const,
      },
    };
    rerender(
      <MainDiscovery
        data={emptyData}
        query={query}
        view={selectDiscoveryView(emptyData, query)}
      />,
    );
    expect(
      screen.getByText("선택한 지역에 예정된 축제가 없어요."),
    ).toBeVisible();
    expect(
      screen.queryByText("축제 정보를 불러오지 못했어요."),
    ).not.toBeInTheDocument();
  });

  it("has no detectable accessibility violations on the festival tab", async () => {
    const query = parseDiscoveryQuery({ tab: "festivals", region: "jeju" });
    const view = selectDiscoveryView(mainDiscoveryMock, query);
    const { container } = render(
      <MainDiscovery data={mainDiscoveryMock} query={query} view={view} />,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});

describe("DiscoverySearchPanel", () => {
  it("keeps the selected tab in accessible link state", () => {
    render(
      <DiscoverySearchPanel
        query={{ ...defaultDiscoveryQuery, tab: "places" }}
      />,
    );

    expect(screen.getByRole("link", { name: "인기 관광지" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("opens the festival tab with the whole country selected", () => {
    render(<DiscoverySearchPanel query={defaultDiscoveryQuery} />);

    expect(screen.getByRole("link", { name: "관광 축제" })).toHaveAttribute(
      "href",
      "/?region=all&tab=festivals",
    );
  });

  it("builds every tab link without a scroll-target fragment", () => {
    render(
      <DiscoverySearchPanel
        query={{ ...defaultDiscoveryQuery, tab: "places" }}
      />,
    );

    const tabs = within(
      screen.getByRole("navigation", { name: "탐색 분류" }),
    ).getAllByRole("link");

    expect(tabs).toHaveLength(3);
    for (const tab of tabs) {
      expect(tab.getAttribute("href")).not.toContain("#");
    }
  });

  it("uses underline tabs with the approved labels", () => {
    render(
      <DiscoverySearchPanel
        query={{ ...defaultDiscoveryQuery, tab: "places" }}
      />,
    );

    expect(
      screen.getAllByRole("link").map((link) => link.textContent),
    ).toEqual(["추천", "인기 관광지", "관광 축제"]);
    expect(screen.getByRole("link", { name: "인기 관광지" })).toHaveClass(
      "border-b-2",
      "aria-[current=page]:border-primary",
    );
    expect(screen.getByRole("link", { name: "인기 관광지" })).not.toHaveClass(
      "rounded-full",
      "bg-primary",
    );
  });
});

describe("RankedPlaceSection", () => {
  it("renders ten nationwide API ranking cards with the period and age filters", () => {
    render(<RankedPlaceSection ranking={readyRanking} query={defaultDiscoveryQuery} />);

    expect(
      screen.getByRole("heading", { name: "세대별 인기관광지 순위" }),
    ).toBeVisible();
    expect(screen.getByText("전국 · 2025.08~2026.07")).toBeVisible();
    expect(
      within(screen.getByRole("navigation", { name: "세대 필터" }))
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["전체", "20대", "30대", "40대", "50대", "60대 이상"]);
    const list = screen.getByRole("list", { name: "세대별 인기관광지 순위" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(10);
    expect(screen.getByRole("link", { name: /1위 에버랜드/ })).toHaveAttribute(
      "href",
      "/places/84549352-0c20-4e11-af50-2d4f278f41ef?tab=introduction",
    );
  });

  it("marks the selected audience and keeps age-filter navigation free of scroll fragments", () => {
    const query = { ...defaultDiscoveryQuery, audience: "30s" as const };
    render(
      <>
        <RankedPlaceSection
          ranking={{
            ...readyRanking,
            data: { ...rankingResponse, audience: "30s" },
          }}
          query={query}
        />
        <DiscoverySearchPanel query={query} />
      </>,
    );

    expect(screen.getByRole("link", { name: "30대" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("link", { name: "30대" })).toHaveAttribute(
      "href",
      "/?region=gyeonggi&tab=recommended&audience=30s",
    );
    expect(screen.getByRole("link", { name: "관광 축제" })).toHaveAttribute(
      "href",
      expect.stringContaining("audience=30s"),
    );
  });

  it("restores the saved vertical position after age-filter navigation", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const targetHref = "/?region=gyeonggi&tab=recommended&audience=20s";
    window.history.replaceState(null, "", targetHref);
    window.sessionStorage.setItem(
      "haetteum:ranked-place-audience:scroll",
      JSON.stringify({ href: targetHref, scrollY: 334 }),
    );

    try {
      render(
        <RankedPlaceSection
          ranking={{
            ...readyRanking,
            data: { ...rankingResponse, audience: "20s" },
          }}
          query={{ ...defaultDiscoveryQuery, audience: "20s" }}
        />,
      );

      await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 334));
      expect(
        window.sessionStorage.getItem(
          "haetteum:ranked-place-audience:scroll",
        ),
      ).toBeNull();
    } finally {
      window.history.replaceState(null, "", "/");
      window.sessionStorage.removeItem(
        "haetteum:ranked-place-audience:scroll",
      );
      scrollTo.mockRestore();
    }
  });

  it("saves the current vertical position before age-filter navigation", () => {
    const previousScrollY = window.scrollY;
    Object.defineProperty(window, "scrollY", {
      configurable: true,
      value: 334,
    });
    window.sessionStorage.removeItem(
      "haetteum:ranked-place-audience:scroll",
    );

    try {
      render(
        <RankedPlaceSection
          ranking={readyRanking}
          query={defaultDiscoveryQuery}
        />,
      );
      const twentiesLink = screen.getByRole("link", { name: "20대" });
      twentiesLink.addEventListener("click", (event) => event.preventDefault());

      fireEvent.click(twentiesLink);

      expect(
        JSON.parse(
          window.sessionStorage.getItem(
            "haetteum:ranked-place-audience:scroll",
          ) ?? "null",
        ),
      ).toEqual({
        href: "/?region=gyeonggi&tab=recommended&audience=20s",
        scrollY: 334,
      });
    } finally {
      Object.defineProperty(window, "scrollY", {
        configurable: true,
        value: previousScrollY,
      });
      window.sessionStorage.removeItem(
        "haetteum:ranked-place-audience:scroll",
      );
    }
  });

  it("shows the first-ranked place after the audience changes", () => {
    const { rerender } = render(
      <RankedPlaceSection
        ranking={readyRanking}
        query={defaultDiscoveryQuery}
      />,
    );
    const initialList = screen.getByRole("list", {
      name: "세대별 인기관광지 순위",
    });
    initialList.scrollLeft = 320;

    rerender(
      <RankedPlaceSection
        ranking={{
          status: "ready",
          data: { ...rankingResponse, audience: "30s" },
        }}
        query={{ ...defaultDiscoveryQuery, audience: "30s" }}
      />,
    );

    expect(
      screen.getByRole("list", { name: "세대별 인기관광지 순위" }),
    ).toHaveProperty("scrollLeft", 0);
  });

  it("shows an error state without restoring mock ranking cards", () => {
    render(<RankedPlaceSection ranking={{ status: "error" }} query={defaultDiscoveryQuery} />);

    expect(screen.getByText("인기 관광지 순위 정보를 불러오지 못했어요.")).toBeVisible();
    expect(screen.getByText("잠시 후 다시 시도해 주세요.")).toBeVisible();
    expect(screen.getByRole("button", { name: "다시 시도하기" })).toBeVisible();
    expect(screen.queryByRole("article", { name: /이천 테르메덴/ })).not.toBeInTheDocument();
  });

  it("treats an incomplete ranking response as a retryable error", () => {
    render(
      <RankedPlaceSection
        ranking={{
          status: "ready",
          data: { ...rankingResponse, items: rankingResponse.items.slice(0, 9) },
        }}
        query={defaultDiscoveryQuery}
      />,
    );

    expect(screen.getByText("인기 관광지 순위 정보를 불러오지 못했어요.")).toBeVisible();
    expect(screen.getByRole("button", { name: "다시 시도하기" })).toBeVisible();
    expect(
      screen.queryByRole("list", { name: "세대별 인기관광지 순위" }),
    ).not.toBeInTheDocument();
  });
});

describe("HotPlaceSection", () => {
  it("renders ten nationwide hot-place cards with the base month and age filters", () => {
    render(
      <HotPlaceSection
        ranking={readyHotRanking}
        query={defaultDiscoveryQuery}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "세대별 핫플레이스" }),
    ).toBeVisible();
    expect(screen.getByText("전국 · 2026.07")).toBeVisible();
    expect(
      within(
        screen.getByRole("navigation", { name: "핫플레이스 세대 필터" }),
      )
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["전체", "20대", "30대", "40대", "50대", "60대 이상"]);
    const list = screen.getByRole("list", { name: "세대별 핫플레이스" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(10);
    expect(screen.getByText("방문 급상승 400.0%")).toBeVisible();
    expect(screen.getByRole("link", { name: /1위 장릉/ })).toHaveAttribute(
      "href",
      "/places/84549352-0c20-4e11-af50-2d4f278f41ef?tab=introduction",
    );
  });

  it("marks the selected hot-place audience and links with hotAudience", () => {
    const query = { ...defaultDiscoveryQuery, hotAudience: "50s" as const };
    render(<HotPlaceSection ranking={readyHotRanking} query={query} />);

    const link = within(
      screen.getByRole("navigation", { name: "핫플레이스 세대 필터" }),
    ).getByRole("link", { name: "50대" });
    expect(link).toHaveAttribute("aria-current", "true");
    expect(link).toHaveAttribute(
      "href",
      "/?region=gyeonggi&tab=recommended&hotAudience=50s",
    );
  });

  it("shows a retryable error state for an incomplete hot-place response", () => {
    render(
      <HotPlaceSection
        ranking={{
          status: "ready",
          data: {
            ...hotRankingResponse,
            items: hotRankingResponse.items.slice(0, 9),
          },
        }}
        query={defaultDiscoveryQuery}
      />,
    );

    expect(screen.getByText("핫플레이스 정보를 불러오지 못했어요.")).toBeVisible();
    expect(screen.getByRole("button", { name: "다시 시도하기" })).toBeVisible();
    expect(
      screen.queryByRole("list", { name: "세대별 핫플레이스" }),
    ).not.toBeInTheDocument();
  });
});

describe("FestivalSection", () => {
  it("renders the monthly festivals in a labelled list", () => {
    render(<FestivalSection festivals={readyMonthlyFestivals.items} />);

    const list = screen.getByRole("list", { name: "축제 일정" });
    const listItems = within(list).getAllByRole("listitem");

    expect(
      screen.getByRole("heading", { name: "이번 달 인기 축제" }),
    ).toBeVisible();
    expect(listItems).toHaveLength(1);
    expect(listItems[0]).not.toHaveAccessibleName();
    expect(list).toContainElement(
      screen.getByRole("article", { name: "이천 도자기 축제" }),
    );
  });

  it("shows an empty-state notice when there are no monthly festivals", () => {
    render(<FestivalSection festivals={[]} />);

    expect(
      screen.getByText("이번 달에 열리는 축제 정보가 없어요."),
    ).toBeVisible();
    expect(screen.queryByRole("list", { name: "축제 일정" })).toBeNull();
  });
});

describe("PopularPlacesTab", () => {
  it("renders the popular-place sections in the approved order", () => {
    render(
      <PopularPlacesTab
        query={{ ...defaultDiscoveryQuery, tab: "places" }}
      />,
    );

    expect(
      screen.getAllByTestId("popular-place-section").map((node) =>
        node.getAttribute("data-section"),
      ),
    ).toEqual(["popular-videos"]);
    expect(
      screen.getByRole("heading", { name: "릴스형 인기 관광지" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "여행 테마" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "영상으로 둘러보기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("article", { name: "짧게 보고 바로 저장" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "이전 슬라이드" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "다음 슬라이드" }),
    ).not.toBeInTheDocument();
  });

  it("offers a region filter for the reel feed without an age filter", () => {
    render(
      <PopularPlacesTab
        query={{ ...defaultDiscoveryQuery, tab: "places", reelRegion: "jeju" }}
      />,
    );

    expect(
      screen.queryByRole("navigation", { name: "세대 필터" }),
    ).not.toBeInTheDocument();

    const regionNav = screen.getByRole("navigation", {
      name: "릴스 지역 필터",
    });
    const jejuLink = within(regionNav).getByRole("link", { name: "제주" });
    expect(jejuLink).toHaveAttribute("aria-current", "true");
    expect(
      within(regionNav).getByRole("link", { name: "서울" }),
    ).toHaveAttribute("href", "/?region=gyeonggi&tab=places&reelRegion=seoul");
  });

  it("offers a reset action when no popular place matches", () => {
    render(
      <PopularPlacesTab
        query={{
          ...defaultDiscoveryQuery,
          q: "해당없음",
          region: "busan",
          tab: "places",
        }}
      />,
    );

    expect(
      screen.getByText("조건에 맞는 인기 관광지를 찾지 못했어요."),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "검색어 지우기" })).toHaveAttribute(
      "href",
      "/?region=busan&tab=places#places",
    );
  });

  it("has no detectable accessibility violations on the popular-place tab", async () => {
    const { container } = render(
      <PopularPlacesTab
        query={{ ...defaultDiscoveryQuery, tab: "places" }}
      />,
    );

    expect(
      (
        await axe.run(container, {
          rules: { "color-contrast": { enabled: false } },
        })
      ).violations,
    ).toEqual([]);
  });
});
