import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it } from "vitest";

import { MyReviewsScreen } from "@/components/patterns/my-reviews-screen";
import type { MyReviewsData } from "@/features/profile/my-reviews-model";

const screenData: MyReviewsData = {
  written: [
    {
      id: "written-live-everland",
      placeId: "everland",
      title: "테스트 에버랜드",
      location: "경기 용인",
      rating: 5,
      date: "2026.08.26",
      content: "실제 데이터로 표시되는 작성 후기예요.",
      likeCount: 0,
      commentCount: 0,
      bookmarked: false,
      image: {
        src: "/images/explore/categories/popular-attraction.png",
        alt: "테스트 에버랜드 대표 이미지",
      },
    },
  ],
  bookmarked: [],
};

const emptyWrittenData: MyReviewsData = {
  written: [],
  bookmarked: [],
};

describe("MyReviewsScreen", () => {
  it("keeps every primary content region on the standard horizontal inset", () => {
    render(<MyReviewsScreen data={screenData} writtenLoadState="ready" />);

    const header = screen
      .getByRole("heading", { level: 1, name: "내 후기" })
      .closest("header");
    const tabsContainer = screen
      .getByRole("tablist", { name: "내 후기 분류" })
      .parentElement;
    const panel = screen.getByRole("tabpanel");

    for (const region of [header, tabsContainer, panel]) {
      expect(region).toHaveClass("px-5");
    }
  });

  it("aligns the header top inset with the Explore screen", () => {
    render(<MyReviewsScreen data={screenData} writtenLoadState="ready" />);

    const header = screen
      .getByRole("heading", { level: 1, name: "내 후기" })
      .closest("header");

    expect(header).toHaveClass("pt-[25px]");
  });

  it("opens on the written reviews tab with two personal review tabs", () => {
    render(<MyReviewsScreen data={screenData} writtenLoadState="ready" />);

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
      screen.getByRole("article", { name: "테스트 에버랜드 후기" }),
    ).toBeVisible();
    expect(
      screen.getByText("실제 데이터로 표시되는 작성 후기예요."),
    ).toBeVisible();
    expect(
      within(screen.getByRole("list", { name: "작성한 후기 목록" })).getAllByRole(
        "listitem",
      ),
    ).toHaveLength(1);

    const navigation = screen.getByRole("navigation", { name: "주요 메뉴" });
    expect(
      within(navigation).getByRole("link", { name: "내 후기" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("shows an empty written-review state instead of an empty list", () => {
    render(
      <MyReviewsScreen data={emptyWrittenData} writtenLoadState="ready" />,
    );

    expect(screen.getByText("작성한 후기가 아직 없어요")).toBeVisible();
    expect(
      screen.queryByRole("list", { name: "작성한 후기 목록" }),
    ).not.toBeInTheDocument();
  });

  it("shows a written-review error state instead of an empty list", () => {
    render(
      <MyReviewsScreen data={emptyWrittenData} writtenLoadState="error" />,
    );

    expect(screen.getByText("후기를 불러오지 못했어요")).toBeVisible();
    expect(screen.getByText("잠시 후 다시 시도해 주세요.")).toBeVisible();
    expect(
      screen.queryByRole("list", { name: "작성한 후기 목록" }),
    ).not.toBeInTheDocument();
  });

  it("shows the truthful empty bookmarked state without personal mocks", async () => {
    const user = userEvent.setup();
    render(<MyReviewsScreen data={screenData} writtenLoadState="ready" />);

    const bookmarkTab = screen.getByRole("tab", { name: "북마크" });
    await user.click(bookmarkTab);

    expect(bookmarkTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("북마크한 후기가 아직 없어요")).toBeVisible();
    expect(
      screen.queryByRole("article", { name: "테스트 에버랜드 후기" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "북마크한 후기 목록" })).not.toBeInTheDocument();
  });

  it("does not render a redundant back control", () => {
    render(<MyReviewsScreen data={screenData} writtenLoadState="ready" />);

    expect(
      screen.queryByRole("link", { name: "마이페이지로 돌아가기" }),
    ).not.toBeInTheDocument();
  });

  it("offers an accessible floating link for writing a review", () => {
    render(<MyReviewsScreen data={screenData} writtenLoadState="ready" />);

    const createLink = screen.getByRole("link", { name: "후기 작성하기" });

    expect(createLink).toHaveAttribute("href", "/reviews/new");
    expect(createLink).toHaveTextContent("+");
    expect(
      screen.queryByRole("button", { name: "작성하기" }),
    ).not.toBeInTheDocument();

    expect(createLink.parentElement).toHaveClass(
      "pointer-events-none",
      "fixed",
      "bottom-[var(--reviews-navigation-reserve)]",
      "z-40",
      "max-w-[30rem]",
      "justify-end",
      "px-5",
    );
    expect(createLink).toHaveClass(
      "pointer-events-auto",
      "size-14",
      "rounded-full",
    );
  });

  it("adds an edit link to written reviews only", async () => {
    const user = userEvent.setup();
    render(<MyReviewsScreen data={screenData} writtenLoadState="ready" />);

    expect(
      screen.getByRole("link", { name: "테스트 에버랜드 후기 수정" }),
    ).toHaveAttribute("href", "/reviews/written-live-everland/edit");

    await user.click(screen.getByRole("tab", { name: "북마크" }));

    expect(screen.queryByRole("link", { name: /후기 수정/ })).not.toBeInTheDocument();
  });

  it("moves tab selection and focus with the arrow keys", async () => {
    const user = userEvent.setup();
    render(<MyReviewsScreen data={screenData} writtenLoadState="ready" />);

    const writtenTab = screen.getByRole("tab", { name: "작성한 후기" });
    const bookmarkTab = screen.getByRole("tab", { name: "북마크" });
    writtenTab.focus();

    await user.keyboard("{ArrowRight}");

    expect(bookmarkTab).toHaveFocus();
    expect(bookmarkTab).toHaveAttribute("aria-selected", "true");
  });

  it("keeps every tab control reference attached to the rendered panel", () => {
    const { container } = render(
      <MyReviewsScreen data={screenData} writtenLoadState="ready" />,
    );

    for (const tab of screen.getAllByRole("tab")) {
      const panelId = tab.getAttribute("aria-controls");

      expect(panelId).toBeTruthy();
      expect(container.querySelector(`#${panelId}`)).toBeInTheDocument();
    }
  });

  it("has no detectable accessibility violations in either tab", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <MyReviewsScreen data={screenData} writtenLoadState="ready" />,
    );

    const axeOptions = {
      rules: { "color-contrast": { enabled: false } },
    };

    expect((await axe.run(container, axeOptions)).violations).toEqual([]);

    await user.click(screen.getByRole("tab", { name: "북마크" }));

    expect((await axe.run(container, axeOptions)).violations).toEqual([]);
  });
});
