import type { CSSProperties } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { FestivalDetailActions } from "@/components/travel/festival-detail-actions";
import { FestivalDetailHeader } from "@/components/travel/festival-detail-header";
import { FestivalGallery } from "@/components/travel/festival-gallery";
import { FestivalIntroduction } from "@/components/travel/festival-introduction";
import { FestivalSummary } from "@/components/travel/festival-summary";
import type { FestivalDetailView } from "@/features/festivals/festival-detail-model";
import { cn } from "@/lib/utils";

type FestivalDetailScreenProps = {
  festival: FestivalDetailView;
};

const detailStyle = {
  "--festival-detail-action-height": "5.25rem",
  "--festival-detail-action-reserve":
    "calc(var(--festival-detail-action-height) + var(--safe-area-bottom) + 24px)",
} as CSSProperties;

function FestivalDetailScreen({ festival }: FestivalDetailScreenProps) {
  const hasBottomActions = Boolean(festival.homepage || festival.mapUrl);

  return (
    <main
      className={cn(
        "min-h-screen max-w-[30rem] mx-auto bg-background",
        hasBottomActions
          ? "pb-[var(--festival-detail-action-reserve)]"
          : "sticky-safe-area-bottom",
      )}
      style={hasBottomActions ? detailStyle : undefined}
    >
      <div data-detail-region="header" className="sticky top-0 z-40">
        <FestivalDetailHeader title={festival.title} />
      </div>
      <div data-detail-region="gallery">
        <FestivalGallery gallery={festival.gallery} />
      </div>
      <div className="space-y-4 px-4 pt-5">
        <div data-detail-region="summary">
          <FestivalSummary festival={festival} />
        </div>

        {festival.overview ? (
          <Card data-detail-region="introduction" className="gap-0 py-4">
            <CardContent>
              <FestivalIntroduction introduction={festival.overview} />
            </CardContent>
          </Card>
        ) : null}

        {festival.eventInfo.length > 0 ? (
          <Card data-detail-region="event-info" className="gap-0 py-4">
            <CardContent>
              <h2 className="type-title-md text-foreground">행사 정보</h2>
              <dl className="mt-3 space-y-2.5">
                {festival.eventInfo.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <dt className="type-caption w-16 shrink-0 text-muted-foreground">
                      {item.label}
                    </dt>
                    <dd className="type-body-sm min-w-0 flex-1 whitespace-pre-line text-foreground">
                      {item.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        ) : null}

        {festival.program ? (
          <Card data-detail-region="program" className="gap-0 py-4">
            <CardContent>
              <FestivalIntroduction
                title="프로그램"
                introduction={festival.program}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
      <div data-detail-region="actions">
        <FestivalDetailActions
          homepage={festival.homepage}
          mapUrl={festival.mapUrl}
        />
      </div>
    </main>
  );
}

export { FestivalDetailScreen, type FestivalDetailScreenProps };
