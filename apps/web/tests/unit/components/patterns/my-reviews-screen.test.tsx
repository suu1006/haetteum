import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MyReviewsScreen } from "@/components/patterns/my-reviews-screen";
import { favoritesQueryKey } from "@/features/places/favorite-place-query";
import type { MyReviewItem } from "@/features/profile/my-reviews-model";

const {
  addFavorite,
  removeFavorite,
  loadMyFavorites,
  deleteReview,
  routerPush,
} = vi.hoisted(() => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  loadMyFavorites: vi.fn(),
  deleteReview: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock("@/features/places/favorite-place-api", () => ({
  addFavorite,
  removeFavorite,
  loadMyFavorites,
}));
vi.mock("@/features/profile/my-reviews-api", () => ({ deleteReview }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

const writtenReviews: readonly MyReviewItem[] = [
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
    image: {
      src: "/images/explore/categories/popular-attraction.png",
      alt: "테스트 에버랜드 대표 이미지",
    },
  },
];

const favoritePlace = {
  id: "everland",
  title: "테스트 에버랜드",
  location: "경기 용인",
  primaryImageUrl: null,
  favoritedAt: "2026-08-30T00:00:00.000Z",
};

function renderScreen(
  ui: ReactElement,
  { favorites = [] }: { favorites?: (typeof favoritePlace)[] } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(favoritesQueryKey(), { items: favorites });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  loadMyFavorites.mockResolvedValue({ items: [] });
});

describe("MyReviewsScreen", () => {
  it("keeps every primary content region on the standard horizontal inset", () => {
    renderScreen(
      <MyReviewsScreen
        writtenReviews={writtenReviews}
        writtenLoadState="ready"
        bookmarkedLoadState="ready"
      />,
    );

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
    renderScreen(
      <MyReviewsScreen
        writtenReviews={writtenReviews}
        writtenLoadState="ready"
        bookmarkedLoadState="ready"
      />,
    );

    const header = screen
      .getByRole("heading", { level: 1, name: "내 후기" })
      .closest("header");

    expect(header).toHaveClass("pt-[25px]");
  });

  it("opens on the written reviews tab with two personal review tabs", () => {
    renderScreen(
      <MyReviewsScreen
        writtenReviews={writtenReviews}
        writtenLoadState="ready"
        bookmarkedLoadState="ready"
      />,
    );

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
    renderScreen(
      <MyReviewsScreen
        writtenReviews={[]}
        writtenLoadState="ready"
        bookmarkedLoadState="ready"
      />,
    );

    expect(screen.getByText("작성한 후기가 아직 없어요")).toBeVisible();
    expect(
      screen.queryByRole("list", { name: "작성한 후기 목록" }),
    ).not.toBeInTheDocument();
  });

  it("shows a written-review error state instead of an empty list", () => {
    renderScreen(
      <MyReviewsScreen
        writtenReviews={[]}
        writtenLoadState="error"
        bookmarkedLoadState="ready"
      />,
    );

    expect(screen.getByText("후기를 불러오지 못했어요")).toBeVisible();
    expect(screen.getByText("잠시 후 다시 시도해 주세요.")).toBeVisible();
    expect(
      screen.queryByRole("list", { name: "작성한 후기 목록" }),
    ).not.toBeInTheDocument();
  });

  it("shows the truthful empty bookmarked state without personal mocks", async () => {
    const user = userEvent.setup();
    renderScreen(
      <MyReviewsScreen
        writtenReviews={writtenReviews}
        writtenLoadState="ready"
        bookmarkedLoadState="ready"
      />,
    );

    const bookmarkTab = screen.getByRole("tab", { name: "북마크" });
    await user.click(bookmarkTab);

    expect(bookmarkTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("찜한 장소가 아직 없어요")).toBeVisible();
    expect(
      screen.queryByRole("article", { name: "테스트 에버랜드 후기" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "찜한 장소 목록" })).not.toBeInTheDocument();
  });

  it("renders favorited places on the bookmarked tab and unfavorites them from there", async () => {
    const user = userEvent.setup();
    removeFavorite.mockResolvedValue(undefined);
    renderScreen(
      <MyReviewsScreen
        writtenReviews={writtenReviews}
        writtenLoadState="ready"
        bookmarkedLoadState="ready"
      />,
      { favorites: [favoritePlace] },
    );

    await user.click(screen.getByRole("tab", { name: "북마크" }));

    const card = screen.getByRole("article", { name: "테스트 에버랜드 찜한 장소" });
    expect(within(card).getByText("테스트 에버랜드")).toBeVisible();
    expect(within(card).getByText("경기 용인")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "테스트 에버랜드 찜 해제" }),
    );

    expect(removeFavorite).toHaveBeenCalledWith("everland");
    expect(
      screen.queryByRole("article", { name: "테스트 에버랜드 찜한 장소" }),
    ).not.toBeInTheDocument();
  });

  it("does not render a redundant back control", () => {
    renderScreen(
      <MyReviewsScreen
        writtenReviews={writtenReviews}
        writtenLoadState="ready"
        bookmarkedLoadState="ready"
      />,
    );

    expect(
      screen.queryByRole("link", { name: "마이페이지로 돌아가기" }),
    ).not.toBeInTheDocument();
  });

  it("offers an accessible floating link for writing a review", () => {
    renderScreen(
      <MyReviewsScreen
        writtenReviews={writtenReviews}
        writtenLoadState="ready"
        bookmarkedLoadState="ready"
      />,
    );

    const createLink = screen.getByRole("link", { name: "후기 작성하기" });

    expect(createLink).toHaveAttribute("href", "/reviews/new");
    expect(createLink.querySelector("svg")).toBeInTheDocument();
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

  it("adds a more-options menu to written reviews only", async () => {
    const user = userEvent.setup();
    renderScreen(
      <MyReviewsScreen
        writtenReviews={writtenReviews}
        writtenLoadState="ready"
        bookmarkedLoadState="ready"
      />,
      { favorites: [favoritePlace] },
    );

    expect(
      screen.getByRole("button", { name: "테스트 에버랜드 후기 더보기" }),
    ).toBeVisible();

    await user.click(screen.getByRole("tab", { name: "북마크" }));

    expect(
      screen.queryByRole("button", { name: /후기 더보기/ }),
    ).not.toBeInTheDocument();
  });

  it("navigates to the review edit route when 수정 is selected", () => {
    renderScreen(
      <MyReviewsScreen
        writtenReviews={writtenReviews}
        writtenLoadState="ready"
        bookmarkedLoadState="ready"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "테스트 에버랜드 후기 더보기" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "수정" }));

    expect(routerPush).toHaveBeenCalledWith(
      "/reviews/written-live-everland/edit",
    );
  });

  it("removes a review from the list when 삭제 succeeds", async () => {
    deleteReview.mockResolvedValue({ status: "success" });
    renderScreen(
      <MyReviewsScreen
        writtenReviews={writtenReviews}
        writtenLoadState="ready"
        bookmarkedLoadState="ready"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "테스트 에버랜드 후기 더보기" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "삭제" }));

    expect(deleteReview).toHaveBeenCalledWith("written-live-everland");
    expect(
      await screen.findByText("작성한 후기가 아직 없어요"),
    ).toBeVisible();
  });

  it("keeps a review in the list and reports the error when 삭제 fails", async () => {
    deleteReview.mockResolvedValue({
      status: "error",
      message: "후기를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.",
    });
    renderScreen(
      <MyReviewsScreen
        writtenReviews={writtenReviews}
        writtenLoadState="ready"
        bookmarkedLoadState="ready"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "테스트 에버랜드 후기 더보기" }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "삭제" }));

    expect(
      await screen.findByText(
        "후기를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("article", { name: "테스트 에버랜드 후기" }),
    ).toBeVisible();
  });

  it("moves tab selection and focus with the arrow keys", async () => {
    const user = userEvent.setup();
    renderScreen(
      <MyReviewsScreen
        writtenReviews={writtenReviews}
        writtenLoadState="ready"
        bookmarkedLoadState="ready"
      />,
    );

    const writtenTab = screen.getByRole("tab", { name: "작성한 후기" });
    const bookmarkTab = screen.getByRole("tab", { name: "북마크" });
    writtenTab.focus();

    await user.keyboard("{ArrowRight}");

    expect(bookmarkTab).toHaveFocus();
    expect(bookmarkTab).toHaveAttribute("aria-selected", "true");
  });

  it("keeps every tab control reference attached to the rendered panel", () => {
    const { container } = renderScreen(
      <MyReviewsScreen
        writtenReviews={writtenReviews}
        writtenLoadState="ready"
        bookmarkedLoadState="ready"
      />,
    );

    for (const tab of screen.getAllByRole("tab")) {
      const panelId = tab.getAttribute("aria-controls");

      expect(panelId).toBeTruthy();
      expect(container.querySelector(`#${panelId}`)).toBeInTheDocument();
    }
  });

  it("has no detectable accessibility violations in either tab", async () => {
    const user = userEvent.setup();
    const { container } = renderScreen(
      <MyReviewsScreen
        writtenReviews={writtenReviews}
        writtenLoadState="ready"
        bookmarkedLoadState="ready"
      />,
      { favorites: [favoritePlace] },
    );

    const axeOptions = {
      rules: { "color-contrast": { enabled: false } },
    };

    expect((await axe.run(container, axeOptions)).violations).toEqual([]);

    await user.click(screen.getByRole("tab", { name: "북마크" }));

    expect((await axe.run(container, axeOptions)).violations).toEqual([]);
  });
});
