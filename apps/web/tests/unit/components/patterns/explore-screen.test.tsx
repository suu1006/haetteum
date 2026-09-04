import { render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import type {
  PlaceRankingResponse,
  PopularReelsResponse,
} from "@haetteum/contracts";

import { ExploreScreen } from "@/components/patterns/explore-screen";
import { exploreMock } from "@/features/explore/explore.mock";
import type { PlaceRankingLoadState } from "@/features/discovery/place-ranking-api";
import type { PopularReelsLoadState } from "@/features/discovery/place-reels-api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const trendingRankingData: PlaceRankingResponse = {
  source: "KTO_DATALAB",
  scope: "national",
  periodStart: "2026-08-01",
  periodEnd: "2026-08-31",
  audience: "all",
  items: [
    {
      rank: 1,
      sourcePlaceId: "a".repeat(32),
      title: "제주도",
      category: "자연",
      sharePercent: 12.3,
      placeId: null,
      primaryImageUrl: null,
      imageCopyrightType: null,
      imageAttribution: null,
      imageAttributionUrl: null,
    },
    {
      rank: 2,
      sourcePlaceId: "b".repeat(32),
      title: "강릉",
      category: "자연",
      sharePercent: 10.1,
      placeId: null,
      primaryImageUrl: null,
      imageCopyrightType: null,
      imageAttribution: null,
      imageAttributionUrl: null,
    },
    {
      rank: 3,
      sourcePlaceId: "c".repeat(32),
      title: "여수",
      category: "자연",
      sharePercent: 9.4,
      placeId: null,
      primaryImageUrl: null,
      imageCopyrightType: null,
      imageAttribution: null,
      imageAttributionUrl: null,
    },
  ],
};

const regionalReelsData: PopularReelsResponse = {
  source: "YOUTUBE",
  audience: "all",
  region: "gyeonggi",
  nextCursor: null,
  items: [
    {
      provider: "YOUTUBE",
      videoId: "aaaaaaaaaaa",
      title: "파주 헤이리마을 브이로그",
      channelTitle: "여행채널",
      thumbnailUrl: "https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg",
      durationSeconds: 45,
      viewCount: 1000,
      publishedAt: "2026-01-01T00:00:00.000Z",
      embedUrl: "https://www.youtube.com/embed/aaaaaaaaaaa",
      placeId: "11111111-1111-4111-8111-111111111111",
      placeTitle: "파주 헤이리마을",
      region: "경기",
    },
    {
      provider: "YOUTUBE",
      videoId: "bbbbbbbbbbb",
      title: "가평 아침고요수목원 산책",
      channelTitle: "여행채널",
      thumbnailUrl: "https://i.ytimg.com/vi/bbbbbbbbbbb/hqdefault.jpg",
      durationSeconds: 30,
      viewCount: 800,
      publishedAt: "2026-01-02T00:00:00.000Z",
      embedUrl: "https://www.youtube.com/embed/bbbbbbbbbbb",
      placeId: "22222222-2222-4222-8222-222222222222",
      placeTitle: "가평 아침고요수목원",
      region: "경기",
    },
    {
      provider: "YOUTUBE",
      videoId: "ccccccccccc",
      title: "용인 한국민속촌 나들이",
      channelTitle: "여행채널",
      thumbnailUrl: "https://i.ytimg.com/vi/ccccccccccc/hqdefault.jpg",
      durationSeconds: 50,
      viewCount: 500,
      publishedAt: "2026-01-03T00:00:00.000Z",
      embedUrl: "https://www.youtube.com/embed/ccccccccccc",
      placeId: "33333333-3333-4333-8333-333333333333",
      placeTitle: "용인 한국민속촌",
      region: "경기",
    },
  ],
};

const trendingRanking: PlaceRankingLoadState = {
  status: "ready",
  data: trendingRankingData,
};

const regionalReels: PopularReelsLoadState = {
  status: "ready",
  data: regionalReelsData,
};

describe("ExploreScreen", () => {
  it("matches the My Trips screen title typography", () => {
    render(
      <ExploreScreen
        data={exploreMock}
        region="gyeonggi"
        trendingRanking={null}
        regionalReels={null}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "탐색" })).toHaveClass(
      "text-[1.55rem]",
      "font-bold",
      "leading-9",
      "tracking-[-0.03em]",
    );
  });

  it("assembles the approved exploration sections and active navigation", () => {
    render(
      <ExploreScreen
        data={exploreMock}
        region="gyeonggi"
        trendingRanking={trendingRanking}
        regionalReels={regionalReels}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "탐색" })).toBeVisible();
    expect(
      screen.getByRole("searchbox", { name: "여행지 검색" }),
    ).toHaveAttribute("placeholder", "어디로 떠나볼까요?");

    expect(
      screen.getByRole("heading", { name: "지금 뜨는 여행지" }),
    ).toBeVisible();
    expect(
      within(screen.getByRole("list", { name: "지금 뜨는 여행지" }))
        .getAllByRole("article")
        .map((article) => article.getAttribute("aria-label")),
    ).toEqual(["1위 제주도", "2위 강릉", "3위 여수"]);

    expect(
      screen.getByRole("heading", { name: "지역별 추천 여행지" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "경기" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "서울" })).toHaveAttribute(
      "href",
      "/explore?region=seoul#regional-destinations",
    );
    expect(
      within(screen.getByRole("list", { name: "경기 추천 여행지" }))
        .getAllByRole("article")
        .map((article) => article.getAttribute("aria-label")),
    ).toEqual(["파주 헤이리마을", "가평 아침고요수목원", "용인 한국민속촌"]);

    expect(screen.getByRole("link", { name: "탐색" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("shows a retry fallback when trending or regional data fails to load", () => {
    render(
      <ExploreScreen
        data={exploreMock}
        region="gyeonggi"
        trendingRanking={{ status: "error" }}
        regionalReels={{ status: "error" }}
      />,
    );

    expect(
      screen.getByText("지금 뜨는 여행지를 불러오지 못했어요."),
    ).toBeVisible();
    expect(
      screen.getByText("경기 추천 여행지를 아직 준비하지 못했어요."),
    ).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: "다시 시도하기" }),
    ).toHaveLength(2);
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <ExploreScreen
        data={exploreMock}
        region="gyeonggi"
        trendingRanking={trendingRanking}
        regionalReels={regionalReels}
      />,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
