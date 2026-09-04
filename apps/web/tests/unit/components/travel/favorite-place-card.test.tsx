import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FavoritePlaceCard } from "@/components/travel/favorite-place-card";

const baseItem = {
  id: "everland",
  title: "에버랜드",
  location: "경기 용인",
  primaryImageUrl: null as string | null,
  favoritedAt: "2026-08-31T00:00:00.000Z",
};

describe("FavoritePlaceCard", () => {
  it("normalizes an http TourAPI image URL instead of passing it straight to next/image", () => {
    render(
      <FavoritePlaceCard
        item={{
          ...baseItem,
          primaryImageUrl:
            "http://tong.visitkorea.or.kr/cms/resource/43/3590343_image2_1.jpg",
        }}
        onRemove={vi.fn()}
      />,
    );

    const src = decodeURIComponent(
      screen.getByRole("img", { name: "에버랜드 대표 이미지" }).getAttribute(
        "src",
      ) ?? "",
    );
    expect(src).toContain(
      "https://tong.visitkorea.or.kr/cms/resource/43/3590343_image2_1.jpg",
    );
  });

  it("falls back to the local placeholder for a missing or unofficial image", () => {
    render(<FavoritePlaceCard item={baseItem} onRemove={vi.fn()} />);

    const src = decodeURIComponent(
      screen.getByRole("img", { name: "에버랜드 대표 이미지" }).getAttribute(
        "src",
      ) ?? "",
    );
    expect(src).toContain("/images/explore/categories/popular-attraction.png");
  });

  it("removes the favorite when the heart button is pressed", async () => {
    const onRemove = vi.fn();
    render(<FavoritePlaceCard item={baseItem} onRemove={onRemove} />);

    screen.getByRole("button", { name: "에버랜드 찜 해제" }).click();

    expect(onRemove).toHaveBeenCalledOnce();
  });
});
