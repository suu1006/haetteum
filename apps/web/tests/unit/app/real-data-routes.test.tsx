import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(), course: vi.fn(), place: vi.fn(),
  notFound: vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); }),
}));
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ cookie: "session=test" }) }));
vi.mock("@/features/auth/auth-server", () => ({ requireCurrentUser: mocks.user }));
vi.mock("@/features/auth/auth-user-hydrator", () => ({ AuthUserHydrator: () => null }));
vi.mock("@/features/trips/my-saved-courses-api", () => ({ loadSavedCourseById: mocks.course }));
vi.mock("@/features/places/place-detail-api", () => ({ loadPlaceDetail: mocks.place, loadPlaceReviews: vi.fn() }));
vi.mock("@/features/courses/saved-course-experience", () => ({ SavedCourseExperience: ({ course }: { course: { title: string } }) => <h1>{course.title}</h1> }));
vi.mock("@/features/courses/course-editor", () => ({ CourseEditor: ({ course }: { course: { title: string; courses: { custom: { places: unknown[] } } } }) => <h1>{course.title} / {course.courses.custom.places.length}곳</h1> }));
import SavedCoursePage from "@/app/courses/[courseId]/page";
import CourseEditPage from "@/app/courses/[courseId]/edit/page";
import PlacePage from "@/app/places/[placeId]/page";

const id = "40000000-0000-4000-8000-000000000001";
const params = Promise.resolve({ courseId: id });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ id: "user", displayName: "여행자", profileImageUrl: null });
  mocks.course.mockResolvedValue({ status: "ready", data: { id, title: "내가 저장한 코스", savedAt: "2026-09-17T00:00:00Z", stops: [] } });
});

describe("production routes use persisted data", () => {
  it("loads a private saved course with the request session", async () => {
    render(await SavedCoursePage({ params }));
    expect(screen.getByRole("heading", { name: "내가 저장한 코스" })).toBeVisible();
    expect(mocks.user).toHaveBeenCalledWith(`/courses/${id}`);
    expect(mocks.course).toHaveBeenCalledWith(id, "session=test");
  });
  it("requires authentication before fetching saved details", async () => {
    mocks.user.mockRejectedValue(new Error("LOGIN_REDIRECT"));
    await expect(SavedCoursePage({ params })).rejects.toThrow("LOGIN_REDIRECT");
    expect(mocks.course).not.toHaveBeenCalled();
  });
  it("requires authentication for a new empty course", async () => {
    render(await CourseEditPage({ params: Promise.resolve({ courseId: "new" }) }));
    expect(mocks.user).toHaveBeenCalledWith("/courses/new/edit");
    expect(screen.getByText("새 일정 / 0곳")).toBeVisible();
    expect(mocks.course).not.toHaveBeenCalled();
  });
  it("rejects the former demo edit slug instead of rendering sample stops", async () => {
    await expect(CourseEditPage({ params: Promise.resolve({ courseId: "icheon-day-trip" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.course).not.toHaveBeenCalled();
  });
  it("rejects the former demo place slug", async () => {
    await expect(PlacePage({ params: Promise.resolve({ placeId: "icheon-termeden" }), searchParams: Promise.resolve({}) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mocks.place).not.toHaveBeenCalled();
  });
  it.each([SavedCoursePage, CourseEditPage])("shows service failure separately from missing data", async (page) => {
    mocks.course.mockResolvedValue({ status: "error" });
    render(await page({ params }));
    expect(screen.getByRole("alert")).toHaveTextContent("불러오지 못했어요");
    expect(mocks.notFound).not.toHaveBeenCalled();
  });
  it.each([SavedCoursePage, CourseEditPage])("uses 404 for missing or inaccessible saved data", async (page) => {
    mocks.course.mockResolvedValue({ status: "not-found" });
    await expect(page({ params })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
