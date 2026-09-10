import Image from "next/image";
import { CheckIcon, MapPinIcon, MinusIcon, PlusIcon } from "lucide-react";
import type { PlaceListItem } from "@haetteum/contracts";

import { Button } from "@/components/ui/button";
import { resolveOfficialImageSource } from "@/lib/official-image";
import { cn } from "@/lib/utils";

type PlaceSelectCardProps = {
  place: PlaceListItem;
  selected: boolean;
  unavailable: boolean;
  eager?: boolean;
  onSelectedChange: (selected: boolean) => void;
  onRemove: () => void;
};

function PlaceSelectCard({
  place,
  selected,
  unavailable,
  eager = false,
  onSelectedChange,
  onRemove,
}: PlaceSelectCardProps) {
  const location = place.district ?? place.address;
  const controlLabel = unavailable
    ? `${place.title} 일정에서 빼기`
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
          src={resolveOfficialImageSource(place.primaryImageUrl)}
          alt={place.title}
          fill
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          sizes="80px"
          className="object-cover"
        />
      </div>

      <div className="min-w-0 py-1">
        <h2 className="type-label truncate text-foreground">{place.title}</h2>
        {location != null ? (
          <p className="type-caption mt-1 flex items-center gap-1 text-muted-foreground">
            <MapPinIcon className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{location}</span>
          </p>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant={selected ? "default" : "outline"}
          aria-pressed={unavailable ? undefined : selected}
          aria-label={controlLabel}
          onClick={() => (unavailable ? onRemove() : onSelectedChange(!selected))}
          className="rounded-full"
        >
          {unavailable ? (
            <MinusIcon className="size-5" aria-hidden="true" />
          ) : selected ? (
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

export { PlaceSelectCard, type PlaceSelectCardProps };
