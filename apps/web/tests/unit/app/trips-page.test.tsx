import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireCurrentUser: vi.fn() }));

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/features/auth/auth-server", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));
vi.mock("@/features/auth/auth-user-hydrator", () => ({
  AuthUserHydrator: ({ user }: { user: { id: string } }) => (
    <output data-testid="hydrated-user">{user.id}</output>
  ),
}));

import TripsPage, { metadata } from "@/app/trips/page";

const user = {
  id: "447a6484-d0a7-4e5b-8f31-8872a563d9b1",
  displayName: "실제 카카오 여행자",
  profileImageUrl: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCurrentUser.mockResolvedValue(user);
});

describe("trips page", () => {
  it("protects the exact route and renders truthful empty trip collections", async () => {
    expect(metadata).toMatchObject({ title: "내 일정 | 해뜸" });

    render(await TripsPage());

    expect(mocks.requireCurrentUser).toHaveBeenCalledWith("/trips");
    expect(screen.getByTestId("hydrated-user")).toHaveTextContent(user.id);
    expect(screen.getByText("예정된 일정이 없어요.")).toBeVisible();
    expect(screen.queryByRole("article", { name: /제주도 힐링 여행/ })).not.toBeInTheDocument();
  });

  it("stops rendering when the session helper redirects", async () => {
    mocks.requireCurrentUser.mockRejectedValue(
      new Error("redirected:/login?returnTo=%2Ftrips"),
    );

    await expect(TripsPage()).rejects.toThrow(
      "redirected:/login?returnTo=%2Ftrips",
    );
  });
});
