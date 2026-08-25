import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

import { MyReviewsScreen } from "@/components/patterns/my-reviews-screen";
import { myReviewsMock } from "@/features/profile/my-reviews.mock";

describe("MyReviewsScreen", () => {
  it("opens on the written reviews tab with two personal review tabs", () => {
    render(<MyReviewsScreen data={myReviewsMock} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "내 후기" }),
    ).toBeVisible();

    const tabs = screen.getByRole("tablist", { name: "내 후기 분류" });
    expect(within(tabs).getAllByRole("tab")).toHaveLength(2);
    expect(
      within(tabs).getByRole("tab", { name: "작성한 후기" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(within(tabs).getByRole("tab", { name: "북마크" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(within(tabs).queryByRole("tab", { name: "전체" })).not.toBeInTheDocument();

    expect(
      screen.getByRole("article", { name: "이천 테르메덴 후기" }),
    ).toBeVisible();
    expect(screen.getByText("온천도 좋고 주변 경관도 아름다워요.")).toBeVisible();
    expect(
      within(screen.getByRole("list", { name: "작성한 후기 목록" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(3);

    const navigation = screen.getByRole("navigation", { name: "주요 메뉴" });
    expect(
      within(navigation).getByRole("link", { name: "내 후기" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("switches the visible cards to bookmarked reviews", async () => {
    const user = userEvent.setup();
    render(<MyReviewsScreen data={myReviewsMock} />);

    const bookmarkTab = screen.getByRole("tab", { name: "북마크" });
    await user.click(bookmarkTab);

    expect(bookmarkTab).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("article", { name: "성산일출봉 후기" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("article", { name: "이천 테르메덴 후기" }),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "북마크한 후기 목록" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(2);
  });

  it("offers a deterministic back path to My Page", () => {
    render(<MyReviewsScreen data={myReviewsMock} />);

    expect(
      screen.getByRole("link", { name: "마이페이지로 돌아가기" }),
    ).toHaveAttribute("href", "/mypage");
  });

  it("announces that review writing is not yet available", async () => {
    const user = userEvent.setup();
    render(<MyReviewsScreen data={myReviewsMock} />);

    await user.click(screen.getByRole("button", { name: "작성하기" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "후기 작성 기능을 준비하고 있어요",
    );
  });

  it("moves tab selection and focus with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<MyReviewsScreen data={myReviewsMock} />);

    const writtenTab = screen.getByRole("tab", { name: "작성한 후기" });
    const bookmarkTab = screen.getByRole("tab", { name: "북마크" });
    writtenTab.focus();

    await user.keyboard("{ArrowRight}");

    expect(bookmarkTab).toHaveFocus();
    expect(bookmarkTab).toHaveAttribute("aria-selected", "true");
  });

  it("keeps every tab control reference attached to the rendered panel", () => {
    const { container } = render(<MyReviewsScreen data={myReviewsMock} />);

    for (const tab of screen.getAllByRole("tab")) {
      const panelId = tab.getAttribute("aria-controls");

      expect(panelId).toBeTruthy();
      expect(container.querySelector(`#${panelId}`)).toBeInTheDocument();
    }
  });

  it("has no detectable accessibility violations in either tab", async () => {
    const user = userEvent.setup();
    const { container } = render(<MyReviewsScreen data={myReviewsMock} />);

    const axeOptions = {
      rules: { "color-contrast": { enabled: false } },
    };

    expect((await axe.run(container, axeOptions)).violations).toEqual([]);

    await user.click(screen.getByRole("tab", { name: "북마크" }));

    expect((await axe.run(container, axeOptions)).violations).toEqual([]);
  });
});
