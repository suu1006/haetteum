import type { CSSProperties } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { FestivalDetailActions } from "@/components/travel/festival-detail-actions";
import { FestivalDetailHeader } from "@/components/travel/festival-detail-header";
import { FestivalGallery } from "@/components/travel/festival-gallery";
import { FestivalIntroduction } from "@/components/travel/festival-introduction";
import { FestivalProgramGrid } from "@/components/travel/festival-program-grid";
import { FestivalRecommendationPoints } from "@/components/travel/festival-recommendation-points";
import { FestivalSummary } from "@/components/travel/festival-summary";
import { NearbyCourseList } from "@/components/travel/nearby-course-list";
import type { FestivalDetail } from "@/features/festivals/festival-detail-model";

type FestivalDetailScreenProps = {
  festival: FestivalDetail;
};

const detailStyle = {
  "--festival-detail-action-height": "5.25rem",
  "--festival-detail-action-reserve":
    "calc(var(--festival-detail-action-height) + var(--safe-area-bottom) + 24px)",
} as CSSProperties;

function FestivalDetailScreen({ festival }: FestivalDetailScreenProps) {
  return (
    <main
      className="min-h-screen max-w-[30rem] mx-auto bg-background pb-[var(--festival-detail-action-reserve)]"
      style={detailStyle}
    >
      <div data-detail-region="header">
        <FestivalDetailHeader title={festival.title} />
      </div>
      <div data-detail-region="gallery">
        <FestivalGallery gallery={festival.gallery} />
      </div>
      <div className="space-y-4 px-4 pt-5">
        <div data-detail-region="summary">
          <FestivalSummary festival={festival} />
        </div>
        <Card data-detail-region="introduction" className="gap-0 py-4">
          <CardContent>
            <FestivalIntroduction introduction={festival.introduction} />
          </CardContent>
        </Card>
        {festival.programs.length > 0 ? (
          <Card data-detail-region="programs" className="gap-0 py-4">
            <CardContent>
              <FestivalProgramGrid programs={festival.programs} />
            </CardContent>
          </Card>
        ) : null}
        {festival.recommendationPoints.length > 0 ? (
          <Card data-detail-region="points" className="gap-0 py-4">
            <CardContent>
              <FestivalRecommendationPoints
                points={festival.recommendationPoints}
              />
            </CardContent>
          </Card>
        ) : null}
        {festival.nearbyCourses.length > 0 ? (
          <Card data-detail-region="nearby" className="gap-0 py-4">
            <CardContent>
              <NearbyCourseList courses={festival.nearbyCourses} />
            </CardContent>
          </Card>
        ) : null}
      </div>
      <div data-detail-region="actions">
        <FestivalDetailActions />
      </div>
    </main>
  );
}

export { FestivalDetailScreen, type FestivalDetailScreenProps };
