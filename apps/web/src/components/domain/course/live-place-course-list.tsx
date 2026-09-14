import { MapPinnedIcon, RouteIcon, TimerIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { PlaceCourseItem } from "@haetteum/contracts";

import { buildPlaceDetailHref } from "@/features/places/place-detail-model";
import { resolveOfficialImageSource } from "@/lib/official-image";

type LivePlaceCourseListProps = {
  placeId: string;
  items: readonly PlaceCourseItem[];
};

function CourseMeta({ course }: { course: PlaceCourseItem }) {
  const meta = [
    course.takeTime ? { icon: TimerIcon, text: course.takeTime } : null,
    course.distance ? { icon: RouteIcon, text: course.distance } : null,
    course.theme ? { icon: MapPinnedIcon, text: course.theme } : null,
  ].filter((entry): entry is { icon: typeof TimerIcon; text: string } =>
    entry !== null,
  );

  if (meta.length === 0) return null;

  return (
    <p className="type-caption mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
      {meta.map(({ icon: Icon, text }) => (
        <span key={text} className="inline-flex items-center gap-1">
          <Icon className="size-3.5" aria-hidden="true" />
          {text}
        </span>
      ))}
    </p>
  );
}

/**
 * TourAPI 여행코스는 하루짜리 단일 동선이며 경유지별 이동거리를 주지 않는다.
 * 그래서 목업의 일자별 코스 UI 대신 코스 총 정보 + 순번 타임라인으로 보여준다.
 */
function LivePlaceCourseList({ placeId, items }: LivePlaceCourseListProps) {
  return (
    <div className="space-y-3 px-3 py-4">
      <p className="type-caption px-1 text-muted-foreground">
        한국관광공사가 추천한 여행코스 중 이 관광지를 지나는 코스예요.
      </p>
      {items.map((course) => (
        <section
          key={course.id}
          aria-labelledby={`course-${course.id}-title`}
          className="overflow-hidden rounded-2xl border border-border bg-card"
        >
          {course.imageUrl ? (
            <div className="relative aspect-[16/9] w-full bg-secondary">
              <Image
                src={resolveOfficialImageSource(course.imageUrl)}
                alt=""
                fill
                sizes="(max-width: 30rem) 100vw, 30rem"
                className="object-cover"
              />
            </div>
          ) : null}

          <header className="px-4 pt-4">
            <h2
              id={`course-${course.id}-title`}
              className="type-title-md text-foreground"
            >
              {course.title}
            </h2>
            <CourseMeta course={course} />
            {course.overview ? (
              <p className="type-body-md mt-3 leading-6 text-muted-foreground">
                {course.overview}
              </p>
            ) : null}
          </header>

          {course.stops.length > 0 ? (
            <ol
              aria-label={`${course.title} 경유지`}
              className="mt-4 px-4 pb-4"
            >
              {course.stops.map((stop, index) => {
                const last = index === course.stops.length - 1;
                const title =
                  stop.placeId === null || stop.placeId === placeId ? (
                    <span className="type-label text-foreground">
                      {stop.title}
                    </span>
                  ) : (
                    <Link
                      href={buildPlaceDetailHref(stop.placeId)}
                      className="type-label text-foreground underline-offset-4 hover:underline"
                    >
                      {stop.title}
                    </Link>
                  );

                return (
                  <li
                    key={`${course.id}-${stop.sequence}`}
                    className="relative grid grid-cols-[1.75rem_3rem_minmax(0,1fr)] gap-3 pb-3 last:pb-0"
                  >
                    {!last ? (
                      <span
                        className="absolute top-7 bottom-0 left-[0.8125rem] w-px bg-primary/25"
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="type-caption relative z-10 mt-1 flex size-7 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground">
                      {stop.sequence}
                    </span>
                    <div className="relative mt-1 size-12 overflow-hidden rounded-lg bg-secondary">
                      <Image
                        src={resolveOfficialImageSource(stop.imageUrl)}
                        alt=""
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 pt-1">
                      {stop.placeId === placeId ? (
                        <span className="type-caption mb-1 inline-block rounded-full bg-primary-subtle px-2 py-0.5 font-semibold text-primary">
                          지금 보는 곳
                        </span>
                      ) : null}
                      <div>{title}</div>
                      {stop.overview ? (
                        <p className="type-caption mt-1 line-clamp-2 text-muted-foreground">
                          {stop.overview}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : null}
        </section>
      ))}
    </div>
  );
}

export { LivePlaceCourseList, type LivePlaceCourseListProps };
