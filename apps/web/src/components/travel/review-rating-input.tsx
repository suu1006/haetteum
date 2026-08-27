"use client";

import { useRef } from "react";

import { cn } from "@/lib/utils";

type ReviewRatingInputProps = {
  value: number | null;
  onChange: (rating: number) => void;
  disabled?: boolean;
};

const ratings = [1, 2, 3, 4, 5] as const;

function ReviewRatingInput({
  value,
  onChange,
  disabled = false,
}: ReviewRatingInputProps) {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function selectAndFocus(rating: number) {
    onChange(rating);
    buttonRefs.current[rating - 1]?.focus();
  }

  return (
    <div role="radiogroup" aria-label="별점" className="flex gap-2">
      {ratings.map((rating, index) => {
        const selected = value === rating;
        const tabbable = value == null ? rating === 1 : selected;

        return (
          <button
            key={rating}
            ref={(node) => {
              buttonRefs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${rating}점`}
            tabIndex={tabbable ? 0 : -1}
            disabled={disabled}
            className={cn(
              "flex size-11 items-center justify-center rounded-full border text-xl outline-none transition-[color,background-color,border-color,transform] focus-visible:ring-3 focus-visible:ring-ring/25 active:scale-95 disabled:pointer-events-none disabled:opacity-45",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-primary",
            )}
            onClick={() => onChange(rating)}
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
            <span aria-hidden="true">★</span>
          </button>
        );
      })}
    </div>
  );
}

export { ReviewRatingInput, type ReviewRatingInputProps };
