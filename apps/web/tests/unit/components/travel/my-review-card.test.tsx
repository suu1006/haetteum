import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
  image: {
    src: "/images/explore/categories/popular-attraction.png",
    alt: "에버랜드 대표 이미지",
  },
};

function openMoreMenu() {
  fireEvent.click(
    screen.getByRole("button", { name: "에버랜드 후기 더보기" }),
  );
}

describe("MyReviewCard", () => {
  it("does not show a more-options trigger when no edit or delete handler is provided", () => {
    render(<MyReviewCard review={review} />);

    expect(
      screen.queryByRole("button", { name: "에버랜드 후기 더보기" }),
    ).not.toBeInTheDocument();
  });

  it("calls onEdit with the review id when 수정 is selected from the more-options menu", () => {
    const onEdit = vi.fn();
    render(<MyReviewCard review={review} onEdit={onEdit} />);

    openMoreMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "수정" }));

    expect(onEdit).toHaveBeenCalledWith("review-1");
  });

  it("calls onDelete with the review id when 삭제 is selected from the more-options menu", () => {
    const onDelete = vi.fn();
    render(<MyReviewCard review={review} onDelete={onDelete} />);

    openMoreMenu();
    fireEvent.click(screen.getByRole("menuitem", { name: "삭제" }));

    expect(onDelete).toHaveBeenCalledWith("review-1");
  });

  it("disables the delete menu item while a delete is pending", () => {
    const onDelete = vi.fn();
    render(<MyReviewCard review={review} onDelete={onDelete} deleting />);

    openMoreMenu();

    expect(screen.getByRole("menuitem", { name: "삭제" })).toHaveAttribute(
      "data-disabled",
    );
  });
});
