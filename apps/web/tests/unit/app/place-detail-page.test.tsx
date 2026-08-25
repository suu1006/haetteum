import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import PlaceDetailPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/places/[placeId]/page";
import PlaceNotFound from "@/app/places/[placeId]/not-found";
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

describe("place detail page", () => {
  it("projects every discovery place into static route params", () => {
    expect(generateStaticParams()).toEqual(
      mainDiscoveryMock.places.map(({ id }) => ({ placeId: id })),
    );
  });

  it("builds place-specific review metadata", async () => {
    await expect(
      generateMetadata({
        params: Promise.resolve({ placeId: "icheon-termeden" }),
      }),
    ).resolves.toMatchObject({
      title: "이천 테르메덴 후기 | 해뜸",
      description: expect.stringContaining("2,345개"),
    });
  });

  it("renders the requested place and URL-selected provider", async () => {
    render(
      await PlaceDetailPage({
        params: Promise.resolve({ placeId: "icheon-termeden" }),
        searchParams: Promise.resolve({ tab: "reviews", source: "google" }),
      }),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "이천 테르메덴" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: /통합 후기/ })).toHaveTextContent(
      "2,345개",
    );
    expect(
      screen.getByRole("article", { name: "Traveler_J의 후기" }),
    ).toBeVisible();
  });

  it("delegates unknown place IDs to the scoped not-found boundary", async () => {
    await expect(
      PlaceDetailPage({
        params: Promise.resolve({ placeId: "missing-place" }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("offers a return path from the scoped not-found page", () => {
    render(<PlaceNotFound />);

    expect(screen.getByText("장소를 찾을 수 없어요")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "여행 탐색으로 돌아가기" }),
    ).toHaveAttribute("href", "/");
  });
});
