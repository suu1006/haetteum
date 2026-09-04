import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PlaceListItem } from "@haetteum/contracts";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ReviewNewPage, { metadata } from "@/app/reviews/new/page";

const routerMocks = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
const apiMocks = vi.hoisted(() => ({
  createReview: vi.fn(),
  loadMyReviews: vi.fn(),
  searchReviewPlaces: vi.fn(),
  updateReview: vi.fn(),
}));
const favoriteApiMocks = vi.hoisted(() => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  loadMyFavorites: vi.fn(),
}));
const authMocks = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));
const headersMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => routerMocks }));
vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("@/features/auth/auth-server", () => authMocks);
vi.mock("@/features/profile/my-reviews-api", () => apiMocks);
vi.mock("@/features/places/favorite-place-api", () => favoriteApiMocks);

const existingPlace = {
  id: "84549352-0c20-4e11-af50-2d4f278f41ef",
  title: "에버랜드",
  region: "gyeonggi",
  district: "용인시",
  address: "경기도 용인시 처인구",
  longitude: 127.204,
  latitude: 37.294,
  primaryImageUrl: null,
  imageCopyrightType: null,
} as const satisfies PlaceListItem;

const freshPlace = {
  ...existingPlace,
  id: "5d1f4931-ff56-48df-841d-c85854af0133",
  title: "수원 화성",
  district: "수원시",
  address: "경기도 수원시 팔달구",
} as const satisfies PlaceListItem;

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  apiMocks.loadMyReviews.mockReset();
  apiMocks.searchReviewPlaces.mockReset();
  apiMocks.createReview.mockReset();
  routerMocks.replace.mockReset();
  routerMocks.refresh.mockReset();
  authMocks.requireCurrentUser.mockReset();
  headersMock.mockReset();
  authMocks.requireCurrentUser.mockResolvedValue({
    id: "447a6484-d0a7-4e5b-8f31-8872a563d9b1",
  });
  headersMock.mockResolvedValue(
    new Headers({ Cookie: "haetteum_session=opaque-session" }),
  );
  apiMocks.searchReviewPlaces.mockResolvedValue({
    status: "ready",
    items: [existingPlace, freshPlace],
  });
  favoriteApiMocks.loadMyFavorites.mockResolvedValue({ items: [] });
});

async function searchAndOpenResults(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByRole("combobox", { name: "지역" }), "gyeonggi");
  await user.click(screen.getByRole("button", { name: "관광지 검색" }));
  await user.type(await screen.findByRole("searchbox", { name: "관광지 검색" }), "화성");
}

describe("new review page", () => {
  it("exports Korean metadata", () => {
    expect(metadata).toMatchObject({
      title: "후기 작성 | 해뜸",
      description: expect.stringContaining("후기"),
    });
  });

  it("passes loaded review place IDs to create mode", async () => {
    const user = userEvent.setup();
    apiMocks.loadMyReviews.mockResolvedValue({
      status: "ready",
      items: [
        {
          id: "24684077-a907-45c3-85bf-b509dab12377",
          placeId: existingPlace.id,
          title: existingPlace.title,
          location: "경기 용인",
          rating: 5,
          date: "2026.08.26",
          content: "이미 작성한 후기",
          likeCount: 0,
          commentCount: 0,
          bookmarked: false,
          image: { src: "/fallback.png", alt: "에버랜드 대표 이미지" },
        },
      ],
    });

    renderWithQueryClient(await ReviewNewPage());
    await searchAndOpenResults(user);

    expect(authMocks.requireCurrentUser).toHaveBeenCalledWith("/reviews/new");
    expect(apiMocks.loadMyReviews).toHaveBeenCalledWith(
      "haetteum_session=opaque-session",
    );
    expect(screen.queryByRole("button", { name: /에버랜드/ })).not.toBeInTheDocument();
    const result = await screen.findByRole("button", { name: /수원 화성/ });
    expect(result).toBeVisible();

    await user.click(result);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(
      screen.getByRole("link", { name: "내 후기로 돌아가기" }),
    ).toHaveAttribute("href", "/reviews");
  });

  it("keeps the form usable after a list-load error and trusts the duplicate mutation guard", async () => {
    const user = userEvent.setup();
    apiMocks.loadMyReviews.mockResolvedValue({ status: "error" });
    apiMocks.createReview.mockResolvedValue({ status: "duplicate" });

    renderWithQueryClient(await ReviewNewPage());
    await searchAndOpenResults(user);
    await user.click(await screen.findByRole("button", { name: /에버랜드/ }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("radio", { name: "5점" }));
    await user.type(
      screen.getByRole("textbox", { name: "제목을 입력해주세요" }),
      "다시 작성",
    );
    await user.type(
      screen.getByRole("textbox", { name: "후기를 작성해주세요" }),
      "다시 작성해 보는 후기입니다.",
    );
    await user.click(screen.getByRole("button", { name: "등록하기" }));

    expect(
      await screen.findByText("이미 이 관광지에 작성한 후기가 있어요."),
    ).toBeVisible();
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });
});
