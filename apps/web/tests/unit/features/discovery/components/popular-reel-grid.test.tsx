import { fireEvent, render, screen } from "@testing-library/react";
import type { PopularReelItem } from "@haetteum/contracts";
import { describe, expect, it } from "vitest";

import { PopularReelGrid } from "@/features/discovery/components/popular-reel-grid";

const reel: PopularReelItem = {
  provider: "YOUTUBE",
  videoId: "dQw4w9WgXcQ",
  title: "에버랜드 미리보기",
  channelTitle: "여행 채널",
  thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  durationSeconds: 44,
  viewCount: 1200,
  publishedAt: "2026-08-30T00:00:00.000Z",
  embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  placeId: "84549352-0c20-4e11-af50-2d4f278f41ef",
  placeTitle: "에버랜드",
  region: "경기 용인",
};

describe("PopularReelGrid", () => {
  it("shows only the reel media while keeping the full-screen navigation link", () => {
    const { container } = render(<PopularReelGrid reels={[reel]} />);

    const link = screen.getByRole("link", {
      name: "에버랜드 릴스 미리보기",
    });
    expect(link).toHaveAttribute(
      "href",
      "/reels/place/84549352-0c20-4e11-af50-2d4f278f41ef?v=dQw4w9WgXcQ",
    );
    expect(link).toBeEmptyDOMElement();
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
    expect(screen.queryByText("에버랜드")).not.toBeInTheDocument();
    expect(screen.queryByText("0:44")).not.toBeInTheDocument();
  });
});

it("loads a single player only on request and releases it outside the viewport", async () => {
  const { act } = await import("@testing-library/react");
  const { vi } = await import("vitest");
  const observers: { callback: IntersectionObserverCallback; nodes: Element[] }[] = [];
  vi.stubGlobal("IntersectionObserver", class {
    nodes: Element[] = [];
    constructor(callback: IntersectionObserverCallback) { observers.push({ callback, nodes: this.nodes }); }
    observe(node: Element) { this.nodes.push(node); }
    disconnect() {}
    unobserve() {}
  });
  try {
    const { container } = render(<PopularReelGrid reels={[reel, { ...reel, videoId: "second-video" }, { ...reel, videoId: "third-video" }]} />);
    const tiles = Array.from(container.querySelectorAll("li"));
    const notify = (visible: Element[]) => act(() => {
      for (const observer of observers) observer.callback(observer.nodes.map(target => ({ target, isIntersecting: visible.includes(target) }) as IntersectionObserverEntry), {} as IntersectionObserver);
    });
    notify(tiles);
    expect(container.querySelectorAll("iframe")).toHaveLength(0);
    fireEvent.click(screen.getAllByRole("button", { name: /미리보기 재생/ })[0]);
    expect(container.querySelectorAll("iframe")).toHaveLength(1);
    notify([tiles[2]]);
    expect(container.querySelectorAll("iframe")).toHaveLength(0);
    fireEvent.click(screen.getAllByRole("button", { name: /미리보기 재생/ })[2]);
    expect(container.querySelectorAll("iframe")).toHaveLength(1);
    expect(tiles[0].querySelector("iframe")).toBeNull();
    expect(tiles[2].querySelector("iframe")).not.toBeNull();
    notify([]);
    expect(container.querySelectorAll("iframe")).toHaveLength(0);
  } finally { vi.unstubAllGlobals(); }
});
