import type { PlaceListItem } from "@haetteum/contracts";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

import {
  PlaceRegionSearchScreen,
  type PlaceRegionSearchScreenProps,
} from "@/components/patterns/place-region-search-screen";

const places = [
  {
    id: "gyeongbokgung",
    title: "경복궁",
    region: "seoul",
    district: "종로구",
    address: "서울특별시 종로구 사직로 161",
    longitude: 126.977,
    latitude: 37.579,
    primaryImageUrl: null,
    imageCopyrightType: null,
  },
  {
    id: "namsan-tower",
    title: "남산타워",
    region: "seoul",
    district: "용산구",
    address: "서울특별시 용산구 남산공원길 105",
    longitude: 126.988,
    latitude: 37.551,
    primaryImageUrl: null,
    imageCopyrightType: null,
  },
] as const satisfies readonly PlaceListItem[];

function createProps(
  overrides: Partial<PlaceRegionSearchScreenProps> = {},
): PlaceRegionSearchScreenProps {
  return {
    region: "seoul",
    query: "",
    places,
    loadState: "ready",
    selectedIds: new Set<string>(),
    unavailableIds: new Set(["gyeongbokgung"]),
    status: "",
    onBack: vi.fn(),
    onMapRequest: vi.fn(),
    onRegionChange: vi.fn(),
    onQueryChange: vi.fn(),
    onSelectedChange: vi.fn(),
    onRemovePlace: vi.fn(),
    onConfirm: vi.fn(),
    ...overrides,
  };
}

describe("PlaceRegionSearchScreen", () => {
  it("renders the search regions and disables confirm with no selection", () => {
    render(<PlaceRegionSearchScreen {...createProps()} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "장소 검색" }),
    ).toBeVisible();
    expect(screen.getByRole("searchbox", { name: "장소 검색어" })).toBeVisible();
    expect(screen.getByRole("group", { name: "지역 선택" })).toBeVisible();
    expect(screen.getByText("서울 장소")).toBeVisible();
    expect(screen.getByRole("list", { name: "지역 장소" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "선택한 장소 추가하기 0" }),
    ).toBeDisabled();
  });

  it("forwards search, region, and map actions", async () => {
    const user = userEvent.setup();
    const props = createProps();
    render(<PlaceRegionSearchScreen {...props} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "장소 검색어" }), {
      target: { value: "경복궁" },
    });
    expect(props.onQueryChange).toHaveBeenCalledWith("경복궁");

    const regions = screen.getByRole("group", { name: "지역 선택" });
    await user.click(within(regions).getByRole("button", { name: "부산" }));
    expect(props.onRegionChange).toHaveBeenCalledWith("busan");

    await user.click(screen.getByRole("button", { name: "지도" }));
    expect(props.onMapRequest).toHaveBeenCalledOnce();
  });

  it("shows a loading state while a search is in flight", () => {
    render(<PlaceRegionSearchScreen {...createProps({ loadState: "loading" })} />);

    expect(screen.getByText("장소를 불러오고 있어요...")).toBeVisible();
  });

  it("shows an error state when a search fails", () => {
    render(<PlaceRegionSearchScreen {...createProps({ loadState: "error" })} />);

    expect(screen.getByText("장소를 불러오지 못했어요")).toBeVisible();
  });

  it("shows the empty state and confirms selected places", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const { rerender } = render(
      <PlaceRegionSearchScreen {...createProps({ places: [] })} />,
    );

    expect(screen.getByText("검색 조건에 맞는 장소가 없어요")).toBeVisible();

    rerender(
      <PlaceRegionSearchScreen
        {...createProps({
          selectedIds: new Set(["namsan-tower"]),
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

  it("lets an already-added place be removed", async () => {
    const user = userEvent.setup();
    const onRemovePlace = vi.fn();
    render(<PlaceRegionSearchScreen {...createProps({ onRemovePlace })} />);

    await user.click(screen.getByRole("button", { name: "경복궁 일정에서 빼기" }));
    expect(onRemovePlace).toHaveBeenCalledWith("gyeongbokgung");
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(<PlaceRegionSearchScreen {...createProps()} />);

    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });
    expect(results.violations).toEqual([]);
  });
});
