"use client";

import { useQuery } from "@tanstack/react-query";

import { LivePlaceCourseList } from "@/components/travel/live-place-course-list";
import { LoadFailureNotice } from "@/components/travel/load-failure-notice";
import { placeCoursesQueryOptions } from "@/features/places/place-course-query";

function EmptyCourseNotice() {
  return (
    <section className="px-4 py-16 text-center">
      <h2 className="type-title-md text-foreground">
        아직 등록된 추천 코스가 없어요
      </h2>
      <p className="type-body-md mt-2 text-muted-foreground">
        이 관광지를 지나는 한국관광공사 여행코스가 아직 없어요.
      </p>
    </section>
  );
}

function LiveCourseContent({ placeId }: { placeId: string }) {
  const { data } = useQuery(placeCoursesQueryOptions(placeId));

  // 서버가 채운 캐시가 하이드레이션되기 전까지는 아직 데이터가 없다.
  if (data == null) return null;
  if (data.status !== "ready") return <LoadFailureNotice label="추천 코스" />;
  if (data.data.items.length === 0) return <EmptyCourseNotice />;
  return <LivePlaceCourseList placeId={placeId} items={data.data.items} />;
}

export { LiveCourseContent };
