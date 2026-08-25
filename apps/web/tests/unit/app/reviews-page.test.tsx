import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ReviewsPage, { metadata } from "@/app/reviews/page";

describe("reviews page", () => {
  it("renders the personal reviews screen with matching metadata", () => {
    expect(metadata).toMatchObject({
      title: "내 후기 | 해뜸",
      description: expect.stringContaining("작성한 후기와 북마크"),
    });

    render(<ReviewsPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "내 후기" }),
    ).toBeVisible();
    expect(screen.getByRole("tab", { name: "작성한 후기" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "북마크" })).toBeVisible();
  });
});
