import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CourseEditor } from "@/features/courses/course-editor";
import type { CourseEditFixture } from "@/features/courses/course-edit-model";
import { courseEditMock } from "@/features/courses/course-edit.mock";

const routerMocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

describe("CourseEditor", () => {
  beforeEach(() => {
    routerMocks.back.mockReset();
    routerMocks.push.mockReset();
  });

  it("renders the approved mobile regions in reference order", () => {
    render(<CourseEditor course={courseEditMock} />);

    expect(
      screen.getAllByTestId("course-edit-region").map((node) =>
        node.getAttribute("data-region"),
      ),
    ).toEqual(["header", "tabs", "instructions", "itinerary", "actions"]);

    expect(
      screen.getByRole("heading", { level: 1, name: "일정 수정" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "뒤로가기" })).toBeVisible();
    expect(screen.getByRole("button", { name: "초기화" })).toBeVisible();
  });

  it("pairs fixed time slots with sortable AI course cards", () => {
    render(<CourseEditor course={courseEditMock} />);

    const tabs = screen.getByRole("tablist", { name: "코스 종류" });
    expect(within(tabs).getByRole("tab", { name: "AI 추천 코스" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(within(tabs).getByRole("tab", { name: "내가 만든 코스" })).toHaveAttribute(
      "aria-selected",
      "false",
    );

    const itinerary = screen.getByRole("list", { name: "AI 추천 코스 일정" });
    expect(within(itinerary).getAllByRole("listitem")).toHaveLength(5);
    expect(within(itinerary).getByText("08:30")).toBeVisible();
    expect(within(itinerary).getByText("임금님 쌀밥집")).toBeVisible();
    expect(
      within(itinerary).getByRole("button", {
        name: "임금님 쌀밥집 일정 이동",
      }),
    ).toBeVisible();
  });

  it("opens the selected place details from the card content", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);

    await user.click(
      screen.getByRole("button", {
        name: "이천 테르메덴 상세 정보 보기",
      }),
    );

    const dialog = screen.getByRole("dialog", { name: "장소 상세 정보" });
    expect(dialog).toHaveFocus();
    expect(within(dialog).getByText("이천 테르메덴")).toBeVisible();
    expect(within(dialog).getByText("온천/워터파크")).toBeVisible();
    expect(
      within(dialog).getByText("경기 이천시 모가면 사실로 984"),
    ).toBeVisible();
    expect(
      within(dialog).getByText(
        "자연 속에서 온천과 물놀이를 함께 즐기는 휴식형 테마파크예요.",
      ),
    ).toBeVisible();
  });

  it("keeps the drag handle separate and returns focus after closing details", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);
    const detailButton = screen.getByRole("button", {
      name: "이천 테르메덴 상세 정보 보기",
    });

    await user.click(detailButton);
    await user.click(
      within(screen.getByRole("dialog", { name: "장소 상세 정보" })).getByRole(
        "button",
        { name: "닫기" },
      ),
    );

    expect(
      screen.queryByRole("dialog", { name: "장소 상세 정보" }),
    ).not.toBeInTheDocument();
    expect(detailButton).toHaveFocus();

    await user.click(
      screen.getByRole("button", { name: "이천 테르메덴 일정 이동" }),
    );
    expect(
      screen.queryByRole("dialog", { name: "장소 상세 정보" }),
    ).not.toBeInTheDocument();
  });

  it("confirms the selected place from the detail modal", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);

    await user.click(
      screen.getByRole("button", { name: "설봉공원 상세 정보 보기" }),
    );
    await user.click(
      within(screen.getByRole("dialog", { name: "장소 상세 정보" })).getByRole(
        "button",
        { name: "일정에 반영하기" },
      ),
    );

    expect(
      screen.queryByRole("dialog", { name: "장소 상세 정보" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "일정 편집 상태" }),
    ).toHaveTextContent("설봉공원을 일정에 반영했습니다.");
  });

  it("shows the reorder icon guidance and bottom actions", () => {
    render(<CourseEditor course={courseEditMock} />);

    expect(
      screen.getByText("드래그해서 순서를 변경하거나, '+' 버튼으로 장소를 추가하세요"),
    ).toBeVisible();
    const reorderGuidance = screen.getByText(
      "아이콘을 눌러 순서를 변경할 수 있어요",
    );
    expect(reorderGuidance).toBeVisible();
    expect(reorderGuidance.querySelector(".lucide-menu")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "장소 추가하기" })).toBeVisible();
    expect(screen.getByRole("button", { name: "저장하기" })).toBeVisible();
  });

  it("keeps independent mock orders while switching course tabs", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);

    await user.click(screen.getByRole("tab", { name: "내가 만든 코스" }));

    expect(
      screen.getByRole("tab", { name: "내가 만든 코스" }),
    ).toHaveAttribute("aria-selected", "true");
    const customItinerary = screen.getByRole("list", {
      name: "내가 만든 코스 일정",
    });
    expect(within(customItinerary).getAllByRole("listitem")[0]).toHaveTextContent(
      "09:00설봉공원",
    );

    await user.click(screen.getByRole("tab", { name: "AI 추천 코스" }));
    const aiItinerary = screen.getByRole("list", { name: "AI 추천 코스 일정" });
    expect(within(aiItinerary).getAllByRole("listitem")[0]).toHaveTextContent(
      "08:30임금님 쌀밥집",
    );
  });

  it("opens nearby search without changing the active draft", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);

    await user.click(screen.getByRole("button", { name: "장소 추가하기" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "주변 장소 검색" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { level: 1, name: "일정 수정" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "이천 시립박물관 이미 일정에 추가됨",
      }),
    ).toBeDisabled();
  });

  it("selects places across filters and appends them to the active course", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);

    await user.click(screen.getByRole("button", { name: "장소 추가하기" }));
    await user.click(screen.getByRole("button", { name: "카페 온천 선택" }));
    await user.click(
      within(screen.getByRole("group", { name: "장소 카테고리" })).getByRole(
        "button",
        { name: "숙소" },
      ),
    );
    expect(
      screen.getByRole("button", { name: "선택한 장소 추가하기 1" }),
    ).toBeEnabled();
    await user.click(
      screen.getByRole("button", { name: "테르메덴 리조트 선택" }),
    );
    await user.click(
      screen.getByRole("button", { name: "선택한 장소 추가하기 2" }),
    );

    const itinerary = screen.getByRole("list", { name: "AI 추천 코스 일정" });
    expect(within(itinerary).getAllByRole("listitem")).toHaveLength(7);
    expect(within(itinerary).getByText("카페 온천")).toBeVisible();
    expect(within(itinerary).getByText("테르메덴 리조트")).toBeVisible();
    expect(within(itinerary).getByText("18:00")).toBeVisible();
    expect(within(itinerary).getByText("19:30")).toBeVisible();
    expect(
      screen.getByRole("status", { name: "일정 편집 상태" }),
    ).toHaveTextContent("장소 2개를 일정에 추가했습니다.");

    await user.click(screen.getByRole("button", { name: "초기화" }));

    expect(within(itinerary).getAllByRole("listitem")).toHaveLength(5);
    expect(within(itinerary).queryByText("카페 온천")).not.toBeInTheDocument();
    expect(
      screen.getByRole("status", { name: "일정 편집 상태" }),
    ).toHaveTextContent("AI 추천 코스를 처음 순서로 되돌렸습니다.");
  });

  it("discards pending place selections when returning to edit", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);

    await user.click(screen.getByRole("button", { name: "장소 추가하기" }));
    await user.click(screen.getByRole("button", { name: "카페 온천 선택" }));
    await user.click(
      screen.getByRole("button", { name: "일정 수정으로 돌아가기" }),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "일정 수정" }),
    ).toBeVisible();
    expect(screen.queryByText("카페 온천")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "장소 추가하기" }));
    expect(
      screen.getByRole("button", { name: "선택한 장소 추가하기 0" }),
    ).toBeDisabled();
  });

  it("announces a time-slot failure after returning to edit", async () => {
    const user = userEvent.setup();
    const lateCourse = {
      ...courseEditMock,
      courses: {
        ...courseEditMock.courses,
        ai: {
          ...courseEditMock.courses.ai,
          slots: courseEditMock.courses.ai.slots.map((slot, index) =>
            index === courseEditMock.courses.ai.slots.length - 1
              ? { ...slot, time: "23:30" }
              : slot,
          ),
        },
      },
    } satisfies CourseEditFixture;

    render(<CourseEditor course={lateCourse} />);
    await user.click(screen.getByRole("button", { name: "장소 추가하기" }));
    await user.click(screen.getByRole("button", { name: "카페 온천 선택" }));
    await user.click(
      screen.getByRole("button", { name: "선택한 장소 추가하기 1" }),
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "일정 수정" }),
    ).toBeVisible();
    expect(
      screen.getByRole("status", { name: "일정 편집 상태" }),
    ).toHaveTextContent("추가할 일정 시간을 만들 수 없습니다.");
    expect(screen.queryByText("카페 온천")).not.toBeInTheDocument();
  });

  it("keeps added places isolated to the active custom course", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);

    await user.click(screen.getByRole("tab", { name: "내가 만든 코스" }));
    await user.click(screen.getByRole("button", { name: "장소 추가하기" }));
    await user.click(screen.getByRole("button", { name: "카페 온천 선택" }));
    await user.click(
      screen.getByRole("button", { name: "선택한 장소 추가하기 1" }),
    );

    const customItinerary = screen.getByRole("list", {
      name: "내가 만든 코스 일정",
    });
    expect(within(customItinerary).getAllByRole("listitem")).toHaveLength(6);
    expect(within(customItinerary).getByText("19:30")).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "AI 추천 코스" }));
    const aiItinerary = screen.getByRole("list", { name: "AI 추천 코스 일정" });
    expect(within(aiItinerary).getAllByRole("listitem")).toHaveLength(5);
    expect(within(aiItinerary).queryByText("카페 온천")).not.toBeInTheDocument();
  });

  it("opens the saved course after saving the active draft", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);

    await user.click(screen.getByRole("tab", { name: "내가 만든 코스" }));
    await user.click(screen.getByRole("button", { name: "저장하기" }));

    expect(routerMocks.push).toHaveBeenCalledWith("/courses/icheon-day-trip");
  });

  it("moves the focused card with the keyboard and announces its new slot", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);
    const itinerary = screen.getByRole("list", { name: "AI 추천 코스 일정" });
    const handle = within(itinerary).getByRole("button", {
      name: "설봉공원 일정 이동",
    });

    handle.focus();
    await user.keyboard("[Space][ArrowUp][ArrowUp][Space]");

    expect(within(itinerary).getAllByRole("listitem")[0]).toHaveTextContent(
      "08:30설봉공원",
    );
    expect(
      screen.getByRole("status", { name: "일정 편집 상태" }),
    ).toHaveTextContent("설봉공원이 1번째 일정으로 이동했습니다.");
    expect(handle).toHaveFocus();
  });

  it("returns through browser history from the header", async () => {
    const user = userEvent.setup();
    render(<CourseEditor course={courseEditMock} />);

    await user.click(screen.getByRole("button", { name: "뒤로가기" }));

    expect(routerMocks.back).toHaveBeenCalledOnce();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<CourseEditor course={courseEditMock} />);
    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });
});
