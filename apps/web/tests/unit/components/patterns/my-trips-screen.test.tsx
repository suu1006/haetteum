import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  loadMySavedCourses: vi.fn(),
  saveCourse: vi.fn(),
  removeSavedCourse: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock("@/features/trips/saved-course-api", () => ({
  loadMySavedCourses: mocks.loadMySavedCourses,
  saveCourse: mocks.saveCourse,
  removeSavedCourse: mocks.removeSavedCourse,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}));

import { MyTripsScreen } from "@/components/patterns/my-trips-screen";
import type { MyTripsScreenProps } from "@/components/patterns/my-trips-screen";
import { blankCourseMock, courseEditMock } from "@/features/courses/course-edit.mock";
import type { SavedCourseItem } from "@haetteum/contracts";

function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

function renderScreen(props: Omit<MyTripsScreenProps, "initialSavedCourses">) {
  return render(<MyTripsScreen {...props} initialSavedCourses={[]} />);
}

const savedCourse: SavedCourseItem = {
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
};

const testTrips = {
  scheduled: [
    {
      id: "jeju-healing",
      dDay: "D-5",
      title: "제주도 힐링 여행",
      duration: "2박 3일",
      dateRange: "2025.08.28 ~ 08.30",
      imageSrc: "/images/trips/jeju-healing.png",
      imageAlt: "숲과 바다가 내려다보이는 제주 여행지",
      participantCount: 4,
      participants: [
        { id: "mina", name: "민아", imageSrc: "/images/trips/avatar-mina.png" },
        { id: "jun", name: "준호", imageSrc: "/images/trips/avatar-jun.png" },
        { id: "seo", name: "서연", imageSrc: "/images/trips/avatar-seo.png" },
      ],
    },
    {
      id: "busan-sea",
      dDay: "D-12",
      title: "부산 바다 여행",
      duration: "1박 2일",
      dateRange: "2025.09.04 ~ 09.05",
      imageSrc: "/images/trips/busan-sea.png",
      imageAlt: "푸른 바다와 마을이 보이는 부산 여행지",
      participantCount: 3,
      participants: [
        { id: "jun", name: "준호", imageSrc: "/images/trips/avatar-jun.png" },
        { id: "seo", name: "서연", imageSrc: "/images/trips/avatar-seo.png" },
      ],
    },
    {
      id: "gyeongju-history",
      dDay: "D-20",
      title: "경주 역사 탐방",
      duration: "1박 2일",
      dateRange: "2025.09.12 ~ 09.13",
      imageSrc: "/images/trips/gyeongju-history.png",
      imageAlt: "전통 누각이 보이는 경주 여행지",
      participantCount: 2,
      participants: [
        { id: "mina", name: "민아", imageSrc: "/images/trips/avatar-mina.png" },
        { id: "seo", name: "서연", imageSrc: "/images/trips/avatar-seo.png" },
      ],
    },
  ],
  past: [
    {
      id: "jeonju-food",
      dDay: "완료",
      title: "전주 미식 여행",
      duration: "1박 2일",
      dateRange: "2025.07.12 ~ 07.13",
      imageSrc: "/images/trips/gyeongju-history.png",
      imageAlt: "한옥 풍경이 있는 전주 여행지",
      participantCount: 2,
      participants: [
        { id: "mina", name: "민아", imageSrc: "/images/trips/avatar-mina.png" },
      ],
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadMySavedCourses.mockResolvedValue({ items: [] });
});

describe("MyTripsScreen", () => {
  it("keeps every primary content region on the standard horizontal inset", () => {
    renderScreen({ trips: testTrips });

    const header = screen
      .getByRole("heading", { level: 1, name: "내 일정" })
      .closest("header");
    const tabsContainer = screen
      .getByRole("tablist", { name: "일정 구분" })
      .parentElement;
    const panel = screen.getByRole("tabpanel");
    const actionsContainer = screen
      .getByRole("button", { name: "새 일정 만들기" })
      .parentElement;

    for (const region of [header, tabsContainer, panel, actionsContainer]) {
      expect(region).toHaveClass("px-5");
    }
  });

  it("aligns the header top inset with the Explore screen", () => {
    renderScreen({ trips: testTrips });

    const header = screen
      .getByRole("heading", { level: 1, name: "내 일정" })
      .closest("header");

    expect(header).toHaveClass("pt-[25px]");
  });

  it("renders upcoming trip cards and marks the trip navigation current", () => {
    renderScreen({ trips: testTrips });

    expect(screen.getByRole("heading", { level: 1, name: "내 일정" })).toBeVisible();
    expect(screen.getByRole("button", { name: "알림" })).toBeDisabled();
    expect(screen.getByRole("tab", { name: "예정된 일정" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    const list = screen.getByRole("list", { name: "예정된 일정 목록" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    const jejuCard = within(list).getByRole("article", {
      name: "D-5 제주도 힐링 여행",
    });
    expect(
      within(jejuCard).getByRole("img", {
        name: "숲과 바다가 내려다보이는 제주 여행지",
      }),
    ).toHaveAttribute("loading", "eager");
    expect(
      within(list).getByRole("img", {
        name: "전통 누각이 보이는 경주 여행지",
      }),
    ).toHaveAttribute("loading", "eager");
    expect(screen.getByRole("img", { name: "AI 여행 일정 도우미" })).toHaveAttribute(
      "loading",
      "eager",
    );
    expect(jejuCard).toHaveTextContent("2박 3일 · 2025.08.28 ~ 08.30");
    expect(jejuCard).toHaveTextContent("4명");
    expect(within(jejuCard).getAllByRole("img")).toHaveLength(4);

    expect(screen.getByRole("link", { name: "내 일정" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute("href", "/");
  });

  it("switches to past trips without leaving the screen", async () => {
    const user = userEvent.setup();
    renderScreen({ trips: testTrips });

    await user.click(screen.getByRole("tab", { name: "지난 일정" }));

    expect(screen.getByRole("tab", { name: "지난 일정" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("list", { name: "지난 일정 목록" })).toHaveTextContent(
      "전주 미식 여행",
    );
    expect(screen.queryByText("제주도 힐링 여행")).not.toBeInTheDocument();
  });

  it("gives feedback for the visible itinerary actions", async () => {
    const user = userEvent.setup();
    renderScreen({ trips: testTrips });

    await user.click(
      screen.getByRole("button", { name: "제주도 힐링 여행 상세 보기" }),
    );
    expect(screen.getByRole("status", { name: "일정 화면 상태" })).toHaveTextContent(
      "제주도 힐링 여행 상세 화면을 준비하고 있어요.",
    );
  });

  it("opens a blank course editor when starting a new schedule", async () => {
    const user = userEvent.setup();
    renderScreen({ trips: testTrips });

    await user.click(screen.getByRole("button", { name: "새 일정 만들기" }));

    expect(mocks.routerPush).toHaveBeenCalledWith(
      `/courses/${blankCourseMock.id}/edit`,
    );
  });

  it("opens the course editor from the AI recommendation banner", async () => {
    const user = userEvent.setup();
    renderScreen({ trips: testTrips });

    await user.click(
      screen.getByRole("button", { name: "AI 맞춤 일정 추천 받기" }),
    );

    expect(mocks.routerPush).toHaveBeenCalledWith(
      `/courses/${courseEditMock.id}/edit`,
    );
  });

  it("shows saved courses only on the scheduled tab", async () => {
    const user = userEvent.setup();
    render(
      <MyTripsScreen
        trips={{ scheduled: [], past: [] }}
        initialSavedCourses={[savedCourse]}
      />,
    );

    expect(screen.getByText("예술의전당 근처 코스")).toBeVisible();
    expect(screen.queryByText("예정된 일정이 없어요.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "지난 일정" }));

    expect(screen.queryByText("예술의전당 근처 코스")).not.toBeInTheDocument();
    expect(screen.getByText("지난 일정이 없어요.")).toBeVisible();
  });

  it("removes a saved course from its more menu", async () => {
    mocks.removeSavedCourse.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <MyTripsScreen
        trips={{ scheduled: [], past: [] }}
        initialSavedCourses={[savedCourse]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "예술의전당 근처 코스 더보기" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "삭제" }));

    expect(mocks.removeSavedCourse.mock.calls[0]?.[0]).toBe(savedCourse.id);
    expect(
      await screen.findByRole("status", { name: "일정 화면 상태" }),
    ).toHaveTextContent("저장한 코스를 삭제했어요.");
    expect(screen.queryByText("예술의전당 근처 코스")).not.toBeInTheDocument();
  });

  it("opens the course editor from a saved course's more menu", async () => {
    const user = userEvent.setup();
    render(
      <MyTripsScreen
        trips={{ scheduled: [], past: [] }}
        initialSavedCourses={[savedCourse]}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "예술의전당 근처 코스 더보기" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "수정" }));

    expect(mocks.routerPush).toHaveBeenCalledWith(
      `/courses/${savedCourse.id}/edit`,
    );
  });

  it("collapses and expands a saved course's stop list by clicking its header", async () => {
    const user = userEvent.setup();
    render(
      <MyTripsScreen
        trips={{ scheduled: [], past: [] }}
        initialSavedCourses={[savedCourse]}
      />,
    );

    const toggle = screen.getByRole("button", {
      name: "예술의전당 근처 코스 펼치기",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);

    expect(screen.getByText("예술의전당")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "예술의전당 근처 코스 접기" }),
    ).toHaveAttribute("aria-expanded", "true");

    await user.click(
      screen.getByRole("button", { name: "예술의전당 근처 코스 접기" }),
    );

    expect(screen.queryByText("예술의전당")).not.toBeInTheDocument();
  });
});
