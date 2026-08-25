import Image from "next/image";
import { MapPinIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { NearbyCourse } from "@/features/festivals/festival-detail-model";

type NearbyCourseListProps = {
  courses: readonly NearbyCourse[];
};

function NearbyCourseList({ courses }: NearbyCourseListProps) {
  return (
    <section aria-labelledby="nearby-course-list-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="nearby-course-list-title" className="type-title-md text-foreground">
          주변 추천 코스
        </h2>
        <details className="relative">
          <summary
            className="type-label flex min-h-11 cursor-pointer list-none items-center px-2 text-primary"
          aria-label="주변 코스 전체보기"
          >
            전체보기
          </summary>
          <p
            role="status"
            className="type-caption absolute top-11 right-0 z-10 w-52 rounded-md bg-card p-2 text-primary shadow-card"
          >
            주변 코스 전체보기는 준비 중인 기능이에요
          </p>
        </details>
      </div>
      <ul
        aria-label="주변 추천 코스"
        className="scrollbar-none mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1"
      >
        {courses.map((course) => (
          <li key={course.id} className="w-64 shrink-0 snap-start">
            <Card className="h-full gap-0 py-0">
              <CardContent className="flex items-center gap-3 py-3">
                <div className="relative size-[72px] shrink-0 overflow-hidden rounded-lg bg-primary-subtle">
                  <Image
                    src={course.image.src}
                    alt={course.image.alt}
                    fill
                    sizes="72px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="type-label truncate text-foreground">
                    {course.title}
                  </h3>
                  <p className="type-caption mt-1 text-muted-foreground">
                    {course.category}
                  </p>
                  <p className="type-caption mt-1 flex items-center gap-1 text-muted-foreground">
                    <MapPinIcon aria-hidden="true" className="size-3.5 shrink-0" />
                    {course.distanceLabel}
                  </p>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

export { NearbyCourseList, type NearbyCourseListProps };
