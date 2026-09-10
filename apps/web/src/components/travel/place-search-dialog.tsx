"use client";

import type { PlaceListItem, PlaceRegion } from "@haetteum/contracts";
import { Dialog } from "@base-ui/react/dialog";
import { ChevronRightIcon, MapPinIcon, SearchIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { searchReviewPlaces } from "@/features/profile/my-reviews-api";

type SearchState = "idle" | "loading" | "ready" | "error";

type PlaceSearchDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  region: PlaceRegion;
  excludedPlaceIds?: ReadonlySet<string>;
  onSelect: (place: PlaceListItem) => void;
};

const searchErrorMessage = "관광지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

function PlaceSearchDialog({
  open,
  onOpenChange,
  region,
  excludedPlaceIds,
  onSelect,
}: PlaceSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PlaceListItem[]>([]);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const searchRequestIdRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const visiblePlaces = excludedPlaceIds
    ? places.filter((place) => !excludedPlaceIds.has(place.id))
    : places;

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      searchRequestIdRef.current += 1;
      setQuery("");
      setPlaces([]);
      setSearchState("idle");
    }
    onOpenChange(nextOpen);
  }

  useEffect(() => {
    if (!open || query.trim() === "") return;

    const requestId = searchRequestIdRef.current + 1;
    const timeoutId = setTimeout(() => {
      searchRequestIdRef.current = requestId;
      setSearchState("loading");
      void searchReviewPlaces(region, query.trim()).then((result) => {
        if (searchRequestIdRef.current !== requestId) return;

        if (result.status === "ready") {
          setPlaces(result.items);
          setSearchState("ready");
        } else {
          setPlaces([]);
          setSearchState("error");
        }
      });
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [open, query, region]);

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px] transition-opacity duration-180 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto sm:items-center sm:p-4">
          <Dialog.Popup
            initialFocus={inputRef}
            className="relative flex h-[60dvh] w-full max-w-[30rem] flex-col overflow-hidden rounded-t-[1.75rem] border border-white/70 bg-card text-foreground shadow-floating outline-none transition-[transform,opacity] duration-180 data-ending-style:translate-y-2 data-ending-style:opacity-0 data-starting-style:translate-y-2 data-starting-style:opacity-0 sm:h-[38rem] sm:max-h-[60dvh] sm:rounded-[1.75rem]"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 pt-5 pb-4">
              <div>
                <Dialog.Title className="type-title-md text-foreground">
                  관광지 검색
                </Dialog.Title>
                <Dialog.Description className="type-caption mt-1 text-muted-foreground">
                  방문한 관광지를 검색해 선택해 주세요.
                </Dialog.Description>
              </div>
              <Dialog.Close
                aria-label="닫기"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/25"
              >
                <XIcon aria-hidden="true" className="size-5" />
              </Dialog.Close>
            </div>

            <div className="px-5 pt-4">
              <div className="relative">
                <SearchIcon
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  ref={inputRef}
                  type="search"
                  value={query}
                  aria-label="관광지 검색"
                  placeholder="관광지 이름을 입력해 주세요"
                  className="border-transparent bg-secondary pl-10"
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4" aria-live="polite">
              {query.trim() === "" ? (
                <p className="type-caption text-muted-foreground">
                  관광지 이름을 입력하면 검색 결과가 나타나요.
                </p>
              ) : searchState === "error" ? (
                <p role="alert" className="type-caption text-destructive">
                  {searchErrorMessage}
                </p>
              ) : visiblePlaces.length > 0 ? (
                <>
                  <p className="type-caption mb-2 text-muted-foreground">
                    {searchState === "loading"
                      ? "검색 중..."
                      : `검색 결과 ${visiblePlaces.length}개`}
                  </p>
                  <ul aria-label="관광지 검색 결과" className="grid gap-2">
                    {visiblePlaces.map((place) => {
                      const location = place.district ?? place.address;
                      return (
                        <li key={place.id}>
                          <Dialog.Close
                            render={
                              <button type="button">
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                                  <MapPinIcon aria-hidden="true" className="size-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="type-label block truncate text-foreground">
                                    {place.title}
                                  </span>
                                  {location != null ? (
                                    <span className="type-caption mt-0.5 block truncate text-muted-foreground">
                                      {location}
                                    </span>
                                  ) : null}
                                </span>
                                <ChevronRightIcon
                                  aria-hidden="true"
                                  className="size-4 shrink-0 text-muted-foreground"
                                />
                              </button>
                            }
                            className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left outline-none transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/25"
                            onClick={() => onSelect(place)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : searchState === "loading" ? (
                <p className="type-caption text-muted-foreground">
                  관광지를 찾고 있어요...
                </p>
              ) : searchState === "ready" ? (
                <div className="rounded-2xl border border-dashed border-border bg-background px-5 py-10 text-center">
                  <p className="type-label text-foreground">검색 결과가 없어요</p>
                  <p className="type-caption mt-2 text-muted-foreground">
                    다른 검색어로 다시 시도해보세요.
                  </p>
                </div>
              ) : null}
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { PlaceSearchDialog, type PlaceSearchDialogProps };
