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

const apiMocks = vi.hoisted(() => ({
  loadPlaceDetail: vi.fn(),
  loadNearbyPlaces: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: navigationMocks.notFound,
  useRouter: () => navigationMocks,
}));

vi.mock("@/features/places/place-detail-api", () => apiMocks);

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

  it("loads a UUID place from the API and renders the introduction by default", async () => {
    apiMocks.loadPlaceDetail.mockResolvedValue({
      status: "ready",
      data: {
        id: "24684077-a907-45c3-85bf-b509dab12377",
        title: "에버랜드",
        category: { primary: "VE", secondary: null, tertiary: null },
        region: "gyeonggi",
        district: "용인시",
        address: "경기 용인시",
        longitude: 127.2,
        latitude: 37.2,
        telephone: null,
        homepage: null,
        overview: "테마파크 소개",
        images: [],
        introduction: {
          infoCenter: null,
          restDate: null,
          useSeason: null,
          useTime: "09:00~18:00",
          parking: "주차 가능",
          experienceAgeRange: null,
          experienceGuide: null,
          babyCarriage: null,
          creditCard: null,
          pet: null,
        },
        information: [],
        detailSyncedAt: null,
      },
    });

    render(
      await PlaceDetailPage({
        params: Promise.resolve({
          placeId: "24684077-a907-45c3-85bf-b509dab12377",
        }),
        searchParams: Promise.resolve({}),
      }),
    );

    expect(screen.getByRole("heading", { level: 1, name: "에버랜드" })).toBeVisible();
    expect(screen.getByText("테마파크 소개")).toBeVisible();
    expect(screen.getByText("09:00~18:00")).toBeVisible();
  });

  it("builds truthful live metadata for a UUID place", async () => {
    apiMocks.loadPlaceDetail.mockResolvedValue({
      status: "ready",
      data: { title: "에버랜드", overview: "테마파크 소개" },
    });
    await expect(
      generateMetadata({
        params: Promise.resolve({
          placeId: "24684077-a907-45c3-85bf-b509dab12377",
        }),
      }),
    ).resolves.toEqual({
      title: "에버랜드 소개 | 해뜸",
      description: "테마파크 소개",
    });
  });

  it("offers a return path from the scoped not-found page", () => {
    render(<PlaceNotFound />);

    expect(screen.getByText("장소를 찾을 수 없어요")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "여행 탐색으로 돌아가기" }),
    ).toHaveAttribute("href", "/");
  });
});
