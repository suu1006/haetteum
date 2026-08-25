import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

import {
  NearbyPlaceSearchScreen,
  type NearbyPlaceSearchScreenProps,
} from "@/components/patterns/nearby-place-search-screen";
import { nearbyPlaceSearchMock } from "@/features/places/nearby-place-search.mock";

function createProps(
  overrides: Partial<NearbyPlaceSearchScreenProps> = {},
): NearbyPlaceSearchScreenProps {
  return {
    query: "",
    category: "all",
    sort: "recommended",
    places: nearbyPlaceSearchMock,
    selectedIds: new Set<string>(),
    unavailableIds: new Set([
      "icheon-city-museum",
      "icheon-rice-breakfast",
      "haeju-cold-noodles",
    ]),
    status: "",
    onBack: vi.fn(),
    onMapRequest: vi.fn(),
    onQueryChange: vi.fn(),
    onCategoryChange: vi.fn(),
    onSortChange: vi.fn(),
    onSelectedChange: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  };
}

describe("NearbyPlaceSearchScreen", () => {
  it("renders the search regions and disables confirm with no selection", () => {
    render(<NearbyPlaceSearchScreen {...createProps()} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "주변 장소 검색" }),
    ).toBeVisible();
    expect(
      screen.getByRole("searchbox", { name: "주변 장소 검색어" }),
    ).toBeVisible();
    expect(
      screen.getByRole("group", { name: "장소 카테고리" }),
    ).toBeVisible();
    expect(
      screen.getByRole("list", { name: "주변 추천 장소" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "선택한 장소 추가하기 0" }),
    ).toBeDisabled();
  });

  it("forwards search, category, sort, and map actions", async () => {
    const user = userEvent.setup();
    const props = createProps();
    render(<NearbyPlaceSearchScreen {...props} />);

    fireEvent.change(
      screen.getByRole("searchbox", { name: "주변 장소 검색어" }),
      { target: { value: "카페" } },
    );
    expect(props.onQueryChange).toHaveBeenCalledWith("카페");

    const categories = screen.getByRole("group", { name: "장소 카테고리" });
    await user.click(within(categories).getByRole("button", { name: "카페" }));
    expect(props.onCategoryChange).toHaveBeenCalledWith("cafe");

    await user.click(screen.getByRole("combobox", { name: "장소 정렬" }));
    await user.click(await screen.findByRole("option", { name: "거리순" }));
    expect(props.onSortChange).toHaveBeenCalledWith("distance");

    await user.click(screen.getByRole("button", { name: "지도" }));
    expect(props.onMapRequest).toHaveBeenCalledOnce();
  });

  it("shows the empty state and confirms selected places", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const { rerender } = render(
      <NearbyPlaceSearchScreen {...createProps({ places: [] })} />,
    );

    expect(screen.getByText("검색 조건에 맞는 장소가 없어요")).toBeVisible();

    rerender(
      <NearbyPlaceSearchScreen
        {...createProps({
          selectedIds: new Set(["cafe-oncheon"]),
          onConfirm,
        })}
      />,
    );
    const confirm = screen.getByRole("button", {
      name: "선택한 장소 추가하기 1",
    });
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <NearbyPlaceSearchScreen {...createProps()} />,
    );

    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });
    expect(results.violations).toEqual([]);
  });
});
