import { StarIcon, UserRoundIcon } from "lucide-react";
import type { ReactNode } from "react";

import { ProviderBadge } from "@/components/travel/provider-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type ReviewCardProps = {
  author: string;
  rating: number;
  date: string;
  content: string;
  provider: string;
  providerIcon?: ReactNode;
  avatar?: ReactNode;
};

function ReviewCard({
  author,
  rating,
  date,
  content,
  provider,
  providerIcon,
  avatar,
}: ReviewCardProps) {
  const formattedRating = rating.toFixed(1);

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

export { ReviewCard, type ReviewCardProps };
