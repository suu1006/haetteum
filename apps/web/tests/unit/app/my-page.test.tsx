import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  loadMyReviews: vi.fn(),
  loadMyFavorites: vi.fn(),
  loadMySavedCourses: vi.fn(),
  requireCurrentUser: vi.fn(),
  loadPlaceRankings: vi.fn(),
  loadHotPlaceRankings: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
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
vi.mock("@/features/trips/my-saved-courses-api", () => ({
  loadMySavedCourses: mocks.loadMySavedCourses,
}));
vi.mock("@/features/auth/auth-user-hydrator", () => ({
  AuthUserHydrator: ({ user }: { user: { id: string } }) => (
    <output data-testid="hydrated-user">{user.id}</output>
  ),
}));
vi.mock("@/features/discovery/place-ranking-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/discovery/place-ranking-api")>()),
  loadPlaceRankings: mocks.loadPlaceRankings,
}));
vi.mock("@/features/discovery/hot-place-ranking-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/discovery/hot-place-ranking-api")>()),
  loadHotPlaceRankings: mocks.loadHotPlaceRankings,
}));

import MyPage, { metadata } from "@/app/mypage/page";
import { AuthStoreProvider } from "@/features/auth/auth-store";

function renderPage(element: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthStoreProvider>{element}</AuthStoreProvider>
    </QueryClientProvider>,
  );
}

const user = {
  id: "447a6484-d0a7-4e5b-8f31-8872a563d9b1",
  displayName: "실제 카카오 여행자",
  profileImageUrl: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCurrentUser.mockResolvedValue(user);
  mocks.headers.mockResolvedValue(
    new Headers({ Cookie: "haetteum_session=opaque-session" }),
  );
  mocks.loadMyReviews.mockResolvedValue({
    status: "ready",
    data: { written: [{ id: "one" }, { id: "two" }], bookmarked: [] },
  });
  mocks.loadMyFavorites.mockResolvedValue({
    status: "ready",
    data: { items: [{ id: "place-one" }] },
  });
  mocks.loadMySavedCourses.mockResolvedValue({
    status: "ready",
    data: { items: [] },
  });
  mocks.loadPlaceRankings.mockResolvedValue({ status: "error" });
  mocks.loadHotPlaceRankings.mockResolvedValue({ status: "error" });
});

describe("My Page route", () => {
  it("protects the exact route and renders the verified profile with an actual review count", async () => {
    expect(metadata).toMatchObject({ title: "마이페이지 | 해뜸" });

    renderPage(await MyPage());

    expect(mocks.requireCurrentUser).toHaveBeenCalledWith("/mypage");
    expect(screen.getByTestId("hydrated-user")).toHaveTextContent(user.id);
    expect(screen.getByRole("heading", { name: user.displayName })).toBeVisible();
    expect(screen.getByText("카카오로 로그인됨")).toBeVisible();
    const records = screen.getByRole("list", { name: "나의 여행 기록" });
    expect(records).toHaveTextContent("내 후기2개");
    expect(records).toHaveTextContent("찜한 장소1개");
    expect(within(records).getByRole("link", { name: /찜한 장소/ })).toHaveAttribute(
      "href",
      "/reviews?tab=bookmarked",
    );
    expect(mocks.loadMyReviews).toHaveBeenCalledWith(
      "haetteum_session=opaque-session",
    );
    expect(mocks.loadMyFavorites).toHaveBeenCalledWith(
      "haetteum_session=opaque-session",
    );
    expect(mocks.loadMySavedCourses).toHaveBeenCalledWith(
      "haetteum_session=opaque-session",
    );
  });

  it("keeps the review destination but omits its unavailable count when loading fails", async () => {
    mocks.loadMyReviews.mockResolvedValue({ status: "error" });

    renderPage(await MyPage());

    const records = screen.getByRole("list", { name: "나의 여행 기록" });
    expect(within(records).getByRole("link", { name: "내 후기" })).toHaveAttribute(
      "href",
      "/reviews",
    );
    expect(records).not.toHaveTextContent("내 후기0개");
    expect(screen.queryByText("해뜸이")).not.toBeInTheDocument();
  });

  it("stops rendering when the session helper redirects", async () => {
    mocks.requireCurrentUser.mockRejectedValue(
      new Error("redirected:/login?returnTo=%2Fmypage"),
    );

    await expect(MyPage()).rejects.toThrow(
      "redirected:/login?returnTo=%2Fmypage",
    );
    expect(mocks.loadMyReviews).not.toHaveBeenCalled();
    expect(mocks.loadMyFavorites).not.toHaveBeenCalled();
    expect(mocks.loadMySavedCourses).not.toHaveBeenCalled();
  });
});
