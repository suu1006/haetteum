"use client";

import { useMemo, useRef, useState } from "react";

import { ThemeTravelSection } from "@/components/patterns/theme-travel-section";
import {
  selectThemeCourses,
  type ThemeFeature,
  type ThemeId,
  type ThemeSort,
  type ThemeTravelData,
} from "@/features/themes/theme-travel-model";

type ThemeCourseExplorerProps = {
  data: ThemeTravelData;
};

function ThemeCourseExplorer({ data }: ThemeCourseExplorerProps) {
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>("all");
  const [sort, setSort] = useState<ThemeSort>("popular");
  const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const recommendationsRef = useRef<HTMLElement>(null);
  const courses = useMemo(
    () => selectThemeCourses(data.courses, selectedTheme, sort),
    [data.courses, selectedTheme, sort],
  );

  function scrollToRecommendations() {
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    recommendationsRef.current?.scrollIntoView?.({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  function handleFeatureSelect(theme: ThemeFeature["id"]) {
    setSelectedTheme(theme);
    scrollToRecommendations();
  }

  function handleShowAll() {
    setSelectedTheme("all");
    scrollToRecommendations();
  }

  function handleSavedChange(courseId: string, saved: boolean) {
    setSavedIds((current) => {
      const next = new Set(current);
      if (saved) next.add(courseId);
      else next.delete(courseId);
      return next;
    });
  }

  return (
    <ThemeTravelSection
      features={data.features}
      courses={courses}
      selectedTheme={selectedTheme}
      sort={sort}
      savedIds={savedIds}
      recommendationsRef={recommendationsRef}
      onFeatureSelect={handleFeatureSelect}
      onThemeChange={setSelectedTheme}
      onSortChange={setSort}
      onSavedChange={handleSavedChange}
      onShowAll={handleShowAll}
    />
  );
}

export { ThemeCourseExplorer, type ThemeCourseExplorerProps };
