import { render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PopularReelsResponse } from "@haetteum/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PopularReelFeed } from "@/components/travel/popular-reel-feed";
import { loadPopularReels } from "@/features/discovery/place-reels-api";

vi.mock("@/features/discovery/place-reels-api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/discovery/place-reels-api")>();
  return { ...actual, loadPopularReels: vi.fn() };
});

const loadPopularReelsMock = vi.mocked(loadPopularReels);

function makePage(
  startIndex: number,
  count: number,
  nextCursor: number | null,
): PopularReelsResponse {
  return {
    source: "YOUTUBE",
    audience: "all",
    region: "all",
    nextCursor,
    items: Array.from({ length: count }, (_, offset) => {
      const index = startIndex + offset;
      return {
        provider: "YOUTUBE",
        videoId: `v${String(index).padStart(10, "0")}`,
        title: `릴스 ${index}`,
        channelTitle: "채널",
        thumbnailUrl: "https://i.ytimg.com/vi/x/hqdefault.jpg",
        durationSeconds: 10,
        viewCount: 1,
        publishedAt: "2026-01-01T00:00:00.000Z",
        embedUrl: "https://www.youtube-nocookie.com/embed/x",
        placeId: "11111111-1111-4111-8111-111111111111",
        placeTitle: "장소",
        region: "지역",
      };
    }),
  };
}

type ObserverInstance = {
  callback: IntersectionObserverCallback;
};

let observerInstances: ObserverInstance[];

class FakeIntersectionObserver implements ObserverInstance {
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    observerInstances.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

function fireIntersection(isIntersecting: boolean) {
  const instance = observerInstances.at(-1);
  instance?.callback(
    [{ isIntersecting } as IntersectionObserverEntry],
    instance as unknown as IntersectionObserver,
  );
}

function renderFeed(initialPage: PopularReelsResponse) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PopularReelFeed audience="all" region="all" initialPage={initialPage} />
    </QueryClientProvider>,
  );
}

describe("PopularReelFeed", () => {
  beforeEach(() => {
    observerInstances = [];
    loadPopularReelsMock.mockReset();
    Object.defineProperty(globalThis, "IntersectionObserver", {
      configurable: true,
      writable: true,
      value: FakeIntersectionObserver,
    });
  });

  it("fetches the next page once when the sentinel enters view", async () => {
    const page1 = makePage(0, 12, 12);
    const page2 = makePage(12, 12, null);
    loadPopularReelsMock.mockResolvedValueOnce({ status: "ready", data: page2 });

    renderFeed(page1);
    fireIntersection(true);

    await waitFor(() => expect(loadPopularReelsMock).toHaveBeenCalledTimes(1));
    expect(loadPopularReelsMock).toHaveBeenCalledWith(
      "all",
      "all",
      fetch,
      undefined,
      { cursor: 12, limit: 12 },
    );
  });

  it("does not re-fetch while the sentinel re-intersects during a scroll before the fetch settles", async () => {
    const page1 = makePage(0, 12, 12);
    let resolvePage2: (value: { status: "ready"; data: PopularReelsResponse }) => void =
      () => {};
    const page2Promise = new Promise<{
      status: "ready";
      data: PopularReelsResponse;
    }>((resolve) => {
      resolvePage2 = resolve;
    });
    loadPopularReelsMock.mockReturnValueOnce(page2Promise);

    renderFeed(page1);

    // A fast scroll can cross the sentinel's intersection boundary several
    // times before React re-renders with the in-flight fetch's state.
    fireIntersection(true);
    fireIntersection(false);
    fireIntersection(true);
    fireIntersection(true);

    expect(loadPopularReelsMock).toHaveBeenCalledTimes(1);

    resolvePage2({ status: "ready", data: makePage(12, 12, null) });
    await waitFor(() =>
      expect(loadPopularReelsMock).toHaveBeenCalledTimes(1),
    );
  });

  it("never renders a duplicate tile even if a fetched page overlaps the previous one", async () => {
    const page1 = makePage(0, 12, 12);
    // Simulate the failure mode this regression covers: the "next" page
    // response comes back identical to page 1 instead of advancing. Marking
    // it as the last page (nextCursor: null) isolates this from the
    // separate greedy-cascade behavior covered by the other tests.
    loadPopularReelsMock.mockResolvedValueOnce({
      status: "ready",
      data: { ...page1, nextCursor: null },
    });

    const { container } = renderFeed(page1);
    fireIntersection(true);

    await waitFor(() => expect(loadPopularReelsMock).toHaveBeenCalledTimes(1));
    await waitFor(() => {
      const tiles = container.querySelectorAll(
        'ul[aria-label="릴스형 인기 관광지 목록"] li',
      );
      expect(tiles).toHaveLength(12);
    });
  });
});
