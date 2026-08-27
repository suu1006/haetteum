import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MyReviewCard } from "@/components/travel/my-review-card";
import type { MyReviewItem } from "@/features/profile/my-reviews-model";

const review: MyReviewItem = {
  id: "review-1",
  placeId: "everland",
  title: "에버랜드",
  location: "경기 용인",
  rating: 4.5,
  date: "2026.08.26",
  content: "즐거운 하루를 보냈어요.",
  likeCount: 3,
  commentCount: 1,
  bookmarked: false,
  image: {
    src: "/images/explore/categories/popular-attraction.png",
    alt: "에버랜드 대표 이미지",
  },
};

describe("MyReviewCard", () => {
  it("links to the review edit route when an edit path is provided", () => {
    render(
      <MyReviewCard review={review} editHref="/reviews/review-1/edit" />,
    );

    expect(
      screen.getByRole("link", { name: "에버랜드 후기 수정" }),
    ).toHaveAttribute("href", "/reviews/review-1/edit");
  });

  it("does not show an edit link when no edit path is provided", () => {
    render(<MyReviewCard review={review} />);

    expect(
      screen.queryByRole("link", { name: "에버랜드 후기 수정" }),
    ).not.toBeInTheDocument();
  });
});
