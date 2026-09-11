"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { GeneratedCourseStop } from "@haetteum/contracts";

import type {
  RandomCoursePhase,
  SaveCourseState,
} from "@/components/travel/random-course-dialog";
import { generatedCourseQueryOptions } from "@/features/places/place-generated-course-query";
import {
  pickRandomCandidate,
  type RandomCourseCandidate,
} from "@/features/places/random-course-candidates";
import {
  useRemoveSavedCourse,
  useSaveCourse,
} from "@/features/trips/saved-course-query";

// 한 번에 뽑은 관광지가 좌표 미비/카카오 실패로 코스를 못 만들면
// 다른 후보로 조용히 재시도한다. 너무 많이 돌리면 응답이 느려지므로 상한을 둔다.
const MAX_ATTEMPTS = 3;

function useRandomCourseRecommendation(
  candidates: readonly RandomCourseCandidate[],
) {
  const queryClient = useQueryClient();
  const saveCourse = useSaveCourse();
  const removeSavedCourse = useRemoveSavedCourse();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<RandomCoursePhase>("empty");
  const [stops, setStops] = useState<GeneratedCourseStop[]>([]);
  const [startTitle, setStartTitle] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveCourseState>("idle");
  const [savedCourseId, setSavedCourseId] = useState<string | null>(null);

  async function findCourse(exclude: Set<string>, attempt: number): Promise<void> {
    const candidate = pickRandomCandidate(candidates, exclude);
    if (candidate == null) {
      setPhase("empty");
      setLoading(false);
      return;
    }

    const data = await queryClient.fetchQuery(
      generatedCourseQueryOptions(candidate.placeId),
    );
    if (data.status === "ready" && data.stops.length > 0) {
      setStops(data.stops);
      setStartTitle(candidate.title);
      setPhase("ready");
      setLoading(false);
      return;
    }

    if (attempt + 1 >= MAX_ATTEMPTS) {
      setPhase("empty");
      setLoading(false);
      return;
    }
    exclude.add(candidate.placeId);
    await findCourse(exclude, attempt + 1);
  }

  function recommend() {
    setOpen(true);
    setLoading(true);
    setPhase("loading");
    setSaveState("idle");
    setSavedCourseId(null);
    void findCourse(new Set(), 0);
  }

  function handleSave() {
    if (startTitle === null || stops.length === 0) return;

    setSaveState("saving");
    saveCourse.mutate(
      { title: `${startTitle} 근처 코스`, stops },
      {
        onSuccess: (saved) => {
          setSaveState("saved");
          setSavedCourseId(saved.id);
        },
        onError: () => setSaveState("error"),
      },
    );
  }

  function handleCancelSave() {
    if (savedCourseId === null) return;

    setSaveState("canceling");
    removeSavedCourse.mutate(savedCourseId, {
      onSuccess: () => {
        setSaveState("idle");
        setSavedCourseId(null);
      },
      onError: () => setSaveState("error"),
    });
  }

  return {
    open,
    setOpen,
    loading,
    phase,
    stops,
    startTitle,
    saveState,
    recommend,
    handleSave,
    handleCancelSave,
  };
}

export { useRandomCourseRecommendation };
