import { render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { PlaceDetailTabs } from "@/components/travel/place-detail-tabs";

type LinkDoubleProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  href: string;
  replace?: boolean;
};

vi.mock("next/link", () => ({
  default: ({ replace, ...props }: LinkDoubleProps) => (
    <a {...props} data-history-mode={replace ? "replace" : "push"} />
  ),
}));

describe("PlaceDetailTabs history", () => {
  it("replaces the current history entry when switching detail tabs", () => {
    render(<PlaceDetailTabs placeId="everland" currentTab="reviews" />);

    for (const label of ["소개", "코스 추천", "후기", "정보"]) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute(
        "data-history-mode",
        "replace",
      );
    }
  });
});
