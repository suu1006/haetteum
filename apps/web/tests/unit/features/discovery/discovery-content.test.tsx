import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DiscoveryContent } from "@/features/discovery/discovery-content";

describe("DiscoveryContent", () => {
  it("renders the approved Gyeonggi mock view from default search params", async () => {
    render(await DiscoveryContent({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", { name: "어디로 떠나볼까요?" }),
    ).toBeVisible();
    expect(
      screen.getByRole("article", { name: "1위 이천 테르메덴" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "경기" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("assembles the popular-place tab from URL search params", async () => {
    render(
      await DiscoveryContent({
        searchParams: Promise.resolve({ tab: "places", region: "jeju" }),
      }),
    );

    expect(screen.getByRole("link", { name: "인기 관광지" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("heading", { name: "릴스형 인기 관광지" })).toBeVisible();
  });
});
