"use client";

import {
  ArrowLeftIcon,
  MapIcon,
  SearchIcon,
} from "lucide-react";
import type { PlaceListItem, PlaceRegion } from "@haetteum/contracts";

import { PlaceSelectCard } from "@/components/travel/place-select-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

type PlaceRegionSearchLoadState = "loading" | "ready" | "error";

type PlaceRegionSearchScreenProps = {
  region: PlaceRegion;
  query: string;
  places: readonly PlaceListItem[];
  loadState: PlaceRegionSearchLoadState;
  selectedIds: ReadonlySet<string>;
  unavailableIds: ReadonlySet<string>;
  status: string;
  onBack: () => void;
  onMapRequest: () => void;
  onRegionChange: (region: PlaceRegion) => void;
  onQueryChange: (query: string) => void;
  onSelectedChange: (placeId: string, selected: boolean) => void;
  onRemovePlace: (placeId: string) => void;
  onConfirm: () => void;
  showConfirmBar?: boolean;
};

const regionOptions: readonly { value: PlaceRegion; label: string }[] = [
  { value: "seoul", label: "서울" },
  { value: "gyeonggi", label: "경기" },
  { value: "gangwon", label: "강원" },
  { value: "busan", label: "부산" },
  { value: "jeju", label: "제주" },
];

function PlaceRegionSearchScreen({
  region,
  query,
  places,
  loadState,
  selectedIds,
  unavailableIds,
  status,
  onBack,
  onMapRequest,
  onRegionChange,
  onQueryChange,
  onSelectedChange,
  onRemovePlace,
  onConfirm,
  showConfirmBar = true,
}: PlaceRegionSearchScreenProps) {
  const selectedCount = selectedIds.size;
  const regionLabel =
    regionOptions.find((option) => option.value === region)?.label ?? "";

  return (
    <div
      className={cn(
        "mx-auto min-h-[100svh] w-full max-w-[30rem] bg-background",
        showConfirmBar
          ? "pb-[calc(6rem+var(--safe-area-bottom))]"
          : "safe-area-bottom",
      )}
    >
      <header className="safe-area-top grid min-h-16 grid-cols-[3rem_minmax(0,1fr)_4.5rem] items-center px-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="일정 수정으로 돌아가기"
          onClick={onBack}
        >
          <ArrowLeftIcon className="size-5" aria-hidden="true" />
        </Button>
        <h1 className="type-title-md text-center text-foreground">
          장소 검색
        </h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 gap-1 px-2"
          onClick={onMapRequest}
        >
          <MapIcon className="size-4" aria-hidden="true" />
          지도
        </Button>
      </header>

      <main>
        <section aria-label="장소 검색과 지역 선택" className="px-4 pt-1">
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              aria-label="장소 검색어"
              placeholder="장소명을 검색해보세요"
              className="border-transparent bg-secondary pl-10"
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </div>

          <div className="-mx-4 overflow-x-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ToggleGroup
              type="single"
              variant="outline"
              aria-label="지역 선택"
              value={[region]}
              onValueChange={(values) => {
                const nextRegion = values[0];
                if (nextRegion) {
                  onRegionChange(nextRegion as PlaceRegion);
                }
              }}
              className="w-max gap-2"
            >
              {regionOptions.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  className="type-caption min-h-11 rounded-xl px-3 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:font-semibold aria-pressed:text-primary-foreground"
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </section>

        <section aria-labelledby="place-region-results-title" className="px-4">
          <h2
            id="place-region-results-title"
            className="type-label flex min-h-11 items-center text-foreground"
          >
            {regionLabel} 장소
          </h2>

          {loadState === "loading" ? (
            <p className="type-caption mt-2 px-1 text-muted-foreground">
              장소를 불러오고 있어요...
            </p>
          ) : loadState === "error" ? (
            <div className="mt-2 rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center">
              <p className="type-label text-foreground">
                장소를 불러오지 못했어요
              </p>
              <p className="type-caption mt-2 text-muted-foreground">
                잠시 후 다시 시도해 주세요.
              </p>
            </div>
          ) : places.length > 0 ? (
            <ul aria-label="지역 장소" className="mt-2 space-y-2.5">
              {places.map((place, index) => (
                <li key={place.id}>
                  <PlaceSelectCard
                    place={place}
                    selected={selectedIds.has(place.id)}
                    unavailable={unavailableIds.has(place.id)}
                    eager={index === 0}
                    onSelectedChange={(selected) =>
                      onSelectedChange(place.id, selected)
                    }
                    onRemove={() => onRemovePlace(place.id)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-2 rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center">
              <p className="type-label text-foreground">
                검색 조건에 맞는 장소가 없어요
              </p>
              <p className="type-caption mt-2 text-muted-foreground">
                검색어를 줄이거나 다른 지역을 선택해보세요.
              </p>
            </div>
          )}
        </section>
      </main>

      {showConfirmBar ? (
        <div className="safe-area-bottom fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[30rem] border-t border-border bg-card/95 px-4 pt-3 backdrop-blur-xl">
          <Button
            type="button"
            size="lg"
            disabled={selectedCount === 0}
            aria-label={`선택한 장소 추가하기 ${selectedCount}`}
            onClick={onConfirm}
            className="w-full"
          >
            선택한 장소 추가하기
            <span className="flex size-6 items-center justify-center rounded-full bg-primary-foreground text-xs font-bold text-primary">
              {selectedCount}
            </span>
          </Button>
        </div>
      ) : null}

      <p
        role="status"
        aria-label="장소 검색 상태"
        aria-live="polite"
        className="sr-only"
      >
        {status}
      </p>
    </div>
  );
}

export {
  PlaceRegionSearchScreen,
  type PlaceRegionSearchLoadState,
  type PlaceRegionSearchScreenProps,
};
