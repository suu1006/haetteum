import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  headers: vi.fn(),
  loadMySavedCourses: vi.fn(),
}));

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/features/auth/auth-server", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));
vi.mock("@/features/auth/auth-user-hydrator", () => ({
  AuthUserHydrator: ({ user }: { user: { id: string } }) => (
    <output data-testid="hydrated-user">{user.id}</output>
  ),
}));
vi.mock("@/features/trips/my-saved-courses-api", () => ({
  loadMySavedCourses: mocks.loadMySavedCourses,
}));

import TripsPage, { metadata } from "@/app/trips/page";

const user = {
  id: "447a6484-d0a7-4e5b-8f31-8872a563d9b1",
  displayName: "실제 카카오 여행자",
  profileImageUrl: null,
};

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCurrentUser.mockResolvedValue(user);
  mocks.headers.mockResolvedValue(
    new Headers({ Cookie: "haetteum_session=opaque-session" }),
  );
  mocks.loadMySavedCourses.mockResolvedValue({
    status: "ready",
    data: { items: [] },
  });
});

describe("trips page", () => {
  it("protects the exact route and renders truthful empty trip collections", async () => {
    expect(metadata).toMatchObject({ title: "내 일정 | 해뜸" });

    renderWithQueryClient(await TripsPage());

    expect(mocks.requireCurrentUser).toHaveBeenCalledWith("/trips");
    expect(screen.getByTestId("hydrated-user")).toHaveTextContent(user.id);
    expect(screen.getByText("예정된 일정이 없어요.")).toBeVisible();
    expect(screen.queryByRole("article", { name: /제주도 힐링 여행/ })).not.toBeInTheDocument();
    expect(mocks.loadMySavedCourses).toHaveBeenCalledWith(
      "haetteum_session=opaque-session",
    );
  });

  it("renders saved courses in the scheduled tab", async () => {
    mocks.loadMySavedCourses.mockResolvedValue({
      status: "ready",
      data: {
        items: [
          {
            id: "course-one",
            title: "예술의전당 근처 코스",
            savedAt: "2026-09-01T03:00:00.000Z",
            stops: [
              {
                role: "anchor",
                sequence: 1,
                placeId: "20000000-0000-4000-8000-000000000001",
                title: "예술의전당",
                categoryLabel: null,
                address: "서울 서초구 서초동",
                longitude: 127.01,
                latitude: 37.48,
                distanceMeters: null,
                placeUrl: null,
              },
            ],
          },
        ],
      },
    });

    renderWithQueryClient(await TripsPage());

    expect(screen.getByText("예술의전당 근처 코스")).toBeVisible();
    expect(screen.queryByText("예정된 일정이 없어요.")).not.toBeInTheDocument();
  });

  it("stops rendering when the session helper redirects", async () => {
    mocks.requireCurrentUser.mockRejectedValue(
      new Error("redirected:/login?returnTo=%2Ftrips"),
    );

    await expect(TripsPage()).rejects.toThrow(
      "redirected:/login?returnTo=%2Ftrips",
    );
    expect(mocks.loadMySavedCourses).not.toHaveBeenCalled();
  });
});
