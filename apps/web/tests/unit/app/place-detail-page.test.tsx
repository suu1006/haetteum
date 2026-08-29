import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type {
  NearbyPlaceCategory,
  NearbyPlacesResponse,
  PlaceCourseItem,
} from "@haetteum/contracts";

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
  loadPlaceReviews: vi.fn(),
  loadNearbyPlaces: vi.fn(),
  loadPlaceCourses: vi.fn(),
  loadGeneratedCourse: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: navigationMocks.notFound,
  useRouter: () => navigationMocks,
}));

vi.mock("@/features/places/place-detail-api", () => apiMocks);

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

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

    renderWithQueryClient(
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

  it("prefetches nearby places for the information tab and hydrates them without a second fetch", async () => {
    const placeId = "24684077-a907-45c3-85bf-b509dab12377";
    apiMocks.loadPlaceDetail.mockResolvedValue({
      status: "ready",
      data: {
        id: placeId,
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
    apiMocks.loadNearbyPlaces.mockClear();
    apiMocks.loadNearbyPlaces.mockImplementation(
      async (
        _placeId: string,
        category: NearbyPlaceCategory,
      ): Promise<NearbyPlacesResponse> => ({
        status: "ready",
        category,
        partial: false,
        items: [
          {
            provider: "KAKAO_LOCAL",
            providerPlaceId: `${category}-1`,
            title: `${category} 장소`,
            categoryLabel: "카테고리",
            telephone: null,
            address: null,
            roadAddress: null,
            longitude: 127.2,
            latitude: 37.2,
            distanceMeters: 500,
            placeUrl: "http://place.map.kakao.com/12345",
          },
        ],
      }),
    );

    const tree = await PlaceDetailPage({
      params: Promise.resolve({ placeId }),
      searchParams: Promise.resolve({ tab: "information" }),
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const view = render(
      <QueryClientProvider client={queryClient}>{tree}</QueryClientProvider>,
    );
    view.rerender(
      <QueryClientProvider client={queryClient}>{tree}</QueryClientProvider>,
    );

    expect(screen.getByText("attraction 장소")).toBeVisible();
    expect(screen.getByText("restaurant 장소")).toBeVisible();
    expect(screen.getByText("cafe 장소")).toBeVisible();
    expect(apiMocks.loadNearbyPlaces).toHaveBeenCalledTimes(3);
  });

  it("shows an empty-course notice when TourAPI has no course for this place", async () => {
    const placeId = "24684077-a907-45c3-85bf-b509dab12377";
    apiMocks.loadPlaceDetail.mockResolvedValue({
      status: "ready",
      data: {
        id: placeId,
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
          useTime: null,
          parking: null,
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
    apiMocks.loadPlaceCourses.mockResolvedValue({
      status: "ready",
      data: { placeId, source: "TOUR_API", items: [] },
    });
    apiMocks.loadGeneratedCourse.mockResolvedValue({
      status: "unavailable",
      reason: "provider_not_configured",
    });

    renderWithQueryClient(
      await PlaceDetailPage({
        params: Promise.resolve({ placeId }),
        searchParams: Promise.resolve({ tab: "course" }),
      }),
    );

    expect(
      screen.getByText("아직 등록된 추천 코스가 없어요"),
    ).toBeVisible();
    expect(screen.queryByText("가까운 코스로 둘러보기")).toBeNull();
  });

  it("shows a course failure notice when the API errors", async () => {
    const placeId = "24684077-a907-45c3-85bf-b509dab12377";
    apiMocks.loadPlaceDetail.mockResolvedValue({
      status: "ready",
      data: {
        id: placeId,
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
          useTime: null,
          parking: null,
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
    apiMocks.loadPlaceCourses.mockResolvedValue({ status: "error" });
    apiMocks.loadGeneratedCourse.mockResolvedValue({
      status: "unavailable",
      reason: "provider_not_configured",
    });

    renderWithQueryClient(
      await PlaceDetailPage({
        params: Promise.resolve({ placeId }),
        searchParams: Promise.resolve({ tab: "course" }),
      }),
    );

    expect(screen.getByText("추천 코스를 불러오지 못했어요")).toBeVisible();
  });

  it("renders a TourAPI course and its stops from the hydrated cache", async () => {
    const placeId = "24684077-a907-45c3-85bf-b509dab12377";
    apiMocks.loadPlaceDetail.mockResolvedValue({
      status: "ready",
      data: {
        id: placeId,
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
          useTime: null,
          parking: null,
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
    const course: PlaceCourseItem = {
      id: "55555555-5555-4555-8555-555555555555",
      title: "에버랜드 하루 코스",
      overview: null,
      takeTime: null,
      distance: null,
      schedule: null,
      theme: null,
      imageUrl: null,
      stops: [],
    };
    apiMocks.loadPlaceCourses.mockClear();
    apiMocks.loadPlaceCourses.mockResolvedValue({
      status: "ready",
      data: { placeId, source: "TOUR_API", items: [course] },
    });
    apiMocks.loadGeneratedCourse.mockResolvedValue({
      status: "unavailable",
      reason: "provider_not_configured",
    });

    renderWithQueryClient(
      await PlaceDetailPage({
        params: Promise.resolve({ placeId }),
        searchParams: Promise.resolve({ tab: "course" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "에버랜드 하루 코스" }),
    ).toBeVisible();
    expect(apiMocks.loadPlaceCourses).toHaveBeenCalledTimes(1);
  });

  it("shows the generated course card above the curated TourAPI list", async () => {
    const placeId = "24684077-a907-45c3-85bf-b509dab12377";
    apiMocks.loadPlaceDetail.mockResolvedValue({
      status: "ready",
      data: {
        id: placeId,
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
          useTime: null,
          parking: null,
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
    apiMocks.loadPlaceCourses.mockResolvedValue({
      status: "ready",
      data: { placeId, source: "TOUR_API", items: [] },
    });
    apiMocks.loadGeneratedCourse.mockResolvedValue({
      status: "ready",
      partial: true,
      stops: [
        {
          role: "anchor",
          sequence: 1,
          placeId,
          title: "에버랜드",
          categoryLabel: null,
          address: "경기 용인시",
          longitude: 127.2,
          latitude: 37.2,
          distanceMeters: 0,
          placeUrl: null,
        },
        {
          role: "attraction",
          sequence: 2,
          placeId: null,
          title: "캐리비안 베이",
          categoryLabel: "관광,명소 > 워터파크",
          address: null,
          longitude: 127.201,
          latitude: 37.201,
          distanceMeters: 300,
          placeUrl: "http://place.map.kakao.com/1",
        },
      ],
    });

    renderWithQueryClient(
      await PlaceDetailPage({
        params: Promise.resolve({ placeId }),
        searchParams: Promise.resolve({ tab: "course" }),
      }),
    );

    expect(
      screen.getByRole("heading", { name: "가까운 코스로 둘러보기" }),
    ).toBeVisible();
    expect(screen.getByText("지금 보는 곳")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "캐리비안 베이" }),
    ).toHaveAttribute("href", "http://place.map.kakao.com/1");
    expect(screen.getByText("일부 장소는 찾지 못했어요.")).toBeVisible();
    expect(
      screen.getByText("아직 등록된 추천 코스가 없어요"),
    ).toBeVisible();
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
