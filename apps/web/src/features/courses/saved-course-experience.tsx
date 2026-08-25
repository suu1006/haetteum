"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SavedCourseScreen } from "@/components/patterns/saved-course-screen";
import type {
  SavedCourseFixture,
  SavedCourseStop,
} from "@/features/courses/saved-course-model";

type SavedCourseExperienceProps = {
  course: SavedCourseFixture;
};

function SavedCourseExperience({ course }: SavedCourseExperienceProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(true);
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState("");

  function handleSavedChange(nextSaved: boolean) {
    setSaved(nextSaved);
    setStatus(nextSaved ? "일정을 다시 저장했어요." : "일정 저장을 해제했어요.");
  }

  async function handleShare() {
    const shareData = {
      title: course.title,
      text: course.completionMessage,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setStatus("일정 공유를 완료했어요.");
        return;
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        setStatus("일정 링크를 복사했어요.");
        return;
      }

      setStatus("이 브라우저에서는 공유 기능을 사용할 수 없어요.");
    } catch {
      setStatus("일정 공유를 완료하지 못했어요. 다시 시도해 주세요.");
    }
  }

  function handleStopSelect(stop: SavedCourseStop) {
    if (stop.id === "icheon-termeden") {
      router.push(`/places/${stop.id}`);
      return;
    }
    setStatus(`${stop.title} 상세 정보는 준비 중이에요.`);
  }

  return (
    <SavedCourseScreen
      course={course}
      saved={saved}
      started={started}
      status={status}
      onBack={() => router.back()}
      onSavedChange={handleSavedChange}
      onMore={() => router.push(`/courses/${course.id}/edit`)}
      onStopSelect={handleStopSelect}
      onShare={() => void handleShare()}
      onStart={() => {
        setStarted(true);
        setStatus("여행을 시작했어요. 첫 번째 장소로 이동해 보세요.");
      }}
    />
  );
}

export { SavedCourseExperience, type SavedCourseExperienceProps };
