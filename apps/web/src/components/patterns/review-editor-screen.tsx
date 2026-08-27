"use client";

import type { PlaceListItem, PlaceRegion, ReviewItem } from "@haetteum/contracts";
import { ChevronLeftIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ReviewEditorForm } from "@/components/travel/review-editor-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createReview,
  searchReviewPlaces,
  updateReview,
} from "@/features/profile/my-reviews-api";
import { cn } from "@/lib/utils";

type ReviewEditorScreenProps =
  | {
      mode: "create";
      reviewedPlaceIds: readonly string[];
      initialReview?: never;
    }
  | {
      mode: "edit";
      reviewedPlaceIds?: never;
      initialReview: ReviewItem;
    };

type SearchState = "idle" | "loading" | "ready" | "error";

const regionOptions: readonly { value: PlaceRegion; label: string }[] = [
  { value: "seoul", label: "서울" },
  { value: "gyeonggi", label: "경기" },
  { value: "gangwon", label: "강원" },
  { value: "busan", label: "부산" },
  { value: "jeju", label: "제주" },
];

const duplicateMessage = "이미 이 관광지에 작성한 후기가 있어요.";
const searchErrorMessage = "관광지를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";

function ReviewEditorScreen(props: ReviewEditorScreenProps) {
  const router = useRouter();
  const isCreate = props.mode === "create";
  const [region, setRegion] = useState<PlaceRegion | "">("");
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PlaceListItem[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceListItem | null>(null);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [rating, setRating] = useState<number | null>(
    isCreate ? null : props.initialReview.rating,
  );
  const [content, setContent] = useState(
    isCreate ? "" : props.initialReview.content,
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const placeButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const searchRequestIdRef = useRef(0);
  const submittingRef = useRef(false);

  const reviewedPlaceIds = new Set(
    isCreate ? props.reviewedPlaceIds : ([] as readonly string[]),
  );
  const visiblePlaces = places.filter((place) => !reviewedPlaceIds.has(place.id));
  const selectedPlaceIsVisible = visiblePlaces.some(
    (place) => place.id === selectedPlace?.id,
  );
  const currentSelectedPlace = selectedPlaceIsVisible ? selectedPlace : null;
  const placeTabbableId = selectedPlaceIsVisible
    ? selectedPlace?.id
    : visiblePlaces[0]?.id;
  const placeLabel = isCreate
    ? currentSelectedPlace?.title ?? null
    : `${props.initialReview.placeTitle}\n${props.initialReview.location}`;

  function invalidatePlaceSearch() {
    searchRequestIdRef.current += 1;
    setPlaces([]);
    setSelectedPlace(null);
    setSearchState("idle");
    setErrorMessage(null);
  }

  async function handleSearch() {
    if (region === "" || searchState === "loading") return;

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setPlaces([]);
    setSelectedPlace(null);
    setSearchState("loading");
    setErrorMessage(null);
    const result = await searchReviewPlaces(region, query.trim());
    if (searchRequestIdRef.current !== requestId) return;

    if (result.status === "ready") {
      setPlaces(result.items);
      setSearchState("ready");
    } else {
      setPlaces([]);
      setSearchState("error");
    }
  }

  async function handleSubmit() {
    if (submittingRef.current || rating == null) return;
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0 || trimmedContent.length > 500) return;
    if (isCreate && currentSelectedPlace == null) return;

    submittingRef.current = true;
    setSubmitting(true);
    setErrorMessage(null);

    const result = isCreate
      ? await createReview({
          placeId: currentSelectedPlace!.id,
          rating,
          content: trimmedContent,
        })
      : await updateReview(props.initialReview.id, {
          rating,
          content: trimmedContent,
        });

    if (result.status === "success") {
      router.replace("/reviews");
      router.refresh();
      return;
    }

    submittingRef.current = false;
    setSubmitting(false);
    setErrorMessage(
      result.status === "duplicate" ? duplicateMessage : result.message,
    );
  }

  const createPlaceControls = isCreate ? (
    <section aria-label="관광지 선택" className="grid gap-4">
      <div className="grid gap-2">
        <label htmlFor="review-region" className="type-label text-foreground">
          지역
        </label>
        <select
          id="review-region"
          value={region}
          disabled={submitting}
          className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-45"
          onChange={(event) => {
            setRegion(event.target.value as PlaceRegion | "");
            invalidatePlaceSearch();
          }}
        >
          <option value="">지역 선택</option>
          {regionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <label htmlFor="review-place-query" className="type-label text-foreground">
          관광지 검색
        </label>
        <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
          <Input
            id="review-place-query"
            type="search"
            value={query}
            disabled={submitting}
            placeholder="관광지 이름"
            onChange={(event) => {
              setQuery(event.target.value);
              invalidatePlaceSearch();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSearch();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={region === "" || searchState === "loading" || submitting}
            onClick={() => void handleSearch()}
          >
            <SearchIcon className="size-4" aria-hidden="true" />
            검색
          </Button>
        </div>
      </div>

      <div aria-live="polite">
        {searchState === "loading" ? (
          <p className="type-caption text-muted-foreground">관광지를 찾고 있어요...</p>
        ) : searchState === "error" ? (
          <p role="alert" className="type-caption text-destructive">
            {searchErrorMessage}
          </p>
        ) : searchState === "ready" && visiblePlaces.length === 0 ? (
          <p className="type-caption text-muted-foreground">
            선택할 수 있는 관광지가 없어요.
          </p>
        ) : visiblePlaces.length > 0 ? (
          <div role="radiogroup" aria-label="관광지 검색 결과" className="grid gap-2">
            {visiblePlaces.map((place, index) => {
              const selected = selectedPlace?.id === place.id;
              const location = place.district ?? place.address;
              return (
                <button
                  key={place.id}
                  ref={(node) => {
                    placeButtonRefs.current[index] = node;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  tabIndex={place.id === placeTabbableId ? 0 : -1}
                  disabled={submitting}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left outline-none transition-[border-color,background-color,box-shadow] focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-45",
                    selected
                      ? "border-primary bg-primary-subtle shadow-card"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                  onClick={() => {
                    setSelectedPlace(place);
                    setErrorMessage(null);
                  }}
                  onKeyDown={(event) => {
                    const movesForward =
                      event.key === "ArrowRight" || event.key === "ArrowDown";
                    const movesBackward =
                      event.key === "ArrowLeft" || event.key === "ArrowUp";
                    if (!movesForward && !movesBackward) return;

                    event.preventDefault();
                    const offset = movesForward ? 1 : -1;
                    const nextIndex =
                      (index + offset + visiblePlaces.length) %
                      visiblePlaces.length;
                    const nextPlace = visiblePlaces[nextIndex];
                    if (nextPlace == null) return;

                    setSelectedPlace(nextPlace);
                    setErrorMessage(null);
                    placeButtonRefs.current[nextIndex]?.focus();
                  }}
                >
                  <span className="type-label block text-foreground">{place.title}</span>
                  {location != null ? (
                    <span className="type-caption mt-1 block text-muted-foreground">
                      {location}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  ) : undefined;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[30rem] bg-background px-5 pt-[25px] pb-10">
      <header className="mb-7">
        <Link
          href="/reviews"
          className="type-caption inline-flex min-h-11 items-center gap-1 rounded-lg pr-3 text-muted-foreground outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/25"
        >
          <ChevronLeftIcon className="size-4" aria-hidden="true" />
          내 후기로 돌아가기
        </Link>
        <h1 className="mt-2 text-[1.55rem] leading-9 font-bold tracking-[-0.03em] text-foreground">
          {isCreate ? "후기 작성" : "후기 수정"}
        </h1>
      </header>

      <main>
        <ReviewEditorForm
          mode={props.mode}
          placeLabel={placeLabel}
          rating={rating}
          content={content}
          submitting={submitting}
          errorMessage={errorMessage}
          onRatingChange={(nextRating) => {
            setRating(nextRating);
            setErrorMessage(null);
          }}
          onContentChange={(nextContent) => {
            setContent(nextContent);
            setErrorMessage(null);
          }}
          onSubmit={() => void handleSubmit()}
          createPlaceControls={createPlaceControls}
        />
      </main>
    </div>
  );
}

export { ReviewEditorScreen, type ReviewEditorScreenProps };
