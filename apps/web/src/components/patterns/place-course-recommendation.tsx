import { SparklesIcon } from "lucide-react";
import Link from "next/link";

import { CourseDayTabs } from "@/components/travel/course-day-tabs";
import { CourseRouteMap } from "@/components/travel/course-route-map";
import { CourseTimeline } from "@/components/travel/course-timeline";
import { buttonVariants } from "@/components/ui/button";
import type { PlaceCourseDetail } from "@/features/places/place-detail-model";

type PlaceCourseRecommendationProps = {
  course: PlaceCourseDetail["course"];
};

function PlaceCourseRecommendation({ course }: PlaceCourseRecommendationProps) {
  const day = course.days[0];

  if (!day) return null;

  return (
    <section aria-labelledby={`${day.id}-course-title`} className="bg-background">
      <div className="bg-card px-4 pt-4 pb-3">
        <CourseDayTabs days={course.days} daySlotCount={course.daySlotCount} />
      </div>

      <header className="border-y border-border bg-card px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <h2 id={`${day.id}-course-title`} className="type-title-md text-foreground">
            {day.title}
          </h2>
          <span className="type-caption inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full border border-primary/15 bg-primary-subtle px-3 font-semibold text-primary">
            <SparklesIcon className="size-3.5" aria-hidden="true" />
            {course.optimizationLabel}
          </span>
        </div>
        <p className="type-caption mt-1.5 text-muted-foreground">
          {day.totalDurationLabel}
          <span className="mx-2 text-border" aria-hidden="true">|</span>
          {day.totalDistanceLabel}
        </p>
      </header>

      <CourseRouteMap image={day.mapImage} />

      <div className="relative -mt-3 rounded-t-2xl bg-card px-4 pt-5 pb-3 shadow-[0_-6px_18px_oklch(0.2146_0.0099_276.58/0.08)]">
        <CourseTimeline day={day} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[30rem] border-t border-border bg-card/95 px-4 pt-3 pb-[calc(0.75rem+var(--safe-area-bottom))] backdrop-blur-md">
        <Link
          href="/courses/icheon-day-trip/edit"
          className={buttonVariants({
            className: "h-14 w-full text-base",
          })}
        >
          코스 수정하기
        </Link>
      </div>
    </section>
  );
}

export {
  PlaceCourseRecommendation,
  type PlaceCourseRecommendationProps,
};
