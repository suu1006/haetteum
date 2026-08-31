"use client";

import { useQuery } from "@tanstack/react-query";

import { generatedCourseQueryOptions } from "@/features/places/place-generated-course-query";

import { GeneratedCourseStopList } from "./generated-course-stop-list";
import { LiveGeneratedCourseMap } from "./live-generated-course-map";

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
      <LiveGeneratedCourseMap stops={data.stops} />
      <div className="mt-4 px-4 pb-4">
        <GeneratedCourseStopList stops={data.stops} />
      </div>
      {data.partial ? (
        <p className="type-caption px-4 pb-4 text-muted-foreground">
          일부 장소는 찾지 못했어요.
        </p>
      ) : null}
    </section>
  );
}

export { LiveGeneratedCourseContent };
