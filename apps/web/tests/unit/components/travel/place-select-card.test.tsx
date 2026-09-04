import type { PlaceListItem } from "@haetteum/contracts";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PlaceSelectCard } from "@/components/travel/place-select-card";

const place = {
  id: "cafe-oncheon",
  title: "카페 온천",
  region: "gyeonggi",
  district: "이천시",
  address: "경기 이천시 온천로 1",
  longitude: 127.44,
  latitude: 37.27,
  primaryImageUrl: "https://images.example.test/cafe-oncheon.jpg",
  imageCopyrightType: null,
} as const satisfies PlaceListItem;

const museum = {
  ...place,
  id: "icheon-city-museum",
  title: "이천 시립박물관",
  district: null,
  address: null,
  primaryImageUrl: null,
} as const satisfies PlaceListItem;

describe("PlaceSelectCard", () => {
  it("renders place facts and toggles a selectable place", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();

    render(
      <PlaceSelectCard
        place={place}
        selected={false}
        unavailable={false}
        onSelectedChange={onSelectedChange}
        onRemove={vi.fn()}
      />,
    );

    expect(screen.getByRole("article", { name: "카페 온천" })).toBeVisible();
    expect(screen.getByText("이천시")).toBeVisible();

    const control = screen.getByRole("button", { name: "카페 온천 선택" });
    expect(control).toHaveAttribute("aria-pressed", "false");
    await user.click(control);
    expect(onSelectedChange).toHaveBeenCalledWith(true);
  });

  it("falls back to the district-less address and a placeholder image", () => {
    render(
      <PlaceSelectCard
        place={museum}
        selected={false}
        unavailable={false}
        eager
        onSelectedChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("img", { name: "이천 시립박물관" }),
    ).toHaveAttribute("loading", "eager");
  });

  it("changes its accessible state when selected", () => {
    render(
      <PlaceSelectCard
        place={place}
        selected
        unavailable={false}
        onSelectedChange={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const control = screen.getByRole("button", {
      name: "카페 온천 선택 해제",
    });
    expect(control).toHaveAttribute("aria-pressed", "true");
    expect(control.querySelector(".lucide-check")).toBeInTheDocument();
  });

  it("lets a place already in the course be removed instead of selected", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    const onRemove = vi.fn();

    render(
      <PlaceSelectCard
        place={place}
        selected={false}
        unavailable
        onSelectedChange={onSelectedChange}
        onRemove={onRemove}
      />,
    );

    expect(screen.getByText("추가됨")).toBeVisible();
    const control = screen.getByRole("button", {
      name: "카페 온천 일정에서 빼기",
    });
    expect(control).toBeEnabled();
    expect(control.querySelector(".lucide-minus")).toBeInTheDocument();
    await user.click(control);
    expect(onRemove).toHaveBeenCalledOnce();
    expect(onSelectedChange).not.toHaveBeenCalled();
  });
});
