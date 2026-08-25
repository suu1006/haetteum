import Image from "next/image";
import { MapPinIcon } from "lucide-react";

import type { FestivalDiscoveryListItem as FestivalDiscoveryListItemData } from "@/features/discovery/discovery-model";
import { cn } from "@/lib/utils";

type FestivalDiscoveryListItemProps = {
  festival: FestivalDiscoveryListItemData;
};

const seoulDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function getSeoulCalendarDate(now: Date) {
  const dateParts = seoulDateFormatter.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    dateParts.find((datePart) => datePart.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function isFestivalEnded(endDate: string, now = new Date()) {
  return getSeoulCalendarDate(now) > endDate;
}

function FestivalDiscoveryListItem({
  festival,
}: FestivalDiscoveryListItemProps) {
  const ended = isFestivalEnded(festival.endDate);

  return (
    <article
      aria-label={festival.title}
      className="h-full overflow-hidden rounded-xl border border-border/70 bg-card shadow-card"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-primary-subtle">
        <Image
          src={festival.image.src}
          alt={festival.image.alt}
          fill
          sizes="(max-width: 480px) calc((100vw - 3.5rem) / 2), 210px"
          className="object-cover"
        />
        <span
          className={cn(
            "absolute top-2 left-2 rounded-md px-2.5 py-1 text-[0.65rem] leading-4 font-semibold shadow-sm",
            ended
              ? "bg-foreground/72 text-background"
              : "bg-primary text-primary-foreground",
          )}
        >
          {ended ? "종료" : "진행중"}
        </span>
      </div>

      <div className="flex min-w-0 flex-col px-3 py-2.5">
        <h3 className="line-clamp-2 text-[0.82rem] leading-[1.15rem] font-semibold tracking-[-0.025em] text-foreground">
          {festival.title}
        </h3>
        <p className="mt-2 text-[0.65rem] leading-4 tracking-[-0.025em] whitespace-nowrap text-muted-foreground">
          {festival.dateLabel}
        </p>
        <p className="mt-1 flex min-w-0 items-center gap-1 text-[0.68rem] leading-4 text-muted-foreground">
          <MapPinIcon aria-hidden="true" className="size-3 shrink-0" />
          <span className="truncate">{festival.location}</span>
        </p>
      </div>
    </article>
  );
}

export {
  FestivalDiscoveryListItem,
  type FestivalDiscoveryListItemProps,
};
