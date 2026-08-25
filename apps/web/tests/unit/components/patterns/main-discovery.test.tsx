import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

import { DiscoverySearchPanel } from "@/components/patterns/discovery-search-panel";
import { FestivalSection } from "@/components/patterns/festival-section";
import { MainDiscovery } from "@/components/patterns/main-discovery";
import { PopularPlacesTab } from "@/components/patterns/popular-places-tab";
import { RankedPlaceSection } from "@/components/patterns/ranked-place-section";
import {
  defaultDiscoveryQuery,
  parseDiscoveryQuery,
  selectDiscoveryView,
} from "@/features/discovery/discovery-model";
import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";

describe("MainDiscovery", () => {
  it("renders the five approved main-page regions in order", () => {
    const view = selectDiscoveryView(mainDiscoveryMock, defaultDiscoveryQuery);

    render(
      <MainDiscovery
        data={mainDiscoveryMock}
        query={defaultDiscoveryQuery}
        view={view}
      />,
    );

    const landmarks = screen.getAllByTestId("main-region");
    expect(landmarks.map((node) => node.dataset.region)).toEqual([
      "hero",
      "search",
      "list",
      "banner",
      "navigation",
    ]);
    expect(
      screen.getByRole("heading", { name: "지역별 인기 관광지 TOP 3" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "어디로 떠나볼까요?" }),
    ).toBeVisible();
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
      screen.getByRole("heading", { name: "이번 주 인기 축제" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("list", { name: "축제 일정" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: "이천쌀문화축제" }),
    ).toHaveAttribute("href", "/festivals/icheon-rice-cultural-festival");
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

  it("places the AI banner between ranked places and festivals inside the list region", () => {
    const view = selectDiscoveryView(mainDiscoveryMock, defaultDiscoveryQuery);

    render(
      <MainDiscovery
        data={mainDiscoveryMock}
        query={defaultDiscoveryQuery}
        view={view}
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
    ).toEqual(["places", "banner", "festivals"]);
  });

  it("falls back to recommendations when the disabled theme URL is requested", () => {
    const query = parseDiscoveryQuery({
      tab: "ai-course",
      region: "gyeonggi",
    });
    const view = selectDiscoveryView(mainDiscoveryMock, query);
    render(
      <MainDiscovery data={mainDiscoveryMock} query={query} view={view} />,
    );

    expect(
      screen.queryByRole("link", { name: "테마 여행" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "테마로 떠나는 여행" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "지역별 인기 관광지 TOP 3" }),
    ).toBeVisible();
  });

  it("has no detectable accessibility violations on the assembled discovery surface", async () => {
    const view = selectDiscoveryView(mainDiscoveryMock, defaultDiscoveryQuery);

    const { container } = render(
      <MainDiscovery
        data={mainDiscoveryMock}
        query={defaultDiscoveryQuery}
        view={view}
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
      screen.getByRole("heading", { name: "요즘 뜨는 축제 ✨" }),
    ).toBeVisible();
    expect(screen.getByRole("search")).toBeVisible();
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
    ).toEqual(["hero", "search", "list", "navigation"]);
    expect(
      screen.queryByRole("heading", { name: "지역별 인기 관광지 TOP 3" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("list", { name: "요즘 뜨는 축제 순위" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("list", { name: "요즘 뜨는 축제 순위" }))
        .getAllByRole("listitem")
        .map((item) => item.textContent?.match(/[123]/)?.[0]),
    ).toEqual([
      "3",
      "1",
      "2",
    ]);
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
    expect(screen.getByRole("link", { name: "축제 보기" })).toHaveAttribute(
      "href",
      "/festivals/jeju-summer-light-garden",
    );
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

  it("replaces the ranking feed only on the popular-place tab", () => {
    const query = parseDiscoveryQuery({ q: "", region: "jeju", tab: "places" });
    const view = selectDiscoveryView(mainDiscoveryMock, query);

    render(<MainDiscovery data={mainDiscoveryMock} query={query} view={view} />);

    expect(screen.getByRole("heading", { name: "릴스형 인기 관광지" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "여행 테마" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "지금 뜨는 영상 코스" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "지역별 인기 관광지 TOP 3" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "이번 주 인기 축제" }),
    ).not.toBeInTheDocument();
  });

  it("toggles the featured festival bookmark", async () => {
    const user = userEvent.setup();
    const query = parseDiscoveryQuery({ tab: "festivals", region: "jeju" });
    const view = selectDiscoveryView(mainDiscoveryMock, query);

    render(<MainDiscovery data={mainDiscoveryMock} query={query} view={view} />);

    const featuredSave = screen.getByRole("button", {
      name: "제주 여름빛 정원축제 저장",
    });
    expect(featuredSave).toHaveAttribute("aria-pressed", "false");
    await user.click(featuredSave);
    expect(featuredSave).toHaveAttribute("aria-pressed", "true");
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

  it("submits search with preserved tab and region values", () => {
    render(
      <DiscoverySearchPanel
        query={{
          ...defaultDiscoveryQuery,
          q: "해변",
          tab: "festivals",
          festivalFilters: {
            ...defaultDiscoveryQuery.festivalFilters,
            free: true,
          },
        }}
      />,
    );

    const search = screen.getByRole("search");

    expect(search).toHaveAttribute("method", "get");
    expect(
      within(search).getByRole("searchbox", { name: "여행지 검색" }),
    ).toHaveAttribute("name", "q");
    expect(
      search.querySelector('input[type="hidden"][name="tab"]'),
    ).toHaveValue("festivals");
    expect(search.querySelector('input[type="hidden"][name="region"]')).toHaveValue(
      "gyeonggi",
    );
    expect(
      search.querySelector('input[type="hidden"][name="festivalPrice"]'),
    ).toHaveValue("free");
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
  it("renders ranked places in a horizontal snap list without a visible scrollbar", () => {
    render(
      <RankedPlaceSection
        places={mainDiscoveryMock.places.slice(0, 3)}
        query={defaultDiscoveryQuery}
        regions={mainDiscoveryMock.regions}
      />,
    );

    const list = screen.getByRole("list", { name: "지역별 인기 관광지" });
    const listItems = within(list).getAllByRole("listitem");

    expect(
      screen.getByRole("heading", { name: "지역별 인기 관광지 TOP 3" }),
    ).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "지역 필터" }),
    ).toContainElement(screen.getByRole("link", { name: "경기" }));
    expect(screen.getByRole("link", { name: "경기" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(listItems).toHaveLength(3);
    expect(list).toHaveClass(
      "flex",
      "overflow-x-auto",
      "snap-x",
      "scrollbar-none",
    );
    expect(listItems[0]).toHaveClass("shrink-0", "snap-start");
    expect(listItems[0]).not.toHaveAccessibleName();
    expect(list).toContainElement(
      screen.getByRole("article", { name: "1위 이천 테르메덴" }),
    );
  });

  it("opens home ranked places on the course recommendation tab", () => {
    render(
      <RankedPlaceSection
        places={mainDiscoveryMock.places.slice(0, 3)}
        query={defaultDiscoveryQuery}
        regions={mainDiscoveryMock.regions}
      />,
    );

    expect(
      screen.getByRole("link", { name: /1위 이천 테르메덴/ }),
    ).toHaveAttribute("href", "/places/icheon-termeden?tab=course");
  });

  it("offers a query reset link when no ranked places match", () => {
    render(
      <RankedPlaceSection
        places={[]}
        query={{
          ...defaultDiscoveryQuery,
          q: "해변",
          region: "busan",
        }}
      />,
    );

    expect(
      screen.getByText("선택한 지역에서 조건에 맞는 관광지를 찾지 못했어요."),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "검색어 지우기" })).toHaveAttribute(
      "href",
      "/?region=busan&tab=recommended#places",
    );
  });
});

describe("FestivalSection", () => {
  it("renders festivals in a labelled list", () => {
    const festivals = mainDiscoveryMock.festivals.filter(
      (festival) => festival.region === "jeju",
    );

    render(<FestivalSection festivals={festivals} />);

    const list = screen.getByRole("list", { name: "축제 일정" });
    const listItems = within(list).getAllByRole("listitem");

    expect(screen.getByRole("heading", { name: "이번 주 인기 축제" })).toBeVisible();
    expect(listItems).toHaveLength(6);
    expect(listItems[0]).not.toHaveAccessibleName();
    expect(list).toContainElement(
      screen.getByRole("article", { name: "제주 여름빛 정원축제" }),
    );
  });

  it("offers a query reset link when no festivals match", () => {
    render(
      <FestivalSection
        festivals={[]}
        query={{
          ...defaultDiscoveryQuery,
          q: "꽃",
          region: "gangwon",
        }}
      />,
    );

    expect(screen.getByText("조건에 맞는 축제를 찾지 못했어요.")).toBeVisible();
    expect(screen.getByRole("link", { name: "검색어 지우기" })).toHaveAttribute(
      "href",
      "/?region=gangwon&tab=recommended#festivals",
    );
  });
});

describe("PopularPlacesTab", () => {
  it("renders the popular-place sections in the approved order", () => {
    render(
      <PopularPlacesTab
        videos={mainDiscoveryMock.popularPlaces.videos}
        themes={mainDiscoveryMock.popularPlaces.themes}
        courses={mainDiscoveryMock.popularPlaces.courses}
        query={{ ...defaultDiscoveryQuery, tab: "places" }}
      />,
    );

    expect(
      screen.getAllByTestId("popular-place-section").map((node) =>
        node.getAttribute("data-section"),
      ),
    ).toEqual(["popular-videos", "travel-themes", "video-courses"]);
    expect(
      screen.getByRole("heading", { name: "릴스형 인기 관광지" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "여행 테마" })).toHaveClass(
      "sr-only",
    );
    expect(
      screen.getByRole("heading", { name: "지금 뜨는 영상 코스" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "영상으로 둘러보기" }),
    ).toHaveAttribute("href", "/reels/seongsan-sunrise-preview");
    expect(screen.getAllByText("더보기")).toHaveLength(2);
    const videoCourseList = screen.getByRole("list", {
      name: "지금 뜨는 영상 코스 목록",
    });
    expect(videoCourseList).toHaveClass("grid", "grid-cols-2");
    expect(within(videoCourseList).getAllByRole("listitem")).toHaveLength(
      mainDiscoveryMock.popularPlaces.courses.length,
    );
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

  it("preloads only the first popular short-video preview", () => {
    const { container } = render(
      <PopularPlacesTab
        videos={mainDiscoveryMock.popularPlaces.videos}
        themes={mainDiscoveryMock.popularPlaces.themes}
        courses={mainDiscoveryMock.popularPlaces.courses}
        query={{ ...defaultDiscoveryQuery, tab: "places" }}
      />,
    );

    const videos = container.querySelectorAll("video");
    expect(videos[0]).toHaveAttribute("preload", "metadata");
    for (const video of Array.from(videos).slice(1)) {
      expect(video).toHaveAttribute("preload", "none");
    }
  });

  it("shows video courses in a two-column grid", () => {
    render(
      <PopularPlacesTab
        videos={mainDiscoveryMock.popularPlaces.videos}
        themes={mainDiscoveryMock.popularPlaces.themes}
        courses={mainDiscoveryMock.popularPlaces.courses}
        query={{ ...defaultDiscoveryQuery, tab: "places" }}
      />,
    );

    const videoCourseList = screen.getByRole("list", {
      name: "지금 뜨는 영상 코스 목록",
    });
    const items = within(videoCourseList).getAllByRole("listitem");

    expect(videoCourseList).toHaveClass("grid", "grid-cols-2");
    expect(items).toHaveLength(4);
    expect(
      screen.queryByRole("region", { name: "지금 뜨는 영상 코스 목록" }),
    ).not.toBeInTheDocument();
  });

  it("offers a reset action while keeping travel themes visible", () => {
    render(
      <PopularPlacesTab
        videos={[]}
        themes={mainDiscoveryMock.popularPlaces.themes}
        courses={[]}
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
    expect(screen.getByRole("heading", { name: "여행 테마" })).toHaveClass(
      "sr-only",
    );
  });

  it("has no detectable accessibility violations on the popular-place tab", async () => {
    const { container } = render(
      <PopularPlacesTab
        videos={mainDiscoveryMock.popularPlaces.videos}
        themes={mainDiscoveryMock.popularPlaces.themes}
        courses={mainDiscoveryMock.popularPlaces.courses}
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
