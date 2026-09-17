import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SavedCourseNotFound from "@/app/courses/[courseId]/not-found";
import { metadata } from "@/app/courses/[courseId]/page";
import { vi } from "vitest";
vi.mock("server-only", () => ({}));

describe("saved course page metadata and fallback", () => {
  it("keeps private course content out of search metadata", () => {
    expect(metadata).toMatchObject({ title: "저장한 코스 | 해뜸", robots: { index: false, follow: false } });
  });
  it("offers a return path from the saved-course not-found page", () => {
    render(<SavedCourseNotFound />);
    expect(screen.getByText("저장된 코스를 찾을 수 없어요")).toBeVisible();
    expect(screen.getByRole("link", { name: "여행 탐색으로 돌아가기" })).toHaveAttribute("href", "/");
  });
});
