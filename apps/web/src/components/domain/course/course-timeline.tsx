import { Clock3Icon } from "lucide-react";
import Image from "next/image";

import type {
  PlaceCourseDay,
  PlaceCourseStop,
} from "@/features/places/place-detail-model";
import { cn } from "@/lib/utils";

type CourseTimelineProps = {
  day: PlaceCourseDay;
};

type CourseStopItemProps = {
  stop: PlaceCourseStop;
  last: boolean;
};

function CourseStopItem({ stop, last }: CourseStopItemProps) {
  return (
    <li className="relative grid min-h-20 grid-cols-[1.75rem_3rem_minmax(0,1fr)] gap-3 pb-2 last:pb-0">
      {!last ? (
        <span
          className="absolute top-6 bottom-0 left-[0.8125rem] w-px bg-primary/25"
          aria-hidden="true"
        />
      ) : null}
      <span className="type-caption relative z-10 mt-1 flex size-7 items-center justify-center rounded-full border-3 border-card bg-primary font-bold text-primary-foreground shadow-card">
        {stop.sequence}
      </span>
      <div className="relative mt-1 size-12 overflow-hidden rounded-lg bg-secondary">
        <Image
          src={stop.image.src}
          alt={stop.image.alt}
          fill
          sizes="48px"
          className="object-cover"
        />
      </div>
      <div className={cn("min-w-0 pb-2", !last && "border-b border-border")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {stop.periodLabel ? (
                <span className="type-caption rounded-full bg-primary-subtle px-2 py-0.5 font-semibold text-primary">
                  {stop.periodLabel}
                </span>
              ) : null}
              <h3 className="type-label truncate text-foreground">{stop.title}</h3>
            </div>
            <p className="type-caption mt-1 text-muted-foreground">
              {stop.categoryLabel}
            </p>
          </div>
          <p className="type-caption shrink-0 whitespace-nowrap text-muted-foreground">
            {stop.distanceLabel} / {stop.travelTimeLabel}
          </p>
        </div>
        {stop.timeLabel ? (
          <p className="type-caption mt-1 inline-flex items-center gap-1 text-muted-foreground">
            <Clock3Icon className="size-3.5" aria-hidden="true" />
            {stop.timeLabel}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function CourseTimeline({ day }: CourseTimelineProps) {
  return (
    <ol aria-label={`${day.label} 여행 일정`} className="space-y-0">
      {day.stops.map((stop, index) => (
        <CourseStopItem
          key={stop.id}
          stop={stop}
          last={index === day.stops.length - 1}
        />
      ))}
    </ol>
  );
}

export { CourseTimeline, type CourseTimelineProps };
