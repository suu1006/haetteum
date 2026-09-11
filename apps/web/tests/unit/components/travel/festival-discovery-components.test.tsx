import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AiCourseBanner } from "@/components/travel/ai-course-banner";
import { FestivalFeatureBanner } from "@/components/travel/festival-feature-banner";
import { FestivalFilterGroup } from "@/components/travel/festival-filter-group";
import { FestivalDiscoveryListItem } from "@/components/travel/festival-discovery-list-item";
import { FestivalRankingShowcase } from "@/components/travel/festival-ranking-showcase";
import { defaultDiscoveryQuery } from "@/features/discovery/discovery-model";
import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";

describe("FestivalDiscoveryListItem", () => {
  const festival = mainDiscoveryMock.festivalDiscovery.festivals[0];

  it("shows factual status, dates, address, and category", () => {
    render(<FestivalDiscoveryListItem festival={festival} />);

    expect(screen.getByText("진행 중")).toBeVisible();
    expect(screen.getByText(festival.dateLabel)).toBeVisible();
    expect(screen.getByText(festival.location)).toBeVisible();
    expect(screen.getByText(festival.categoryLabel)).toBeVisible();
    expect(screen.queryByText(/저장/)).not.toBeInTheDocument();
  });
});

describe("FestivalFilterGroup", () => {
  it("marks active URL filters and preserves the discovery context", () => {
    render(
      <FestivalFilterGroup
        query={{
          ...defaultDiscoveryQuery,
          q: "꽃",
          tab: "festivals",
          festivalFilters: {
            ...defaultDiscoveryQuery.festivalFilters,
            thisWeek: true,
          },
        }}
      />,
    );

    expect(screen.getByRole("link", { name: /이번 주/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("link", { name: /무료/ })).toHaveAttribute(
      "href",
      expect.stringContaining("q=%EA%BD%83"),
    );
  });
});

describe("FestivalRankingShowcase", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps each ranking card presentation synchronized with the carousel position", async () => {
    render(
      <FestivalRankingShowcase
        festivals={mainDiscoveryMock.festivalDiscovery.ranking}
      />,
    );

    const featuredLayer = screen.getByRole("article", {
      name: "1위 제주 여름빛 정원축제",
    }).parentElement;
    const nextCompactLayer = screen.getByRole("button", {
      name: "2위 제주 바다불꽃 문화제 선택",
    }).parentElement;

    await waitFor(() => {
      expect(featuredLayer).toHaveStyle({
        opacity: "1",
        scale: "none",
        transform: "translateX(-50%) scale(1)",
        translate: "none",
      });
      expect(nextCompactLayer).toHaveStyle({
        left: "25%",
        opacity: "1",
        scale: "none",
        transform: "translateX(-50%) scale(1)",
        translate: "none",
      });
      expect(featuredLayer?.style.scale).toBe("none");
      expect(featuredLayer?.style.translate).toBe("none");
      expect(nextCompactLayer?.style.scale).toBe("none");
      expect(nextCompactLayer?.style.translate).toBe("none");
    });
  });

  it("eagerly loads every ranking image needed during a swipe", () => {
    const { container } = render(
      <FestivalRankingShowcase
        festivals={mainDiscoveryMock.festivalDiscovery.ranking}
      />,
    );

    for (const image of container.querySelectorAll("[data-ranking-layer] img")) {
      expect(image).toHaveAttribute("loading", "eager");
    }
  });

  it("keeps festival images from taking over the horizontal drag gesture", () => {
    render(
      <FestivalRankingShowcase
        festivals={mainDiscoveryMock.festivalDiscovery.ranking}
      />,
    );

    const ranking = screen.getByRole("list", {
      name: "지금 만날 수 있는 축제 순위",
    });

    for (const image of within(ranking).getAllByRole("img")) {
      expect(image).toHaveAttribute("draggable", "false");
    }
  });

  it("cycles the selected festival through ranks 1, 2, 3 and back to 1", async () => {
    const user = userEvent.setup();

    render(
      <FestivalRankingShowcase
        festivals={mainDiscoveryMock.festivalDiscovery.ranking}
      />,
    );

    expect(
      screen.getByRole("article", { name: "1위 제주 여름빛 정원축제" }),
    ).toHaveAttribute("aria-current", "true");

    await user.click(
      screen.getByRole("button", { name: "2위 제주 바다불꽃 문화제 선택" }),
    );
    expect(
      screen.getByRole("article", { name: "2위 제주 바다불꽃 문화제" }),
    ).toHaveAttribute("aria-current", "true");

    await user.click(
      screen.getByRole("button", { name: "3위 서귀포 등불 물빛축제 선택" }),
    );
    expect(
      screen.getByRole("article", { name: "3위 서귀포 등불 물빛축제" }),
    ).toHaveAttribute("aria-current", "true");

    await user.click(
      screen.getByRole("button", { name: "1위 제주 여름빛 정원축제 선택" }),
    );
    expect(
      screen.getByRole("article", { name: "1위 제주 여름빛 정원축제" }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("shows factual status and dates without fake popularity or engagement", () => {
    render(
      <FestivalRankingShowcase
        festivals={mainDiscoveryMock.festivalDiscovery.ranking}
      />,
    );

    expect(screen.getAllByText("진행 중").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2026. 8. 22. – 8. 30.").length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText(/인기 98%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/저장 8.2만/)).not.toBeInTheDocument();
    expect(screen.queryByText(/후기 2.6천/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /저장/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "축제 보기" }),
    ).not.toBeInTheDocument();
  });

  it("automatically cycles through ranks 1, 2, 3 and back to 1 every five seconds", () => {
    vi.useFakeTimers();

    render(
      <FestivalRankingShowcase
        festivals={mainDiscoveryMock.festivalDiscovery.ranking}
      />,
    );

    for (const rank of [2, 3, 1]) {
      act(() => {
        vi.advanceTimersByTime(5_000);
      });

      expect(
        screen.getByRole("article", { name: new RegExp(`^${rank}위`) }),
      ).toHaveAttribute("aria-current", "true");
    }
  });

  it("keeps the visible ranking card clickable while the carousel is mid-transition", () => {
    vi.useFakeTimers();

    const { container } = render(
      <FestivalRankingShowcase
        festivals={mainDiscoveryMock.festivalDiscovery.ranking}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    // 화면에 보이는 카드가 곧 링크를 받는 카드여야 한다.
    // 예전에는 보이는 모습만 스크롤 위치를 따라가고 pointer-events는
    // React 상태를 따라가서, 전환 중에 보이는 카드가 클릭을 삼켰다.
    for (const slide of container.querySelectorAll<HTMLElement>(
      "[role='listitem']",
    )) {
      const activeLayer = slide.querySelector<HTMLElement>(
        "[data-ranking-layer='active']",
      );
      const compactLayer = slide.querySelector<HTMLElement>(
        "[data-ranking-layer='compact']",
      );
      const visible = Number(activeLayer?.style.opacity) > 0.5;

      expect(activeLayer?.style.pointerEvents).toBe(visible ? "auto" : "none");
      expect(compactLayer?.style.pointerEvents).toBe(visible ? "none" : "auto");
      expect(slide.style.zIndex).toBe(visible ? "10" : "0");
    }
  });

  it("restarts the five-second countdown after a manual selection", () => {
    vi.useFakeTimers();

    render(
      <FestivalRankingShowcase
        festivals={mainDiscoveryMock.festivalDiscovery.ranking}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    fireEvent.click(
      screen.getByRole("button", {
        name: "2위 제주 바다불꽃 문화제 선택",
      }),
    );

    act(() => {
      vi.advanceTimersByTime(4_999);
    });
    expect(
      screen.getByRole("article", { name: "2위 제주 바다불꽃 문화제" }),
    ).toHaveAttribute("aria-current", "true");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(
      screen.getByRole("article", { name: "3위 서귀포 등불 물빛축제" }),
    ).toHaveAttribute("aria-current", "true");
  });
});

describe("FestivalFeatureBanner", () => {
  it("renders the monthly festival feature from props", () => {
    render(<FestivalFeatureBanner feature={mainDiscoveryMock.festivalFeature} />);

    expect(
      screen.getByRole("heading", { name: "제주 가을 산책 주간" }),
    ).toBeVisible();
    expect(screen.getByText("2026. 9. 19. – 10. 11.")).toBeVisible();
  });
});

describe("AiCourseBanner festival copy", () => {
  it("uses injected festival copy without changing its interaction", async () => {
    const user = userEvent.setup();
    const onRecommend = vi.fn();

    render(
      <AiCourseBanner
        imageAlt="여행 코스를 안내하는 해뜸 도우미"
        imageSrc="/images/discovery/ai-course-guide.png"
        eyebrow="AI 축제 코스"
        title="축제로 하루 코스를 만들어 보세요"
        description="축제 일정과 주변 여행지를 자연스럽게 이어 드려요."
        buttonLabel="축제 코스 추천받기"
        onRecommend={onRecommend}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "축제 코스 추천받기" }),
    );
    expect(onRecommend).toHaveBeenCalledTimes(1);
  });
});
