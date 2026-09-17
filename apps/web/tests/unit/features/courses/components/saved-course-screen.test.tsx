import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import type { SavedCourseItem } from "@haetteum/contracts";
import { describe, expect, it, vi } from "vitest";
import { SavedCourseExperience } from "@/features/courses/saved-course-experience";
const router = vi.hoisted(() => ({ back: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const course: SavedCourseItem = {
  id: "40000000-0000-4000-8000-000000000001", title: "서울 산책", savedAt: "2026-09-16T23:30:00Z",
  stops: [
    { sequence: 2, role: "cafe", title: "두 번째 카페", placeId: null, categoryLabel: "카페", address: "서울 종로구", latitude: 37.58, longitude: 126.98, distanceMeters: 250, placeUrl: "https://place.map.kakao.com/123" },
    { sequence: 1, role: "anchor", title: "첫 번째 장소", placeId: null, categoryLabel: null, address: "서울 중구", latitude: 37.57, longitude: 126.98, distanceMeters: null, placeUrl: null },
  ],
};
describe("SavedCourseExperience", () => {
  it("renders persisted title, KST date and ordered stops", () => {
    render(<SavedCourseExperience course={course} />);
    expect(screen.getByRole("heading", { name: "서울 산책" })).toBeVisible();
    expect(screen.getByText(/2026. 9. 17./)).toBeVisible();
    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("첫 번째 장소");
    expect(items[0]).toHaveTextContent("기준 장소");
    expect(items[1]).toHaveTextContent("두 번째 카페");
    expect(screen.getByRole("link", { name: "두 번째 카페" })).toHaveAttribute("href", "https://place.map.kakao.com/123");
    expect(screen.queryByText(/45,000|8시간 30분|18.7km/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "여행 시작하기" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "일정 저장 해제" })).not.toBeInTheDocument();
  });
  it("provides working back, list and real course edit navigation", async () => {
    render(<SavedCourseExperience course={course} />);
    await userEvent.setup().click(screen.getByRole("button", { name: "뒤로가기" }));
    expect(router.back).toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "내 일정" })).toHaveAttribute("href", "/trips");
    expect(screen.getByRole("link", { name: "일정 수정" })).toHaveAttribute("href", `/courses/${course.id}/edit`);
  });
  it("shows an empty state without inventing itinerary stops", () => {
    render(<SavedCourseExperience course={{ ...course, stops: [] }} />);
    expect(screen.getByText(/저장된 장소가 없어요/)).toBeVisible();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
  it("has no detectable accessibility violations", async () => {
    const { container } = render(<SavedCourseExperience course={course} />);
    expect((await axe.run(container, { rules: { region: { enabled: false } } })).violations).toEqual([]);
  });
});
