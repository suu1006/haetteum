import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SavedCourseExperience } from "@/features/courses/saved-course-experience";
import { savedCourseMock } from "@/features/courses/saved-course.mock";

const routerMocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

describe("SavedCourseExperience", () => {
  beforeEach(() => {
    routerMocks.back.mockReset();
    routerMocks.push.mockReset();
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "share");
    Reflect.deleteProperty(navigator, "clipboard");
  });

  it("renders the saved itinerary regions and summary in reference order", () => {
    render(<SavedCourseExperience course={savedCourseMock} />);

    expect(
      screen.getAllByTestId("saved-course-region").map((node) =>
        node.getAttribute("data-region"),
      ),
    ).toEqual(["header", "success", "summary", "itinerary", "actions"]);
    expect(
      screen.getByRole("heading", { level: 1, name: "여행 일정이 완성되었어요" }),
    ).toBeVisible();
    expect(screen.getByText("이천 테르메덴 중심 1일 코스가 저장되었어요")).toBeVisible();
    expect(screen.getByText("8시간 30분")).toBeVisible();
    expect(screen.getByText("18.7km")).toBeVisible();
    expect(screen.getByText("1인 약 45,000원")).toBeVisible();
    expect(
      screen.getByRole("img", { name: "이천 테르메덴 1일 코스 경로 지도" }),
    ).toBeVisible();
  });

  it("shows five confirmed stops with transfer information between them", () => {
    render(<SavedCourseExperience course={savedCourseMock} />);

    const itinerary = screen.getByRole("list", { name: "확정된 여행 일정" });
    expect(within(itinerary).getAllByRole("listitem")).toHaveLength(5);
    expect(within(itinerary).getByText("08:30")).toBeVisible();
    expect(within(itinerary).getByText("임금님 쌀밥집")).toBeVisible();
    expect(within(itinerary).getByText("0.8km · 차량 3분")).toBeVisible();
    expect(within(itinerary).getByText("설봉공원")).toBeVisible();
  });

  it("toggles the local saved state from the header", async () => {
    const user = userEvent.setup();
    render(<SavedCourseExperience course={savedCourseMock} />);

    const savedButton = screen.getByRole("button", { name: "일정 저장 해제" });
    expect(savedButton).toHaveAttribute("aria-pressed", "true");

    await user.click(savedButton);

    expect(
      screen.getByRole("button", { name: "일정 다시 저장" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("moves back and exposes a visible mock travel-start state", async () => {
    const user = userEvent.setup();
    render(<SavedCourseExperience course={savedCourseMock} />);

    await user.click(screen.getByRole("button", { name: "뒤로가기" }));
    expect(routerMocks.back).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "여행 시작하기" }));
    expect(screen.getByRole("button", { name: "여행 진행 중" })).toBeDisabled();
    expect(screen.getByRole("status", { name: "저장 일정 상태" })).toHaveTextContent(
      "여행을 시작했어요",
    );
  });

  it("copies the itinerary URL when native sharing is unavailable", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<SavedCourseExperience course={savedCourseMock} />);

    await user.click(screen.getByRole("button", { name: "일정 공유하기" }));

    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(
      await screen.findByText("일정 링크를 복사했어요."),
    ).toBeInTheDocument();
  });

  it("announces a share failure without leaving the saved itinerary", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error("share unavailable")),
    });
    render(<SavedCourseExperience course={savedCourseMock} />);

    await user.click(screen.getByRole("button", { name: "일정 공유하기" }));

    expect(
      await screen.findByText("일정 공유를 완료하지 못했어요. 다시 시도해 주세요."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "여행 일정이 완성되었어요" }),
    ).toBeVisible();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <SavedCourseExperience course={savedCourseMock} />,
    );

    const results = await axe.run(container, {
      rules: {
        region: { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });
});
