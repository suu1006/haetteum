import { StarIcon, ThumbsUpIcon, UserRoundIcon } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

import { ProviderBadge } from "@/components/travel/provider-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type ReviewImage = {
  src: string;
  alt: string;
};

type ReviewCardProps = {
  author: string;
  rating: number;
  date: string;
  content: string;
  provider: string;
  providerIcon?: ReactNode;
  avatar?: ReactNode;
  variant?: "default" | "feed";
  images?: readonly ReviewImage[];
  likeCount?: number;
  eagerImages?: boolean;
};

function ReviewCard({
  author,
  rating,
  date,
  content,
  provider,
  providerIcon,
  avatar,
  variant = "default",
  images = [],
  likeCount = 0,
  eagerImages = false,
}: ReviewCardProps) {
  const formattedRating = rating.toFixed(1);

  if (variant === "feed") {
    return (
      <article aria-label={`${author}의 후기`} className="min-w-0">
        <Card className="gap-0 py-0">
          <div className="space-y-3 p-4">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
              <span className="inline-flex min-w-0 items-center gap-2">
                {providerIcon ? (
                  <span aria-hidden="true">{providerIcon}</span>
                ) : null}
                <strong className="type-label truncate">{provider}</strong>
              </span>
              <span
                className="type-label inline-flex items-center gap-1.5 text-foreground"
                aria-label={`평점 ${formattedRating}점`}
              >
                <span className="inline-flex gap-0.5 text-primary" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, index) => (
                    <StarIcon
                      key={index}
                      className={
                        rating >= index + 0.75
                          ? "size-4 fill-current"
                          : "size-4 opacity-25"
                      }
                    />
                  ))}
                </span>
                {formattedRating}
              </span>
            </div>

            <p className="type-body-lg break-words text-foreground">{content}</p>

            {images.length > 0 ? (
              <ul
                aria-label={`${author}의 후기 사진`}
                className="scrollbar-none flex snap-x gap-1.5 overflow-x-auto overscroll-x-contain"
              >
                {images.map((image) => (
                  <li
                    key={image.src}
                    className="relative aspect-[4/3] min-w-[8.25rem] snap-start overflow-hidden rounded-lg bg-primary-subtle"
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes="132px"
                      loading={eagerImages ? "eager" : "lazy"}
                      className="object-cover"
                    />
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="flex min-w-0 items-center justify-between gap-3 pt-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-muted-foreground">
                  {avatar ?? (
                    <UserRoundIcon className="size-3.5" aria-hidden="true" />
                  )}
                </span>
                <span className="type-caption truncate font-medium text-foreground">
                  {author}
                </span>
                <span className="type-caption shrink-0 text-muted-foreground">
                  {date}
                </span>
              </div>
              <span
                className="type-caption inline-flex shrink-0 items-center gap-1 text-muted-foreground"
                aria-label={`좋아요 ${likeCount}개`}
              >
                <ThumbsUpIcon className="size-4" aria-hidden="true" />
                {likeCount}
              </span>
            </div>
          </div>
        </Card>
      </article>
    );
  }

  return (
    <article aria-label={`${author}의 후기`} className="min-w-0">
      <Card className="h-full">
        <CardHeader className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
          <div className="row-span-2 flex size-11 items-center justify-center overflow-hidden rounded-full bg-primary-subtle text-primary">
            {avatar ?? <UserRoundIcon className="size-5" aria-hidden="true" />}
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <strong className="type-label min-w-0 break-words">{author}</strong>
            <ProviderBadge provider={provider} icon={providerIcon} />
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span
              className="type-label inline-flex items-center gap-1 text-foreground"
              aria-label={`평점 ${formattedRating}점`}
            >
              <StarIcon
                className="size-4 fill-rating text-rating"
                aria-hidden="true"
              />
              {formattedRating}
            </span>
            <span className="type-caption text-muted-foreground">{date}</span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="type-body-md break-words text-foreground">{content}</p>
        </CardContent>
      </Card>
    </article>
  );
}

export { ReviewCard, type ReviewCardProps, type ReviewImage };
