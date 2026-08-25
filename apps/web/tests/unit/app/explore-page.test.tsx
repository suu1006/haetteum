import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ExplorePage, { metadata } from "@/app/explore/page";

describe("explore page", () => {
  it("uses exploration metadata", () => {
    expect(metadata).toMatchObject({
      title: "탐색 | 해뜸",
    });
  });

  it("selects the regional recommendations from URL search params", async () => {
    render(
      await ExplorePage({
        searchParams: Promise.resolve({ region: "jeju" }),
      }),
    );

    expect(screen.getByRole("link", { name: "제주" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("list", { name: "제주 추천 여행지" })).toBeVisible();
  });
});
