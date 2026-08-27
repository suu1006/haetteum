"use client";

import type { FormEvent, ReactNode } from "react";

import { ReviewRatingInput } from "@/components/travel/review-rating-input";
import { Button } from "@/components/ui/button";

type ReviewEditorFormProps = {
  mode: "create" | "edit";
  placeLabel: string | null;
  rating: number | null;
  content: string;
  submitting: boolean;
  errorMessage: string | null;
  onRatingChange: (rating: number) => void;
  onContentChange: (content: string) => void;
  onSubmit: () => void;
  createPlaceControls?: ReactNode;
};

const maxContentLength = 500;

function ReviewEditorForm({
  mode,
  placeLabel,
  rating,
  content,
  submitting,
  errorMessage,
  onRatingChange,
  onContentChange,
  onSubmit,
  createPlaceControls,
}: ReviewEditorFormProps) {
  const trimmedContent = content.trim();
  const contentTooLong = trimmedContent.length > maxContentLength;
  const submitDisabled =
    submitting ||
    placeLabel == null ||
    rating == null ||
    trimmedContent.length === 0 ||
    contentTooLong;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!submitDisabled) onSubmit();
  }

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      {mode === "create" ? createPlaceControls : null}

      {mode === "edit" && placeLabel != null ? (
        <section aria-label="후기 관광지" className="rounded-2xl bg-primary-subtle px-4 py-4">
          <p className="type-caption text-muted-foreground">관광지</p>
          {placeLabel.split("\n").map((line, index) => (
            <p
              key={line}
              className={
                index === 0
                  ? "type-body-md mt-1 font-semibold text-foreground"
                  : "type-caption mt-1 text-muted-foreground"
              }
            >
              {line}
            </p>
          ))}
        </section>
      ) : null}

      <fieldset className="grid gap-3" disabled={submitting}>
        <legend className="type-label text-foreground">별점</legend>
        <ReviewRatingInput
          value={rating}
          onChange={onRatingChange}
          disabled={submitting}
        />
      </fieldset>

      <div className="grid gap-2">
        <div className="flex items-end justify-between gap-4">
          <label htmlFor="review-content" className="type-label text-foreground">
            후기 내용
          </label>
          <span
            aria-live="polite"
            className={
              contentTooLong
                ? "type-caption text-destructive"
                : "type-caption text-muted-foreground"
            }
          >
            {content.length}/{maxContentLength}
          </span>
        </div>
        <textarea
          id="review-content"
          value={content}
          disabled={submitting}
          aria-invalid={contentTooLong}
          aria-describedby={contentTooLong ? "review-content-error" : undefined}
          rows={7}
          className="min-h-40 w-full resize-y rounded-xl border border-input bg-background px-3.5 py-3 text-base text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-45"
          placeholder="여행지에서의 경험을 남겨 주세요."
          onChange={(event) => onContentChange(event.target.value)}
        />
        {contentTooLong ? (
          <p id="review-content-error" className="type-caption text-destructive">
            후기는 500자 이하로 작성해 주세요.
          </p>
        ) : null}
      </div>

      {errorMessage != null ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={submitDisabled} className="w-full">
        {submitting
          ? "저장 중..."
          : mode === "create"
            ? "후기 등록"
            : "수정 저장"}
      </Button>
    </form>
  );
}

export { ReviewEditorForm, type ReviewEditorFormProps };
