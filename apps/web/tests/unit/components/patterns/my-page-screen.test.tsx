import { render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

import { MyPageScreen } from "@/components/patterns/my-page-screen";
import { myPageMock } from "@/features/profile/my-page.mock";

describe("MyPageScreen", () => {
  it("assembles the profile, travel records, AI recommendation and account menu", () => {
    render(<MyPageScreen data={myPageMock} />);

    expect(
      screen.getByRole("heading", { name: "마이페이지", level: 1 }),
    ).toBeVisible();
    expect(screen.getByRole("img", { name: "해뜸이 프로필" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "해뜸이" })).toBeVisible();
    expect(screen.getByText("여행자 Lv.3")).toBeVisible();
    expect(screen.getByText("다음 레벨까지 230P 남았어요!")).toBeVisible();
    expect(screen.getByText("2,770P")).toBeVisible();
    expect(screen.getByRole("progressbar", { name: "다음 레벨 진행도" })).toHaveAttribute(
      "aria-valuenow",
      "38",
    );

    const travelRecords = screen.getByRole("list", { name: "나의 여행 기록" });
    expect(within(travelRecords).getAllByRole("listitem")).toHaveLength(4);
    expect(travelRecords).toHaveTextContent("내 일정3개");
    expect(travelRecords).toHaveTextContent("내 후기12개");
    expect(travelRecords).toHaveTextContent("찜한 장소28개");
    expect(travelRecords).toHaveTextContent("방문한 장소15개");

    expect(
      screen.getByRole("link", { name: "AI 맞춤 여행 추천 받기" }),
    ).toHaveAttribute(
      "href",
      "/?region=gyeonggi&tab=recommended#ai-course",
    );

    const accountMenu = screen.getByRole("list", { name: "마이페이지 메뉴" });
    expect(within(accountMenu).getAllByRole("listitem")).toHaveLength(5);
    expect(accountMenu).toHaveTextContent("알림");
    expect(accountMenu).toHaveTextContent("설정");
    expect(accountMenu).toHaveTextContent("고객센터");
    expect(accountMenu).toHaveTextContent("이용 안내");
    expect(accountMenu).toHaveTextContent("로그아웃");
  });

  it("keeps home available and identifies My Page as the current destination", () => {
    render(<MyPageScreen data={myPageMock} />);

    expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "마이페이지" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("links both My Page review entry points to the personal reviews screen", () => {
    render(<MyPageScreen data={myPageMock} />);

    const travelRecords = screen.getByRole("list", { name: "나의 여행 기록" });
    expect(
      within(travelRecords).getByRole("link", { name: /내 후기/ }),
    ).toHaveAttribute("href", "/reviews");

    const mainNavigation = screen.getByRole("navigation", { name: "주요 메뉴" });
    expect(
      within(mainNavigation).getByRole("link", { name: "내 후기" }),
    ).toHaveAttribute("href", "/reviews");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<MyPageScreen data={myPageMock} />);

    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });
});
