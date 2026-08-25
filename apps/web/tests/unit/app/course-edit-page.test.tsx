import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import CourseEditNotFound from "@/app/courses/[courseId]/edit/not-found";
import CourseEditPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/courses/[courseId]/edit/page";

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

describe("course edit page", () => {
  it("prebuilds only the approved mock course", () => {
    expect(generateStaticParams()).toEqual([{ courseId: "icheon-day-trip" }]);
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

  it("delegates unknown course IDs to the scoped not-found boundary", async () => {
    await expect(
      CourseEditPage({
        params: Promise.resolve({ courseId: "missing-course" }),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("offers a return path from the scoped not-found page", () => {
    render(<CourseEditNotFound />);

    expect(screen.getByText("코스를 찾을 수 없어요")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "여행 탐색으로 돌아가기" }),
    ).toHaveAttribute("href", "/");
  });
});
