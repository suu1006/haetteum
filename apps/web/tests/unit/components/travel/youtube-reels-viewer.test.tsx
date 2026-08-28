import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  YouTubeReelsViewer,
  type ReelViewerItem,
} from "@/components/travel/youtube-reels-viewer";

const navigationMocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks,
}));

const items: ReelViewerItem[] = [
  {
    videoId: "dQw4w9WgXcQ",
    title: "성산일출봉 브이로그",
    channelTitle: "여행 채널",
    embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    placeId: "84549352-0c20-4e11-af50-2d4f278f41ef",
    placeTitle: "성산일출봉",
    region: "제주특별자치도",
  },
  {
    videoId: "abcdefghijk",
    title: "협재 해변 산책",
    channelTitle: "제주 채널",
    embedUrl: "https://www.youtube-nocookie.com/embed/abcdefghijk",
    placeId: "94549352-0c20-4e11-af50-2d4f278f41ef",
    placeTitle: "협재해수욕장",
    region: "제주특별자치도",
  },
];

describe("YouTubeReelsViewer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders one privacy-enhanced embed per reel with the JS API enabled", () => {
    const { container } = render(
      <YouTubeReelsViewer items={items} returnHref="/?tab=places" />,
    );

    const frames = Array.from(container.querySelectorAll("iframe"));
    expect(frames).toHaveLength(2);

    const first = new URL(frames[0]?.getAttribute("src") ?? "");
    expect(first.origin).toBe("https://www.youtube-nocookie.com");
    expect(first.pathname).toBe("/embed/dQw4w9WgXcQ");
    expect(first.searchParams.get("enablejsapi")).toBe("1");
    expect(first.searchParams.get("playsinline")).toBe("1");

    expect(
      screen.getAllByRole("group", { name: /릴스 \d \/ 2/ })[0],
    ).toHaveAccessibleName("성산일출봉 릴스 1 / 2");
    expect(screen.getByText("협재해수욕장")).toBeVisible();
  });

  it("returns to the previous screen from the back control", async () => {
    const user = userEvent.setup();
    render(<YouTubeReelsViewer items={items} returnHref="/?tab=places" />);

    await user.click(
      screen.getByRole("button", { name: "인기 관광지로 돌아가기" }),
    );

    expect(
      navigationMocks.back.mock.calls.length +
        navigationMocks.push.mock.calls.length,
    ).toBe(1);
  });

  it("toggles the mute control", async () => {
    const user = userEvent.setup();
    render(<YouTubeReelsViewer items={items} returnHref="/?tab=places" />);

    const toggle = screen.getAllByRole("button", { name: /소리/ })[0];
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });
});
