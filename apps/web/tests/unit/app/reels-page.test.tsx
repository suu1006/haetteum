import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ReelsNotFound from "@/app/reels/[videoId]/not-found";
import ReelsPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/reels/[videoId]/page";
import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";

const navigationMocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: navigationMocks.notFound,
  useRouter: () => navigationMocks,
}));

describe("reels page", () => {
  it("projects every popular video into static route params", () => {
    expect(generateStaticParams()).toEqual(
      mainDiscoveryMock.popularPlaces.videos.map(({ id }) => ({ videoId: id })),
    );
  });

  it("builds video-specific metadata", async () => {
    await expect(
      generateMetadata({
        params: Promise.resolve({ videoId: "hyeopjae-sunset-highlight" }),
      }),
    ).resolves.toMatchObject({
      title: "협재 노을 하이라이트 | 해뜸",
      description: expect.stringContaining("협재"),
    });
  });

  it("renders the requested reel first", async () => {
    render(
      await ReelsPage({
        params: Promise.resolve({ videoId: "hyeopjae-sunset-highlight" }),
      }),
    );

    expect(screen.getAllByRole("group", { name: /릴스 \d \/ 3/ })[0]).toHaveAccessibleName(
      "협재 노을 하이라이트 릴스 1 / 3",
    );
  });

  it("delegates unknown video IDs to the scoped not-found boundary", async () => {
    await expect(
      ReelsPage({ params: Promise.resolve({ videoId: "missing-video" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("offers a return path from the scoped not-found page", () => {
    render(<ReelsNotFound />);

    expect(screen.getByText("영상을 찾을 수 없어요")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "인기 관광지로 돌아가기" }),
    ).toHaveAttribute("href", "/?tab=places");
  });
});
