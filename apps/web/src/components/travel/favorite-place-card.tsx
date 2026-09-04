"use client";

import type { FavoritePlaceItem } from "@haetteum/contracts";
import { HeartIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { buildPlaceDetailHref } from "@/features/places/place-detail-model";
import { resolveOfficialImageSource } from "@/lib/official-image";

type FavoritePlaceCardProps = {
  item: FavoritePlaceItem;
  onRemove: () => void;
  disabled?: boolean;
};

function FavoritePlaceCard({
  item,
  onRemove,
  disabled = false,
}: FavoritePlaceCardProps) {
  return (
    <article
      aria-label={`${item.title} 찜한 장소`}
      className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card"
    >
      <Link
        href={buildPlaceDetailHref(item.id)}
        className="flex min-w-0 flex-1 items-center gap-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
      >
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-primary-subtle">
          <Image
            src={resolveOfficialImageSource(item.primaryImageUrl)}
            alt={`${item.title} 대표 이미지`}
            fill
            sizes="4rem"
            className="object-cover"
          />
        </div>
        <div className="min-w-0">
          <p className="type-title-md truncate text-foreground">
            {item.title}
          </p>
          <p className="type-body-md truncate text-muted-foreground">
            {item.location}
          </p>
        </div>
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`${item.title} 찜 해제`}
        aria-pressed={true}
        disabled={disabled}
        onClick={onRemove}
      >
        <HeartIcon className="fill-current text-primary" aria-hidden="true" />
      </Button>
    </article>
  );
}

export { FavoritePlaceCard, type FavoritePlaceCardProps };
