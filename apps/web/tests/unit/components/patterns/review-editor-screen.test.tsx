import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

const favoriteApiMocks = vi.hoisted(() => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
  loadMyFavorites: vi.fn(),
}));

const imageApiMocks = vi.hoisted(() => ({
  uploadReviewImage: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

vi.mock("@/features/profile/my-reviews-api", () => apiMocks);
vi.mock("@/features/places/favorite-place-api", () => favoriteApiMocks);
vi.mock("@/features/profile/review-images-api", () => imageApiMocks);

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

const initialReview = {
  id: "24684077-a907-45c3-85bf-b509dab12377",
  placeId: "84549352-0c20-4e11-af50-2d4f278f41ef",
  placeTitle: "에버랜드",
  location: "경기 용인",
  rating: 4,
  title: "여유로운 하루",
  content: "평일이라 여유롭게 둘러봤어요.",
  images: [],
  primaryImageUrl: null,
  createdAt: "2026-08-25T14:00:00.000Z",
  updatedAt: "2026-08-26T01:30:00.000Z",
} as const satisfies ReviewItem;

function renderScreen(ui: Parameters<typeof render>[0]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  apiMocks.searchReviewPlaces.mockResolvedValue({ status: "ready", items: [] });
  apiMocks.createReview.mockResolvedValue({
    status: "success",
    review: initialReview,
  });
  apiMocks.updateReview.mockResolvedValue({
    status: "success",
    review: initialReview,
  });
  favoriteApiMocks.loadMyFavorites.mockResolvedValue({ items: [] });
});

async function selectPlace(user: ReturnType<typeof userEvent.setup>) {
  apiMocks.searchReviewPlaces.mockResolvedValue({
    status: "ready",
    items: [selectablePlace],
  });

  await user.selectOptions(screen.getByRole("combobox", { name: "지역" }), "gyeonggi");
  await user.click(screen.getByRole("button", { name: "관광지 검색" }));
  await user.type(await screen.findByRole("searchbox", { name: "관광지 검색" }), "화성");

  const result = await screen.findByRole("button", { name: /수원 화성/ });
  await user.click(result);

  await waitFor(() => {
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("radio", { name: "5점" }));
  await user.type(
    screen.getByRole("textbox", { name: "제목을 입력해주세요" }),
    "다시 오고 싶어요",
  );
  await user.type(
    screen.getByRole("textbox", { name: "후기를 작성해주세요" }),
    "야경이 정말 아름다웠어요.",
  );
}

describe("ReviewEditorScreen", () => {
  it("offers the five supported regions and keeps the search trigger disabled until a region is picked", () => {
    renderScreen(<ReviewEditorScreen mode="create" reviewedPlaceIds={[]} />);

    const region = screen.getByRole("combobox", { name: "지역" });
    expect(
      within(region).getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["지역 선택", "서울", "경기", "강원", "부산", "제주"]);
    expect(screen.getByRole("button", { name: "관광지 검색" })).toBeDisabled();
  });

  it("selects a place through the search dialog and shows it as a summary card", async () => {
    const user = userEvent.setup();
    renderScreen(<ReviewEditorScreen mode="create" reviewedPlaceIds={[]} />);

    await selectPlace(user);

    expect(screen.getByText("수원 화성")).toBeVisible();
    expect(screen.getByText("경기 수원시")).toBeVisible();
    expect(
      screen.queryByRole("combobox", { name: "지역" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다른 관광지로 변경" }));

    expect(screen.getByRole("combobox", { name: "지역" })).toBeVisible();
  });

  it("keeps the submit button disabled until rating, title and a long-enough review are provided", async () => {
    const user = userEvent.setup();
    renderScreen(<ReviewEditorScreen mode="create" reviewedPlaceIds={[]} />);

    const submit = screen.getByRole("button", { name: "등록하기" });
    expect(submit).toBeDisabled();

    await selectPlace(user);
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: "5점" }));
    expect(submit).toBeDisabled();

    await user.type(
      screen.getByRole("textbox", { name: "제목을 입력해주세요" }),
      "다시 오고 싶어요",
    );
    expect(submit).toBeDisabled();

    await user.type(
      screen.getByRole("textbox", { name: "후기를 작성해주세요" }),
      "너무 짧아요",
    );
    expect(submit).toBeDisabled();

    await user.type(
      screen.getByRole("textbox", { name: "후기를 작성해주세요" }),
      " 그리고 더 자세히 적어봅니다.",
    );
    expect(submit).toBeEnabled();
  });

  it("submits the review, defaults the bookmark toggle on, and navigates back on success", async () => {
    const user = userEvent.setup();
    renderScreen(<ReviewEditorScreen mode="create" reviewedPlaceIds={[]} />);
    await selectPlace(user);
    await fillRequiredFields(user);

    await user.click(screen.getByRole("button", { name: "등록하기" }));

    await waitFor(() => {
      expect(apiMocks.createReview).toHaveBeenCalledWith({
        placeId: selectablePlace.id,
        rating: 5,
        title: "다시 오고 싶어요",
        content: "야경이 정말 아름다웠어요.",
        images: [],
      });
    });
    await waitFor(() => {
      expect(favoriteApiMocks.addFavorite).toHaveBeenCalledWith(selectablePlace.id);
    });
    expect(routerMocks.replace).toHaveBeenCalledWith("/reviews");
    expect(routerMocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("does not bookmark the place when the toggle is turned off before submitting", async () => {
    const user = userEvent.setup();
    renderScreen(<ReviewEditorScreen mode="create" reviewedPlaceIds={[]} />);
    await selectPlace(user);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("switch", { name: "북마크에 저장" }));

    await user.click(screen.getByRole("button", { name: "등록하기" }));

    await waitFor(() => {
      expect(routerMocks.replace).toHaveBeenCalledWith("/reviews");
    });
    expect(favoriteApiMocks.addFavorite).not.toHaveBeenCalled();
  });

  it("uploads a photo and allows removing it before submitting", async () => {
    const user = userEvent.setup();
    imageApiMocks.uploadReviewImage.mockResolvedValue({
      status: "success",
      url: "https://api.test/uploads/reviews/photo-1.jpg",
    });
    renderScreen(<ReviewEditorScreen mode="create" reviewedPlaceIds={[]} />);
    await selectPlace(user);
    await fillRequiredFields(user);

    const file = new File(["binary"], "photo.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText("사진 추가"), file);

    await waitFor(() => {
      expect(imageApiMocks.uploadReviewImage).toHaveBeenCalledWith(file);
    });
    expect(await screen.findByAltText("첨부 사진 1")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "등록하기" }));

    await waitFor(() => {
      expect(apiMocks.createReview).toHaveBeenCalledWith(
        expect.objectContaining({
          images: ["https://api.test/uploads/reviews/photo-1.jpg"],
        }),
      );
    });
  });

  it("shows a safe duplicate message without navigating", async () => {
    const user = userEvent.setup();
    apiMocks.createReview.mockResolvedValue({ status: "duplicate" });
    renderScreen(<ReviewEditorScreen mode="create" reviewedPlaceIds={[]} />);
    await selectPlace(user);
    await fillRequiredFields(user);

    await user.click(screen.getByRole("button", { name: "등록하기" }));

    expect(
      await screen.findByText("이미 이 관광지에 작성한 후기가 있어요."),
    ).toBeVisible();
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });

  it("allows only one mutation while a create request is pending", async () => {
    const user = userEvent.setup();
    let resolveMutation: ((value: { status: "success"; review: ReviewItem }) => void) | undefined;
    apiMocks.createReview.mockReturnValue(
      new Promise((resolve) => {
        resolveMutation = resolve;
      }),
    );
    renderScreen(<ReviewEditorScreen mode="create" reviewedPlaceIds={[]} />);
    await selectPlace(user);
    await fillRequiredFields(user);

    const submit = screen.getByRole("button", { name: "등록하기" });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(apiMocks.createReview).toHaveBeenCalledTimes(1);

    resolveMutation?.({ status: "success", review: initialReview });
    await waitFor(() => expect(routerMocks.replace).toHaveBeenCalledWith("/reviews"));
  });

  it("keeps the edit place read-only and patches rating, title, content and images", async () => {
    const user = userEvent.setup();
    renderScreen(
      <ReviewEditorScreen mode="edit" initialReview={initialReview} />,
    );

    expect(screen.getByText("에버랜드")).toBeVisible();
    expect(screen.getByText("경기 용인")).toBeVisible();
    expect(
      screen.queryByRole("combobox", { name: "지역" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "4점" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(
      screen.getByRole("textbox", { name: "제목을 입력해주세요" }),
    ).toHaveValue("여유로운 하루");

    await user.click(screen.getByRole("radio", { name: "5점" }));
    const content = screen.getByRole("textbox", { name: "후기를 작성해주세요" });
    await user.clear(content);
    await user.type(content, "다시 방문해도 좋을 것 같아요.");

    await user.click(screen.getByRole("button", { name: "등록하기" }));

    await waitFor(() => {
      expect(apiMocks.updateReview).toHaveBeenCalledWith(initialReview.id, {
        rating: 5,
        title: "여유로운 하루",
        content: "다시 방문해도 좋을 것 같아요.",
        images: [],
      });
    });
    expect(routerMocks.replace).toHaveBeenCalledWith("/reviews");
  });

  it("shows the adapter's generic error without navigating", async () => {
    const user = userEvent.setup();
    apiMocks.updateReview.mockResolvedValue({
      status: "error",
      message: "후기를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
    });
    renderScreen(
      <ReviewEditorScreen mode="edit" initialReview={initialReview} />,
    );

    await user.click(screen.getByRole("button", { name: "등록하기" }));

    expect(
      await screen.findByText(
        "후기를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      ),
    ).toBeVisible();
    expect(routerMocks.replace).not.toHaveBeenCalled();
  });
});
