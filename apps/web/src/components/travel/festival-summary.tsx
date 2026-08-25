import {
  CalendarDaysIcon,
  MapPinIcon,
  StarIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { FestivalDetail } from "@/features/festivals/festival-detail-model";

type FestivalSummaryProps = {
  festival: FestivalDetail;
};

function FestivalSummary({ festival }: FestivalSummaryProps) {
  const statusLabel = festival.status === "ongoing" ? "진행 중" : "예정";
  const reviewCount = new Intl.NumberFormat("ko-KR").format(
    festival.reviewCount,
  );

  return (
    <section aria-labelledby={`${festival.id}-summary-title`} className="space-y-4">
      <h1
        id={`${festival.id}-summary-title`}
        className="type-title-lg break-keep text-foreground"
      >
        {festival.title}
      </h1>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <p className="type-body-md flex items-center gap-2 text-muted-foreground">
          <CalendarDaysIcon aria-hidden="true" className="size-4 shrink-0" />
          {festival.dateLabel}
        </p>
        <p className="type-body-md flex items-center gap-2 text-muted-foreground">
          <MapPinIcon aria-hidden="true" className="size-4 shrink-0" />
          {festival.location}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="type-body-md flex items-center gap-1.5 text-foreground">
          <StarIcon
            aria-hidden="true"
            className="size-4 fill-primary text-primary"
          />
          <span className="font-semibold">{festival.rating.toFixed(1)}</span>
          <span className="text-muted-foreground">후기 {reviewCount}개</span>
        </p>
        <Badge>{statusLabel}</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {festival.tags.map((tag) => (
          <Badge key={tag} variant="outline" className="font-normal">
            {tag}
          </Badge>
        ))}
      </div>
    </section>
  );
}

export { FestivalSummary, type FestivalSummaryProps };
