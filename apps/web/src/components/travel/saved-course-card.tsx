"use client";

import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { TbDotsVertical } from "react-icons/tb";

import type { SavedCourseItem } from "@haetteum/contracts";

import { GeneratedCourseStopList } from "@/components/patterns/generated-course-stop-list";
import { SavedCourseRouteMap } from "@/components/travel/saved-course-route-map";

type SavedCourseCardProps = {
  course: SavedCourseItem;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  removing?: boolean;
};

function formatSavedDate(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}.${month}.${day} 저장`;
}

function SavedCourseCard({
  course,
  onRemove,
  onEdit,
  removing = false,
}: SavedCourseCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className="rounded-[1.15rem] bg-card p-4 shadow-[0_4px_18px_oklch(0.2146_0.0099_276.58/0.07)]">
      <div className="flex items-start justify-between gap-3">
        <div
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-label={expanded ? `${course.title} 접기` : `${course.title} 펼치기`}
          onClick={() => setExpanded((current) => !current)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            setExpanded((current) => !current);
          }}
          className="min-w-0 flex-1 cursor-pointer rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
        >
          <h3 className="truncate text-[1.05rem] font-bold leading-6 tracking-[-0.02em] text-foreground">
            {course.title}
          </h3>
          <p className="mt-1 text-[0.82rem] text-muted-foreground">
            {formatSavedDate(course.savedAt)} · 경유지 {course.stops.length}곳
          </p>
        </div>
        <Menu.Root>
          <Menu.Trigger
            aria-label={`${course.title} 더보기`}
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/25"
          >
            <TbDotsVertical aria-hidden="true" className="size-5" strokeWidth={1.7} />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner side="bottom" align="end" sideOffset={4} className="isolate z-50">
              <Menu.Popup className="min-w-28 origin-(--transform-origin) rounded-2xl bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
                <Menu.Item
                  onClick={() => onEdit(course.id)}
                  className="flex min-h-9 cursor-default items-center rounded-xl px-3 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground"
                >
                  수정
                </Menu.Item>
                <Menu.Item
                  onClick={() => onRemove(course.id)}
                  disabled={removing}
                  className="flex min-h-9 cursor-default items-center rounded-xl px-3 text-sm text-destructive outline-hidden select-none focus:bg-accent data-disabled:pointer-events-none data-disabled:opacity-50"
                >
                  삭제
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>
      {expanded ? (
        <div className="mt-3">
          <SavedCourseRouteMap stops={course.stops} />
          <GeneratedCourseStopList stops={course.stops} anchorLabel="출발지" />
        </div>
      ) : null}
    </article>
  );
}

export { SavedCourseCard, type SavedCourseCardProps };
