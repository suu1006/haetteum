import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PopularVideoRail } from "@/components/travel/popular-video-rail";
import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";

describe("PopularVideoRail", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.sessionStorage.clear();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });

  it("plays only the selected popular reel", async () => {
    const playedMedia: HTMLMediaElement[] = [];
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      playedMedia.push(this);
      return Promise.resolve();
    });
    const { container } = render(
      <PopularVideoRail videos={mainDiscoveryMock.popularPlaces.videos} />,
    );
    const media = Array.from(container.querySelectorAll("video"));

    await waitFor(() => expect(playedMedia).toHaveLength(1));
    expect(playedMedia[0]).toBe(media[0]);
    expect(playedMedia).not.toContain(media[1]);
    expect(playedMedia).not.toContain(media[2]);
  });

  it("links every card to its reel route", () => {
    render(
      <PopularVideoRail videos={mainDiscoveryMock.popularPlaces.videos} />,
    );

    expect(
      screen.getByRole("link", {
        name: "성산일출봉 일출 미리보기 릴스 보기",
      }),
    ).toHaveAttribute("href", "/reels/seongsan-sunrise-preview");
  });

  it("falls back to a poster cue when autoplay is rejected", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(
      new DOMException("Autoplay blocked", "NotAllowedError"),
    );
    render(
      <PopularVideoRail videos={mainDiscoveryMock.popularPlaces.videos} />,
    );

    await waitFor(() =>
      expect(
        screen.getByLabelText("성산일출봉 일출 미리보기 영상 미리보기 재생"),
      ).toBeVisible(),
    );
  });

  it("does not begin autoplay when reduced motion is requested", async () => {
    const playedMedia: HTMLMediaElement[] = [];
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }));
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      playedMedia.push(this);
      return Promise.resolve();
    });

    render(
      <PopularVideoRail videos={mainDiscoveryMock.popularPlaces.videos} />,
    );

    await waitFor(() =>
      expect(
        screen.getByLabelText("성산일출봉 일출 미리보기 영상 미리보기 재생"),
      ).toBeVisible(),
    );
    expect(playedMedia).toHaveLength(0);
  });

  it("pauses previews while the document is hidden", async () => {
    const { container } = render(
      <PopularVideoRail videos={mainDiscoveryMock.popularPlaces.videos} />,
    );
    const firstMedia = container.querySelector("video");

    await waitFor(() => expect(firstMedia?.play).toHaveBeenCalled());
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    fireEvent(document, new Event("visibilitychange"));

    expect(firstMedia?.pause).toHaveBeenCalled();
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
  });

  it("restores and consumes the saved popular-reel position", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    window.sessionStorage.setItem(
      "haetteum:popular-reels:return",
      JSON.stringify({
        href: `${window.location.pathname}${window.location.search}${window.location.hash}`,
        scrollY: 420,
        selectedVideoId: "hyeopjae-sunset-highlight",
      }),
    );

    render(
      <PopularVideoRail videos={mainDiscoveryMock.popularPlaces.videos} />,
    );

    await waitFor(() => expect(scrollTo).toHaveBeenCalledWith(0, 420));
    expect(
      window.sessionStorage.getItem("haetteum:popular-reels:return"),
    ).toBeNull();
  });
});
