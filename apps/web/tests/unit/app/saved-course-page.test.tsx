import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SavedCourseNotFound from "@/app/courses/[courseId]/not-found";
import SavedCoursePage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/courses/[courseId]/page";

const navigationMocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: navigationMocks.notFound,
  useRouter: () => navigationMocks,
}));

describe("saved course page", () => {
  it("prebuilds the available mock course route", () => {
    expect(generateStaticParams()).toEqual([{ courseId: "icheon-day-trip" }]);
  });

  it("builds metadata for the saved itinerary", async () => {
    await expect(
      generateMetadata({
        params: Promise.resolve({ courseId: "icheon-day-trip" }),
      }),
    ).resolves.toMatchObject({
      title: "이천 테르메덴 중심 1일 코스 | 해뜸",
      description: expect.stringContaining("저장된 여행 일정"),
    });
  });

  it("renders the requested saved course", async () => {
    render(
      await SavedCoursePage({
        params: Promise.resolve({ courseId: "icheon-day-trip" }),
      }),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "여행 일정이 완성되었어요" }),
    ).toBeVisible();
  });

  it("delegates unknown course IDs to the scoped not-found boundary", async () => {
    await expect(
      SavedCoursePage({
        params: Promise.resolve({ courseId: "missing-course" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("offers a return path from the saved-course not-found page", () => {
    render(<SavedCourseNotFound />);

    expect(screen.getByText("저장된 코스를 찾을 수 없어요")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "여행 탐색으로 돌아가기" }),
    ).toHaveAttribute("href", "/");
  });
});
