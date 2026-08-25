"use client";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ArrowLeftIcon,
  MenuIcon,
  PlusIcon,
  RotateCcwIcon,
  SparklesIcon,
} from "lucide-react";

import { SortableItineraryCard } from "@/components/travel/sortable-itinerary-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  CoursePlace,
  CourseSource,
  CourseTimeSlot,
} from "@/features/courses/course-edit-model";

type CourseEditScreenProps = {
  source: CourseSource;
  slots: readonly CourseTimeSlot[];
  places: readonly CoursePlace[];
  status: string;
  onBack: () => void;
  onReset: () => void;
  onSourceChange: (source: CourseSource) => void;
  onPlaceSelect: (place: CoursePlace) => void;
  onAddPlace: () => void;
  onSave: () => void;
};

const sourceTabs: readonly { id: CourseSource; label: string }[] = [
  { id: "ai", label: "AI 추천 코스" },
  { id: "custom", label: "내가 만든 코스" },
];

function CourseEditScreen({
  source,
  slots,
  places,
  status,
  onBack,
  onReset,
  onSourceChange,
  onPlaceSelect,
  onAddPlace,
  onSave,
}: CourseEditScreenProps) {
  const sourceLabel = source === "ai" ? "AI 추천 코스" : "내가 만든 코스";

  return (
    <div className="mx-auto min-h-[100svh] w-full max-w-[30rem] bg-background pb-[calc(7.5rem+var(--safe-area-bottom))]">
      <header
        data-testid="course-edit-region"
        data-region="header"
        className="safe-area-top grid min-h-16 grid-cols-[3rem_minmax(0,1fr)_4.5rem] items-center px-3"
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
        <h1 className="type-title-md text-center text-foreground">일정 수정</h1>
        <button
          type="button"
          className="type-caption flex min-h-11 items-center justify-end gap-1 rounded-lg px-1 font-semibold text-muted-foreground outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/25"
          onClick={onReset}
        >
          <RotateCcwIcon className="size-4" aria-hidden="true" />
          초기화
        </button>
      </header>

      <div
        data-testid="course-edit-region"
        data-region="tabs"
        className="px-4 pt-1"
      >
        <div
          role="tablist"
          aria-label="코스 종류"
          className="grid grid-cols-2 rounded-xl bg-secondary p-1"
        >
          {sourceTabs.map((tab) => {
            const selected = tab.id === source;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={cn(
                  "type-label min-h-11 rounded-lg px-3 outline-none transition-[color,background-color,box-shadow,transform] active:scale-[0.98] focus-visible:ring-3 focus-visible:ring-ring/25",
                  selected
                    ? "bg-primary text-primary-foreground shadow-card"
                    : "text-muted-foreground hover:text-foreground",
                )}
                onClick={() => onSourceChange(tab.id)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        data-testid="course-edit-region"
        data-region="instructions"
        className="px-5 pt-5 pb-4 text-center"
      >
        <p className="type-body-md text-muted-foreground">
          드래그해서 순서를 변경하거나, &apos;+&apos; 버튼으로 장소를 추가하세요
        </p>
      </div>

      <section
        data-testid="course-edit-region"
        data-region="itinerary"
        aria-label={`${sourceLabel} 일정 편집`}
        className="px-4"
      >
        <SortableContext
          items={places.map(({ id }) => id)}
          strategy={verticalListSortingStrategy}
        >
          <ol aria-label={`${sourceLabel} 일정`}>
            {places.map((place, index) => {
              const slot = slots[index];
              if (!slot) return null;
              return (
                <SortableItineraryCard
                  key={place.id}
                  place={place}
                  slot={slot}
                  isLast={index === places.length - 1}
                  onSelect={onPlaceSelect}
                />
              );
            })}
          </ol>
        </SortableContext>

        <div
          aria-hidden="true"
          className="type-label mt-5 flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/35 bg-primary-subtle/40 px-4 text-center text-primary"
        >
          <MenuIcon className="size-5 shrink-0" />
          아이콘을 눌러 순서를 변경할 수 있어요
        </div>
      </section>

      <div
        data-testid="course-edit-region"
        data-region="actions"
        className="safe-area-bottom fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[30rem] border-t border-border bg-card/95 px-4 pt-3 backdrop-blur-xl"
      >
        <div className="grid grid-cols-[0.95fr_1.15fr] gap-3 pb-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-w-0 px-3 text-primary"
            onClick={onAddPlace}
          >
            <PlusIcon className="size-5" aria-hidden="true" />
            장소 추가하기
          </Button>
          <Button
            type="button"
            size="lg"
            className="min-w-0 px-3"
            onClick={onSave}
          >
            <SparklesIcon className="size-5" aria-hidden="true" />
            저장하기
          </Button>
        </div>
      </div>

      <p
        role="status"
        aria-label="일정 편집 상태"
        aria-live="polite"
        className="sr-only"
      >
        {status}
      </p>
    </div>
  );
}

export { CourseEditScreen, type CourseEditScreenProps };
