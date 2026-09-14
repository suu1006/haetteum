"use client";

import { useState } from "react";
import { Menu } from "@/components/ui/menu/menu";
import { TbDotsVertical } from "react-icons/tb";

import type { SavedCourseItem } from "@haetteum/contracts";

import { GeneratedCourseStopList } from "@/features/courses/components/generated-course-stop-list";
import { SavedCourseRouteMap } from "@/components/domain/course/saved-course-route-map";

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
          aria-label={
            expanded ? `${course.title} 접기` : `${course.title} 펼치기`
          }
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
            className="size-9"
          >
            <TbDotsVertical
              aria-hidden="true"
              className="size-5"
              strokeWidth={1.7}
            />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner
              side="bottom"
              align="end"
              sideOffset={4}
              className="isolate z-50"
            >
              <Menu.Popup className="min-w-28">
                <Menu.Item
                  onClick={() => onEdit(course.id)}
                  className="focus:text-accent-foreground"
                >
                  수정
                </Menu.Item>
                <Menu.Item
                  onClick={() => onRemove(course.id)}
                  disabled={removing}
                  className="text-destructive data-disabled:pointer-events-none data-disabled:opacity-50"
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
