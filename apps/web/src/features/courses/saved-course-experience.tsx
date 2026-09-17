"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SavedCourseItem } from "@haetteum/contracts";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button/button";
import { SavedCourseRouteMap } from "@/components/domain/course/saved-course-route-map";
import { GeneratedCourseStopList } from "@/features/courses/components/generated-course-stop-list";

type SavedCourseExperienceProps = { course: SavedCourseItem };

function SavedCourseExperience({ course }: SavedCourseExperienceProps) {
  const router = useRouter();
  const stops = [...course.stops].sort((a, b) => a.sequence - b.sequence);
  return (
    <main className="mx-auto min-h-screen w-full max-w-[30rem] bg-background pb-[calc(6rem+var(--safe-area-bottom))]">
      <header className="safe-area-top flex items-center gap-3 px-4 py-4">
        <Button variant="ghost" size="icon" aria-label="뒤로가기" onClick={() => router.back()}>
          <ArrowLeftIcon aria-hidden="true" className="size-5" />
        </Button>
        <h1 className="type-title-md">{course.title}</h1>
      </header>
      <section aria-label="저장된 코스 요약" className="space-y-4 px-4">
        <p className="type-body-md text-muted-foreground">
          <time dateTime={course.savedAt}>{new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" }).format(new Date(course.savedAt))}</time> 저장 · 경유지 {stops.length}곳
        </p>
        {stops.length > 0 ? <SavedCourseRouteMap stops={stops} /> : null}
      </section>
      <section aria-label="저장된 경유지" className="px-4 pt-6">
        {stops.length > 0 ? <GeneratedCourseStopList stops={stops} anchorLabel="기준 장소" /> : <p className="type-body-md text-muted-foreground">저장된 장소가 없어요. 일정을 수정해 장소를 추가해 주세요.</p>}
      </section>
      <footer className="safe-area-bottom fixed inset-x-0 bottom-0 mx-auto flex max-w-[30rem] gap-3 border-t border-border bg-card px-4 py-4">
        <Link href="/trips" className="type-label flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border">내 일정</Link>
        <Link href={`/courses/${course.id}/edit`} className="type-label flex min-h-11 flex-1 items-center justify-center rounded-lg bg-primary text-primary-foreground">일정 수정</Link>
      </footer>
    </main>
  );
}

export { SavedCourseExperience, type SavedCourseExperienceProps };
