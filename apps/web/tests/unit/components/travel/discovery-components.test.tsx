import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AiCourseBanner } from "@/components/travel/ai-course-banner";
import {
  BottomNavigation,
  type BottomNavigationItem,
} from "@/components/travel/bottom-navigation";
import { FestivalListItem } from "@/components/travel/festival-list-item";
import { FestivalCardRail } from "@/components/travel/festival-card-rail";
import { FestivalFeatureBanner } from "@/components/travel/festival-feature-banner";
import { FestivalFilterGroup } from "@/components/travel/festival-filter-group";
import { FestivalRankingCard } from "@/components/travel/festival-ranking-card";
import { PlaceRankingCard } from "@/components/travel/place-ranking-card";
import { CourseQuickSaveCard } from "@/components/travel/course-quick-save-card";
import { defaultDiscoveryQuery } from "@/features/discovery/discovery-model";
import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";
import { PopularVideoCard } from "@/components/travel/popular-video-card";
import {
  TravelThemeItem,
  TravelThemeMoreItem,
} from "@/components/travel/travel-theme-item";
import { VideoCourseCard } from "@/components/travel/video-course-card";

describe("PlaceRankingCard", () => {
  it("renders rank, city and parenthetical review count in a borderless portrait article", () => {
    render(
      <PlaceRankingCard
        place={mainDiscoveryMock.places[0]}
        href="/places/icheon-termeden"
      />,
    );

    expect(
      screen.getByRole("article", { name: "1위 이천 테르메덴" }),
    ).toBeVisible();
    expect(screen.getByText("이천")).toBeVisible();
    expect(screen.getByRole("group", { name: /평점 4\.6점/ })).toBeVisible();
    expect(screen.getByText("(2,345)")).toBeVisible();
    expect(screen.getByRole("article", { name: "1위 이천 테르메덴" })).toHaveClass(
      "grid",
    );
    expect(
      screen.getByRole("img", { name: "온천 수영장이 있는 이천 테르메덴" })
        .parentElement,
    ).toHaveClass("aspect-[4/5]", "rounded-lg");
    expect(
      screen.getByRole("link", { name: /1위 이천 테르메덴/ }),
    ).toHaveAttribute("href", "/places/icheon-termeden");
  });

  it("uses gold, silver and bronze badges for the top three ranks", () => {
    render(
      <>
        {mainDiscoveryMock.places.slice(0, 3).map((place) => (
          <PlaceRankingCard
            key={place.id}
            place={place}
            href={`/places/${place.id}`}
          />
        ))}
      </>,
    );

    expect(screen.getByText("1위")).toHaveClass(
      "bg-rank-gold",
      "text-rank-gold-foreground",
    );
    expect(screen.getByText("2위")).toHaveClass(
      "bg-rank-silver",
      "text-rank-silver-foreground",
    );
    expect(screen.getByText("3위")).toHaveClass(
      "bg-rank-bronze",
      "text-rank-bronze-foreground",
    );
  });
});

