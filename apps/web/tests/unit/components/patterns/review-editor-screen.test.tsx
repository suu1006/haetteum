import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PlaceListItem, ReviewItem } from "@haetteum/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReviewEditorScreen } from "@/components/patterns/review-editor-screen";

const routerMocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
}));

const apiMocks = vi.hoisted(() => ({
  createReview: vi.fn(),
  searchReviewPlaces: vi.fn(),
  updateReview: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

vi.mock("@/features/profile/my-reviews-api", () => apiMocks);

const reviewedPlace = {
  id: "84549352-0c20-4e11-af50-2d4f278f41ef",
  title: "이미 후기 쓴 에버랜드",
  region: "gyeonggi",
  district: "용인시",
  address: "경기도 용인시 처인구",
  longitude: 127.204,
  latitude: 37.294,
  primaryImageUrl: null,
  imageCopyrightType: null,
} as const satisfies PlaceListItem;

const selectablePlace = {
  id: "5d1f4931-ff56-48df-841d-c85854af0133",
  title: "수원 화성",
  region: "gyeonggi",
  district: "수원시",
  address: "경기도 수원시 팔달구 정조로",
  longitude: 127.014,
  latitude: 37.287,
  primaryImageUrl: "https://images.example.test/suwon.jpg",
  imageCopyrightType: "Type1",
} as const satisfies PlaceListItem;

const jejuPlace = {
  id: "f021e183-afdb-4c15-a4a7-b642c4dfaef8",
  title: "성산일출봉",
  region: "jeju",
  district: "서귀포시",
  address: "제주특별자치도 서귀포시 성산읍",
  longitude: 126.9406,
  latitude: 33.4581,
  primaryImageUrl: null,
  imageCopyrightType: null,
} as const satisfies PlaceListItem;

type PlaceSearchResult =
  | { status: "ready"; items: PlaceListItem[] }
  | { status: "error" };

const initialReview = {
  id: "24684077-a907-45c3-85bf-b509dab12377",
  placeId: reviewedPlace.id,
  placeTitle: "에버랜드",
  location: "경기 용인",
  rating: 4,
  content: "평일이라 여유롭게 둘러봤어요.",
  primaryImageUrl: null,
  createdAt: "2026-08-25T14:00:00.000Z",
  updatedAt: "2026-08-26T01:30:00.000Z",
} as const satisfies ReviewItem;

beforeEach(() => {
  routerMocks.replace.mockReset();
  routerMocks.refresh.mockReset();
  apiMocks.createReview.mockReset();
  apiMocks.searchReviewPlaces.mockReset();
  apiMocks.updateReview.mockReset();
  apiMocks.searchReviewPlaces.mockResolvedValue({ status: "ready", items: [] });
  apiMocks.createReview.mockResolvedValue({
    status: "success",
    review: initialReview,
  });
  apiMocks.updateReview.mockResolvedValue({
    status: "success",
    review: initialReview,
  });
});

async function prepareCreateForm(user: ReturnType<typeof userEvent.setup>) {
  apiMocks.searchReviewPlaces.mockResolvedValue({
    status: "ready",
    items: [selectablePlace],
  });

  await user.selectOptions(screen.getByRole("combobox", { name: "지역" }), "gyeonggi");
  await user.type(screen.getByRole("searchbox", { name: "관광지 검색" }), "화성");
  await user.click(screen.getByRole("button", { name: "검색" }));
  await user.click(screen.getByRole("radio", { name: /수원 화성/ }));
  await user.click(screen.getByRole("radio", { name: "5점" }));
  await user.type(screen.getByRole("textbox", { name: "후기 내용" }), "  야경이 아름다웠어요.  ");
}

describe("ReviewEditorScreen", () => {
  it("offers the five supported regions and never searches before a region is selected", async () => {
    const user = userEvent.setup();
    render(<ReviewEditorScreen mode="create" reviewedPlaceIds={[]} />);

    const region = screen.getByRole("combobox", { name: "지역" });
    expect(within(region).getAllByRole("option").map((option) => option.textContent)).toEqual([
      "지역 선택",
      "서울",
      "경기",
      "강원",
      "부산",
      "제주",
    ]);
    expect(screen.getByRole("button", { name: "검색" })).toBeDisabled();
    expect(apiMocks.searchReviewPlaces).not.toHaveBeenCalled();

    await user.selectOptions(region, "jeju");
    await user.type(screen.getByRole("searchbox", { name: "관광지 검색" }), "성산");
    await user.click(screen.getByRole("button", { name: "검색" }));

    expect(apiMocks.searchReviewPlaces).toHaveBeenCalledWith("jeju", "성산");
  });

  it("excludes reviewed places from complete search results and lets another place be selected", async () => {
    const user = userEvent.setup();
    apiMocks.searchReviewPlaces.mockResolvedValue({
      status: "ready",
      items: [reviewedPlace, selectablePlace],
    });
    render(
      <ReviewEditorScreen
        mode="create"
        reviewedPlaceIds={[reviewedPlace.id]}
      />,
    );

    await user.selectOptions(screen.getByRole("combobox", { name: "지역" }), "gyeonggi");
    await user.click(screen.getByRole("button", { name: "검색" }));

    expect(
      screen.queryByRole("radio", { name: /이미 후기 쓴 에버랜드/ }),
    ).not.toBeInTheDocument();
    const placeControl = screen.getByRole("radio", { name: /수원 화성/ });
    expect(placeControl).toHaveAttribute("aria-checked", "false");

    await user.click(placeControl);

    expect(placeControl).toHaveAttribute("aria-checked", "true");
  });

  it("clears a selected place when the query changes and requires a new visible selection", async () => {
    const user = userEvent.setup();
    apiMocks.searchReviewPlaces
      .mockResolvedValueOnce({ status: "ready", items: [selectablePlace] })
      .mockResolvedValueOnce({ status: "ready", items: [] })
      .mockResolvedValueOnce({ status: "ready", items: [jejuPlace] });
    render(<ReviewEditorScreen mode="create" reviewedPlaceIds={[]} />);

    const query = screen.getByRole("searchbox", { name: "관광지 검색" });
    const submit = screen.getByRole("button", { name: "후기 등록" });
    await user.selectOptions(
      screen.getByRole("combobox", { name: "지역" }),
      "gyeonggi",
    );
    await user.type(query, "화성");
    await user.click(screen.getByRole("button", { name: "검색" }));
    await user.click(screen.getByRole("radio", { name: /수원 화성/ }));
    await user.click(screen.getByRole("radio", { name: "5점" }));
    await user.type(
      screen.getByRole("textbox", { name: "후기 내용" }),
      "야경이 아름다웠어요.",
    );
    expect(submit).toBeEnabled();

    await user.clear(query);
    await user.type(query, "없는 곳");

    expect(submit).toBeDisabled();
    expect(
      screen.queryByRole("radio", { name: /수원 화성/ }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "검색" }));
    expect(screen.getByText("선택할 수 있는 관광지가 없어요.")).toBeVisible();
    expect(submit).toBeDisabled();

    await user.clear(query);
    await user.type(query, "성산");
    await user.click(screen.getByRole("button", { name: "검색" }));

    const nextPlace = screen.getByRole("radio", { name: /성산일출봉/ });
    expect(submit).toBeDisabled();
    await user.click(nextPlace);
    expect(submit).toBeEnabled();
  });

  it("invalidates a pending search when its query is edited", async () => {
    const user = userEvent.setup();
    let resolveSearch: ((result: PlaceSearchResult) => void) | undefined;
    apiMocks.searchReviewPlaces.mockReturnValue(
      new Promise((resolve) => {
        resolveSearch = resolve;
      }),
    );
    render(<ReviewEditorScreen mode="create" reviewedPlaceIds={[]} />);

    const query = screen.getByRole("searchbox", { name: "관광지 검색" });
    await user.selectOptions(
      screen.getByRole("combobox", { name: "지역" }),
      "gyeonggi",
    );
    await user.type(query, "화성");
    await user.click(screen.getByRole("button", { name: "검색" }));
    await user.clear(query);
    await user.type(query, "성산");

    await act(async () => {
      resolveSearch?.({ status: "ready", items: [selectablePlace] });
    });

    expect(
      screen.queryByRole("radio", { name: /수원 화성/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "검색" })).toBeEnabled();
  });

  it("ignores a stale search response after the region changes and a newer search completes", async () => {
    const user = userEvent.setup();
    const resolveSearches: Array<(result: PlaceSearchResult) => void> = [];
    apiMocks.searchReviewPlaces.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSearches.push(resolve);
        }),
    );
    render(<ReviewEditorScreen mode="create" reviewedPlaceIds={[]} />);

    const region = screen.getByRole("combobox", { name: "지역" });
    await user.selectOptions(region, "gyeonggi");
    await user.click(screen.getByRole("button", { name: "검색" }));
    await user.selectOptions(region, "jeju");
    await user.click(screen.getByRole("button", { name: "검색" }));

    await act(async () => {
      resolveSearches[1]?.({ status: "ready", items: [jejuPlace] });
    });
    expect(screen.getByRole("radio", { name: /성산일출봉/ })).toBeVisible();

    await act(async () => {
      resolveSearches[0]?.({ status: "ready", items: [selectablePlace] });
    });
    expect(screen.getByRole("radio", { name: /성산일출봉/ })).toBeVisible();
    expect(
      screen.queryByRole("radio", { name: /수원 화성/ }),
    ).not.toBeInTheDocument();
  });

  it("uses roving tab stops and arrow keys to focus and select place results", async () => {
    const user = userEvent.setup();
    apiMocks.searchReviewPlaces.mockResolvedValue({
      status: "ready",
      items: [selectablePlace, jejuPlace],
    });
    render(<ReviewEditorScreen mode="create" reviewedPlaceIds={[]} />);

    await user.selectOptions(
      screen.getByRole("combobox", { name: "지역" }),
      "gyeonggi",
    );
    await user.click(screen.getByRole("button", { name: "검색" }));

    const results = screen.getByRole("radiogroup", {
      name: "관광지 검색 결과",
    });
    const firstPlace = within(results).getByRole("radio", {
      name: /수원 화성/,
    });
    const secondPlace = within(results).getByRole("radio", {
      name: /성산일출봉/,
    });
    expect(firstPlace).toHaveAttribute("tabindex", "0");
    expect(secondPlace).toHaveAttribute("tabindex", "-1");

    firstPlace.focus();
    await user.keyboard("{ArrowDown}");

    expect(secondPlace).toHaveFocus();
    expect(secondPlace).toHaveAttribute("aria-checked", "true");
    expect(secondPlace).toHaveAttribute("tabindex", "0");
    expect(firstPlace).toHaveAttribute("tabindex", "-1");

    await user.keyboard("{ArrowUp}");

    expect(firstPlace).toHaveFocus();
    expect(firstPlace).toHaveAttribute("aria-checked", "true");
  });

  it("validates required fields, exposes a roving keyboard rating, trims content, and navigates after success", async () => {
    const user = userEvent.setup();
    render(<ReviewEditorScreen mode="create" reviewedPlaceIds={[]} />);

    expect(screen.getByText("0/500")).toBeVisible();
    expect(screen.getByRole("button", { name: "후기 등록" })).toBeDisabled();

    await user.selectOptions(screen.getByRole("combobox", { name: "지역" }), "gyeonggi");
    apiMocks.searchReviewPlaces.mockResolvedValue({
      status: "ready",
      items: [selectablePlace],
    });
    await user.click(screen.getByRole("button", { name: "검색" }));
    await user.click(screen.getByRole("radio", { name: /수원 화성/ }));

    const ratingGroup = screen.getByRole("radiogroup", { name: "별점" });
    const firstRating = within(ratingGroup).getByRole("radio", { name: "1점" });
    expect(firstRating).toHaveAttribute("tabindex", "0");
    firstRating.focus();
    await user.keyboard("{ArrowRight}");

    const secondRating = within(ratingGroup).getByRole("radio", { name: "2점" });
    expect(secondRating).toHaveFocus();
    expect(secondRating).toHaveAttribute("aria-checked", "true");
    expect(secondRating).toHaveAttribute("tabindex", "0");
    expect(firstRating).toHaveAttribute("tabindex", "-1");

    await user.type(
      screen.getByRole("textbox", { name: "후기 내용" }),
      "  산책하기 좋았어요.  ",
    );
    expect(screen.getByText("14/500")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "후기 등록" }));

    await waitFor(() => {
      expect(apiMocks.createReview).toHaveBeenCalledWith({
        placeId: selectablePlace.id,
        rating: 2,
        content: "산책하기 좋았어요.",
      });
    });
    expect(routerMocks.replace).toHaveBeenCalledWith("/reviews");
    expect(routerMocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("rejects content longer than 500 characters without issuing a mutation", () => {
    render(<ReviewEditorScreen mode="edit" initialReview={initialReview} />);

    const content = screen.getByRole("textbox", { name: "후기 내용" });
    fireEvent.change(content, { target: { value: "가".repeat(501) } });

    expect(screen.getByText("501/500")).toBeVisible();
    expect(screen.getByText("후기는 500자 이하로 작성해 주세요.")).toBeVisible();
    expect(screen.getByRole("button", { name: "수정 저장" })).toBeDisabled();
    expect(apiMocks.updateReview).not.toHaveBeenCalled();
  });

  it("accepts surrounding spaces around 500 meaningful characters and submits trimmed content", async () => {
    const user = userEvent.setup();
    const meaningfulContent = "가".repeat(500);
    render(<ReviewEditorScreen mode="edit" initialReview={initialReview} />);

    fireEvent.change(screen.getByRole("textbox", { name: "후기 내용" }), {
      target: { value: ` ${meaningfulContent} ` },
    });

    expect(screen.getByText("502/500")).toBeVisible();
    expect(
      screen.queryByText("후기는 500자 이하로 작성해 주세요."),
    ).not.toBeInTheDocument();
    const submit = screen.getByRole("button", { name: "수정 저장" });
    expect(submit).toBeEnabled();

    await user.click(submit);

    await waitFor(() => {
      expect(apiMocks.updateReview).toHaveBeenCalledWith(initialReview.id, {
        rating: 4,
        content: meaningfulContent,
      });
    });
  });

  it("allows only one mutation while a create request is pending", async () => {
    const user = userEvent.setup();
    let resolveMutation: ((value: { status: "success"; review: ReviewItem }) => void) | undefined;
    apiMocks.createReview.mockReturnValue(
      new Promise((resolve) => {
        resolveMutation = resolve;
      }),
    );
    render(<ReviewEditorScreen mode="create" reviewedPlaceIds={[]} />);
    await prepareCreateForm(user);

    const submit = screen.getByRole("button", { name: "후기 등록" });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(apiMocks.createReview).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();

    resolveMutation?.({ status: "success", review: initialReview });
    await waitFor(() => expect(routerMocks.replace).toHaveBeenCalledWith("/reviews"));
  });

  it("retains every field and shows a safe duplicate message", async () => {
    const user = userEvent.setup();
    apiMocks.createReview.mockResolvedValue({ status: "duplicate" });
    render(<ReviewEditorScreen mode="create" reviewedPlaceIds={[]} />);
    await prepareCreateForm(user);

    await user.click(screen.getByRole("button", { name: "후기 등록" }));

    expect(
      await screen.findByText("이미 이 관광지에 작성한 후기가 있어요."),
    ).toBeVisible();
    expect(screen.getByRole("radio", { name: /수원 화성/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("radio", { name: "5점" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("textbox", { name: "후기 내용" })).toHaveValue(
      "  야경이 아름다웠어요.  ",
    );
    expect(routerMocks.replace).not.toHaveBeenCalled();
    expect(routerMocks.refresh).not.toHaveBeenCalled();
  });

  it("shows the adapter's generic error without navigating", async () => {
    const user = userEvent.setup();
    apiMocks.updateReview.mockResolvedValue({
      status: "error",
      message: "후기를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
    });
    render(<ReviewEditorScreen mode="edit" initialReview={initialReview} />);

    await user.click(screen.getByRole("button", { name: "수정 저장" }));

    expect(
      await screen.findByText(
        "후기를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      ),
    ).toBeVisible();
    expect(routerMocks.replace).not.toHaveBeenCalled();
    expect(routerMocks.refresh).not.toHaveBeenCalled();
  });

  it("keeps the edit place read-only and patches only rating and trimmed content", async () => {
    const user = userEvent.setup();
    render(<ReviewEditorScreen mode="edit" initialReview={initialReview} />);

    expect(screen.getByText("에버랜드")).toBeVisible();
    expect(screen.getByText("경기 용인")).toBeVisible();
    expect(screen.queryByRole("combobox", { name: "지역" })).not.toBeInTheDocument();
    expect(screen.queryByRole("searchbox", { name: "관광지 검색" })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "4점" })).toHaveAttribute(
      "aria-checked",
      "true",
    );

    const content = screen.getByRole("textbox", { name: "후기 내용" });
    await user.clear(content);
    await user.type(content, "  다시 가고 싶어요.  ");
    await user.click(screen.getByRole("radio", { name: "5점" }));
    await user.click(screen.getByRole("button", { name: "수정 저장" }));

    await waitFor(() => {
      expect(apiMocks.updateReview).toHaveBeenCalledWith(initialReview.id, {
        rating: 5,
        content: "다시 가고 싶어요.",
      });
    });
    expect(routerMocks.replace).toHaveBeenCalledWith("/reviews");
    expect(routerMocks.refresh).toHaveBeenCalledTimes(1);
  });
});
