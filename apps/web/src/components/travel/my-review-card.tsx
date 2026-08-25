import {
  BookmarkIcon,
  HeartIcon,
  MessageCircleIcon,
  StarIcon,
} from "lucide-react";
import Image from "next/image";

import type { MyReviewItem } from "@/features/profile/my-reviews-model";

type MyReviewCardProps = {
  review: MyReviewItem;
  eager?: boolean;
};

function MyReviewCard({ review, eager = false }: MyReviewCardProps) {
  return (
    <article
      aria-label={`${review.title} 후기`}
      className="grid min-h-[11.25rem] grid-cols-[7.5rem_minmax(0,1fr)] gap-4 rounded-[1.35rem] border border-border/70 bg-card p-3 shadow-card max-[359px]:grid-cols-[6.5rem_minmax(0,1fr)] max-[359px]:gap-3"
    >
      <div className="relative min-h-[9.75rem] overflow-hidden rounded-[1rem] bg-primary-subtle">
        <Image
          src={review.image.src}
          alt={review.image.alt}
          fill
          sizes="(max-width: 359px) 104px, 120px"
          loading={eager ? "eager" : "lazy"}
          className="object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-col py-0.5">
        <div className="min-w-0">
          <h2 className="truncate text-[1rem] leading-6 font-bold tracking-[-0.025em] text-foreground">
            {review.title}
          </h2>
          <p className="type-caption mt-0.5 text-muted-foreground">
            {review.location}
          </p>
        </div>

        <div className="mt-2 flex min-w-0 items-center gap-4">
          <span
            aria-label={`평점 ${review.rating.toFixed(1)}점`}
            className="type-label inline-flex shrink-0 items-center gap-1 text-foreground"
          >
            <StarIcon
              aria-hidden="true"
              className="size-4 fill-rating text-rating"
            />
            {review.rating.toFixed(1)}
          </span>
          <time
            dateTime={review.date.replaceAll(".", "-")}
            className="type-caption truncate text-muted-foreground"
          >
            {review.date}
          </time>
        </div>

        <p className="mt-2 line-clamp-2 text-[0.8rem] leading-[1.2rem] tracking-[-0.0125em] text-foreground">
          {review.content}
        </p>

        <div className="mt-auto flex items-center gap-5 pt-3 text-muted-foreground">
          <span
            aria-label={`좋아요 ${review.likeCount}개`}
            className="type-caption inline-flex items-center gap-1"
          >
            <HeartIcon aria-hidden="true" className="size-[1.125rem]" />
            {review.likeCount}
          </span>
          <span
            aria-label={`댓글 ${review.commentCount}개`}
            className="type-caption inline-flex items-center gap-1"
          >
            <MessageCircleIcon aria-hidden="true" className="size-[1.125rem]" />
            {review.commentCount}
          </span>
          <BookmarkIcon
            aria-label={review.bookmarked ? "북마크됨" : "북마크하지 않음"}
            className="ml-auto size-5 text-muted-foreground data-[bookmarked=true]:fill-primary data-[bookmarked=true]:text-primary"
            data-bookmarked={review.bookmarked}
          />
        </div>
      </div>
    </article>
  );
}

export { MyReviewCard, type MyReviewCardProps };
