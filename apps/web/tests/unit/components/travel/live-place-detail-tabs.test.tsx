import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type {
  PlaceCourseItem,
  PlaceReviewsResponse,
} from "@haetteum/contracts";

import { LivePlaceCourseList } from "@/components/travel/live-place-course-list";
import { LivePlaceReviewList } from "@/components/travel/live-place-review-list";

const placeId = "22222222-2222-4222-8222-222222222222";

const course: PlaceCourseItem = {
  id: "33333333-3333-4333-8333-333333333333",
  title: "선사유적지와 분단의 현장에 발을 딛다.",
  overview: "경기도 최북단 연천을 걷는 하루 코스.",
  takeTime: "1일",
  distance: "65.93km",
  schedule: "기타",
  theme: "지자체",
  imageUrl: "https://tong.visitkorea.or.kr/cms/resource/13/1049613_image2_1.jpg",
  stops: [
    {
      sequence: 1,
      placeId: "44444444-4444-4444-8444-444444444444",
      title: "재인폭포",
      overview: "한탄강 서쪽에 자리한 폭포.",
      imageUrl:
        "https://tong.visitkorea.or.kr/cms/resource/13/1049613_image2_1.jpg",
    },
    {
      sequence: 2,
      placeId: null,
      title: "전곡선사박물관",
      overview: null,
      imageUrl: null,
    },
    {
      sequence: 3,
      placeId,
      title: "태풍전망대",
      overview: null,
      imageUrl: null,
    },
  ],
};

describe("LivePlaceCourseList", () => {
  it("shows the course totals the provider supplies", () => {
    render(<LivePlaceCourseList placeId={placeId} items={[course]} />);

    expect(screen.getByText(course.title)).toBeVisible();
    expect(screen.getByText("1일")).toBeVisible();
    expect(screen.getByText("65.93km")).toBeVisible();
    expect(screen.getByText("지자체")).toBeVisible();
  });

  it("links a stop we already carry and leaves the others as plain text", () => {
    render(<LivePlaceCourseList placeId={placeId} items={[course]} />);
    const stops = screen.getByRole("list", { name: `${course.title} 경유지` });

    expect(
      within(stops).getByRole("link", { name: "재인폭포" }),
    ).toHaveAttribute(
      "href",
      "/places/44444444-4444-4444-8444-444444444444",
    );
    expect(
      within(stops).queryByRole("link", { name: "전곡선사박물관" }),
    ).toBeNull();
  });

  it("marks the place being viewed instead of linking back to itself", () => {
    render(<LivePlaceCourseList placeId={placeId} items={[course]} />);

    expect(screen.getByText("지금 보는 곳")).toBeVisible();
    expect(screen.queryByRole("link", { name: "태풍전망대" })).toBeNull();
  });

  it("keeps the stops in provider order", () => {
    render(<LivePlaceCourseList placeId={placeId} items={[course]} />);
    const stops = within(
      screen.getByRole("list", { name: `${course.title} 경유지` }),
    ).getAllByRole("listitem");

    expect(stops.map((stop) => stop.textContent)).toEqual([
      expect.stringContaining("재인폭포"),
      expect.stringContaining("전곡선사박물관"),
      expect.stringContaining("태풍전망대"),
    ]);
  });
});

const emptyReviews: PlaceReviewsResponse = {
  placeId,
  reviewCount: 0,
  averageRating: null,
  ratingDistribution: [
    { score: 5, count: 0 },
    { score: 4, count: 0 },
    { score: 3, count: 0 },
    { score: 2, count: 0 },
    { score: 1, count: 0 },
  ],
  items: [],
};

const populatedReviews: PlaceReviewsResponse = {
  placeId,
  reviewCount: 2,
  averageRating: 4.5,
  ratingDistribution: [
    { score: 5, count: 1 },
    { score: 4, count: 1 },
    { score: 3, count: 0 },
    { score: 2, count: 0 },
    { score: 1, count: 0 },
  ],
  items: [
    {
      id: "10000000-0000-4000-8000-000000000001",
      rating: 5,
      content: "분단의 현실이 실감나는 곳이었어요.",
      author: { displayName: "정수", profileImageUrl: null },
      createdAt: "2026-08-25T03:00:00.000Z",
      updatedAt: "2026-08-25T03:00:00.000Z",
    },
    {
      id: "10000000-0000-4000-8000-000000000002",
      rating: 4,
      content: "전망이 좋았습니다.",
      author: { displayName: "haetteum", profileImageUrl: null },
      createdAt: "2026-08-24T03:00:00.000Z",
      updatedAt: "2026-08-24T03:00:00.000Z",
    },
  ],
};

describe("LivePlaceReviewList", () => {
  it("invites the first review when none exists yet", () => {
    render(<LivePlaceReviewList reviews={emptyReviews} />);

    expect(screen.getByText("아직 등록된 후기가 없어요")).toBeVisible();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("summarizes the rating and renders one card per review", () => {
    render(<LivePlaceReviewList reviews={populatedReviews} />);

    expect(
      screen.getByRole("region", { name: "평점 4.5점, 후기 2개" }),
    ).toBeVisible();
    expect(screen.getByText("분단의 현실이 실감나는 곳이었어요.")).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("labels each review with its author and Seoul-time write date", () => {
    render(<LivePlaceReviewList reviews={populatedReviews} />);

    expect(screen.getByRole("article", { name: "정수의 후기" })).toBeVisible();
    expect(screen.getByText("2026년 8월 25일")).toBeVisible();
  });
});
