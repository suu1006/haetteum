import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  loadMyReviews: vi.fn(),
  requireCurrentUser: vi.fn(),
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
vi.mock("@/features/auth/auth-user-hydrator", () => ({
  AuthUserHydrator: ({ user }: { user: { id: string } }) => (
    <output data-testid="hydrated-user">{user.id}</output>
  ),
}));

import MyPage, { metadata } from "@/app/mypage/page";
import { AuthStoreProvider } from "@/features/auth/auth-store";

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
});

describe("My Page route", () => {
  it("protects the exact route and renders the verified profile with an actual review count", async () => {
    expect(metadata).toMatchObject({ title: "마이페이지 | 해뜸" });

    render(<AuthStoreProvider>{await MyPage()}</AuthStoreProvider>);

    expect(mocks.requireCurrentUser).toHaveBeenCalledWith("/mypage");
    expect(screen.getByTestId("hydrated-user")).toHaveTextContent(user.id);
    expect(screen.getByRole("heading", { name: user.displayName })).toBeVisible();
    expect(screen.getByText("카카오로 로그인됨")).toBeVisible();
    expect(screen.getByRole("list", { name: "나의 여행 기록" })).toHaveTextContent(
      "내 후기2개",
    );
    expect(mocks.loadMyReviews).toHaveBeenCalledWith(
      "haetteum_session=opaque-session",
    );
  });

  it("keeps the review destination but omits its unavailable count when loading fails", async () => {
    mocks.loadMyReviews.mockResolvedValue({ status: "error" });

    render(<AuthStoreProvider>{await MyPage()}</AuthStoreProvider>);

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
  });
});
