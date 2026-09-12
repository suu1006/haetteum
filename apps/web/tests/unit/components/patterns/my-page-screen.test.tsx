import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  loadPlaceRankings: vi.fn(),
  loadHotPlaceRankings: vi.fn(),
  loadGeneratedCourse: vi.fn(),
}));

vi.mock("@/features/auth/auth-client", () => ({ logout: mocks.logout }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh, replace: mocks.replace }),
}));
vi.mock("@/features/discovery/place-ranking-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/discovery/place-ranking-api")>()),
  loadPlaceRankings: mocks.loadPlaceRankings,
}));
vi.mock("@/features/discovery/hot-place-ranking-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/discovery/hot-place-ranking-api")>()),
  loadHotPlaceRankings: mocks.loadHotPlaceRankings,
}));
vi.mock("@/features/places/place-detail-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/places/place-detail-api")>()),
  loadGeneratedCourse: mocks.loadGeneratedCourse,
}));

import { MyPageScreen } from "@/components/patterns/my-page-screen";
import { AuthStoreProvider, useAuthStore } from "@/features/auth/auth-store";
import { AuthUserHydrator } from "@/features/auth/auth-user-hydrator";
import type { MyPageData } from "@/features/profile/my-page-model";

const rankingCandidate = {
  rank: 1,
  sourcePlaceId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  title: "해운대 해수욕장",
  category: "자연",
  sharePercent: 12.5,
  placeId: "30000000-0000-4000-8000-000000000001",
  primaryImageUrl: null,
  imageCopyrightType: null,
  imageAttribution: null,
  imageAttributionUrl: null,
};

const user = {
  id: "447a6484-d0a7-4e5b-8f31-8872a563d9b1",
  displayName: "실제 카카오 여행자",
  profileImageUrl: null,
  provider: "KAKAO" as const,
};

const data: MyPageData = {
  profile: {
    nickname: user.displayName,
    authLabel: "카카오로 로그인됨",
    image: {
      src: "/images/profile/haetteumi-avatar.png",
      alt: `${user.displayName} 프로필`,
    },
  },
  travelRecords: [
    { id: "trips", label: "내 일정", countLabel: "0개", href: "/trips" },
    { id: "reviews", label: "내 후기", countLabel: "2개", href: "/reviews" },
    { id: "favorites", label: "찜한 장소", countLabel: "0개" },
    { id: "visited", label: "방문한 장소", countLabel: "0개" },
  ],
  aiRecommendation: {
    title: "AI 맞춤 여행 추천 받기",
    description: "나만을 위한 특별한 여행 코스를 추천해드려요",
    image: {
      src: "/images/discovery/reference-main/ai-course-robot.png",
      alt: "맞춤 여행을 추천하는 해뜸 도우미",
    },
  },
  menuItems: [
    { id: "notifications", label: "알림" },
    { id: "settings", label: "설정" },
    { id: "support", label: "고객센터" },
    { id: "guide", label: "이용 안내" },
    { id: "logout", label: "로그아웃" },
  ],
};

function AuthStateProbe() {
  const status = useAuthStore((state) => state.status);
  return <output data-testid="auth-status">{status}</output>;
}

function renderScreen() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthStoreProvider>
        <AuthUserHydrator user={user} />
        <MyPageScreen data={data} />
        <AuthStateProbe />
      </AuthStoreProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.logout.mockResolvedValue(undefined);
  mocks.loadPlaceRankings.mockResolvedValue({
    status: "ready",
    data: {
      source: "KTO_DATALAB",
      scope: "national",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-31",
      audience: "all",
      items: [rankingCandidate],
    },
  });
  mocks.loadHotPlaceRankings.mockResolvedValue({ status: "ready", data: { items: [] } });
  mocks.loadGeneratedCourse.mockResolvedValue({
    status: "ready",
    partial: false,
    stops: [
      {
        role: "anchor",
        sequence: 1,
        placeId: rankingCandidate.placeId,
        title: rankingCandidate.title,
        categoryLabel: null,
        address: "부산 해운대구",
        longitude: 129.16,
        latitude: 35.16,
        distanceMeters: null,
        placeUrl: null,
      },
    ],
  });
});

describe("MyPageScreen", () => {
  it("opens the home tab's random course recommendation modal from the AI banner", async () => {
    const userEventApi = userEvent.setup();
    renderScreen();

    await userEventApi.click(
      screen.getByRole("button", { name: "AI 맞춤 여행 추천 받기" }),
    );

    expect(
      await screen.findByRole("heading", { name: "해운대 해수욕장 근처 코스" }),
    ).toBeVisible();
  });

  it("renders only real profile identity and truthful record counts", () => {
    renderScreen();

    expect(screen.getByRole("heading", { name: user.displayName })).toBeVisible();
    expect(screen.getByRole("img", { name: `${user.displayName} 프로필` })).toBeVisible();
    expect(screen.getByText("카카오로 로그인됨")).toBeVisible();
    expect(screen.queryByText(/여행자 Lv\.|다음 레벨|P$/)).not.toBeInTheDocument();

    const travelRecords = screen.getByRole("list", { name: "나의 여행 기록" });
    expect(within(travelRecords).getAllByRole("listitem")).toHaveLength(4);
    expect(travelRecords).toHaveTextContent("내 일정0개");
    expect(travelRecords).toHaveTextContent("내 후기2개");
    expect(travelRecords).toHaveTextContent("찜한 장소0개");
    expect(travelRecords).toHaveTextContent("방문한 장소0개");
  });

  it("keeps actual destinations linked from the personal surface", () => {
    renderScreen();

    const records = screen.getByRole("list", { name: "나의 여행 기록" });
    expect(within(records).getByRole("link", { name: /내 일정/ })).toHaveAttribute(
      "href",
      "/trips",
    );
    expect(within(records).getByRole("link", { name: /내 후기/ })).toHaveAttribute(
      "href",
      "/reviews",
    );
    expect(screen.getByRole("link", { name: "마이페이지" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("clears the current auth state and returns home only after logout succeeds", async () => {
    const userEventApi = userEvent.setup();
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("auth-status")).toHaveTextContent("authenticated"));

    await userEventApi.click(screen.getByRole("button", { name: "로그아웃" }));

    await waitFor(() => expect(screen.getByTestId("auth-status")).toHaveTextContent("anonymous"));
    expect(mocks.logout).toHaveBeenCalledOnce();
    expect(mocks.replace).toHaveBeenCalledWith("/");
    expect(mocks.refresh).toHaveBeenCalledOnce();
  });

  it("retains authentication and exposes a retry status when logout fails", async () => {
    const userEventApi = userEvent.setup();
    mocks.logout.mockRejectedValue(new Error("server unavailable"));
    renderScreen();
    await waitFor(() => expect(screen.getByTestId("auth-status")).toHaveTextContent("authenticated"));

    await userEventApi.click(screen.getByRole("button", { name: "로그아웃" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "로그아웃하지 못했어요. 다시 시도해 주세요.",
    );
    expect(screen.getByTestId("auth-status")).toHaveTextContent("authenticated");
    expect(screen.getByRole("button", { name: "로그아웃 다시 시도" })).toBeEnabled();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = renderScreen();

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
