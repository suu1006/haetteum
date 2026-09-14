"use client";

import type { HotPlaceRankingLoadState } from "@/features/discovery/hot-place-ranking-api";
import type { PlaceRankingLoadState } from "@/features/discovery/place-ranking-api";
import { collectRandomCourseCandidates } from "@/features/places/random-course-candidates";
import { useRandomCourseRecommendation } from "@/features/places/use-random-course-recommendation";

import { AiCourseBanner } from "@/components/domain/course/ai-course-banner";
import dynamic from "next/dynamic";

const RandomCourseDialog = dynamic(() =>
  import("@/components/domain/course/random-course-dialog").then((module) => module.RandomCourseDialog),
);

type RandomCourseBannerProps = {
  imageSrc: string;
  imageAlt: string;
  ranking: PlaceRankingLoadState | null | undefined;
  hotRanking: HotPlaceRankingLoadState | null | undefined;
};

function RandomCourseBanner({
  imageSrc,
  imageAlt,
  ranking,
  hotRanking,
}: RandomCourseBannerProps) {
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
      <AiCourseBanner
        imageSrc={imageSrc}
        imageAlt={imageAlt}
        onRecommend={recommend}
        loading={loading}
        disabled={candidates.length === 0}
      />
      {open ? <RandomCourseDialog
        open={open}
        onOpenChange={setOpen}
        phase={phase}
        stops={stops}
        startTitle={startTitle}
        onRetry={recommend}
        onSave={handleSave}
        onCancelSave={handleCancelSave}
        saveState={saveState}
      /> : null}
    </>
  );
}

export { RandomCourseBanner };
