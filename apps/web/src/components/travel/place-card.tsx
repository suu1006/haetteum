"use client";

import { BookmarkIcon, MapPinIcon } from "lucide-react";
import type { ReactNode } from "react";

import { RatingSummary } from "@/components/travel/rating-summary";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";

type PlaceCardProps = {
  title: string;
  location: string;
  rating: number;
  reviewCount: number;
  tags?: readonly string[];
  media?: ReactNode;
  saved?: boolean;
  onSavedChange?: (saved: boolean) => void;
};

function PlaceCard({
  title,
  location,
  rating,
  reviewCount,
  tags = [],
  media,
  saved = false,
  onSavedChange,
}: PlaceCardProps) {
  return (
    <article aria-label={title} className="min-w-0">
      <Card className="h-full">
        <div className="relative aspect-[4/3] overflow-hidden bg-primary-subtle">
          {media ? (
            <div className="size-full [&>*]:size-full">{media}</div>
          ) : (
            <div
              className="flex size-full items-end bg-linear-to-br from-primary-subtle via-background to-current-location/15 p-4"
              aria-hidden="true"
            >
              <MapPinIcon className="size-7 text-primary" />
            </div>
          )}
          <Toggle
            variant="outline"
            pressed={saved}
            onPressedChange={(nextSaved) => onSavedChange?.(nextSaved)}
            aria-label={saved ? `${title} 저장 해제` : `${title} 저장`}
            className="absolute top-3 right-3 bg-card/90 shadow-card backdrop-blur-sm aria-pressed:[&_svg]:fill-current"
          >
            <BookmarkIcon aria-hidden="true" />
          </Toggle>
        </div>

        <CardHeader className="min-w-0">
          <CardTitle className="type-title-md break-words">{title}</CardTitle>
          <div className="type-body-md flex min-w-0 items-start gap-1.5 text-muted-foreground">
            <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">{location}</span>
          </div>
        </CardHeader>

        <CardContent className="mt-auto space-y-3">
          <RatingSummary
            value={rating}
            reviewCount={reviewCount}
            size="compact"
          />
          {tags.length ? (
            <ul aria-label={`${title} 특징`} className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <li
                  key={tag}
                  className="type-caption rounded-full bg-primary-subtle px-2.5 py-1 text-primary"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </article>
  );
}

export { PlaceCard, type PlaceCardProps };
