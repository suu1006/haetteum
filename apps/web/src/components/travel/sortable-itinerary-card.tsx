"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MenuIcon } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import type {
  CoursePlace,
  CourseTimeSlot,
} from "@/features/courses/course-edit-model";

type SortableItineraryCardProps = {
  place: CoursePlace;
  slot: CourseTimeSlot;
  isLast?: boolean;
  onSelect: (place: CoursePlace) => void;
};

function SortableItineraryCard({
  place,
  slot,
  isLast = false,
  onSelect,
}: SortableItineraryCardProps) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: place.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      data-dragging={isDragging ? "true" : "false"}
      className="relative grid min-w-0 grid-cols-[3.25rem_0.875rem_minmax(0,1fr)] gap-2 pb-4 last:pb-0"
    >
      <time
        dateTime={slot.time}
        className="type-label pt-5 text-right text-muted-foreground"
      >
        {slot.time}
      </time>

      <div className="relative flex justify-center pt-6" aria-hidden="true">
        <span className="z-10 size-2.5 rounded-full border-2 border-primary bg-card" />
        {!isLast ? (
          <span className="absolute top-[1.875rem] bottom-[-1rem] left-1/2 w-px -translate-x-1/2 bg-primary/25" />
        ) : null}
      </div>

      <article
        aria-label={`${slot.time} ${place.title}`}
        className={cn(
          "relative flex min-h-20 min-w-0 items-center gap-3 rounded-2xl border bg-card p-3 shadow-card transition-[border-color,box-shadow,transform,opacity] duration-180 ease-[var(--ease-standard)]",
          isDragging
            ? "z-20 scale-[1.015] border-primary opacity-95 shadow-floating ring-2 ring-primary ring-offset-1 ring-offset-background"
            : "border-border",
        )}
      >
        <button
          type="button"
          aria-label={`${place.title} 상세 정보 보기`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-none transition-[background-color,transform] active:scale-[0.99] focus-visible:bg-primary-subtle/60 focus-visible:ring-3 focus-visible:ring-ring/25"
          onClick={() => onSelect(place)}
        >
          <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
            <Image
              src={place.image.src}
              alt={place.image.alt}
              fill
              loading="eager"
              sizes="64px"
              className="object-cover"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="type-label block truncate text-foreground">
              {place.title}
            </span>
            <span className="type-body-md mt-1 block truncate text-muted-foreground">
              {place.category}
            </span>
          </span>
        </button>
        <button
          type="button"
          aria-label={`${place.title} 일정 이동`}
          className="flex size-11 touch-none cursor-grab items-center justify-center rounded-xl text-muted-foreground outline-none transition-[color,background-color,transform] active:cursor-grabbing active:scale-95 focus-visible:bg-primary-subtle focus-visible:text-primary focus-visible:ring-3 focus-visible:ring-ring/25"
          {...attributes}
          {...listeners}
        >
          <MenuIcon className="size-5" aria-hidden="true" />
        </button>
      </article>
    </li>
  );
}

export { SortableItineraryCard, type SortableItineraryCardProps };
