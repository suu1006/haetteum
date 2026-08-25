import { ChevronRightIcon } from "lucide-react";
import type { RefObject } from "react";

import { ThemeFeatureCarousel } from "@/components/patterns/theme-feature-carousel";
import { ThemeCourseCard } from "@/components/travel/theme-course-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import type {
  ThemeCourse,
  ThemeFeature,
  ThemeId,
  ThemeSort,
} from "@/features/themes/theme-travel-model";

type ThemeTravelSectionProps = {
  features: readonly ThemeFeature[];
  courses: readonly ThemeCourse[];
  selectedTheme: ThemeId;
  sort: ThemeSort;
  savedIds: ReadonlySet<string>;
  recommendationsRef: RefObject<HTMLElement | null>;
  onFeatureSelect: (theme: ThemeFeature["id"]) => void;
  onThemeChange: (theme: ThemeId) => void;
  onSortChange: (sort: ThemeSort) => void;
  onSavedChange: (courseId: string, saved: boolean) => void;
  onShowAll: () => void;
};

const themeFilters: ReadonlyArray<{ id: ThemeId; label: string }> = [
  { id: "all", label: "전체" },
  { id: "healing", label: "힐링 & 휴식" },
  { id: "food", label: "미식 여행" },
  { id: "culture", label: "문화 & 역사" },
  { id: "activity", label: "액티비티" },
  { id: "family", label: "가족 여행" },
];

function ThemeTravelSection({
  features,
  courses,
  selectedTheme,
  sort,
  savedIds,
  recommendationsRef,
  onFeatureSelect,
  onThemeChange,
  onSortChange,
  onSavedChange,
  onShowAll,
}: ThemeTravelSectionProps) {
  return (
    <div className="-mt-2 bg-card pb-6 pt-4" data-section="theme-travel">
      <section aria-labelledby="theme-feature-title" className="px-4">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 id="theme-feature-title" className="type-title-md text-foreground">
              테마로 떠나는 여행
            </h2>
            <p className="type-caption mt-1 text-muted-foreground">
              당신의 취향에 맞는 여행 테마를 선택해보세요
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onShowAll}
            className="shrink-0 rounded-full border-primary/20 text-primary"
          >
            테마 전체보기
            <ChevronRightIcon data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-4">
          <ThemeFeatureCarousel
            features={features}
            onThemeSelect={onFeatureSelect}
          />
        </div>
      </section>

      <section
        ref={recommendationsRef}
        aria-labelledby="theme-course-title"
        className="scroll-mt-4 px-4 pt-6"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="theme-course-title" className="type-title-md text-foreground">
            테마별 추천 여행
          </h2>
          <Select
            value={sort}
            onValueChange={(value) => {
              if (value === "popular" || value === "rating") {
                onSortChange(value);
              }
            }}
          >
            <SelectTrigger
              aria-label="추천 코스 정렬"
              className="h-11 rounded-full bg-card px-2 text-foreground"
            >
              <SelectValue>{sort === "popular" ? "인기순" : "평점순"}</SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="popular">인기순</SelectItem>
              <SelectItem value="rating">평점순</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="-mx-4 mt-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ToggleGroup
            type="single"
            variant="outline"
            aria-label="테마 필터"
            value={[selectedTheme]}
            onValueChange={(values) => {
              const nextTheme = values[0];
              if (nextTheme) onThemeChange(nextTheme as ThemeId);
            }}
            className="w-max gap-1.5"
          >
            {themeFilters.map((filter) => (
              <ToggleGroupItem
                key={filter.id}
                value={filter.id}
                className="type-caption min-h-11 rounded-full px-3 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:font-semibold aria-pressed:text-primary-foreground"
              >
                {filter.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {courses.length > 0 ? (
          <ul aria-label="테마별 추천 여행 코스" className="mt-3 space-y-2">
            {courses.map((course, index) => (
              <li key={course.id}>
                <ThemeCourseCard
                  course={course}
                  saved={savedIds.has(course.id)}
                  onSavedChange={(saved) => onSavedChange(course.id, saved)}
                  eager={index === 0}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-border bg-muted/45 p-5 text-center">
            <p className="type-body-md text-muted-foreground">
              선택한 테마의 추천 코스를 준비하고 있어요.
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onShowAll}>
              전체 코스 보기
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}

export { ThemeTravelSection, type ThemeTravelSectionProps };
