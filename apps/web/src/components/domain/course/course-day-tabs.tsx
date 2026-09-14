import { PlusIcon } from "lucide-react";

import type { PlaceCourseDay } from "@/features/places/place-detail-model";

type CourseDayTabsProps = {
  days: readonly PlaceCourseDay[];
  daySlotCount: number;
};

function CourseDayTabs({ days, daySlotCount }: CourseDayTabsProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 items-center gap-2" role="tablist" aria-label="코스 일차 선택">
        {Array.from({ length: daySlotCount }, (_, index) => {
          const day = days[index];
          const selected = index === 0;

          return (
            <button
              key={day?.id ?? `day-slot-${index + 1}`}
              type="button"
              role="tab"
              aria-selected={selected}
              disabled={!day || !selected}
              className="type-label min-h-11 flex-1 rounded-full border border-transparent bg-secondary px-3 text-muted-foreground transition-colors enabled:outline-none enabled:hover:border-primary/15 enabled:hover:text-primary enabled:focus-visible:ring-3 enabled:focus-visible:ring-ring/25 disabled:cursor-default disabled:opacity-100 aria-selected:bg-primary aria-selected:text-primary-foreground"
            >
              {day?.label ?? `${index + 1}일차`}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="여행 일차 추가"
        disabled
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground disabled:cursor-default disabled:opacity-100"
      >
        <PlusIcon className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

export { CourseDayTabs, type CourseDayTabsProps };
