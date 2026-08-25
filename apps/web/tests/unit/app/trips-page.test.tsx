import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import TripsPage, { metadata } from "@/app/trips/page";

describe("trips page", () => {
  it("uses metadata for the personal itinerary surface", () => {
    expect(metadata).toMatchObject({
      title: "내 일정 | 해뜸",
      description: expect.stringContaining("예정된 여행"),
    });
  });

  it("renders the personal itinerary screen", () => {
    render(<TripsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "내 일정" })).toBeVisible();
    expect(screen.getByRole("article", { name: "D-5 제주도 힐링 여행" })).toBeVisible();
  });
});
