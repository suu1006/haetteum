"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  hotPlaceRankingsQueryOptions,
  placeRankingsQueryOptions,
} from "@/features/discovery/place-ranking-query";
import { collectRandomCourseCandidates } from "@/features/places/random-course-candidates";
import { useRandomCourseRecommendation } from "@/features/places/use-random-course-recommendation";

import { RandomCourseDialog } from "./random-course-dialog";

type RandomCourseRecommendationState = {
  recommend: () => void;
  loading: boolean;
  disabled: boolean;
};

type RandomCourseRecommendationProps = {
  children: (state: RandomCourseRecommendationState) => ReactNode;
};

// 홈 탭의 "코스 추천받기" 배너와 동일한 랜덤 코스 추천 모달을, 랭킹 데이터를
// 서버에서 미리 받아오지 않는 화면(내 일정/마이페이지)에서도 띄울 수 있게 해준다.
function RandomCourseRecommendation({ children }: RandomCourseRecommendationProps) {
  const { data: ranking } = useQuery(placeRankingsQueryOptions());
  const { data: hotRanking } = useQuery(hotPlaceRankingsQueryOptions());
  const candidates = collectRandomCourseCandidates(ranking, hotRanking);

  const {
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
  } = useRandomCourseRecommendation(candidates);

  return (
    <>
      {children({ recommend, loading, disabled: candidates.length === 0 })}
      <RandomCourseDialog
        open={open}
        onOpenChange={setOpen}
        phase={phase}
        stops={stops}
        startTitle={startTitle}
        onRetry={recommend}
        onSave={handleSave}
        onCancelSave={handleCancelSave}
        saveState={saveState}
      />
    </>
  );
}

export { RandomCourseRecommendation };
