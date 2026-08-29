import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type { FestivalDetailResponse } from "@haetteum/contracts";

import FestivalDetailPage, {
  generateMetadata,
} from "@/app/festivals/[festivalId]/page";

const navigationMocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const apiMocks = vi.hoisted(() => ({
  loadFestivalDetail: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: navigationMocks.notFound,
  useRouter: () => navigationMocks,
}));

vi.mock("@/features/festivals/festival-detail-api", () => apiMocks);

const festival: FestivalDetailResponse = {
  id: "21c0f38f-de9f-46ce-9d98-08e6154886d3",
  externalId: "3351268",
  title: "동대문구 맥주축제",
  status: "ONGOING",
  eventStartDate: "2026-08-28",
  eventEndDate: "2026-08-29",
  address: "서울특별시 동대문구 장안동 24-1",
  categoryLabel: "문화예술축제",
  telephone: "02-3291-5506",
  longitude: 127.0753,
  latitude: 37.5666,
  primaryImageUrl: "https://tong.visitkorea.or.kr/cms/resource/21/a.jpg",
  homepage: "https://www.ddmac.or.kr/",
  overview: "도심형 여름 축제입니다.",
  eventPlace: "장안1수변공원",
  eventTime: "17:00~22:00",
  feeInfo: "입장료 무료 (주류, 식음료 유료)",
  program: "1. 메인프로그램: 메인 스테이지\n2. 부대프로그램: 비어 테라스",
  organizer: "동대문구",
  organizerTel: "02-3291-5506",
  hostAgency: "동대문문화재단",
  hostAgencyTel: null,
  images: [
    { url: "https://tong.visitkorea.or.kr/cms/resource/20/b.jpg", alt: "정문" },
  ],
};

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );

  return {
    ...view,
    rerenderWithQueryClient: (next: ReactNode) =>
      view.rerender(
        <QueryClientProvider client={queryClient}>{next}</QueryClientProvider>,
      ),
  };
}

describe("festival detail page", () => {
  it("builds festival-specific metadata from the API", async () => {
    apiMocks.loadFestivalDetail.mockResolvedValueOnce({
      status: "ready",
      data: festival,
    });

    await expect(
      generateMetadata({
        params: Promise.resolve({ festivalId: festival.id }),
      }),
    ).resolves.toMatchObject({
      title: "동대문구 맥주축제 | 해뜸",
      description: "도심형 여름 축제입니다.",
    });
  });

  it("renders the detail screen for a ready festival", async () => {
    apiMocks.loadFestivalDetail.mockResolvedValueOnce({
      status: "ready",
      data: festival,
    });

    renderWithQueryClient(
      await FestivalDetailPage({
        params: Promise.resolve({ festivalId: festival.id }),
      }),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "동대문구 맥주축제" }),
    ).toBeVisible();
    expect(screen.getByText("문화예술축제")).toBeVisible();
    expect(
      screen.getByRole("link", { name: /홈페이지/ }),
    ).toHaveAttribute("href", "https://www.ddmac.or.kr/");
  });

  it("delegates a missing festival to the not-found boundary", async () => {
    apiMocks.loadFestivalDetail.mockResolvedValueOnce({ status: "not-found" });

    await expect(
      FestivalDetailPage({
        params: Promise.resolve({ festivalId: festival.id }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("shows an error fallback when the API is unavailable", async () => {
    apiMocks.loadFestivalDetail.mockResolvedValueOnce({ status: "error" });

    renderWithQueryClient(
      await FestivalDetailPage({
        params: Promise.resolve({ festivalId: festival.id }),
      }),
    );

    expect(screen.getByText("축제 정보를 불러오지 못했어요.")).toBeVisible();
  });

  it("renders from the hydrated cache without fetching again in the browser", async () => {
    apiMocks.loadFestivalDetail.mockClear();
    apiMocks.loadFestivalDetail.mockResolvedValueOnce({
      status: "ready",
      data: festival,
    });

    const tree = await FestivalDetailPage({
      params: Promise.resolve({ festivalId: festival.id }),
    });
    const view = renderWithQueryClient(tree);
    view.rerenderWithQueryClient(tree);

    expect(
      screen.getByRole("heading", { level: 1, name: "동대문구 맥주축제" }),
    ).toBeVisible();
    expect(apiMocks.loadFestivalDetail).toHaveBeenCalledTimes(1);
  });
});
