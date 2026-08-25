import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

import { PlaceDetailScreen } from "@/components/patterns/place-detail-screen";
import { getPlaceDetailById } from "@/features/places/place-detail.mock";

const routerMocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

function requirePlace(placeId: string) {
  const place = getPlaceDetailById(placeId);
  if (!place) throw new Error(`Expected place fixture: ${placeId}`);
  return place;
}

describe("PlaceDetailScreen", () => {
  it("renders the approved review regions in reference order", () => {
    render(
      <PlaceDetailScreen
        place={requirePlace("icheon-termeden")}
        query={{ tab: "reviews", source: "all" }}
      />,
    );

    expect(
      screen.getAllByTestId("place-detail-region").map((node) =>
        node.getAttribute("data-region"),
      ),
    ).toEqual([
      "header",
      "tabs",
      "review-heading",
      "filters",
      "rating",
      "feed",
      "action",
    ]);
    expect(screen.getAllByRole("article", { name: /의 후기/ })).toHaveLength(3);
  });

  it("filters the visible review feed by provider", () => {
    render(
      <PlaceDetailScreen
        place={requirePlace("icheon-termeden")}
        query={{ tab: "reviews", source: "google" }}
      />,
    );

    expect(
      screen.getByRole("article", { name: "Traveler_J의 후기" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("article", { name: "김여행의 후기" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the overall rating and offers all reviews for an empty source", () => {
    render(
      <PlaceDetailScreen
        place={requirePlace("everland")}
        query={{ tab: "reviews", source: "kakao" }}
      />,
    );

    expect(screen.getByText("선택한 출처에는 아직 후기가 없어요")).toBeVisible();
    expect(screen.getByRole("region", { name: /평점 4\.5점/ })).toBeVisible();
    expect(screen.getByRole("link", { name: "전체 후기 보기" })).toHaveAttribute(
      "href",
      "/places/everland",
    );
  });

  it("renders the mock AI course from map through itinerary actions", () => {
    render(
      <PlaceDetailScreen
        place={requirePlace("icheon-termeden")}
        query={{ tab: "course", source: "all" }}
      />,
    );

    expect(
      screen.getAllByTestId("place-detail-region").map((node) =>
        node.getAttribute("data-region"),
      ),
    ).toEqual(["header", "tabs", "course"]);
    expect(screen.getByRole("tab", { name: "1일차" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "2일차" })).toBeDisabled();
    expect(
      screen.getByRole("heading", {
        name: "이천 테르메덴 중심 1일 코스",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("img", { name: "이천 테르메덴 1일 코스 경로 지도" }),
    ).toBeVisible();

    const itinerary = screen.getByRole("list", { name: "1일차 여행 일정" });
    expect(within(itinerary).getAllByRole("listitem")).toHaveLength(5);
    expect(within(itinerary).getByText("임금님쌀밥집")).toBeVisible();
    expect(within(itinerary).getByText("해주냉면")).toBeVisible();
    const editCourseLink = screen.getByRole("link", { name: "코스 수정하기" });
    expect(editCourseLink).toHaveAttribute(
      "href",
      "/courses/icheon-day-trip/edit",
    );
    expect(editCourseLink.parentElement).toHaveClass(
      "fixed",
      "inset-x-0",
      "bottom-0",
      "max-w-[30rem]",
    );
    expect(screen.queryByText("추천 코스를 준비하고 있어요")).not.toBeInTheDocument();
  });

  it("has no detectable accessibility violations in the course tab", async () => {
    const { container } = render(
      <PlaceDetailScreen
        place={requirePlace("icheon-termeden")}
        query={{ tab: "course", source: "all" }}
      />,
    );
    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });

  it("renders the introduction in the approved reference order", () => {
    render(
      <PlaceDetailScreen
        place={requirePlace("icheon-termeden")}
        query={{ tab: "introduction", source: "all" }}
      />,
    );

    expect(
      screen.getAllByTestId("place-detail-region").map((node) =>
        node.getAttribute("data-region"),
      ),
    ).toEqual(["header", "tabs", "introduction"]);
    expect(
      screen.getByRole("region", { name: "이천 테르메덴 이미지 갤러리" }),
    ).toBeVisible();
    expect(screen.getByRole("heading", { name: "이천 테르메덴 소개" })).toBeVisible();
    expect(screen.getByRole("list", { name: "대표 시설" }).children).toHaveLength(4);
    expect(screen.getByRole("heading", { name: "추천 포인트" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "시설 미리보기" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "운영 시간" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "이용 요금" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "후기 작성하기" })).not.toBeInTheDocument();
    expect(screen.queryByText("소개를 준비하고 있어요")).not.toBeInTheDocument();
  });

  it("omits average dwell time from the introduction", () => {
    render(
      <PlaceDetailScreen
        place={requirePlace("icheon-termeden")}
        query={{ tab: "introduction", source: "all" }}
      />,
    );

    expect(screen.queryByText(/평균 체류/)).not.toBeInTheDocument();
  });

  it("renders place information and copies a supported value", async () => {
    const user = userEvent.setup();
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue(undefined);

    render(
      <PlaceDetailScreen
        place={requirePlace("icheon-termeden")}
        query={{ tab: "information", source: "all" }}
      />,
    );

    expect(
      screen.getAllByTestId("place-detail-region").map((node) =>
        node.getAttribute("data-region"),
      ),
    ).toEqual(["header", "tabs", "information"]);
    expect(screen.getByRole("heading", { name: "기본 정보" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "찾아가는 길" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "이용 안내" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "주변 관광지" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "주변 맛집" })).toBeVisible();
    expect(screen.getByRole("link", { name: "홈페이지 바로가기" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "후기 작성하기" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "주소 복사" }));

    expect(writeText).toHaveBeenCalledWith("경기 이천시");
    expect(
      screen.getByRole("status", { name: "정보 복사 결과" }),
    ).toHaveTextContent("주소를 복사했어요");
  });

  it("hides optional information sections when a place has no entries", () => {
    render(
      <PlaceDetailScreen
        place={requirePlace("everland")}
        query={{ tab: "information", source: "all" }}
      />,
    );

    expect(screen.getByRole("heading", { name: "기본 정보" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "주변 맛집" })).not.toBeInTheDocument();
  });

  it("keeps the review-tab destination below the sticky header", () => {
    render(
      <PlaceDetailScreen
        place={requirePlace("icheon-termeden")}
        query={{ tab: "reviews", source: "all" }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "통합 후기 2,345개" }),
    ).toHaveClass("scroll-mt-32");
  });

  it("exposes each full review as a sticky-header-safe hash target", () => {
    render(
      <PlaceDetailScreen
        place={requirePlace("icheon-termeden")}
        query={{ tab: "reviews", source: "all" }}
      />,
    );

    const target = document.getElementById("icheon-kakao-clean-pool");
    expect(target).not.toBeNull();
    if (!target) return;

    expect(target).toHaveClass("scroll-mt-32");
    expect(
      within(target).getByRole("article", { name: "김여행의 후기" }),
    ).toBeVisible();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <PlaceDetailScreen
        place={requirePlace("icheon-termeden")}
        query={{ tab: "reviews", source: "all" }}
      />,
    );
    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(results.violations).toEqual([]);
  });

  it.each(["introduction", "information"] as const)(
    "has no detectable accessibility violations in the %s tab",
    async (tab) => {
      const { container } = render(
        <PlaceDetailScreen
          place={requirePlace("icheon-termeden")}
          query={{ tab, source: "all" }}
        />,
      );
      const results = await axe.run(container, {
        rules: {
          "color-contrast": { enabled: false },
        },
      });

      expect(results.violations).toEqual([]);
    },
  );
});
