"use client";

import { useState } from "react";

import { NearbyPlaceSearchScreen } from "@/components/patterns/nearby-place-search-screen";
import {
  filterAndSortNearbyPlaces,
  type NearbyPlaceCategoryFilter,
  type NearbyPlaceResult,
  type NearbyPlaceSort,
} from "@/features/places/nearby-place-search-model";

type CoursePlacePickerProps = {
  places: readonly NearbyPlaceResult[];
  unavailableIds: ReadonlySet<string>;
  onCancel: () => void;
  onConfirm: (places: readonly NearbyPlaceResult[]) => void;
};

function CoursePlacePicker({
  places,
  unavailableIds,
  onCancel,
  onConfirm,
}: CoursePlacePickerProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<NearbyPlaceCategoryFilter>("all");
  const [sort, setSort] = useState<NearbyPlaceSort>("recommended");
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [status, setStatus] = useState("");
  const visiblePlaces = filterAndSortNearbyPlaces(places, {
    query,
    category,
    sort,
  });

  function handleSelectedChange(placeId: string, selected: boolean) {
    if (unavailableIds.has(placeId)) return;

    setSelectedIds((current) => {
      if (selected) {
        return current.includes(placeId) ? current : [...current, placeId];
      }
      return current.filter((id) => id !== placeId);
    });
  }

  function handleConfirm() {
    const selectedPlaces = selectedIds
      .map((id) => places.find((place) => place.id === id))
      .filter((place): place is NearbyPlaceResult => Boolean(place));
    onConfirm(selectedPlaces);
  }

  return (
    <NearbyPlaceSearchScreen
      query={query}
      category={category}
      sort={sort}
      places={visiblePlaces}
      selectedIds={new Set(selectedIds)}
      unavailableIds={unavailableIds}
      status={status}
      onBack={onCancel}
      onMapRequest={() => setStatus("지도 보기는 준비 중이에요.")}
      onQueryChange={setQuery}
      onCategoryChange={setCategory}
      onSortChange={setSort}
      onSelectedChange={handleSelectedChange}
      onConfirm={handleConfirm}
    />
  );
}

export { CoursePlacePicker, type CoursePlacePickerProps };
