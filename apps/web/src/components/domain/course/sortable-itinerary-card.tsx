"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { MenuIcon, Trash2Icon } from "lucide-react";
import Image from "next/image";
import {
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
} from "react";

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
  onRemove: (placeId: string) => void;
};

const SWIPE_OPEN_OFFSET = -72;
const SWIPE_DIRECTION_THRESHOLD = 8;

function SortableItineraryCard({
  place,
  slot,
  isLast = false,
  onSelect,
  onRemove,
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

  const [swipeOffset, setSwipeOffsetState] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const offsetRef = useRef(0);
  const suppressNextClickRef = useRef(false);
  const swipeState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseOffset: number;
    axis: "none" | "horizontal" | "vertical";
  } | null>(null);

  function setSwipeOffset(offset: number) {
    offsetRef.current = offset;
    setSwipeOffsetState(offset);
  }

  function handleSwipePointerDown(event: PointerEvent<HTMLElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    swipeState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseOffset: offsetRef.current,
      axis: "none",
    };
  }

  function handleSwipePointerMove(event: PointerEvent<HTMLElement>) {
    const state = swipeState.current;
    if (!state || state.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - state.startX;
    const deltaY = event.clientY - state.startY;

    if (state.axis === "none") {
      if (
        Math.abs(deltaX) < SWIPE_DIRECTION_THRESHOLD &&
        Math.abs(deltaY) < SWIPE_DIRECTION_THRESHOLD
      ) {
        return;
      }
      state.axis =
        Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
      if (state.axis === "horizontal") {
        try {
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // ignore: pointer may already be released
        }
        setIsSwiping(true);
      }
    }

    if (state.axis !== "horizontal") return;

    const nextOffset = Math.min(
      0,
      Math.max(SWIPE_OPEN_OFFSET, state.baseOffset + deltaX),
    );
    setSwipeOffset(nextOffset);
  }

  function handleSwipePointerUp(event: PointerEvent<HTMLElement>) {
    const state = swipeState.current;
    if (!state || state.pointerId !== event.pointerId) return;

    if (state.axis === "horizontal") {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore: pointer may already be released
      }
      // A mouse drag still fires a trailing click at the release point;
      // suppress just that one so it doesn't immediately re-close the swipe.
      suppressNextClickRef.current = true;
      setSwipeOffset(
        offsetRef.current <= SWIPE_OPEN_OFFSET / 2 ? SWIPE_OPEN_OFFSET : 0,
      );
    }

    swipeState.current = null;
    setIsSwiping(false);
  }

  function handleContentClickCapture(event: MouseEvent<HTMLElement>) {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (offsetRef.current !== 0) {
      event.preventDefault();
      event.stopPropagation();
      setSwipeOffset(0);
    }
  }

  function handleRemove() {
    setSwipeOffset(0);
    onRemove(place.id);
  }

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

      <div className="relative min-w-0 overflow-hidden rounded-2xl">
        <button
          type="button"
          aria-label={`${place.title} 일정에서 삭제`}
          className="absolute inset-y-0 right-0 flex w-[4.5rem] items-center justify-center bg-destructive text-destructive-foreground outline-none transition-colors active:brightness-95 focus-visible:ring-3 focus-visible:ring-ring/25"
          onClick={handleRemove}
        >
          <Trash2Icon className="size-5" aria-hidden="true" />
        </button>

        <article
          aria-label={`${slot.time} ${place.title}`}
          className={cn(
            "relative flex min-h-20 min-w-0 touch-pan-y items-center gap-3 rounded-2xl border bg-card p-3 shadow-card transition-[border-color,box-shadow,opacity] duration-180 ease-[var(--ease-standard)]",
            isDragging
              ? "z-20 scale-[1.015] border-primary opacity-95 shadow-floating ring-2 ring-primary ring-offset-1 ring-offset-background"
              : "border-border",
          )}
          style={{
            transform: `translateX(${swipeOffset}px)`,
            transition: isSwiping ? "none" : "transform 180ms var(--ease-standard)",
          }}
          onPointerDown={handleSwipePointerDown}
          onPointerMove={handleSwipePointerMove}
          onPointerUp={handleSwipePointerUp}
          onPointerCancel={handleSwipePointerUp}
          onClickCapture={handleContentClickCapture}
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
      </div>
    </li>
  );
}

export { SortableItineraryCard, type SortableItineraryCardProps };
