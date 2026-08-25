import Image from "next/image";
import { CheckIcon, PlusIcon } from "lucide-react";

import { RatingSummary } from "@/components/travel/rating-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NearbyPlaceResult } from "@/features/places/nearby-place-search-model";
import { cn } from "@/lib/utils";

type NearbyPlaceSelectCardProps = {
  place: NearbyPlaceResult;
  selected: boolean;
  unavailable: boolean;
  eager?: boolean;
  onSelectedChange: (selected: boolean) => void;
};

const travelModeLabels = {
  car: "차로",
  walk: "도보",
} as const;

function NearbyPlaceSelectCard({
  place,
  selected,
  unavailable,
  eager = false,
  onSelectedChange,
}: NearbyPlaceSelectCardProps) {
  const controlLabel = unavailable
    ? `${place.title} 이미 일정에 추가됨`
    : selected
      ? `${place.title} 선택 해제`
      : `${place.title} 선택`;

  return (
    <article
      aria-label={place.title}
      className={cn(
        "grid min-w-0 grid-cols-[5rem_minmax(0,1fr)_3rem] items-center gap-2 rounded-2xl border bg-card p-2 shadow-card transition-[border-color,box-shadow]",
        selected && "border-primary shadow-float",
      )}
    >
      <div className="relative h-24 overflow-hidden rounded-xl bg-primary-subtle">
        <Image
          src={place.image.src}
          alt={place.image.alt}
          fill
          loading={eager ? "eager" : "lazy"}
          sizes="80px"
          className="object-cover"
        />
      </div>

      <div className="min-w-0 py-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <Badge
            variant="secondary"
            className="h-5 bg-primary-subtle px-1.5 text-[0.65rem] text-primary"
          >
            {place.categoryLabel}
          </Badge>
          <h2 className="type-label truncate text-foreground">{place.title}</h2>
        </div>
        <p className="type-caption mt-1 text-muted-foreground">
          {place.distanceKm.toFixed(1)}km · {travelModeLabels[place.travelMode]}{" "}
          {place.travelMinutes}분
        </p>
        <p className="type-caption mt-1 line-clamp-2 text-muted-foreground">
          {place.description}
        </p>
        <RatingSummary
          value={place.rating}
          reviewCount={place.reviewCount}
          size="compact"
          countVariant="parenthetical"
          className="mt-1"
        />
      </div>

      <div className="flex min-w-0 flex-col items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant={selected ? "default" : "outline"}
          disabled={unavailable}
          aria-pressed={unavailable ? undefined : selected}
          aria-label={controlLabel}
          onClick={() => onSelectedChange(!selected)}
          className="rounded-full"
        >
          {selected ? (
            <CheckIcon className="size-5" aria-hidden="true" />
          ) : (
            <PlusIcon className="size-5" aria-hidden="true" />
          )}
        </Button>
        {unavailable ? (
          <span className="text-[0.625rem] leading-4 text-muted-foreground">
            추가됨
          </span>
        ) : null}
      </div>
    </article>
  );
}

export { NearbyPlaceSelectCard, type NearbyPlaceSelectCardProps };
