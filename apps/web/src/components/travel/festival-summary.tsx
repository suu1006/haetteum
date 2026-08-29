import { CalendarDaysIcon, MapPinIcon, PhoneIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { FestivalDetailView } from "@/features/festivals/festival-detail-model";

type FestivalSummaryProps = {
  festival: FestivalDetailView;
};

function FestivalSummary({ festival }: FestivalSummaryProps) {
  return (
    <section
      aria-labelledby={`${festival.id}-summary-title`}
      className="space-y-4"
    >
      <h1
        id={`${festival.id}-summary-title`}
        className="type-title-lg break-keep text-foreground"
      >
        {festival.title}
      </h1>

      <div className="flex flex-wrap items-center gap-2">
        <Badge>{festival.statusLabel}</Badge>
        <Badge variant="outline" className="font-normal">
          {festival.categoryLabel}
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        <p className="type-body-md flex items-center gap-2 text-muted-foreground">
          <CalendarDaysIcon aria-hidden="true" className="size-4 shrink-0" />
          {festival.dateLabel}
        </p>
        <p className="type-body-md flex items-center gap-2 text-muted-foreground">
          <MapPinIcon aria-hidden="true" className="size-4 shrink-0" />
          {festival.location}
        </p>
        {festival.telephone ? (
          <p className="type-body-md flex items-center gap-2 text-muted-foreground">
            <PhoneIcon aria-hidden="true" className="size-4 shrink-0" />
            <a
              href={`tel:${festival.telephone.replace(/\s+/g, "")}`}
              className="underline-offset-4 hover:underline"
            >
              {festival.telephone}
            </a>
          </p>
        ) : null}
      </div>
    </section>
  );
}

export { FestivalSummary, type FestivalSummaryProps };
