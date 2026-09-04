import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { ReviewItem } from "@haetteum/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ReviewEditNotFound from "@/app/reviews/[reviewId]/edit/not-found";
import ReviewEditPage, { metadata } from "@/app/reviews/[reviewId]/edit/page";

const navigationMocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

const apiMocks = vi.hoisted(() => ({
  createReview: vi.fn(),
  loadReview: vi.fn(),
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

vi.mock("next/navigation", () => ({
  notFound: navigationMocks.notFound,
  useRouter: () => navigationMocks,
}));
vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("@/features/auth/auth-server", () => authMocks);
vi.mock("@/features/profile/my-reviews-api", () => apiMocks);
vi.mock("@/features/places/favorite-place-api", () => favoriteApiMocks);

const review = {
  id: "24684077-a907-45c3-85bf-b509dab12377",
  placeId: "84549352-0c20-4e11-af50-2d4f278f41ef",
  placeTitle: "에버랜드",
  location: "경기 용인",
  rating: 4,
  title: "여유로운 하루",
  content: "평일이라 여유롭게 둘러봤어요.",
  images: [],
  primaryImageUrl: null,
  createdAt: "2026-08-25T14:00:00.000Z",
  updatedAt: "2026-08-26T01:30:00.000Z",
} as const satisfies ReviewItem;

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  apiMocks.loadReview.mockReset();
  navigationMocks.notFound.mockClear();
  navigationMocks.replace.mockReset();
  navigationMocks.refresh.mockReset();
  authMocks.requireCurrentUser.mockReset();
  headersMock.mockReset();
  authMocks.requireCurrentUser.mockResolvedValue({
    id: "447a6484-d0a7-4e5b-8f31-8872a563d9b1",
  });
  headersMock.mockResolvedValue(
    new Headers({ Cookie: "haetteum_session=opaque-session" }),
  );
  favoriteApiMocks.loadMyFavorites.mockResolvedValue({ items: [] });
});

describe("edit review page", () => {
  it("exports Korean metadata", () => {
    expect(metadata).toMatchObject({
      title: "후기 수정 | 해뜸",
      description: expect.stringContaining("후기"),
    });
  });

  it("awaits params, loads the requested review, and renders edit mode", async () => {
    apiMocks.loadReview.mockResolvedValue({ status: "ready", review });

    renderWithQueryClient(
      await ReviewEditPage({
        params: Promise.resolve({ reviewId: review.id }),
      }),
    );

    expect(authMocks.requireCurrentUser).toHaveBeenCalledWith(
      `/reviews/${review.id}/edit`,
    );
    expect(apiMocks.loadReview).toHaveBeenCalledWith(
      review.id,
      "haetteum_session=opaque-session",
    );
    expect(screen.getByRole("heading", { level: 1, name: "후기 수정" })).toBeVisible();
    expect(screen.getByText("에버랜드")).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: "후기를 작성해주세요" }),
    ).toHaveValue(review.content);
    expect(screen.queryByRole("combobox", { name: "지역" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "내 후기로 돌아가기" }),
    ).toHaveAttribute("href", "/reviews");
  });

  it("delegates a missing review to the scoped not-found boundary", async () => {
    apiMocks.loadReview.mockResolvedValue({ status: "not-found" });

    await expect(
      ReviewEditPage({
        params: Promise.resolve({ reviewId: review.id }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(navigationMocks.notFound).toHaveBeenCalledTimes(1);
  });

  it("renders a safe retry state when review loading fails", async () => {
    apiMocks.loadReview.mockResolvedValue({ status: "error" });

    render(
      await ReviewEditPage({
        params: Promise.resolve({ reviewId: "malformed" }),
      }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent("후기를 불러오지 못했어요");
    expect(screen.getByText("잠시 후 다시 시도해 주세요.")).toBeVisible();
    expect(screen.queryByRole("textbox", { name: "후기 내용" })).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "내 후기로 돌아가기" }),
    ).toHaveAttribute("href", "/reviews");
  });

  it("offers a return path from the scoped not-found page", () => {
    render(<ReviewEditNotFound />);

    expect(screen.getByText("후기를 찾을 수 없어요")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "내 후기로 돌아가기" }),
    ).toHaveAttribute("href", "/reviews");
  });
});
