import { render, screen } from "@testing-library/react";
import type {
  HotPlaceRankingItem,
  PlaceRankingItem,
} from "@haetteum/contracts";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AiCourseBanner } from "@/components/travel/ai-course-banner";
import {
  BottomNavigation,
  type BottomNavigationItem,
} from "@/components/travel/bottom-navigation";
import { FestivalListItem } from "@/components/travel/festival-list-item";
import { FestivalFeatureBanner } from "@/components/travel/festival-feature-banner";
import { FestivalFilterGroup } from "@/components/travel/festival-filter-group";
import { HotPlaceRankingCard } from "@/components/travel/hot-place-ranking-card";
import { PlaceRankingCard } from "@/components/travel/place-ranking-card";
import { PlaceRankingRetryButton } from "@/components/travel/place-ranking-retry-button";
import { CourseQuickSaveCard } from "@/components/travel/course-quick-save-card";
import { defaultDiscoveryQuery } from "@/features/discovery/discovery-model";
import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";
import { PopularVideoCard } from "@/components/travel/popular-video-card";
import {
  TravelThemeItem,
  TravelThemeMoreItem,
} from "@/components/travel/travel-theme-item";
import { VideoCourseCard } from "@/components/travel/video-course-card";

const routerMocks = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

describe("PlaceRankingCard", () => {
  const matchedPlace: PlaceRankingItem = {
    rank: 1,
    sourcePlaceId: "0123456789abcdef0123456789abcdef",
    title: "에버랜드",
    category: "레저/스포츠",
    sharePercent: 9,
    placeId: "84549352-0c20-4e11-af50-2d4f278f41ef",
    primaryImageUrl: "https://tong.visitkorea.or.kr/everland.jpg",
    imageCopyrightType: "공공누리",
    imageAttribution: null,
    imageAttributionUrl: null,
  };

  it("links a matched provider place to the real introduction detail", () => {
    render(<PlaceRankingCard place={matchedPlace} />);

    expect(
      screen.getByRole("article", { name: "1위 에버랜드" }),
    ).toBeVisible();
    expect(screen.getByText("레저/스포츠")).toBeVisible();
    expect(screen.getByText("인기 비율 9.0%")).toBeVisible();
    expect(screen.getByRole("article", { name: "1위 에버랜드" })).toHaveClass(
      "grid",
    );
    expect(
      screen.getByRole("img", { name: "에버랜드" }).parentElement,
    ).toHaveClass("aspect-[4/5]", "rounded-lg");
    expect(
      screen.getByRole("img", { name: "에버랜드" }),
    ).toHaveAttribute("src", expect.stringContaining("tong.visitkorea.or.kr"));
    expect(screen.getByRole("link", { name: /1위 에버랜드/ })).toHaveAttribute(
      "href",
      "/places/84549352-0c20-4e11-af50-2d4f278f41ef?tab=introduction",
    );
  });

  it("keeps an unmatched ranking card non-interactive", () => {
    render(<PlaceRankingCard place={{ ...matchedPlace, placeId: null }} />);
    expect(screen.queryByRole("link", { name: /1위 에버랜드/ })).not.toBeInTheDocument();
  });

  it("uses the local fallback image and primary color after the medal ranks", () => {
    render(
      <>
        <PlaceRankingCard place={matchedPlace} />
        <PlaceRankingCard place={{ ...matchedPlace, rank: 2, title: "관광지 2" }} />
        <PlaceRankingCard place={{ ...matchedPlace, rank: 3, title: "관광지 3" }} />
        <PlaceRankingCard
          place={{
            ...matchedPlace,
            rank: 4,
            title: "관광지 4",
            primaryImageUrl: null,
          }}
        />
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
    expect(screen.getByText("4위")).toHaveClass(
      "bg-primary",
      "text-primary-foreground",
    );
    expect(screen.getByRole("img", { name: "관광지 4" })).toHaveAttribute(
      "src",
      expect.stringContaining("popular-attraction.png"),
    );
  });

  it("upgrades the official provider's legacy HTTP image URL to HTTPS", () => {
    render(
      <PlaceRankingCard
        place={{
          ...matchedPlace,
          primaryImageUrl: "http://tong.visitkorea.or.kr/everland.jpg",
        }}
      />,
    );

    expect(screen.getByRole("img", { name: "에버랜드" })).toHaveAttribute(
      "src",
      expect.stringContaining("url=https%3A%2F%2Ftong.visitkorea.or.kr"),
    );
  });

  it("uses the local fallback image when an upgraded official URL has a custom port", () => {
    render(
      <PlaceRankingCard
        place={{
          ...matchedPlace,
          primaryImageUrl: "http://tong.visitkorea.or.kr:8443/everland.jpg",
        }}
      />,
    );

    expect(screen.getByRole("img", { name: "에버랜드" })).toHaveAttribute(
      "src",
      expect.stringContaining("popular-attraction.png"),
    );
  });

  it("uses the local fallback image when an upgraded official URL has a query string", () => {
    render(
      <PlaceRankingCard
        place={{
          ...matchedPlace,
          primaryImageUrl:
            "http://tong.visitkorea.or.kr/everland.jpg?imageId=123",
        }}
      />,
    );

    expect(screen.getByRole("img", { name: "에버랜드" })).toHaveAttribute(
      "src",
      expect.stringContaining("popular-attraction.png"),
    );
  });

  it("uses the local fallback image for an unsupported remote host", () => {
    render(
      <PlaceRankingCard
        place={{
          ...matchedPlace,
          primaryImageUrl: "https://images.example.com/everland.jpg",
        }}
      />,
    );

    expect(screen.getByRole("img", { name: "에버랜드" })).toHaveAttribute(
      "src",
      expect.stringContaining("popular-attraction.png"),
    );
  });

  it("allows a Wikimedia Commons image and shows its photo credit", () => {
    render(
      <PlaceRankingCard
        place={{
          ...matchedPlace,
          primaryImageUrl:
            "https://upload.wikimedia.org/wikipedia/commons/a/a9/example.jpg",
          imageAttribution: "Iddd00, CC BY-SA 4.0, Wikimedia Commons",
          imageAttributionUrl:
            "https://commons.wikimedia.org/wiki/File:example.jpg",
        }}
      />,
    );

    expect(screen.getByRole("img", { name: "에버랜드" })).toHaveAttribute(
      "src",
      expect.stringContaining("url=https%3A%2F%2Fupload.wikimedia.org"),
    );
    expect(
      screen.getByText("사진 출처: Iddd00, CC BY-SA 4.0, Wikimedia Commons"),
    ).toBeVisible();
  });

  it("shows no photo credit line when the image has none", () => {
    render(<PlaceRankingCard place={matchedPlace} />);

    expect(screen.queryByText(/사진 출처:/)).not.toBeInTheDocument();
  });
});

describe("PlaceRankingRetryButton", () => {
  it("refreshes the current route when retrying a failed ranking load", async () => {
    const user = userEvent.setup();
    routerMocks.refresh.mockClear();
    render(<PlaceRankingRetryButton />);

    await user.click(screen.getByRole("button", { name: "다시 시도하기" }));

    expect(routerMocks.refresh).toHaveBeenCalledOnce();
  });
});

describe("HotPlaceRankingCard", () => {
  const matchedPlace: HotPlaceRankingItem = {
    rank: 1,
    sourcePlaceId: "0123456789abcdef0123456789abcdef",
    title: "장릉",
    category: "관광명소",
    provinceName: "강원특별자치도",
    districtName: "영월군",
    growthPercent: 398.9,
    placeId: "84549352-0c20-4e11-af50-2d4f278f41ef",
    primaryImageUrl: "https://tong.visitkorea.or.kr/jangneung.jpg",
    imageCopyrightType: "공공누리",
    imageAttribution: null,
    imageAttributionUrl: null,
  };

  it("shows the visit-growth metric and links a matched provider place", () => {
    render(<HotPlaceRankingCard place={matchedPlace} />);

    expect(screen.getByRole("article", { name: "1위 장릉" })).toBeVisible();
    expect(screen.getByText("관광명소")).toBeVisible();
    expect(screen.getByText("방문 급상승 398.9%")).toBeVisible();
    expect(screen.getByRole("link", { name: /1위 장릉/ })).toHaveAttribute(
      "href",
      "/places/84549352-0c20-4e11-af50-2d4f278f41ef?tab=introduction",
    );
  });

  it("keeps an unmatched hot-place card non-interactive with the fallback image", () => {
    render(
      <HotPlaceRankingCard
        place={{ ...matchedPlace, placeId: null, primaryImageUrl: null }}
      />,
    );

    expect(
      screen.queryByRole("link", { name: /1위 장릉/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("img", { name: "장릉" })).toHaveAttribute(
      "src",
      expect.stringContaining("popular-attraction.png"),
    );
  });

  it("shows the photo credit for a Wikimedia Commons-sourced image", () => {
    render(
      <HotPlaceRankingCard
        place={{
          ...matchedPlace,
          imageAttribution: "Shinfull, CC BY-SA 3.0, Wikimedia Commons",
        }}
      />,
    );

    expect(
      screen.getByText("사진 출처: Shinfull, CC BY-SA 3.0, Wikimedia Commons"),
    ).toBeVisible();
  });
});

describe("FestivalListItem", () => {
  it("renders date and location in a named festival article", () => {
    render(
      <FestivalListItem
        festival={{
          id: "9f0c1e2a-1111-4aaa-8bbb-000000000001",
          title: "이천 도자기 축제",
          status: "ongoing",
          statusLabel: "진행 중",
          dateLabel: "2026. 8. 1. – 8. 31.",
          location: "경기 이천시",
          categoryLabel: "지역특산물축제",
          image: {
            src: "https://tong.visitkorea.or.kr/cms/resource/1/a.jpg",
            alt: "이천 도자기 축제 대표 이미지",
          },
        }}
        href="/festivals/9f0c1e2a-1111-4aaa-8bbb-000000000001"
      />,
    );

    expect(
      screen.getByRole("article", { name: "이천 도자기 축제" }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", { name: "이천 도자기 축제 대표 이미지" })
        .parentElement,
    ).toHaveClass("relative");
    expect(screen.getByText("2026. 8. 1. – 8. 31.")).toBeVisible();
    expect(screen.getByText("경기 이천시")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /이천 도자기 축제/ }),
    ).toHaveAttribute(
      "href",
      "/festivals/9f0c1e2a-1111-4aaa-8bbb-000000000001",
    );
  });

  it("shows a placeholder when the festival has no image", () => {
    render(
      <FestivalListItem
        festival={{
          id: "9f0c1e2a-1111-4aaa-8bbb-000000000002",
          title: "이미지 없는 축제",
          status: "upcoming",
          statusLabel: "곧 시작",
          dateLabel: "2026. 8. 20. – 8. 25.",
          location: "지역 정보 없음",
          categoryLabel: "축제",
          image: { src: null, alt: "이미지 없는 축제 대표 이미지" },
        }}
        href="/festivals/9f0c1e2a-1111-4aaa-8bbb-000000000002"
      />,
    );

    expect(
      screen.getByRole("img", { name: "이미지 없는 축제 대표 이미지" }),
    ).toHaveAttribute("data-image-state", "placeholder");
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

describe("FestivalFeatureBanner", () => {
  it("renders the monthly festival feature from props", () => {
    render(<FestivalFeatureBanner feature={mainDiscoveryMock.festivalFeature} />);

    expect(
      screen.getByRole("heading", { name: "제주 가을 산책 주간" }),
    ).toBeVisible();
    expect(screen.getByText("2026. 9. 19. – 10. 11.")).toBeVisible();
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
