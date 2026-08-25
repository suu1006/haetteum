import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReelsViewer } from "@/components/travel/reels-viewer";
import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";
import { orderPopularVideosFrom } from "@/features/discovery/popular-video-feed";

const navigationMocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

const orderedVideos = orderPopularVideosFrom(
  mainDiscoveryMock.popularPlaces.videos,
  "hyeopjae-sunset-highlight",
);

if (!orderedVideos) throw new Error("Expected the approved reel fixture");

describe("ReelsViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the selected reel first and plays only that slide", async () => {
    const playedMedia: HTMLMediaElement[] = [];
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (
      this: HTMLMediaElement,
    ) {
      playedMedia.push(this);
      return Promise.resolve();
    });
    const { container } = render(
      <ReelsViewer videos={orderedVideos} returnHref="/?tab=places" />,
    );

    expect(
      screen.getByRole("main", { name: "인기 관광지 릴스" }),
    ).toHaveClass("scrollbar-none");
    const slides = screen.getAllByRole("group", { name: /릴스 \d \/ 3/ });
    expect(slides[0]).toHaveAccessibleName(
      "협재 노을 하이라이트 릴스 1 / 3",
    );
    const media = Array.from(container.querySelectorAll("video"));
    await waitFor(() => expect(playedMedia).toHaveLength(1));
    expect(playedMedia[0]).toBe(media[0]);
    expect(playedMedia).not.toContain(media[1]);
  });

  it("toggles a local like without changing the mock count", async () => {
    const user = userEvent.setup();
    render(<ReelsViewer videos={orderedVideos} returnHref="/?tab=places" />);

    const like = screen.getAllByRole("button", { name: /좋아요/ })[0];
    expect(like).toHaveAttribute("aria-pressed", "false");
    await user.click(like);
    expect(like).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByText("1,892")[0]).toBeVisible();
  });

  it("shows no sound button for silent motion previews", () => {
    render(<ReelsViewer videos={orderedVideos} returnHref="/?tab=places" />);

    expect(screen.queryByRole("button", { name: /소리/ })).not.toBeInTheDocument();
    expect(screen.getAllByText("원본 오디오 없음")[0]).toBeVisible();
  });

  it("copies the reel URL when native sharing is unavailable", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<ReelsViewer videos={orderedVideos} returnHref="/?tab=places" />);

    await user.click(screen.getAllByRole("button", { name: /공유/ })[0]);
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(screen.getByRole("status")).toHaveTextContent("링크를 복사했어요.");
  });

  it("keeps unfinished actions visibly non-interactive", () => {
    render(<ReelsViewer videos={orderedVideos} returnHref="/?tab=places" />);

    expect(screen.queryByRole("button", { name: /댓글/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /더보기/ })).not.toBeInTheDocument();
    expect(screen.getAllByText("준비 중").length).toBeGreaterThanOrEqual(2);
  });
});
