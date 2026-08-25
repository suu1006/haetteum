"use client";

import {
  ArrowLeftIcon,
  BookmarkIcon,
  CheckIcon,
  InfoIcon,
  MoreHorizontalIcon,
  NavigationIcon,
  Share2Icon,
  SparkleIcon,
} from "lucide-react";

import { ConfirmedItineraryItem } from "@/components/travel/confirmed-itinerary-item";
import { SavedCourseSummaryCard } from "@/components/travel/saved-course-summary-card";
import { Button } from "@/components/ui/button";
import type {
  SavedCourseFixture,
  SavedCourseStop,
} from "@/features/courses/saved-course-model";
import { cn } from "@/lib/utils";

type SavedCourseScreenProps = {
  course: SavedCourseFixture;
  saved: boolean;
  started: boolean;
  status: string;
  onBack: () => void;
  onSavedChange: (saved: boolean) => void;
  onMore: () => void;
  onStopSelect: (stop: SavedCourseStop) => void;
  onShare: () => void;
  onStart: () => void;
};

function SavedCourseScreen({
  course,
  saved,
  started,
  status,
  onBack,
  onSavedChange,
  onMore,
  onStopSelect,
  onShare,
  onStart,
}: SavedCourseScreenProps) {
  return (
    <main className="mx-auto min-h-[100svh] w-full max-w-[30rem] bg-background pb-[calc(9.5rem+var(--safe-area-bottom))]">
      <header
        data-testid="saved-course-region"
        data-region="header"
        className="safe-area-top grid min-h-16 grid-cols-[2.75rem_minmax(0,1fr)_5.5rem_2.75rem] items-center px-3"
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="뒤로가기"
          onClick={onBack}
        >
          <ArrowLeftIcon className="size-5" aria-hidden="true" />
        </Button>
        <span aria-hidden="true" />
        <button
          type="button"
          aria-label={saved ? "일정 저장 해제" : "일정 다시 저장"}
          aria-pressed={saved}
          className="type-caption flex min-h-11 items-center justify-end gap-1.5 rounded-lg px-1 font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
          onClick={() => onSavedChange(!saved)}
        >
          <BookmarkIcon
            className={cn("size-5", saved && "fill-primary-subtle text-primary")}
            aria-hidden="true"
          />
          {saved ? "저장됨" : "저장"}
        </button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="더보기"
          onClick={onMore}
        >
          <MoreHorizontalIcon className="size-5" aria-hidden="true" />
        </Button>
      </header>

      <section
        data-testid="saved-course-region"
        data-region="success"
        className="px-5 pb-4 text-center"
      >
        <div className="relative mx-auto flex h-20 w-28 items-center justify-center" aria-hidden="true">
          <SparkleIcon className="absolute top-2 left-2 size-3 fill-theme-healing text-theme-healing" />
          <SparkleIcon className="absolute top-5 right-2 size-3 fill-rating text-rating" />
          <SparkleIcon className="absolute bottom-2 left-5 size-2.5 fill-current-location text-current-location" />
          <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-floating">
            <CheckIcon className="size-7 stroke-[2.75]" />
          </span>
        </div>
        <h1 className="type-title-md mt-1 break-keep text-foreground">
          여행 일정이 완성되었어요
        </h1>
        <p className="type-body-md mt-2 break-keep text-muted-foreground">
          {course.completionMessage}
        </p>
      </section>

      <section
        data-testid="saved-course-region"
        data-region="summary"
        aria-label="저장된 코스 요약"
        className="px-4"
      >
        <SavedCourseSummaryCard course={course} />
      </section>

      <section
        data-testid="saved-course-region"
        data-region="itinerary"
        aria-labelledby="confirmed-itinerary-title"
        className="px-4 pt-4"
      >
        <h2 id="confirmed-itinerary-title" className="type-title-md mb-3 text-foreground">
          확정된 일정
        </h2>
        <ol aria-label="확정된 여행 일정">
          {course.stops.map((stop, index) => (
            <ConfirmedItineraryItem
              key={stop.id}
              stop={stop}
              last={index === course.stops.length - 1}
              onSelect={onStopSelect}
            />
          ))}
        </ol>
      </section>

      <footer
        data-testid="saved-course-region"
        data-region="actions"
        className="safe-area-bottom fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[30rem] border-t border-border bg-card/95 px-4 pt-3 backdrop-blur-xl"
      >
        <div className="grid grid-cols-[0.95fr_1.15fr] gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-w-0 px-3 text-primary"
            onClick={onShare}
          >
            <Share2Icon className="size-5" aria-hidden="true" />
            일정 공유하기
          </Button>
          <Button
            type="button"
            size="lg"
            className="min-w-0 px-3"
            disabled={started}
            onClick={onStart}
          >
            <NavigationIcon className="size-5" aria-hidden="true" />
            {started ? "여행 진행 중" : "여행 시작하기"}
          </Button>
        </div>
        <p className="type-caption flex min-h-10 items-center justify-center gap-1.5 text-center text-muted-foreground">
          <InfoIcon className="size-4 shrink-0" aria-hidden="true" />
          여행 중에도 일정을 수정하거나 다른 코스를 추천받을 수 있어요
        </p>
      </footer>

      <p
        role="status"
        aria-label="저장 일정 상태"
        aria-live="polite"
        className="sr-only"
      >
        {status}
      </p>
    </main>
  );
}

export { SavedCourseScreen, type SavedCourseScreenProps };
