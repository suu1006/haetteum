export const themeIds = [
  "all",
  "healing",
  "food",
  "culture",
  "activity",
  "family",
] as const;

export type ThemeId = (typeof themeIds)[number];
export type ThemeSort = "popular" | "rating";
export type ThemeImage = { src: string; alt: string };

export type ThemeFeature = {
  id: Exclude<ThemeId, "all" | "family">;
  title: string;
  description: string;
  courseCount: number;
  image: ThemeImage;
};

export type ThemeCourse = {
  id: string;
  theme: Exclude<ThemeId, "all">;
  title: string;
  description: string;
  durationLabel: string;
  locationLabel: string;
  rating: number;
  reviewCount: number;
  popularity: number;
  tags: readonly string[];
  image: ThemeImage;
};

export type ThemeTravelData = {
  features: readonly ThemeFeature[];
  courses: readonly ThemeCourse[];
};

export function selectThemeCourses(
  courses: readonly ThemeCourse[],
  theme: ThemeId,
  sort: ThemeSort,
) {
  return courses
    .filter((course) => theme === "all" || course.theme === theme)
    .sort((left, right) =>
      sort === "rating"
        ? right.rating - left.rating || right.reviewCount - left.reviewCount
        : right.popularity - left.popularity || right.rating - left.rating,
    );
}
