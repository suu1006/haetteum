"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CourseEditScreen } from "@/components/patterns/course-edit-screen";
import { CoursePlaceDetailModal } from "@/components/travel/course-place-detail-modal";
import { CoursePlacePicker } from "@/features/courses/course-place-picker";
import {
  appendFollowingTimeSlots,
  appendUniqueCoursePlaces,
  formatMoveAnnouncement,
  movePlace,
  type CourseEditFixture,
  type CoursePlace,
  type CourseSource,
  type CourseTimeSlot,
} from "@/features/courses/course-edit-model";
import { nearbyPlaceSearchMock } from "@/features/places/nearby-place-search.mock";
import type { NearbyPlaceResult } from "@/features/places/nearby-place-search-model";

type CourseEditorProps = {
  course: CourseEditFixture;
};

type CourseDraft = {
  places: readonly CoursePlace[];
  slots: readonly CourseTimeSlot[];
};

function initialDrafts(course: CourseEditFixture) {
  return {
    ai: {
      places: [...course.courses.ai.places],
      slots: [...course.courses.ai.slots],
    },
    custom: {
      places: [...course.courses.custom.places],
      slots: [...course.courses.custom.slots],
    },
  } satisfies Record<CourseSource, CourseDraft>;
}

function CourseEditor({ course }: CourseEditorProps) {
  const router = useRouter();
  const [step, setStep] = useState<"edit" | "place-search">("edit");
  const [source, setSource] = useState<CourseSource>("ai");
  const [drafts, setDrafts] = useState(() => initialDrafts(course));
  const [status, setStatus] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<CoursePlace | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const activeCourse = course.courses[source];
  const activeDraft = drafts[source];

  function updateActiveDraft(
    update: (draft: CourseDraft) => CourseDraft,
  ) {
    setDrafts((current) => ({
      ...current,
      [source]: update(current[source]),
    }));
  }

  function handleReset() {
    updateActiveDraft(() => ({
      places: [...activeCourse.places],
      slots: [...activeCourse.slots],
    }));
    setStatus(
      `${source === "ai" ? "AI 추천 코스" : "내가 만든 코스"}를 처음 순서로 되돌렸습니다.`,
    );
  }

  function handleConfirmPlaces(selectedPlaces: readonly NearbyPlaceResult[]) {
    const nextPlaces = appendUniqueCoursePlaces(
      activeDraft.places,
      selectedPlaces,
    );
    const addedCount = nextPlaces.length - activeDraft.places.length;
    const nextSlots = appendFollowingTimeSlots(
      source,
      activeDraft.slots,
      addedCount,
      90,
    );

    if (addedCount === 0) {
      setStatus("새로 추가할 장소가 없습니다.");
      setStep("edit");
      return;
    }

    if (nextSlots === activeDraft.slots) {
      setStatus("추가할 일정 시간을 만들 수 없습니다.");
      setStep("edit");
      return;
    }

    setDrafts((current) => ({
      ...current,
      [source]: { places: nextPlaces, slots: nextSlots },
    }));
    setStatus(`장소 ${addedCount}개를 일정에 추가했습니다.`);
    setStep("edit");
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;

    updateActiveDraft((draft) => {
      const next = movePlace(draft.places, String(active.id), String(over.id));
      if (next === draft.places) return draft;

      const movedIndex = next.findIndex(({ id }) => id === active.id);
      const movedPlace = next[movedIndex];
      if (movedPlace) {
        setStatus(formatMoveAnnouncement(movedPlace, movedIndex));
      }
      return { ...draft, places: next };
    });
  }

  function handlePlaceSelect(place: CoursePlace) {
    setSelectedPlace(place);
    setDetailOpen(true);
  }

  function handleApplyPlace(place: CoursePlace) {
    setStatus(`${place.title}을 일정에 반영했습니다.`);
  }

  if (step === "place-search") {
    return (
      <CoursePlacePicker
        places={nearbyPlaceSearchMock}
        unavailableIds={new Set(activeDraft.places.map(({ id }) => id))}
        onCancel={() => setStep("edit")}
        onConfirm={handleConfirmPlaces}
      />
    );
  }

  return (
    <>
      <DndContext
        id={`course-editor-${course.id}`}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <CourseEditScreen
          source={source}
          slots={activeDraft.slots}
          places={activeDraft.places}
          status={status}
          onBack={() => router.back()}
          onReset={handleReset}
          onSourceChange={setSource}
          onPlaceSelect={handlePlaceSelect}
          onAddPlace={() => setStep("place-search")}
          onSave={() => router.push(`/courses/${course.id}`)}
        />
      </DndContext>
      <CoursePlaceDetailModal
        place={selectedPlace}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onApply={handleApplyPlace}
      />
    </>
  );
}

export { CourseEditor, type CourseEditorProps };
