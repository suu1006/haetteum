import { StarIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type RatingDistribution = {
  score: 1 | 2 | 3 | 4 | 5;
  count: number;
};

type RatingSummaryProps = {
  value: number;
  reviewCount: number;
  distribution?: readonly RatingDistribution[];
  size?: "default" | "compact";
  countVariant?: "labelled" | "parenthetical";
  layout?: "stacked" | "split";
  tone?: "rating" | "primary";
  distributionValue?: "percentage" | "count";
  className?: string;
};

const reviewCountFormatter = new Intl.NumberFormat("ko-KR");

function getPercentage(count: number, reviewCount: number) {
  return Math.min(
    100,
    Math.max(0, Math.round((count / Math.max(reviewCount, 1)) * 100)),
  );
}

function RatingSummary({
  value,
  reviewCount,
  distribution,
  size = "default",
  countVariant = "labelled",
  layout = "stacked",
  tone = "rating",
  distributionValue = "percentage",
  className,
}: RatingSummaryProps) {
  const formattedValue = value.toFixed(1);
  const formattedCount = reviewCountFormatter.format(reviewCount);
  const toneTextClass = tone === "primary" ? "text-primary" : "text-rating";
  const toneBarClass = tone === "primary" ? "bg-primary" : "bg-rating";

  if (layout === "split") {
    return (
      <div
        role="region"
        aria-label={`평점 ${formattedValue}점, 후기 ${formattedCount}개`}
        className={cn(
          "grid min-w-0 grid-cols-[minmax(7rem,0.9fr)_minmax(0,1.4fr)] items-center gap-5 rounded-xl bg-secondary/65 p-5",
          className,
        )}
      >
        <div className="min-w-0">
          <div className="flex items-baseline gap-1.5">
            <strong className="text-[2.25rem] leading-none font-bold tracking-tight text-foreground">
              {formattedValue}
            </strong>
            <span className="type-body-lg text-muted-foreground">/ 5</span>
          </div>
          <div
            className={cn("mt-4 flex items-center gap-1", toneTextClass)}
            aria-hidden="true"
          >
            {Array.from({ length: 5 }, (_, index) => {
              const starValue = index + 1;
              const filled = value >= starValue - 0.25;
              const partial = !filled && value >= starValue - 0.75;

              return (
                <StarIcon
                  key={starValue}
                  className={cn(
                    "size-5",
                    filled && "fill-current",
                    partial && "fill-current opacity-55",
                  )}
                />
              );
            })}
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          {distribution?.map(({ score, count }) => {
            const percentage = getPercentage(count, reviewCount);

            return (
              <div
                key={score}
                className="grid grid-cols-[1.75rem_minmax(0,1fr)_3rem] items-center gap-2"
              >
                <span className="type-caption font-semibold text-primary">
                  {score}점
                </span>
                <div
                  role="meter"
                  aria-label={`${score}점 후기 비율`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percentage}
                  className="h-2 overflow-hidden rounded-full bg-background"
                >
                  <div
                    className={cn("h-full rounded-full", toneBarClass)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="type-caption text-right text-muted-foreground">
                  {distributionValue === "count"
                    ? reviewCountFormatter.format(count)
                    : `${percentage}%`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      role={size === "default" ? "region" : "group"}
      aria-label={`평점 ${formattedValue}점, 후기 ${formattedCount}개`}
      className={cn(
        "min-w-0",
        size === "compact" && "inline-flex items-center gap-2",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center",
          size === "compact" ? "gap-1.5" : "gap-3",
        )}
      >
        <span
          className={cn(
            "inline-flex items-center",
            toneTextClass,
            size === "compact" ? "gap-1" : "gap-2",
          )}
        >
          <StarIcon
            className={cn(
              "fill-current",
              size === "compact" ? "size-4" : "size-6",
            )}
            aria-hidden="true"
          />
          <strong
            className={cn(
              "text-foreground",
              size === "compact" ? "type-label" : "type-title-lg",
            )}
          >
            {formattedValue}
          </strong>
        </span>
        <span className="type-caption text-muted-foreground">
          {countVariant === "parenthetical"
            ? `(${formattedCount})`
            : `후기 ${formattedCount}개`}
        </span>
      </div>

      {distribution?.length ? (
        <div className="mt-5 space-y-2.5">
          {distribution.map(({ score, count }) => {
            const percentage = getPercentage(count, reviewCount);

            return (
              <div
                key={score}
                className="grid grid-cols-[1.5rem_minmax(0,1fr)_2.25rem] items-center gap-2"
              >
                <span className="type-caption font-semibold text-foreground">
                  {score}
                </span>
                <div
                  role="meter"
                  aria-label={`${score}점 후기 비율`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percentage}
                  className="h-2 overflow-hidden rounded-full bg-secondary"
                >
                  <div
                    className={cn("h-full rounded-full", toneBarClass)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="type-caption text-right text-muted-foreground">
                  {distributionValue === "count"
                    ? reviewCountFormatter.format(count)
                    : `${percentage}%`}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export {
  RatingSummary,
  type RatingDistribution,
  type RatingSummaryProps,
};
