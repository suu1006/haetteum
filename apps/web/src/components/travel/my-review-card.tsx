import { Menu } from "@base-ui/react/menu";
import { HeartIcon, MessageCircleIcon, StarIcon } from "lucide-react";
import Image from "next/image";
import { TbDotsVertical } from "react-icons/tb";

import type { MyReviewItem } from "@/features/profile/my-reviews-model";

type MyReviewCardProps = {
  review: MyReviewItem;
  eager?: boolean;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  deleting?: boolean;
};

function MyReviewCard({
  review,
  eager = false,
  onEdit,
  onDelete,
  deleting = false,
}: MyReviewCardProps) {
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
        <div className="flex min-w-0 items-start justify-between gap-2">
          <h2 className="min-w-0 flex-1 truncate text-[1rem] leading-6 font-bold tracking-[-0.025em] text-foreground">
            {review.title}
          </h2>
          {onEdit || onDelete ? (
            <Menu.Root>
              <Menu.Trigger
                aria-label={`${review.title} 후기 더보기`}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/25"
              >
                <TbDotsVertical aria-hidden="true" className="size-5" strokeWidth={1.7} />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner side="bottom" align="end" sideOffset={4} className="isolate z-50">
                  <Menu.Popup className="min-w-28 origin-(--transform-origin) rounded-2xl bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
                    {onEdit ? (
                      <Menu.Item
                        onClick={() => onEdit(review.id)}
                        className="flex min-h-9 cursor-default items-center rounded-xl px-3 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground"
                      >
                        수정
                      </Menu.Item>
                    ) : null}
                    {onDelete ? (
                      <Menu.Item
                        onClick={() => onDelete(review.id)}
                        disabled={deleting}
                        className="flex min-h-9 cursor-default items-center rounded-xl px-3 text-sm text-destructive outline-hidden select-none focus:bg-accent data-disabled:pointer-events-none data-disabled:opacity-50"
                      >
                        삭제
                      </Menu.Item>
                    ) : null}
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          ) : null}
        </div>
        <div className="min-w-0">
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
        </div>
      </div>
    </article>
  );
}

export { MyReviewCard, type MyReviewCardProps };
