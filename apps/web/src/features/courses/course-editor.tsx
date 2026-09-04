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
import type { PlaceListItem } from "@haetteum/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  CourseEditScreen,
  type CourseEditMode,
} from "@/components/patterns/course-edit-screen";
import { CoursePlaceDetailModal } from "@/components/travel/course-place-detail-modal";
import { CoursePlacePicker } from "@/features/courses/course-place-picker";
import {
  appendFollowingTimeSlots,
  appendUniqueCoursePlaces,
  buildCourseDraftFromGeneratedStops,
  buildStopsFromDraft,
  formatMoveAnnouncement,
  movePlace,
  removePlace,
  type CourseEditFixture,
  type CoursePlace,
  type CourseSource,
  type CourseTimeSlot,
} from "@/features/courses/course-edit-model";
import { generatedCourseQueryOptions } from "@/features/places/place-generated-course-query";
import {
  useSaveCourse,
  useUpdateSavedCourse,
} from "@/features/trips/saved-course-query";

const saveErrorMessage = "코스를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
const noEligiblePlacesMessage =
  "좌표 정보가 있는 장소가 없어 저장할 수 없어요.";

type CourseEditorProps = {
  course: CourseEditFixture;
  initialSource?: CourseSource;
  mode?: CourseEditMode;
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

function CourseEditor({
  course,
  initialSource = "ai",
  mode = "edit",
}: CourseEditorProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"edit" | "place-search">("edit");
  const source: CourseSource = initialSource;
  const [title, setTitle] = useState(course.title);
  const [drafts, setDrafts] = useState(() => initialDrafts(course));
  const [status, setStatus] = useState("");
  const [generating, setGenerating] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<CoursePlace | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const saveCourseMutation = useSaveCourse();
  const updateSavedCourseMutation = useUpdateSavedCourse();
  const saving = saveCourseMutation.isPending || updateSavedCourseMutation.isPending;
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

  function appendManualPlaces(selectedPlaces: readonly PlaceListItem[]) {
    setDrafts((current) => {
      const currentDraft = current[source];
      const nextPlaces = appendUniqueCoursePlaces(
        currentDraft.places,
        selectedPlaces,
      );
      const addedCount = nextPlaces.length - currentDraft.places.length;

      if (addedCount === 0) {
        setStatus("새로 추가할 장소가 없습니다.");
        return current;
      }

      const nextSlots = appendFollowingTimeSlots(
        source,
        currentDraft.slots,
        addedCount,
        90,
      );

      if (nextSlots === currentDraft.slots) {
        setStatus("추가할 일정 시간을 만들 수 없습니다.");
        return current;
      }

      setStatus(`장소 ${addedCount}개를 일정에 추가했습니다.`);
      return { ...current, [source]: { places: nextPlaces, slots: nextSlots } };
    });
    setStep("edit");
  }

  async function generateCourseFromAnchor(anchor: PlaceListItem) {
    setStep("edit");
    setGenerating(true);
    setStatus(`${anchor.title} 기반으로 코스를 만들고 있어요.`);

    const generated = await queryClient.fetchQuery(
      generatedCourseQueryOptions(anchor.id),
    );

    setGenerating(false);

    if (generated.status === "ready" && generated.stops.length > 0) {
      const draft = buildCourseDraftFromGeneratedStops(
        source,
        generated.stops,
      );
      setDrafts((current) => ({ ...current, [source]: draft }));
      setStatus(`${anchor.title} 기반으로 코스를 만들었습니다.`);
      return;
    }

    setStatus("자동으로 코스를 만들지 못해 선택한 장소만 담았어요.");
    appendManualPlaces([anchor]);
  }

  function handleConfirmPlaces(selectedPlaces: readonly PlaceListItem[]) {
    const anchor = selectedPlaces[0];
    if (mode === "create" && activeDraft.places.length === 0 && anchor) {
      void generateCourseFromAnchor(anchor);
      return;
    }

    appendManualPlaces(selectedPlaces);
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

  function handleRemovePlace(placeId: string) {
    updateActiveDraft((draft) => {
      const removedPlace = draft.places.find(({ id }) => id === placeId);
      const next = removePlace(draft.places, draft.slots, placeId);
      if (next.places === draft.places) return draft;

      if (removedPlace) {
        setStatus(`${removedPlace.title}을 일정에서 뺐습니다.`);
      }
      return next;
    });
  }

  async function handleSave() {
    const stops = buildStopsFromDraft(activeDraft.places);
    if (stops.length === 0) {
      setStatus(noEligiblePlacesMessage);
      return;
    }

    try {
      if (mode === "create") {
        await saveCourseMutation.mutateAsync({ title, stops });
      } else {
        await updateSavedCourseMutation.mutateAsync({
          id: course.id,
          data: { title, stops },
        });
      }

      // /courses/[courseId]는 아직 데모 코스만 보여주는 화면이라
      // 실제로 저장된 코스는 목록이 이미 실데이터로 연동된 내 일정으로 보낸다.
      router.push("/trips");
    } catch {
      setStatus(saveErrorMessage);
    }
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
        unavailableIds={new Set(activeDraft.places.map(({ id }) => id))}
        onCancel={() => setStep("edit")}
        onConfirm={handleConfirmPlaces}
        onRemovePlace={handleRemovePlace}
        selectOnTap={mode === "create"}
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
          mode={mode}
          source={source}
          title={title}
          slots={activeDraft.slots}
          places={activeDraft.places}
          status={status}
          generating={generating}
          saving={saving}
          onBack={() => router.back()}
          onReset={handleReset}
          onTitleChange={setTitle}
          onPlaceSelect={handlePlaceSelect}
          onRemovePlace={handleRemovePlace}
          onAddPlace={() => setStep("place-search")}
          onSave={() => void handleSave()}
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
