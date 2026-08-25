import {
  Clock3Icon,
  RouteIcon,
  SparklesIcon,
  WalletCardsIcon,
} from "lucide-react";

import { CourseRouteMap } from "@/components/travel/course-route-map";
import { Card } from "@/components/ui/card";
import type { SavedCourseFixture } from "@/features/courses/saved-course-model";

type SavedCourseSummaryCardProps = {
  course: SavedCourseFixture;
};

const summaryItems = [
  { key: "duration", label: "총 소요시간", Icon: Clock3Icon },
  { key: "distance", label: "총 이동거리", Icon: RouteIcon },
  { key: "cost", label: "예상 비용", Icon: WalletCardsIcon },
] as const;

function SavedCourseSummaryCard({ course }: SavedCourseSummaryCardProps) {
  const values = {
    duration: course.totalDurationLabel,
    distance: course.totalDistanceLabel,
    cost: course.estimatedCostLabel,
  } as const;

  return (
    <Card className="gap-0 overflow-hidden p-3 sm:p-4">
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-2 min-[360px]:grid-cols-[7rem_minmax(0,1fr)] min-[360px]:gap-3 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
        <CourseRouteMap
          image={course.mapImage}
          compact
          showCurrentLocation={false}
        />
        <div className="min-w-0 self-center">
          <div className="flex min-w-0 items-start gap-2">
            <h2 className="type-label min-w-0 flex-1 break-keep text-foreground">
              {course.title}
            </h2>
            <span className="type-caption inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-subtle px-2 py-1 font-semibold text-primary">
              <SparklesIcon className="size-3.5" aria-hidden="true" />
              {course.recommendationLabel}
            </span>
          </div>

          <dl className="mt-3 grid grid-cols-3 border-t border-border pt-3">
            {summaryItems.map(({ key, label, Icon }, index) => (
              <div
                key={key}
                className={index === 0 ? "pr-1" : "border-l border-border px-1"}
              >
                <dt className="flex items-center gap-0.5 text-[0.625rem] leading-4 text-muted-foreground">
                  <Icon className="size-3 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">{label}</span>
                </dt>
                <dd className="mt-1 text-[0.6875rem] leading-4 font-semibold break-keep text-foreground sm:text-xs">
                  {values[key]}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Card>
  );
}

export { SavedCourseSummaryCard, type SavedCourseSummaryCardProps };
