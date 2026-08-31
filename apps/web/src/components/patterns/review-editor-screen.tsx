"use client";

import type { PlaceListItem, PlaceRegion, ReviewItem } from "@haetteum/contracts";
import { ChevronDownIcon, ChevronLeftIcon, SearchIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { PlaceSearchDialog } from "@/components/travel/place-search-dialog";
import { ReviewEditorForm } from "@/components/travel/review-editor-form";
import { createReview, updateReview } from "@/features/profile/my-reviews-api";
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

const regionOptions: readonly { value: PlaceRegion; label: string }[] = [
  { value: "seoul", label: "서울" },
  { value: "gyeonggi", label: "경기" },
  { value: "gangwon", label: "강원" },
  { value: "busan", label: "부산" },
  { value: "jeju", label: "제주" },
];

const duplicateMessage = "이미 이 관광지에 작성한 후기가 있어요.";

function ReviewEditorScreen(props: ReviewEditorScreenProps) {
  const router = useRouter();
  const isCreate = props.mode === "create";
  const [region, setRegion] = useState<PlaceRegion | "">("");
  const [selectedPlace, setSelectedPlace] = useState<PlaceListItem | null>(null);
  const [placeModalOpen, setPlaceModalOpen] = useState(false);
  const [rating, setRating] = useState<number | null>(
    isCreate ? null : props.initialReview.rating,
  );
  const [content, setContent] = useState(
    isCreate ? "" : props.initialReview.content,
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const reviewedPlaceIds = new Set(
    isCreate ? props.reviewedPlaceIds : ([] as readonly string[]),
  );
  const placeLabel = isCreate
    ? selectedPlace?.title ?? null
    : `${props.initialReview.placeTitle}\n${props.initialReview.location}`;

  async function handleSubmit() {
    if (submittingRef.current || rating == null) return;
    const trimmedContent = content.trim();
    if (trimmedContent.length === 0 || trimmedContent.length > 500) return;
    if (isCreate && selectedPlace == null) return;

    submittingRef.current = true;
    setSubmitting(true);
    setErrorMessage(null);

    const result = isCreate
      ? await createReview({
          placeId: selectedPlace!.id,
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
        <label htmlFor="review-place-query" className="type-label text-foreground">
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
          <span
            className={cn(
              "truncate text-base",
              selectedPlace != null ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {selectedPlace?.title ?? "관광지 이름을 검색해보세요"}
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