describe("FestivalListItem", () => {
  it("renders date and location in a named festival article", () => {
    const festival = mainDiscoveryMock.festivals.find(
      (item) => item.region === "gyeonggi",
    );
    if (!festival) {
      throw new Error("Expected a Gyeonggi festival fixture.");
    }

    render(
      <FestivalListItem
        festival={festival}
        href="/festivals/icheon-rice-cultural-festival"
      />,
    );

    expect(
      screen.getByRole("article", { name: "이천쌀문화축제" }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", { name: "가을 들판의 이천쌀문화축제" })
        .parentElement,
    ).toHaveClass("relative");
    expect(screen.getByText("2026. 10. 21. – 10. 25.")).toBeVisible();
    expect(screen.getByText("이천시 일원")).toBeVisible();
    expect(screen.getByRole("link", { name: /이천쌀문화축제/ })).toHaveAttribute(
      "href",
      "/festivals/icheon-rice-cultural-festival",
    );
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

describe("AiCourseBanner", () => {
  it("reveals the mock AI recommendation result", async () => {
    const user = userEvent.setup();

    render(
      <AiCourseBanner
        imageAlt="여행 코스를 안내하는 해뜸 도우미"
        imageSrc="/images/discovery/reference-main/ai-course-robot.png"
      />,
    );

    expect(
      screen.getByRole("heading", {
        name: "AI가 추천하는 맞춤 여행 코스",
      }),
    ).toBeVisible();
    expect(
      screen.getByText("당신의 취향에 맞는 완벽한 여행 계획"),
    ).toBeVisible();

    await user.click(screen.getByRole("button", { name: "코스 추천받기" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "경기 하루 코스 추천을 준비했어요.",
    );
    expect(
      screen.getByRole("img", { name: "여행 코스를 안내하는 해뜸 도우미" }),
    ).toHaveAttribute(
      "src",
      expect.stringContaining("reference-main%2Fai-course-robot.png"),
    );
  });

  it("uses injected festival copy without changing its interaction", async () => {
    const user = userEvent.setup();

    render(
      <AiCourseBanner
        imageAlt="여행 코스를 안내하는 해뜸 도우미"
        imageSrc="/images/discovery/ai-course-guide.png"
        eyebrow="AI 축제 코스"
        title="선택한 축제로 하루 코스를 만들어 보세요"
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

describe("BottomNavigation", () => {
  it("marks home current and unavailable destinations as coming soon", () => {
    const navigationItems: BottomNavigationItem[] = [
      { id: "home", label: "홈", href: "/", current: true },
      { id: "explore", label: "탐색" },
      { id: "trips", label: "내 일정" },
      { id: "reviews", label: "내 후기" },
      { id: "profile", label: "마이페이지" },
    ];

    render(<BottomNavigation items={navigationItems} />);

    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByText("탐색").closest("[aria-disabled='true']"),
    ).toHaveAttribute("aria-disabled", "true");
  });
});

describe("popular-place travel cards", () => {
  it("renders a named short-video preview with its metadata", () => {
    render(
      <PopularVideoCard video={mainDiscoveryMock.popularPlaces.videos[0]} />,
    );

    const card = screen.getByRole("article", {
      name: "성산일출봉 일출 미리보기",
    });
    expect(card).toHaveTextContent("지금 인기 급상승");
    expect(card).toHaveTextContent("0:18");
    expect(card).toHaveTextContent("12.4만");
    expect(card).toHaveTextContent("2,356");
    expect(card).toHaveTextContent("서귀포");
    const metadata = screen.getAllByRole("definition");
    expect(metadata[0]).not.toHaveClass("max-[359px]:sr-only");
    expect(metadata[1]).toHaveClass("max-[359px]:sr-only");
    expect(metadata[2]).toHaveClass("max-[359px]:sr-only");
  });

  it("preloads an explicitly eager short-video preview", () => {
    const { container } = render(
      <PopularVideoCard
        video={mainDiscoveryMock.popularPlaces.videos[0]}
        eager
      />,
    );

    const video = container.querySelector("video");
    expect(video).toHaveAttribute("preload", "metadata");
    expect(video).toHaveAttribute(
      "poster",
      "/images/discovery/place-seongsan.png",
    );
  });

  it("renders a non-interactive travel theme", () => {
    render(
      <TravelThemeItem theme={mainDiscoveryMock.popularPlaces.themes[0]} />,
    );

    expect(screen.getByText("핫플")).toBeVisible();
    expect(
      screen.getByRole("img", { name: "제주 해안의 인기 여행지" }),
    ).toHaveAttribute("loading", "eager");
    expect(
      screen.queryByRole("button", { name: "핫플" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "핫플" }),
    ).not.toBeInTheDocument();
  });

  it("renders a named video course with summary and location", () => {
    render(
      <VideoCourseCard course={mainDiscoveryMock.popularPlaces.courses[0]} />,
    );

    const card = screen.getByRole("article", {
      name: "제주 해안 힐링 코스",
    });
    expect(card).toHaveTextContent("바다와 카페를 천천히 즐겨요");
    expect(card).toHaveTextContent("제주시");
    expect(card).toHaveTextContent("0:32");

    const image = screen.getByRole("img", { name: "협재 해변의 맑은 바다" });
    expect(image).toHaveAttribute(
      "sizes",
      "(max-width: 479px) 46vw, 216px",
    );
    expect(image.parentElement).toHaveClass("aspect-[5/4]");
    expect(screen.getByText("바다와 카페를 천천히 즐겨요")).toHaveClass(
      "line-clamp-1",
    );
    expect(screen.getByText("제주시").closest("p")).toHaveClass("truncate");
    expect(
      screen.getByRole("heading", { name: "제주 해안 힐링 코스" })
        .parentElement,
    ).toHaveClass("bg-image-scrim");
  });

  it("renders a non-interactive theme more item", () => {
    render(<TravelThemeMoreItem />);

    expect(screen.getByText("더보기")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "더보기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "더보기" }),
    ).not.toBeInTheDocument();
  });

  it("renders the visual quick-save promotion as a named article", () => {
    render(<CourseQuickSaveCard />);

    expect(
      screen.getByRole("article", { name: "짧게 보고 바로 저장" }),
    ).toHaveTextContent("짧게 보고 바로 저장");
  });
});
