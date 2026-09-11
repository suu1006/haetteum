import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";
import type {
  PopularReelsResponse,
} from "@haetteum/contracts";

import { ExploreScreen } from "@/components/patterns/explore-screen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { parseDiscoveryQuery } from "@/features/discovery/discovery-model";
import type { PopularReelsLoadState } from "@/features/discovery/place-reels-api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

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

const regionalReels: PopularReelsLoadState = {
  status: "ready",
  data: regionalReelsData,
};

describe("ExploreScreen", () => {
  function show({
    popularReels = regionalReels,
  }: {
    popularReels?: PopularReelsLoadState | null;
  } = {}) {
    return render(
      <QueryClientProvider client={new QueryClient()}>
        <ExploreScreen
          query={parseDiscoveryQuery({ reelRegion: "gyeonggi" })}
          popularReels={popularReels}
        />
      </QueryClientProvider>,
    );
  }

  it("shows only reels with local region navigation", () => {
    show();
    expect(screen.getByRole("searchbox", { name: "여행지 검색" })).toHaveAttribute("placeholder", "어디로 떠나볼까요?");
    expect(screen.getByRole("link", { name: "탐색" })).toHaveAttribute("aria-current", "page");

    expect(screen.getByRole("heading", { name: "릴스형 인기 관광지" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "세대별 인기관광지 순위" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "세대별 핫플레이스" })).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "릴스형 인기 관광지 목록" })).toHaveClass("grid-cols-2");
    expect(screen.getByRole("link", { name: "경기" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "서울" })).toHaveAttribute("href", "/explore?reelRegion=seoul");
  });

  it("offers retry when reels fail to load", () => {
    show({ popularReels: { status: "error" } });
    expect(screen.getByText("조건에 맞는 인기 관광지를 찾지 못했어요.")).toBeVisible();
    expect(screen.getAllByRole("button", { name: "다시 시도하기" })).toHaveLength(1);
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = show();
    const result = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations).toEqual([]);
  });
});
