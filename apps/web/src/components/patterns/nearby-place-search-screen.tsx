"use client";

import {
  ArrowLeftIcon,
  MapIcon,
  SearchIcon,
} from "lucide-react";

import { NearbyPlaceSelectCard } from "@/components/travel/nearby-place-select-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import type {
  NearbyPlaceCategoryFilter,
  NearbyPlaceResult,
  NearbyPlaceSort,
} from "@/features/places/nearby-place-search-model";

type NearbyPlaceSearchScreenProps = {
  query: string;
  category: NearbyPlaceCategoryFilter;
  sort: NearbyPlaceSort;
  places: readonly NearbyPlaceResult[];
  selectedIds: ReadonlySet<string>;
  unavailableIds: ReadonlySet<string>;
  status: string;
  onBack: () => void;
  onMapRequest: () => void;
  onQueryChange: (query: string) => void;
  onCategoryChange: (category: NearbyPlaceCategoryFilter) => void;
  onSortChange: (sort: NearbyPlaceSort) => void;
  onSelectedChange: (placeId: string, selected: boolean) => void;
  onConfirm: () => void;
};

const categoryOptions: readonly {
  id: NearbyPlaceCategoryFilter;
  label: string;
}[] = [
  { id: "all", label: "전체" },
  { id: "attraction", label: "관광지" },
  { id: "restaurant", label: "맛집" },
  { id: "cafe", label: "카페" },
  { id: "accommodation", label: "숙소" },
];

const sortLabels: Readonly<Record<NearbyPlaceSort, string>> = {
  recommended: "추천순",
  distance: "거리순",
  rating: "평점순",
};

function NearbyPlaceSearchScreen({
  query,
  category,
  sort,
  places,
  selectedIds,
  unavailableIds,
  status,
  onBack,
  onMapRequest,
  onQueryChange,
  onCategoryChange,
  onSortChange,
  onSelectedChange,
  onConfirm,
}: NearbyPlaceSearchScreenProps) {
  const selectedCount = selectedIds.size;

  return (
    <div className="mx-auto min-h-[100svh] w-full max-w-[30rem] bg-background pb-[calc(6rem+var(--safe-area-bottom))]">
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
          주변 장소 검색
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
        <section aria-label="장소 검색과 필터" className="px-4 pt-1">
          <div className="relative">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              aria-label="주변 장소 검색어"
              placeholder="장소, 음식, 숙소를 검색해보세요"
              className="border-transparent bg-secondary pl-10"
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </div>

          <div className="-mx-4 overflow-x-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ToggleGroup
              type="single"
              variant="outline"
              aria-label="장소 카테고리"
              value={[category]}
              onValueChange={(values) => {
                const nextCategory = values[0];
                if (nextCategory) {
                  onCategoryChange(
                    nextCategory as NearbyPlaceCategoryFilter,
                  );
                }
              }}
              className="w-max gap-2"
            >
              {categoryOptions.map((option) => (
                <ToggleGroupItem
                  key={option.id}
                  value={option.id}
                  className="type-caption min-h-11 rounded-xl px-3 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:font-semibold aria-pressed:text-primary-foreground"
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </section>

        <section aria-labelledby="nearby-place-results-title" className="px-4">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <h2
              id="nearby-place-results-title"
              className="type-label text-foreground"
            >
              내 위치 주변 추천
            </h2>
            <Select
              value={sort}
              onValueChange={(value) => {
                if (
                  value === "recommended" ||
                  value === "distance" ||
                  value === "rating"
                ) {
                  onSortChange(value);
                }
              }}
            >
              <SelectTrigger
                aria-label="장소 정렬"
                className="h-11 rounded-full bg-card px-2 text-foreground"
              >
                <SelectValue>{sortLabels[sort]}</SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="recommended">추천순</SelectItem>
                <SelectItem value="distance">거리순</SelectItem>
                <SelectItem value="rating">평점순</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {places.length > 0 ? (
            <ul aria-label="주변 추천 장소" className="mt-2 space-y-2.5">
              {places.map((place, index) => (
                <li key={place.id}>
                  <NearbyPlaceSelectCard
                    place={place}
                    selected={selectedIds.has(place.id)}
                    unavailable={unavailableIds.has(place.id)}
                    eager={index === 0}
                    onSelectedChange={(selected) =>
                      onSelectedChange(place.id, selected)
                    }
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
                검색어를 줄이거나 다른 카테고리를 선택해보세요.
              </p>
            </div>
          )}
        </section>
      </main>

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

export { NearbyPlaceSearchScreen, type NearbyPlaceSearchScreenProps };
