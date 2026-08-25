import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NearbyPlaceSelectCard } from "@/components/travel/nearby-place-select-card";
import { nearbyPlaceSearchMock } from "@/features/places/nearby-place-search.mock";

describe("NearbyPlaceSelectCard", () => {
  it("renders place facts and toggles a selectable place", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();

    render(
      <NearbyPlaceSelectCard
        place={nearbyPlaceSearchMock[2]}
        selected={false}
        unavailable={false}
        onSelectedChange={onSelectedChange}
      />,
    );

    expect(screen.getByRole("article", { name: "카페 온천" })).toBeVisible();
    expect(screen.getByText("1.2km · 차로 4분")).toBeVisible();
    expect(screen.getByText("온천을 테마로 한 편안한 감성 카페")).toBeVisible();

    const control = screen.getByRole("button", { name: "카페 온천 선택" });
    expect(control).toHaveAttribute("aria-pressed", "false");
    await user.click(control);
    expect(onSelectedChange).toHaveBeenCalledWith(true);
  });

  it("changes its accessible state when selected", () => {
    render(
      <NearbyPlaceSelectCard
        place={nearbyPlaceSearchMock[2]}
        selected
        unavailable={false}
        onSelectedChange={vi.fn()}
      />,
    );

    const control = screen.getByRole("button", {
      name: "카페 온천 선택 해제",
    });
    expect(control).toHaveAttribute("aria-pressed", "true");
    expect(control.querySelector(".lucide-check")).toBeInTheDocument();
  });

  it("eagerly loads an above-the-fold place image", () => {
    render(
      <NearbyPlaceSelectCard
        place={nearbyPlaceSearchMock[0]}
        selected={false}
        unavailable={false}
        eager
        onSelectedChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("img", { name: "전통 건축과 문화 전시 공간" }),
    ).toHaveAttribute("loading", "eager");
  });

  it("disables a place already in the course", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();

    render(
      <NearbyPlaceSelectCard
        place={nearbyPlaceSearchMock[0]}
        selected={false}
        unavailable
        onSelectedChange={onSelectedChange}
      />,
    );

    expect(screen.getByText("추가됨")).toBeVisible();
    const control = screen.getByRole("button", {
      name: "이천 시립박물관 이미 일정에 추가됨",
    });
    expect(control).toBeDisabled();
    await user.click(control);
    expect(onSelectedChange).not.toHaveBeenCalled();
  });
});
