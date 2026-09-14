import { Clock3Icon, MapPinIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type ItineraryStatus = "upcoming" | "current" | "completed";

type ItineraryItemProps = {
  order: number;
  time: string;
  title: string;
  location: string;
  status: ItineraryStatus;
  travelDuration?: string;
  isLast?: boolean;
};

const statusDetails: Record<
  ItineraryStatus,
  { label: string; markerClassName: string; badgeClassName: string }
> = {
  upcoming: {
    label: "예정",
    markerClassName: "border-primary/20 bg-primary-subtle text-primary",
    badgeClassName: "bg-primary-subtle text-primary",
  },
  current: {
    label: "현재 일정",
    markerClassName: "border-current-location bg-current-location text-white",
    badgeClassName: "bg-current-location/10 text-current-location",
  },
  completed: {
    label: "완료",
    markerClassName: "border-border bg-secondary text-muted-foreground",
    badgeClassName: "bg-secondary text-muted-foreground",
  },
};

function ItineraryItem({
  order,
  time,
  title,
  location,
  status,
  travelDuration,
  isLast = false,
}: ItineraryItemProps) {
  const details = statusDetails[status];

  return (
    <li
      data-status={status}
      className="relative grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0"
    >
      <div className="relative flex justify-center">
        <span
          className={cn(
            "type-label z-10 flex size-11 items-center justify-center rounded-full border",
            details.markerClassName,
          )}
          aria-label={`${order}번째 일정`}
        >
          {order}
        </span>
        {!isLast ? (
          <span
            className="absolute top-11 bottom-[-1.25rem] left-1/2 w-0.5 -translate-x-1/2 bg-route-line/20"
            aria-hidden="true"
          />
        ) : null}
      </div>

      <div className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-card">
        <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
          <time className="type-label text-primary">{time}</time>
          <span
            className={cn(
              "type-caption rounded-full px-2.5 py-1 font-semibold",
              details.badgeClassName,
            )}
          >
            {details.label}
          </span>
        </div>
        <h3 className="type-title-md break-words">{title}</h3>
        <p className="type-body-md mt-1 flex min-w-0 items-start gap-1.5 text-muted-foreground">
          <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{location}</span>
        </p>
        {travelDuration ? (
          <p className="type-caption mt-3 flex items-center gap-1.5 text-muted-foreground">
            <Clock3Icon className="size-4 shrink-0" aria-hidden="true" />
            다음 장소까지 {travelDuration}
          </p>
        ) : null}
      </div>
    </li>
  );
}

export { ItineraryItem, type ItineraryItemProps, type ItineraryStatus };
