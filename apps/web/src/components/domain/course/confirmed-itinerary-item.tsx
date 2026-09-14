import { CarFrontIcon, ChevronRightIcon } from "lucide-react";
import Image from "next/image";

import type { SavedCourseStop } from "@/features/courses/saved-course-model";

type ConfirmedItineraryItemProps = {
  stop: SavedCourseStop;
  last?: boolean;
  onSelect: (stop: SavedCourseStop) => void;
};

function ConfirmedItineraryItem({
  stop,
  last = false,
  onSelect,
}: ConfirmedItineraryItemProps) {
  return (
    <li className="relative grid min-w-0 grid-cols-[1.75rem_3.5rem_minmax(0,1fr)] gap-x-2 pb-1 last:pb-0">
      <div className="relative flex justify-center pt-3" aria-hidden="true">
        <span className="type-caption relative z-10 flex size-7 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground shadow-card">
          {stop.order}
        </span>
        {!last ? (
          <span className="absolute top-9 bottom-[-0.25rem] left-1/2 w-px -translate-x-1/2 bg-route-line/45" />
        ) : null}
      </div>

      <time
        dateTime={stop.time}
        className="type-label pt-[0.875rem] text-right text-foreground"
      >
        {stop.time}
      </time>

      <div className="min-w-0">
        <button
          type="button"
          aria-label={`${stop.time} ${stop.title} 상세 보기`}
          className="group flex min-h-15 w-full min-w-0 items-center gap-2.5 rounded-xl border border-border bg-card p-1.5 text-left shadow-card outline-none transition-[border-color,box-shadow,transform] active:scale-[0.99] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
          onClick={() => onSelect(stop)}
        >
          <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
            <Image
              src={stop.image.src}
              alt={stop.image.alt}
              fill
              sizes="48px"
              className="object-cover"
            />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="type-label block truncate text-foreground">
              {stop.title}
            </strong>
            <span className="type-caption mt-1 block truncate text-muted-foreground">
              {stop.categoryLabel} · {stop.durationLabel}
            </span>
          </span>
          <ChevronRightIcon
            className="size-5 shrink-0 text-muted-foreground transition-transform group-active:translate-x-0.5"
            aria-hidden="true"
          />
        </button>

        {stop.transfer ? (
          <p className="type-caption flex min-h-5 items-center gap-1.5 pr-3 pl-12 text-muted-foreground">
            <CarFrontIcon className="size-3.5 shrink-0" aria-hidden="true" />
            {stop.transfer.distanceLabel} · {stop.transfer.durationLabel}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export { ConfirmedItineraryItem, type ConfirmedItineraryItemProps };
