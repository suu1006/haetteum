import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type {
  PlaceRankingResponse,
  PopularReelsResponse,
} from "@haetteum/contracts";

import { ExploreScreen } from "@/components/patterns/explore-screen";
import { exploreMock } from "@/features/explore/explore.mock";
import type { PlaceRankingLoadState } from "@/features/discovery/place-ranking-api";
import type { PopularReelsLoadState } from "@/features/discovery/place-reels-api";

const trendingRanking: PlaceRankingLoadState = {
  status: "ready",
  data: {
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
    ],
  } satisfies PlaceRankingResponse,
};

const regionalReels: PopularReelsLoadState = {
  status: "ready",
  data: {
    source: "YOUTUBE",
    audience: "all",
    region: "gyeonggi",
    nextCursor: null,
    items: [
      {
        provider: "YOUTUBE",
        videoId: "aaaaaaaaaaa",
        title: "가평 아침고요수목원 산책",
        channelTitle: "여행채널",
        thumbnailUrl: "https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg",
        durationSeconds: 30,
        viewCount: 800,
        publishedAt: "2026-01-02T00:00:00.000Z",
        embedUrl: "https://www.youtube.com/embed/aaaaaaaaaaa",
        placeId: "22222222-2222-4222-8222-222222222222",
        placeTitle: "가평 아침고요수목원",
        region: "경기",
      },
    ],
  } satisfies PopularReelsResponse,
};

describe("ExploreScreen image loading", () => {
  it("eagerly loads the destination images visible in the first viewport", () => {
    render(
      <ExploreScreen
        data={exploreMock}
        region="gyeonggi"
        trendingRanking={trendingRanking}
        regionalReels={regionalReels}
      />,
    );

    expect(
      screen.getByRole("img", { name: "제주도 대표 이미지" }),
    ).toHaveAttribute("loading", "eager");
    expect(
      screen.getByRole("img", {
        name: "가평 아침고요수목원 영상 썸네일",
      }),
    ).toHaveAttribute("loading", "eager");
  });
});
