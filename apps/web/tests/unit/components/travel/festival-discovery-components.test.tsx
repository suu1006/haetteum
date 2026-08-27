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
import { FestivalCardRail } from "@/components/travel/festival-card-rail";
import { FestivalFeatureBanner } from "@/components/travel/festival-feature-banner";
import { FestivalFilterGroup } from "@/components/travel/festival-filter-group";
import { FestivalDiscoveryListItem } from "@/components/travel/festival-discovery-list-item";
import { FestivalRankingCard } from "@/components/travel/festival-ranking-card";
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

describe("FestivalRankingCard", () => {
  it("renders rank, status and metadata in a named festival article", () => {
    const festival = mainDiscoveryMock.festivals.find(
      (item) => item.id === "jeju-summer-light-garden",
    );
    if (!festival) {
      throw new Error("Expected the Jeju summer light garden fixture.");
    }

    render(
      <FestivalRankingCard
        festival={festival}
        href="/festivals/jeju-summer-light-garden"
      />,
    );

    expect(
      screen.getByRole("article", { name: "1위 제주 여름빛 정원축제" }),
    ).toBeVisible();
    expect(screen.getByText("진행 중")).toBeVisible();
    expect(screen.getByText("가족")).toBeVisible();
    expect(screen.getByText("야간")).toBeVisible();
    expect(
      screen.getByRole("img", { name: "제주 들판에 핀 여름꽃" }),
    ).toHaveAttribute("loading", "eager");
    expect(
      screen.getByRole("link", { name: /1위 제주 여름빛 정원축제/ }),
    ).toHaveAttribute("href", "/festivals/jeju-summer-light-garden");
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

  it("automatically cycles through ranks 1, 2, 3 and back to 1 every three seconds", () => {
    vi.useFakeTimers();

    render(
      <FestivalRankingShowcase
        festivals={mainDiscoveryMock.festivalDiscovery.ranking}
      />,
    );

    for (const rank of [2, 3, 1]) {
      act(() => {
        vi.advanceTimersByTime(3_000);
      });

      expect(
        screen.getByRole("article", { name: new RegExp(`^${rank}위`) }),
      ).toHaveAttribute("aria-current", "true");
    }
  });

  it("restarts the three-second countdown after a manual selection", () => {
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
      vi.advanceTimersByTime(2_999);
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

describe("FestivalCardRail", () => {
  it("reveals additional festivals once and reports completion", async () => {
    const user = userEvent.setup();
    const festivals = mainDiscoveryMock.festivals.filter(
      (festival) => festival.region === "jeju",
    );

    render(<FestivalCardRail festivals={festivals} />);

    expect(screen.getAllByRole("article", { name: /위 / })).toHaveLength(4);

    await user.click(screen.getByRole("button", { name: "더 많은 축제 보기" }));

    expect(screen.getAllByRole("article", { name: /위 / })).toHaveLength(6);
    expect(screen.getByRole("status")).toHaveTextContent(
      "추가 축제를 모두 펼쳤어요",
    );
  });
});

describe("AiCourseBanner festival copy", () => {
  it("uses injected festival copy without changing its interaction", async () => {
    const user = userEvent.setup();

    render(
      <AiCourseBanner
        imageAlt="여행 코스를 안내하는 해뜸 도우미"
        imageSrc="/images/discovery/ai-course-guide.png"
        eyebrow="AI 축제 코스"
        title="축제로 하루 코스를 만들어 보세요"
        description="축제 일정과 주변 여행지를 자연스럽게 이어 드려요."
        buttonLabel="축제 코스 추천받기"
        successMessage="제주 축제 하루 코스 추천을 준비했어요."
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "축제 코스 추천받기" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "제주 축제 하루 코스 추천을 준비했어요.",
    );
  });
});
