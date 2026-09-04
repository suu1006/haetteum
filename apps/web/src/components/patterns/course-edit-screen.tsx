"use client";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ArrowLeftIcon,
  Loader2Icon,
  MenuIcon,
  PlusIcon,
  RotateCcwIcon,
  SparklesIcon,
} from "lucide-react";

import { CourseEditRouteMap } from "@/components/travel/course-edit-route-map";
import { SortableItineraryCard } from "@/components/travel/sortable-itinerary-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  CoursePlace,
  CourseSource,
  CourseTimeSlot,
} from "@/features/courses/course-edit-model";

type CourseEditMode = "create" | "edit";

type CourseEditScreenProps = {
  mode?: CourseEditMode;
  source: CourseSource;
  title: string;
  slots: readonly CourseTimeSlot[];
  places: readonly CoursePlace[];
  status: string;
  generating?: boolean;
  saving?: boolean;
  onBack: () => void;
  onReset: () => void;
  onTitleChange: (title: string) => void;
  onPlaceSelect: (place: CoursePlace) => void;
  onRemovePlace: (placeId: string) => void;
  onAddPlace: () => void;
  onSave: () => void;
};

function CourseEditScreen({
  mode = "edit",
  source,
  title,
  slots,
  places,
  status,
  generating = false,
  saving = false,
  onBack,
  onReset,
  onTitleChange,
  onPlaceSelect,
  onRemovePlace,
  onAddPlace,
  onSave,
}: CourseEditScreenProps) {
  const isCreate = mode === "create";
  const sourceLabel = isCreate
    ? "일정"
    : source === "ai"
      ? "AI 추천 코스"
      : "내가 만든 코스";

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
        <h1 className="type-title-md text-center text-foreground">
          {isCreate ? "일정 추가" : "일정 수정"}
        </h1>
        <button
          type="button"
          className="type-caption flex min-h-11 items-center justify-end gap-1 rounded-lg px-1 font-semibold text-muted-foreground outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/25"
          onClick={onReset}
        >
          <RotateCcwIcon className="size-4" aria-hidden="true" />
          초기화
        </button>
      </header>

      {isCreate ? null : (
        <div
          data-testid="course-edit-region"
          data-region="title"
          className="px-4 pt-1"
        >
          <label htmlFor="course-title" className="sr-only">
            일정 이름
          </label>
          <Input
            id="course-title"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="일정 이름을 입력하세요"
            className="type-label h-11 rounded-xl bg-secondary px-3 font-semibold"
          />
        </div>
      )}

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
        {places.length > 0 ? (
          <>
            <CourseEditRouteMap places={places} />
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
                      onRemove={onRemovePlace}
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
          </>
        ) : generating ? (
          <div className="rounded-[1.15rem] bg-card px-5 py-12 text-center shadow-card">
            <Loader2Icon
              className="mx-auto size-6 animate-spin text-primary"
              aria-hidden="true"
            />
            <p className="type-body-md mt-3 font-semibold text-foreground">
              선택한 장소로 코스를 만들고 있어요
            </p>
            <p className="type-caption mt-1.5 text-muted-foreground">
              잠시만 기다려주세요.
            </p>
          </div>
        ) : (
          <div className="rounded-[1.15rem] bg-card px-5 py-12 text-center shadow-card">
            <p className="type-body-md font-semibold text-foreground">
              {isCreate
                ? "장소 하나로 일정을 만들어보세요!"
                : "새로운 일정을 추가해보세요!"}
            </p>
            <p className="type-caption mt-1.5 text-muted-foreground">
              {isCreate
                ? "'장소 추가하기' 버튼으로 장소를 고르면 그 장소를 기반으로 코스를 자동으로 만들어드려요."
                : "'장소 추가하기' 버튼으로 방문할 장소를 담아보세요."}
            </p>
          </div>
        )}
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
            disabled={saving || places.length === 0}
            onClick={onSave}
          >
            {saving ? (
              <Loader2Icon className="size-5 animate-spin" aria-hidden="true" />
            ) : (
              <SparklesIcon className="size-5" aria-hidden="true" />
            )}
            {saving ? "저장 중..." : "저장하기"}
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

export {
  CourseEditScreen,
  type CourseEditMode,
  type CourseEditScreenProps,
};
