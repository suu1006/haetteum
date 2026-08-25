import { render } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

import { FestivalDetailScreen } from "@/components/patterns/festival-detail-screen";
import { festivalDetails } from "@/features/festivals/festival-detail.mock";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

describe("FestivalDetailScreen", () => {
  it("renders the approved section order and reserves fixed-action space", () => {
    const { container } = render(
      <FestivalDetailScreen festival={festivalDetails[0]} />,
    );

    expect(
      Array.from(container.querySelectorAll("[data-detail-region]")).map(
        (node) => node.getAttribute("data-detail-region"),
      ),
    ).toEqual([
      "header",
      "gallery",
      "summary",
      "introduction",
      "programs",
      "points",
      "nearby",
      "actions",
    ]);
    expect(container.firstElementChild).toHaveClass(
      "pb-[var(--festival-detail-action-reserve)]",
    );
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <FestivalDetailScreen festival={festivalDetails[0]} />,
    );
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });

    expect(results.violations).toEqual([]);
  });
});
