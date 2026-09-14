import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type {
  PopularReelsResponse,
} from "@haetteum/contracts";

import { ExploreScreen } from "@/features/explore/components/explore-screen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { parseDiscoveryQuery } from "@/features/discovery/discovery-model";
import type { PopularReelsLoadState } from "@/features/discovery/place-reels-api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

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
    const { container } = render(
      <QueryClientProvider client={new QueryClient()}>
        <ExploreScreen query={parseDiscoveryQuery({ reelRegion: "gyeonggi" })} popularReels={{
          ...regionalReels,
          data: {
            ...regionalReels.data,
            items: Array.from({ length: 4 }, (_, index) => ({
              ...regionalReels.data.items[0],
              videoId: `${index}aaaaaaaaaa`,
            })),
          },
        }} />
      </QueryClientProvider>,
    );
    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(4);
    for (const image of Array.from(images).slice(0, 2)) {
      expect(image).toHaveAttribute("loading", "eager");
      expect(image).toHaveAttribute("fetchpriority", "high");
    }
    for (const image of Array.from(images).slice(2)) {
      expect(image).toHaveAttribute("loading", "lazy");
      expect(image).not.toHaveAttribute("fetchpriority", "high");
    }
    expect(screen.getAllByRole("link", { name: "가평 아침고요수목원 릴스 미리보기" })[0]).toHaveAttribute("href", "/reels/place/22222222-2222-4222-8222-222222222222?v=0aaaaaaaaaa");
  });
});
