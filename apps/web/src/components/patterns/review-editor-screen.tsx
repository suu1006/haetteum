"use client";

import type { PlaceListItem, PlaceRegion, ReviewItem } from "@haetteum/contracts";
import { ChevronDownIcon, ChevronLeftIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { PlaceSearchDialog } from "@/components/travel/place-search-dialog";
import {
  REVIEW_EDITOR_FORM_ID,
  ReviewEditorForm,
} from "@/components/travel/review-editor-form";
import { ReviewPlaceSummaryCard } from "@/components/travel/review-place-summary-card";
import {
  useIsPlaceFavorited,
  useTogglePlaceFavorite,
} from "@/features/places/favorite-place-query";
import { createReview, updateReview } from "@/features/profile/my-reviews-api";

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

const regionOptions: readonly { value: PlaceRegion; label: string }[] = [
  { value: "seoul", label: "서울" },
  { value: "gyeonggi", label: "경기" },
  { value: "gangwon", label: "강원" },
  { value: "busan", label: "부산" },
  { value: "jeju", label: "제주" },
];

const duplicateMessage = "이미 이 관광지에 작성한 후기가 있어요.";
const minContentLength = 10;
const maxContentLength = 500;

function ReviewEditorScreen(props: ReviewEditorScreenProps) {
  const router = useRouter();
  const isCreate = props.mode === "create";
  const [region, setRegion] = useState<PlaceRegion | "">("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceListItem | null>(null);
  const [placeModalOpen, setPlaceModalOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(
    isCreate ? null : props.initialReview.rating,
  );
  const [title, setTitle] = useState(isCreate ? "" : props.initialReview.title);
  const [content, setContent] = useState(
    isCreate ? "" : props.initialReview.content,
  );
  const [images, setImages] = useState<string[]>(
    isCreate ? [] : props.initialReview.images,
  );
  const [saveToFavorites, setSaveToFavorites] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const toggleFavorite = useTogglePlaceFavorite();

  const reviewedPlaceIds = new Set(
    isCreate ? props.reviewedPlaceIds : ([] as readonly string[]),
  );

  const favoritePlaceId = isCreate
    ? (selectedPlace?.id ?? "")
    : props.initialReview.placeId;
  const favoriteQueryEnabled = isCreate ? selectedPlace != null : true;
  const currentlyFavorited = useIsPlaceFavorited(
    favoritePlaceId,
    favoriteQueryEnabled,
  );

  async function handleSubmit() {
    if (submittingRef.current || rating == null) return;
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (trimmedTitle.length === 0 || trimmedTitle.length > 30) return;
    if (
      trimmedContent.length < minContentLength ||
      trimmedContent.length > maxContentLength
    ) {
      return;
    }
    if (isCreate && selectedPlace == null) return;

    submittingRef.current = true;
    setSubmitting(true);
    setErrorMessage(null);

    const result = isCreate
      ? await createReview({
          placeId: selectedPlace!.id,
          rating,
          title: trimmedTitle,
          content: trimmedContent,
          images,
        })
      : await updateReview(props.initialReview.id, {
          rating,
          title: trimmedTitle,
          content: trimmedContent,
          images,
        });

    if (result.status === "success") {
      if (saveToFavorites !== currentlyFavorited) {
        const place = isCreate
          ? selectedPlace!
          : {
              id: props.initialReview.placeId,
              title: props.initialReview.placeTitle,
              location: props.initialReview.location,
              primaryImageUrl: props.initialReview.primaryImageUrl,
            };
        try {
          await toggleFavorite.mutateAsync({
            placeId: place.id,
            title: place.title,
            location: isCreate
              ? placeLocationLabel(selectedPlace!)
              : props.initialReview.location,
            primaryImageUrl: place.primaryImageUrl,
            nextFavorited: saveToFavorites,
          });
        } catch {
          // 북마크 반영 실패는 후기 저장 자체를 막지 않는다.
        }
      }

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

  function placeLocationLabel(place: PlaceListItem): string {
    const regionLabel =
      regionOptions.find((option) => option.value === place.region)?.label ??
      place.region;
    return [regionLabel, place.district].filter(Boolean).join(" ");
  }

  const placeSearchControls = (
    <section aria-label="관광지 선택" className="grid gap-4">
      <div className="grid gap-2">
        <label htmlFor="review-region" className="type-body-lg font-semibold text-foreground">
          지역
        </label>
        <div className="relative">
          <select
            id="review-region"
            value={region}
            disabled={submitting}
            className="h-11 w-full appearance-none rounded-lg border border-input bg-background px-3.5 pr-9 text-base text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-45"
            onChange={(event) => {
              setRegion(event.target.value as PlaceRegion | "");
              setSelectedPlace(null);
              setErrorMessage(null);
            }}
          >
            <option value="">지역 선택</option>
            {regionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <label htmlFor="review-place-query" className="type-body-lg font-semibold text-foreground">
          관광지 검색
        </label>
        <button
          id="review-place-query"
          type="button"
          disabled={region === "" || submitting}
          onClick={() => setPlaceModalOpen(true)}
          className="relative flex h-11 w-full items-center gap-2 rounded-lg border border-input bg-background px-3.5 text-left outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-45"
        >
          <SearchIcon
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
          <span className="truncate text-base text-muted-foreground">
            관광지 이름을 검색해보세요
          </span>
        </button>
      </div>

      {region !== "" ? (
        <PlaceSearchDialog
          open={placeModalOpen}
          onOpenChange={setPlaceModalOpen}
          region={region}
          excludedPlaceIds={reviewedPlaceIds}
          onSelect={(place) => {
            setSelectedPlace(place);
            setErrorMessage(null);
          }}
        />
      ) : null}
    </section>
  );

  const placeSection = isCreate ? (
    selectedPlace == null ? (
      placeSearchControls
    ) : (
      <div className="grid gap-2">
        <ReviewPlaceSummaryCard
          title={selectedPlace.title}
          location={placeLocationLabel(selectedPlace)}
          imageUrl={selectedPlace.primaryImageUrl}
        />
        <button
          type="button"
          disabled={submitting}
          onClick={() => setSelectedPlace(null)}
          className="type-caption justify-self-end text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/25 disabled:opacity-45"
        >
          다른 관광지로 변경
        </button>
      </div>
    )
  ) : (
    <ReviewPlaceSummaryCard
      title={props.initialReview.placeTitle}
      location={props.initialReview.location}
      imageUrl={props.initialReview.primaryImageUrl}
    />
  );

  const submitDisabled =
    submitting ||
    rating == null ||
    title.trim().length === 0 ||
    title.trim().length > 30 ||
    content.trim().length < minContentLength ||
    content.trim().length > maxContentLength ||
    (isCreate && selectedPlace == null);

  return (
    <div className="mx-auto min-h-[100svh] w-full max-w-[30rem] bg-background px-5 pt-[15px] pb-[calc(6.5rem+var(--safe-area-bottom))]">
      <header className="mb-7 grid grid-cols-[2.75rem_minmax(0,1fr)] items-center gap-2">
        <Link
          href="/reviews"
          aria-label="내 후기로 돌아가기"
          className="flex size-11 items-center justify-center rounded-lg text-foreground outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/25"
        >
          <ChevronLeftIcon className="size-5" aria-hidden="true" />
        </Link>
        <h1 className="text-[1.2rem] leading-7 font-bold tracking-[-0.02em] text-foreground">
          {isCreate ? "후기 작성" : "후기 수정"}
        </h1>
      </header>

      <main>
        <ReviewEditorForm
          placeSection={placeSection}
          rating={rating}
          title={title}
          content={content}
          images={images}
          saveToFavorites={saveToFavorites}
          submitting={submitting}
          errorMessage={errorMessage}
          onRatingChange={(nextRating) => {
            setRating(nextRating);
            setErrorMessage(null);
          }}
          onTitleChange={(nextTitle) => {
            setTitle(nextTitle);
            setErrorMessage(null);
          }}
          onContentChange={(nextContent) => {
            setContent(nextContent);
            setErrorMessage(null);
          }}
          onImagesChange={setImages}
          onSaveToFavoritesChange={setSaveToFavorites}
          onSubmit={() => void handleSubmit()}
        />
      </main>

      <div className="safe-area-bottom fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[30rem] border-t border-border bg-card/95 px-5 pt-3 backdrop-blur-xl">
        <Button
          type="submit"
          form={REVIEW_EDITOR_FORM_ID}
          disabled={submitDisabled}
          size="lg"
          className="mb-4 w-full"
        >
          {submitting ? "저장 중..." : "등록하기"}
        </Button>
      </div>
    </div>
  );
}

export { ReviewEditorScreen, type ReviewEditorScreenProps };
