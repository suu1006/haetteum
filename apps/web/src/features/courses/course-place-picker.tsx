"use client";

import { useEffect, useRef, useState } from "react";
import type { PlaceListItem, PlaceRegion } from "@haetteum/contracts";

import { PlaceRegionSearchScreen } from "@/components/patterns/place-region-search-screen";
import { searchPlaces } from "@/features/places/place-search-api";

type CoursePlacePickerProps = {
  unavailableIds: ReadonlySet<string>;
  onCancel: () => void;
  onConfirm: (places: readonly PlaceListItem[]) => void;
  onRemovePlace: (placeId: string) => void;
  selectOnTap?: boolean;
};

type SearchResult = {
  region: PlaceRegion;
  query: string;
  status: "ready" | "error";
  items: readonly PlaceListItem[];
};

const DEFAULT_REGION: PlaceRegion = "seoul";
const SEARCH_DEBOUNCE_MS = 350;

function CoursePlacePicker({
  unavailableIds,
  onCancel,
  onConfirm,
  onRemovePlace,
  selectOnTap = false,
}: CoursePlacePickerProps) {
  const [region, setRegion] = useState<PlaceRegion>(DEFAULT_REGION);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [status, setStatus] = useState("");
  const requestIdRef = useRef(0);

  const trimmedQuery = query.trim();
  const isCurrent =
    result != null && result.region === region && result.query === trimmedQuery;
  const loadState = isCurrent ? result.status : "loading";
  const places = isCurrent ? result.items : [];

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const timeoutId = setTimeout(
      () => {
        void searchPlaces(region, trimmedQuery).then((response) => {
          if (requestIdRef.current !== requestId) return;

          setResult({
            region,
            query: trimmedQuery,
            status: response.status,
            items: response.status === "ready" ? response.items : [],
          });
        });
      },
      trimmedQuery === "" ? 0 : SEARCH_DEBOUNCE_MS,
    );

    return () => clearTimeout(timeoutId);
  }, [region, trimmedQuery]);

  function handleSelectedChange(placeId: string, selected: boolean) {
    if (unavailableIds.has(placeId)) return;

    if (selectOnTap) {
      if (!selected) return;
      const place = places.find((candidate) => candidate.id === placeId);
      if (place) onConfirm([place]);
      return;
    }

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
      .filter((place): place is PlaceListItem => Boolean(place));
    onConfirm(selectedPlaces);
  }

  return (
    <PlaceRegionSearchScreen
      region={region}
      query={query}
      places={places}
      loadState={loadState}
      selectedIds={new Set(selectedIds)}
      unavailableIds={unavailableIds}
      status={status}
      onBack={onCancel}
      onMapRequest={() => setStatus("지도 보기는 준비 중이에요.")}
      onRegionChange={setRegion}
      onQueryChange={setQuery}
      onSelectedChange={handleSelectedChange}
      onRemovePlace={onRemovePlace}
      onConfirm={handleConfirm}
      showConfirmBar={!selectOnTap}
    />
  );
}

export { CoursePlacePicker, type CoursePlacePickerProps };
