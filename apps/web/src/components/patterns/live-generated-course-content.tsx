"use client";

import { useQuery } from "@tanstack/react-query";

import type { GeneratedCourseStopRole } from "@haetteum/contracts";

import { generatedCourseQueryOptions } from "@/features/places/place-generated-course-query";

const ROLE_LABELS: Record<GeneratedCourseStopRole, string> = {
  anchor: "지금 보는 곳",
  attraction: "명소",
  cafe: "카페",
  restaurant: "맛집",
};

function LiveGeneratedCourseContent({ placeId }: { placeId: string }) {
  const { data } = useQuery(generatedCourseQueryOptions(placeId));

  // 서버가 채운 캐시가 하이드레이션되기 전까지는 아직 데이터가 없다.
  if (data == null) return null;
  // 좌표가 없거나 카카오를 못 부르면 조용히 숨긴다 — 아래 큐레이션 코스 목록이 대신 안내한다.
  if (data.status !== "ready") return null;

  return (
    <section
      aria-label="가까운 코스로 둘러보기"
      className="mx-3 mt-4 overflow-hidden rounded-2xl border border-border bg-card"
    >
      <header className="px-4 pt-4">
        <h2 className="type-title-md text-foreground">
          가까운 코스로 둘러보기
        </h2>
        <p className="type-caption mt-1 text-muted-foreground">
          가까운 명소·카페·맛집을 순서대로 묶어봤어요.
        </p>
      </header>
      <ol aria-label="추천 코스 경유지" className="mt-4 px-4 pb-4">
        {data.stops.map((stop, index) => {
          const last = index === data.stops.length - 1;
          return (
            <li
              key={`${stop.role}-${stop.sequence}`}
              className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3 pb-3 last:pb-0"
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
              <div className="min-w-0 pt-1">
                <span className="type-caption mb-1 inline-block rounded-full bg-primary-subtle px-2 py-0.5 font-semibold text-primary">
                  {ROLE_LABELS[stop.role]}
                </span>
                <div>
                  {stop.placeUrl ? (
                    <a
                      href={stop.placeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="type-label text-foreground underline-offset-4 hover:underline"
                    >
                      {stop.title}
                    </a>
                  ) : (
                    <span className="type-label text-foreground">
                      {stop.title}
                    </span>
                  )}
                </div>
                {stop.address ? (
                  <p className="type-caption mt-1 text-muted-foreground">
                    {stop.address}
                  </p>
                ) : null}
                {stop.distanceMeters != null && stop.distanceMeters > 0 ? (
                  <p className="type-caption text-muted-foreground">
                    직선거리 {stop.distanceMeters.toLocaleString("ko-KR")}m
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      {data.partial ? (
        <p className="type-caption px-4 pb-4 text-muted-foreground">
          일부 장소는 찾지 못했어요.
        </p>
      ) : null}
    </section>
  );
}

export { LiveGeneratedCourseContent };
