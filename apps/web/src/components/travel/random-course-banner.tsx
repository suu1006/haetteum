"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import type { GeneratedCourseStop } from "@haetteum/contracts";

import type { HotPlaceRankingLoadState } from "@/features/discovery/hot-place-ranking-api";
import type { PlaceRankingLoadState } from "@/features/discovery/place-ranking-api";
import { generatedCourseQueryOptions } from "@/features/places/place-generated-course-query";
import {
  collectRandomCourseCandidates,
  pickRandomCandidate,
} from "@/features/places/random-course-candidates";

import { AiCourseBanner } from "./ai-course-banner";
import { RandomCourseDialog, type RandomCoursePhase } from "./random-course-dialog";

// 한 번에 뽑은 관광지가 좌표 미비/카카오 실패로 코스를 못 만들면
// 다른 후보로 조용히 재시도한다. 너무 많이 돌리면 응답이 느려지므로 상한을 둔다.
const MAX_ATTEMPTS = 3;

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
  const queryClient = useQueryClient();
  const candidates = collectRandomCourseCandidates(ranking, hotRanking);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<RandomCoursePhase>("empty");
  const [stops, setStops] = useState<GeneratedCourseStop[]>([]);
  const [startTitle, setStartTitle] = useState<string | null>(null);

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

  function handleRecommend() {
    setOpen(true);
    setLoading(true);
    setPhase("loading");
    void findCourse(new Set(), 0);
  }

  return (
    <>
      <AiCourseBanner
        imageSrc={imageSrc}
        imageAlt={imageAlt}
        onRecommend={handleRecommend}
        loading={loading}
        disabled={candidates.length === 0}
      />
      <RandomCourseDialog
        open={open}
        onOpenChange={setOpen}
        phase={phase}
        stops={stops}
        startTitle={startTitle}
        onRetry={handleRecommend}
      />
    </>
  );
}

export { RandomCourseBanner };
