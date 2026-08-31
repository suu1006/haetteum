"use client";

import { useRef, useState } from "react";
import { StarIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type ReviewRatingInputProps = {
  value: number | null;
  onChange: (rating: number) => void;
  disabled?: boolean;
};

const ratings = [1, 2, 3, 4, 5] as const;

const ratingLabels: Record<number, string> = {
  1: "별로에요",
  2: "그저 그래요",
  3: "괜찮아요",
  4: "좋아요",
  5: "최고예요",
};

function ReviewRatingInput({
  value,
  onChange,
  disabled = false,
}: ReviewRatingInputProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const filledCount = hoverRating ?? value ?? 0;

  function selectAndFocus(rating: number) {
    onChange(rating);
    buttonRefs.current[rating - 1]?.focus();
  }

  return (
    <div className="grid gap-2">
      <div
        role="radiogroup"
        aria-label="별점"
        className="flex gap-1"
        onPointerLeave={() => setHoverRating(null)}
      >
        {ratings.map((rating, index) => {
          const selected = value === rating;
          const filled = rating <= filledCount;
          const tabbable = value == null ? rating === 1 : selected;

          return (
            <button
              key={rating}
              ref={(node) => {
                buttonRefs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={value === rating}
              aria-label={`${rating}점`}
              tabIndex={tabbable ? 0 : -1}
              disabled={disabled}
              className={cn(
                "flex size-11 items-center justify-center outline-none transition-transform focus-visible:ring-3 focus-visible:ring-ring/25 active:scale-95 disabled:pointer-events-none disabled:opacity-45",
              )}
              onClick={() => onChange(rating)}
              onPointerEnter={() => setHoverRating(rating)}
              onFocus={() => setHoverRating(rating)}
              onBlur={() => setHoverRating(null)}
              onKeyDown={(event) => {
                let nextRating: number | null = null;
                if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                  nextRating = Math.min(5, rating + 1);
                } else if (
                  event.key === "ArrowLeft" ||
                  event.key === "ArrowDown"
                ) {
                  nextRating = Math.max(1, rating - 1);
                }

                if (nextRating != null) {
                  event.preventDefault();
                  selectAndFocus(nextRating);
                }
              }}
            >
              <StarIcon
                aria-hidden="true"
                className={cn(
                  "size-8 transition-colors",
                  filled
                    ? "fill-rating text-rating"
                    : "fill-secondary text-secondary",
                )}
              />
            </button>
          );
        })}
      </div>
      <p className="type-caption text-muted-foreground">
        {value == null ? "선택하세요." : `${value}점 (${ratingLabels[value]})`}
      </p>
    </div>
  );
}

export { ReviewRatingInput, type ReviewRatingInputProps };
