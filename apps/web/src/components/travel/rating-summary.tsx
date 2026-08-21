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
  className?: string;
};

const reviewCountFormatter = new Intl.NumberFormat("ko-KR");

function RatingSummary({
  value,
  reviewCount,
  distribution,
  size = "default",
  className,
}: RatingSummaryProps) {
  const formattedValue = value.toFixed(1);
  const formattedCount = reviewCountFormatter.format(reviewCount);

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
            "inline-flex items-center text-rating",
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
          후기 {formattedCount}개
        </span>
      </div>

      {distribution?.length ? (
        <div className="mt-5 space-y-2.5">
          {distribution.map(({ score, count }) => {
            const percentage = Math.min(
              100,
              Math.max(
                0,
                Math.round((count / Math.max(reviewCount, 1)) * 100),
              ),
            );

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
                    className="h-full rounded-full bg-rating"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="type-caption text-right text-muted-foreground">
                  {percentage}%
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
