import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  loadMyReviews: vi.fn(),
  loadMyFavorites: vi.fn(),
  requireCurrentUser: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/features/auth/auth-server", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));
vi.mock("@/features/reviews/my-reviews-api", () => ({
  loadMyReviews: mocks.loadMyReviews,
}));
vi.mock("@/features/profile/my-favorites-api", () => ({
  loadMyFavorites: mocks.loadMyFavorites,
}));
vi.mock("@/features/places/favorite-place-api", () => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  loadMyFavorites: vi.fn(),
}));
vi.mock("@/features/auth/auth-user-hydrator", () => ({
  AuthUserHydrator: ({ user }: { user: { id: string } }) => (
    <output data-testid="hydrated-user">{user.id}</output>
  ),
}));

import ReviewsPage, { metadata } from "@/app/reviews/page";
import type { MyReviewItem } from "@/features/profile/my-reviews-model";

const user = {
  id: "447a6484-d0a7-4e5b-8f31-8872a563d9b1",
  displayName: "실제 카카오 여행자",
  profileImageUrl: null,
};

const writtenReview: MyReviewItem = {
  id: "24684077-a907-45c3-85bf-b509dab12377",
  placeId: "84549352-0c20-4e11-af50-2d4f278f41ef",
  title: "실제 에버랜드 후기",
  location: "경기 용인",
  rating: 5,
  date: "2026.08.26",
  content: "DB에서 불러온 실제 작성 후기예요.",
  likeCount: 0,
  commentCount: 0,
  image: {
    src: "/images/explore/categories/popular-attraction.png",
    alt: "실제 에버랜드 후기 대표 이미지",
  },
};

function renderPage(searchParams: Record<string, string | string[]> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ReviewsPage({ searchParams: Promise.resolve(searchParams) }).then(
    (element) =>
      render(
        <QueryClientProvider client={queryClient}>
          {element}
        </QueryClientProvider>,
      ),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCurrentUser.mockResolvedValue(user);
  mocks.headers.mockResolvedValue(
    new Headers({ Cookie: "haetteum_session=opaque-session" }),
  );
  mocks.loadMyReviews.mockResolvedValue({
    status: "ready",
    data: { written: [writtenReview] },
  });
  mocks.loadMyFavorites.mockResolvedValue({
    status: "ready",
    data: { items: [] },
  });
});

describe("reviews page", () => {
  it("protects the exact route and renders only actual written reviews", async () => {
    expect(metadata).toMatchObject({ title: "내 후기 | 해뜸" });

    await renderPage();

    expect(mocks.requireCurrentUser).toHaveBeenCalledWith("/reviews");
    expect(screen.getByTestId("hydrated-user")).toHaveTextContent(user.id);
    expect(mocks.loadMyReviews).toHaveBeenCalledWith(
      "haetteum_session=opaque-session",
    );
    expect(mocks.loadMyFavorites).toHaveBeenCalledWith(
      "haetteum_session=opaque-session",
    );
    expect(
      screen.getByRole("article", { name: "실제 에버랜드 후기 후기" }),
    ).toBeVisible();
    expect(screen.queryByText("성산일출봉")).not.toBeInTheDocument();
  });

  it("opens directly on the bookmarked tab when asked via the tab query param", async () => {
    await renderPage({ tab: "bookmarked" });

    expect(
      screen.getByRole("tab", { name: "북마크" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("renders an explicit failure instead of mock or false-empty review data", async () => {
    mocks.loadMyReviews.mockResolvedValue({ status: "error" });

    await renderPage();

    expect(screen.getByRole("alert")).toHaveTextContent(
      "후기를 불러오지 못했어요",
    );
    expect(screen.queryByText("작성한 후기가 아직 없어요")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "작성한 후기 목록" })).not.toBeInTheDocument();
  });

  it("stops rendering when the session helper redirects", async () => {
    mocks.requireCurrentUser.mockRejectedValue(
      new Error("redirected:/login?returnTo=%2Freviews"),
    );

    await expect(
      ReviewsPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("redirected:/login?returnTo=%2Freviews");
    expect(mocks.loadMyReviews).not.toHaveBeenCalled();
    expect(mocks.loadMyFavorites).not.toHaveBeenCalled();
  });
});
