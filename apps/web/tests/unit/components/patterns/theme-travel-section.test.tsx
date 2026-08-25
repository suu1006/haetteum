import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

import { ThemeCourseExplorer } from "@/features/themes/theme-course-explorer";
import { themeTravelMock } from "@/features/themes/theme-travel.mock";

describe("ThemeCourseExplorer", () => {
  it("renders the reference sections and filters mock courses", async () => {
    const user = userEvent.setup();

    render(<ThemeCourseExplorer data={themeTravelMock} />);

    expect(
      screen.getByRole("heading", { name: "테마로 떠나는 여행" }),
    ).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "테마별 추천 여행" }),
    ).toBeVisible();
    expect(
      within(
        screen.getByRole("list", { name: "테마별 추천 여행 코스" }),
      ).getAllByRole("article"),
    ).toHaveLength(3);

    const filter = screen.getByRole("group", { name: "테마 필터" });
    await user.click(
      within(filter).getByRole("button", { name: "미식 여행" }),
    );

    expect(
      screen.getByRole("article", { name: "전주 미식 탐방 코스" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("article", { name: "제주 바다 힐링 코스" }),
    ).not.toBeInTheDocument();
  });

  it("sorts by rating and keeps bookmarks in local state", async () => {
    const user = userEvent.setup();

    render(<ThemeCourseExplorer data={themeTravelMock} />);

    expect(
      screen.getByRole("combobox", { name: "추천 코스 정렬" }),
    ).toHaveTextContent("인기순");

    await user.click(
      screen.getByRole("combobox", { name: "추천 코스 정렬" }),
    );
    await user.click(screen.getByRole("option", { name: "평점순" }));

    const courseList = screen.getByRole("list", {
      name: "테마별 추천 여행 코스",
    });
    expect(
      within(courseList)
        .getAllByRole("article")
        .map((article) => article.getAttribute("aria-label")),
    ).toEqual([
      "경주 역사 탐방 코스",
      "제주 바다 힐링 코스",
      "전주 미식 탐방 코스",
    ]);

    await user.click(
      screen.getByRole("button", { name: "경주 역사 탐방 코스 저장" }),
    );
    expect(
      screen.getByRole("button", { name: "경주 역사 탐방 코스 저장 취소" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("recovers from an empty theme filter", async () => {
    const user = userEvent.setup();

    render(<ThemeCourseExplorer data={themeTravelMock} />);

    const filter = screen.getByRole("group", { name: "테마 필터" });
    await user.click(
      within(filter).getByRole("button", { name: "액티비티" }),
    );

    expect(
      screen.getByText("선택한 테마의 추천 코스를 준비하고 있어요."),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "전체 코스 보기" }));

    expect(
      within(
        screen.getByRole("list", { name: "테마별 추천 여행 코스" }),
      ).getAllByRole("article"),
    ).toHaveLength(3);
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <ThemeCourseExplorer data={themeTravelMock} />,
    );

    expect(
      (
        await axe.run(container, {
          rules: { "color-contrast": { enabled: false } },
        })
      ).violations,
    ).toEqual([]);
  });
});
