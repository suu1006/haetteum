import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render as rtlRender, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigationMocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const mocks = vi.hoisted(() => ({
  requireCurrentUser: vi.fn(),
  headers: vi.fn(),
  loadSavedCourseById: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: navigationMocks.notFound,
  useRouter: () => navigationMocks,
}));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/features/auth/auth-server", () => ({
  requireCurrentUser: mocks.requireCurrentUser,
}));
vi.mock("@/features/trips/my-saved-courses-api", () => ({
  loadSavedCourseById: mocks.loadSavedCourseById,
}));

import CourseEditNotFound from "@/app/courses/[courseId]/edit/not-found";
import CourseEditPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/courses/[courseId]/edit/page";

const user = {
  id: "447a6484-d0a7-4e5b-8f31-8872a563d9b1",
  displayName: "실제 카카오 여행자",
  profileImageUrl: null,
};

const savedCourse = {
  id: "40000000-0000-4000-8000-000000000001",
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

function render(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return rtlRender(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCurrentUser.mockResolvedValue(user);
  mocks.headers.mockResolvedValue(
    new Headers({ Cookie: "haetteum_session=opaque-session" }),
  );
  mocks.loadSavedCourseById.mockResolvedValue({ status: "not-found" });
});

describe("course edit page", () => {
  it("prebuilds only the approved mock and blank courses", () => {
    expect(generateStaticParams()).toEqual([
      { courseId: "icheon-day-trip" },
      { courseId: "new" },
    ]);
  });

  it("builds course-specific metadata", async () => {
    await expect(
      generateMetadata({
        params: Promise.resolve({ courseId: "icheon-day-trip" }),
      }),
    ).resolves.toMatchObject({
      title: "이천 하루 코스 일정 수정 | 해뜸",
      description: expect.stringContaining("방문 순서"),
    });
  });

  it("builds distinct metadata for a blank new schedule", async () => {
    await expect(
      generateMetadata({ params: Promise.resolve({ courseId: "new" }) }),
    ).resolves.toMatchObject({
      title: "새 일정 만들기 | 해뜸",
    });
  });

  it("renders the requested mock course editor", async () => {
    render(
      await CourseEditPage({
        params: Promise.resolve({ courseId: "icheon-day-trip" }),
      }),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "일정 수정" }),
    ).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
  });

  it("renders a blank editor with no default itinerary for a new schedule", async () => {
    render(
      await CourseEditPage({ params: Promise.resolve({ courseId: "new" }) }),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "일정 추가" }),
    ).toBeVisible();
    expect(screen.getByText("장소 하나로 일정을 만들어보세요!")).toBeVisible();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("delegates unknown course IDs to the scoped not-found boundary", async () => {
    await expect(
      CourseEditPage({
        params: Promise.resolve({ courseId: "missing-course" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("renders a saved course fetched from the API for a real course ID", async () => {
    mocks.loadSavedCourseById.mockResolvedValue({
      status: "ready",
      data: savedCourse,
    });

    render(
      await CourseEditPage({
        params: Promise.resolve({ courseId: savedCourse.id }),
      }),
    );

    expect(mocks.requireCurrentUser).toHaveBeenCalledWith(
      `/courses/${savedCourse.id}/edit`,
    );
    expect(mocks.loadSavedCourseById).toHaveBeenCalledWith(
      savedCourse.id,
      "haetteum_session=opaque-session",
    );
    expect(screen.getByText("예술의전당")).toBeVisible();
  });

  it("delegates a saved course the API cannot find to the not-found boundary", async () => {
    mocks.loadSavedCourseById.mockResolvedValue({ status: "not-found" });

    await expect(
      CourseEditPage({
        params: Promise.resolve({ courseId: savedCourse.id }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("sends an unauthenticated visitor through the session redirect before fetching", async () => {
    mocks.requireCurrentUser.mockRejectedValue(
      new Error(`redirected:/login?returnTo=%2Fcourses%2F${savedCourse.id}%2Fedit`),
    );

    await expect(
      CourseEditPage({
        params: Promise.resolve({ courseId: savedCourse.id }),
      }),
    ).rejects.toThrow("redirected:");
    expect(mocks.loadSavedCourseById).not.toHaveBeenCalled();
  });

  it("offers a return path from the scoped not-found page", () => {
    render(<CourseEditNotFound />);

    expect(screen.getByText("코스를 찾을 수 없어요")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "여행 탐색으로 돌아가기" }),
    ).toHaveAttribute("href", "/");
  });
});
