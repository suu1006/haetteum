# Theme Travel UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved screenshot-matched theme travel tab with reusable shadcn-based components and fully local mock data.

**Architecture:** Preserve the existing `/?tab=ai-course` route contract and shared discovery shell. Add typed theme data and pure selectors under `features/themes`, prop-driven travel cards under `components/travel`, controlled screen composition under `components/patterns`, and one small client feature for filter, sort, scroll, and in-memory save state.

**Tech Stack:** Next.js 16.3.1 App Router, React 19.2.8, TypeScript strict, Tailwind CSS 4, shadcn/Base UI Rhea, Embla Carousel, Vitest, React Testing Library, axe-core.

**Spec:** `docs/superpowers/specs/2026-08-24-theme-travel-ui-design.md`

## Global Constraints

- Use typed local mock data only; do not add API, DB, React Query, Zustand, authentication, or a new product route.
- Keep the existing `ai-course` query value and render the theme UI only for that tab.
- Preserve the recommendation, popular-place, festival, detail, welcome, and backend changes already present in the dirty worktree.
- Reuse the existing `Button`, `Badge`, `Card`, `Carousel`, and `ToggleGroup`; add shadcn `Select` from the installed Rhea registry and stop with the exact CLI error if generation fails.
- Keep `components/ui` domain-free, `components/travel` prop-driven, `components/patterns` compositional, and `features/themes` responsible for mock data and state.
- Support 320px and wider viewports, a maximum 480px app surface, 44×44px touch targets, Pretendard, safe-area spacing, and WCAG 2.2 AA semantics.
- Place new raster assets under `apps/web/public/images/themes`; do not use inline SVG, emoji, CSS art, placeholder boxes, or remote runtime images.
- Do not stage, commit, branch, push, or alter unrelated files without separate approval.

---

## File Map

**Create**

- `apps/web/src/features/themes/theme-travel-model.ts` — theme types and pure filter/sort selector.
- `apps/web/src/features/themes/theme-travel.mock.ts` — all theme feature and course mock records.
- `apps/web/src/features/themes/theme-course-explorer.tsx` — client-owned selected theme, sort, scroll target, and saved IDs.
- `apps/web/src/components/travel/theme-feature-card.tsx` — prop-driven portrait feature card.
- `apps/web/src/components/travel/theme-course-card.tsx` — prop-driven recommendation course card.
- `apps/web/src/components/patterns/theme-feature-carousel.tsx` — shadcn carousel composition.
- `apps/web/src/components/patterns/theme-travel-section.tsx` — controlled theme screen presentation.
- `apps/web/src/components/ui/select.tsx` — generated shadcn/Base UI Select primitive if available.
- `apps/web/tests/unit/features/themes/theme-travel-model.test.ts` — pure selector tests.
- `apps/web/tests/unit/components/travel/theme-travel-components.test.tsx` — card behavior and semantics.
- `apps/web/tests/unit/components/patterns/theme-travel-section.test.tsx` — layout, interaction, empty state, and axe tests.
- `apps/web/public/images/themes/theme-healing-beach.png`
- `apps/web/public/images/themes/theme-food-cafe.png`
- `apps/web/public/images/themes/theme-culture-hanok.png`
- `apps/web/public/images/themes/theme-activity-balloons.png`
- `apps/web/public/images/themes/course-jeju-healing.png`
- `apps/web/public/images/themes/course-jeonju-food.png`
- `apps/web/public/images/themes/course-gyeongju-history.png`

**Modify**

- `apps/web/src/features/discovery/discovery-model.ts` — attach `ThemeTravelData`, add `showThemeTravel`, and limit `showAiCourse` to the recommendation tab.
- `apps/web/src/features/discovery/main-discovery.mock.ts` — attach the exported theme mock without duplicating records.
- `apps/web/src/components/patterns/main-discovery.tsx` — render `ThemeCourseExplorer` for `showThemeTravel`.
- `apps/web/tests/unit/features/discovery/discovery-model.test.ts` — assert the new tab visibility contract.
- `apps/web/tests/unit/components/patterns/main-discovery.test.tsx` — assert theme tab composition and existing tab isolation.
- `DESIGN.md` — record the newly implemented theme components and mock-only contract after implementation passes.

---

### Task 1: Add the typed mock model and pure selection behavior

**Files:**

- Create: `apps/web/src/features/themes/theme-travel-model.ts`
- Create: `apps/web/src/features/themes/theme-travel.mock.ts`
- Test: `apps/web/tests/unit/features/themes/theme-travel-model.test.ts`

**Interfaces:**

- Produces: `ThemeId`, `ThemeSort`, `ThemeFeature`, `ThemeCourse`, `ThemeTravelData`.
- Produces: `selectThemeCourses(courses, theme, sort): readonly ThemeCourse[]`.
- Produces: `themeTravelMock: ThemeTravelData`.

- [ ] **Step 1: Write the failing selector tests**

```ts
import { describe, expect, it } from "vitest";

import { selectThemeCourses } from "@/features/themes/theme-travel-model";
import { themeTravelMock } from "@/features/themes/theme-travel.mock";

describe("selectThemeCourses", () => {
  it("filters one theme without mutating the fixture", () => {
    const originalIds = themeTravelMock.courses.map((course) => course.id);
    const result = selectThemeCourses(
      themeTravelMock.courses,
      "healing",
      "popular",
    );

    expect(result.every((course) => course.theme === "healing")).toBe(true);
    expect(themeTravelMock.courses.map((course) => course.id)).toEqual(originalIds);
  });

  it("sorts all courses by rating and then review count", () => {
    expect(
      selectThemeCourses(themeTravelMock.courses, "all", "rating").map(
        (course) => course.id,
      ),
    ).toEqual(["gyeongju-history", "jeju-healing", "jeonju-food"]);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm the missing-module failure**

Run: `pnpm --filter @haetteum/web test -- tests/unit/features/themes/theme-travel-model.test.ts`

Expected: FAIL because `theme-travel-model` and `theme-travel.mock` do not exist.

- [ ] **Step 3: Implement the exact model and stable selector**

```ts
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
    .toSorted((left, right) =>
      sort === "rating"
        ? right.rating - left.rating || right.reviewCount - left.reviewCount
        : right.popularity - left.popularity || right.rating - left.rating,
    );
}
```

- [ ] **Step 4: Add three realistic course records and four feature records**

Use the exact IDs `healing`, `food`, `culture`, `activity` for feature cards and `jeju-healing`, `jeonju-food`, `gyeongju-history` for courses. Set the rating order to Gyeongju `4.9`, Jeju `4.8`, Jeonju `4.7`; set popularity values so the initial order is Jeju, Jeonju, Gyeongju. Point every image to `/images/themes/*.png` paths listed in the file map.

- [ ] **Step 5: Run the focused test and confirm it passes**

Run: `pnpm --filter @haetteum/web test -- tests/unit/features/themes/theme-travel-model.test.ts`

Expected: PASS with 2 tests.

### Task 2: Produce and verify the seven photographic assets

**Files:**

- Create: the seven `apps/web/public/images/themes/*.png` files listed in the file map.

**Interfaces:**

- Consumes: the image paths and alt text declared by `themeTravelMock`.
- Produces: local raster images with no embedded UI copy.

- [ ] **Step 1: Generate the four portrait feature photographs**

Generate separate images with consistent high-end Korean travel editorial photography, natural daylight, restrained saturation, no text, no logo, and vertical crop:

1. Tropical blue beach framed by palms, open sky in the upper third.
2. Warm quiet café table with tea, desserts, and soft window light.
3. Traditional Korean hanok street with tiled roofs and distant green hills.
4. Colorful hot-air balloons over a broad mountain valley at sunrise.

- [ ] **Step 2: Generate the three landscape course thumbnails**

Generate separate images with the same photographic treatment and landscape crop:

1. Jeju coastal walking road, turquoise sea, pine branches, no people in close foreground.
2. Abundant Jeonju Korean meal with multiple brass and ceramic dishes, overhead three-quarter angle.
3. Gyeongju historic pavilion and autumn tree, calm blue sky, architecture unobstructed.

- [ ] **Step 3: Inspect each asset and save it to its consuming path**

Open each saved image, verify that the focal subject survives the planned `object-cover` crop, and verify no generated text, watermark, collage border, or UI element appears.

- [ ] **Step 4: Verify all files are present and readable**

Run:

```bash
for image_path in apps/web/public/images/themes/*.png; do
  sips -g pixelWidth -g pixelHeight "$image_path"
done
```

Expected: exactly seven readable PNG files, each with non-zero width and height.

### Task 3: Add shadcn Select and the prop-driven travel cards

**Files:**

- Create: `apps/web/src/components/ui/select.tsx`
- Create: `apps/web/src/components/travel/theme-feature-card.tsx`
- Create: `apps/web/src/components/travel/theme-course-card.tsx`
- Test: `apps/web/tests/unit/components/travel/theme-travel-components.test.tsx`

**Interfaces:**

- Consumes: `ThemeFeature` and `ThemeCourse` from Task 1.
- Produces: `ThemeFeatureCard({ feature, icon, onSelect, eager })`.
- Produces: `ThemeCourseCard({ course, saved, onSavedChange, eager })`.

- [ ] **Step 1: Read the installed Next.js Image and Client Component guides**

Run:

```bash
rg -n "next/image|Image Component|use client|Client Components" apps/web/node_modules/next/dist/docs
```

Open the matching local guides and apply their current Next.js 16 rules before writing component code.

- [ ] **Step 2: Generate the installed shadcn Rhea Select component**

Run from `apps/web`: `pnpm exec shadcn add select --yes`

Expected: `src/components/ui/select.tsx` using the existing Base UI, CSS-variable, alias, and Lucide configuration; no unrelated component files change.

- [ ] **Step 3: Write failing card tests**

```tsx
it("selects a named feature card", async () => {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  render(
    <ThemeFeatureCard
      feature={themeTravelMock.features[0]}
      icon={<UmbrellaIcon />}
      onSelect={onSelect}
      eager
    />,
  );

  await user.click(screen.getByRole("button", { name: /힐링 & 휴식/ }));
  expect(onSelect).toHaveBeenCalledWith("healing");
});

it("toggles one course bookmark accessibly", async () => {
  const onSavedChange = vi.fn();
  const user = userEvent.setup();
  render(
    <ThemeCourseCard
      course={themeTravelMock.courses[0]}
      saved={false}
      onSavedChange={onSavedChange}
      eager
    />,
  );

  const save = screen.getByRole("button", { name: "제주 바다 힐링 코스 저장" });
  expect(save).toHaveAttribute("aria-pressed", "false");
  await user.click(save);
  expect(onSavedChange).toHaveBeenCalledWith(true);
});
```

- [ ] **Step 4: Run the card tests and confirm the missing-component failure**

Run: `pnpm --filter @haetteum/web test -- tests/unit/components/travel/theme-travel-components.test.tsx`

Expected: FAIL because both travel components do not exist.

- [ ] **Step 5: Implement `ThemeFeatureCard`**

Use `next/image` with `fill`, a fixed portrait aspect ratio, semantic image scrim token, a real `<button type="button">` covering the card, and the passed ReactNode icon. Render title, description, `${courseCount}개 코스`, and a 44px circular arrow treatment inside the button. Call `onSelect(feature.id)`.

- [ ] **Step 6: Implement `ThemeCourseCard`**

Use shadcn `Card`, `Badge`, and `Button`; `CalendarDays`, `MapPin`, `Star`, `Bookmark`, and `ChevronRight` Lucide icons; `aria-pressed={saved}`; and `onSavedChange(!saved)`. Keep title and metadata visible at 320px, make the thumbnail a fixed-width landscape crop, and format the review count as `(${reviewCount.toLocaleString("ko-KR")})`.

- [ ] **Step 7: Run the card tests and confirm they pass**

Run: `pnpm --filter @haetteum/web test -- tests/unit/components/travel/theme-travel-components.test.tsx`

Expected: PASS with feature selection, bookmark state, image loading, and metadata assertions.

### Task 4: Build the controlled carousel and interactive theme explorer

**Files:**

- Create: `apps/web/src/components/patterns/theme-feature-carousel.tsx`
- Create: `apps/web/src/components/patterns/theme-travel-section.tsx`
- Create: `apps/web/src/features/themes/theme-course-explorer.tsx`
- Test: `apps/web/tests/unit/components/patterns/theme-travel-section.test.tsx`

**Interfaces:**

- Consumes: Task 1 data, Task 3 cards, shadcn `Carousel`, `ToggleGroup`, and `Select`.
- Produces: `ThemeFeatureCarousel({ features, onThemeSelect })`.
- Produces: controlled `ThemeTravelSection` props for selected theme, sort, courses, saved IDs, and callbacks.
- Produces: `ThemeCourseExplorer({ data })`, the only stateful public entry point.

- [ ] **Step 1: Write failing section interaction tests**

```tsx
it("filters, sorts, and saves mock courses", async () => {
  const user = userEvent.setup();
  render(<ThemeCourseExplorer data={themeTravelMock} />);

  await user.click(screen.getByRole("button", { name: "미식 여행" }));
  expect(screen.getByRole("article", { name: "전주 미식 탐방 코스" })).toBeVisible();
  expect(screen.queryByRole("article", { name: "제주 바다 힐링 코스" })).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "전주 미식 탐방 코스 저장" }));
  expect(screen.getByRole("button", { name: "전주 미식 탐방 코스 저장 취소" })).toHaveAttribute("aria-pressed", "true");
});

it("has no detectable accessibility violations", async () => {
  const { container } = render(<ThemeCourseExplorer data={themeTravelMock} />);
  expect(
    (await axe.run(container, { rules: { "color-contrast": { enabled: false } } })).violations,
  ).toEqual([]);
});
```

- [ ] **Step 2: Run the section tests and confirm the missing-component failure**

Run: `pnpm --filter @haetteum/web test -- tests/unit/components/patterns/theme-travel-section.test.tsx`

Expected: FAIL because the pattern and client explorer do not exist.

- [ ] **Step 3: Implement `ThemeFeatureCarousel`**

Use `Carousel`, `CarouselContent`, and `CarouselItem` with `align: "start"` and `containScroll: "trimSnaps"`. Use four icon components from Lucide, pass them as icon slots, set the first image eager, and use a fixed `8.5rem` item basis so about 2 cards are visible at 320px and more than 3 cards are visible at 480px. Do not render previous/next overlay controls.

- [ ] **Step 4: Implement the controlled `ThemeTravelSection`**

Render the exact Korean headings and descriptions from the screenshot. Use `ToggleGroup type="single"` with six `ToggleGroupItem` radios, shadcn `Select` with `popular` and `rating`, and a named `<ul aria-label="테마별 추천 여행 코스">`. Render a recovery button labelled `전체 코스 보기` when `courses` is empty.

- [ ] **Step 5: Implement `ThemeCourseExplorer` state**

```tsx
"use client";

const [theme, setTheme] = useState<ThemeId>("all");
const [sort, setSort] = useState<ThemeSort>("popular");
const [savedIds, setSavedIds] = useState<ReadonlySet<string>>(() => new Set());
const courses = useMemo(
  () => selectThemeCourses(data.courses, theme, sort),
  [data.courses, sort, theme],
);
```

Clone the Set on every save change. On feature-card and `테마 전체보기` actions, update the theme and call `recommendationsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })`; use `auto` behavior when `matchMedia("(prefers-reduced-motion: reduce)").matches`.

- [ ] **Step 6: Run the section tests and confirm they pass**

Run: `pnpm --filter @haetteum/web test -- tests/unit/components/patterns/theme-travel-section.test.tsx`

Expected: PASS for initial content, filter, sort, save, empty recovery, and axe checks.

### Task 5: Integrate the theme explorer into the existing discovery tab

**Files:**

- Modify: `apps/web/src/features/discovery/discovery-model.ts`
- Modify: `apps/web/src/features/discovery/main-discovery.mock.ts`
- Modify: `apps/web/src/components/patterns/main-discovery.tsx`
- Modify: `apps/web/tests/unit/features/discovery/discovery-model.test.ts`
- Modify: `apps/web/tests/unit/components/patterns/main-discovery.test.tsx`

**Interfaces:**

- Consumes: `ThemeTravelData`, `themeTravelMock`, and `ThemeCourseExplorer`.
- Produces: `MainDiscoveryData.themeTravel` and `DiscoveryView.showThemeTravel`.

- [ ] **Step 1: Add failing model assertions**

```ts
const themeQuery = { ...defaultDiscoveryQuery, tab: "ai-course" } as const;
const themeView = selectDiscoveryView(mainDiscoveryMock, themeQuery);

expect(themeView.showThemeTravel).toBe(true);
expect(themeView.showAiCourse).toBe(false);
expect(themeView.showRankedPlaces).toBe(false);
expect(themeView.showFestivals).toBe(false);
```

- [ ] **Step 2: Add the failing `MainDiscovery` composition assertion**

Render `MainDiscovery` with the `ai-course` query and assert that `테마로 떠나는 여행` and `테마별 추천 여행` are visible while `AI가 추천하는 맞춤 여행 코스` is absent. Preserve the existing recommendation-tab assertion that the AI banner is still visible there.

- [ ] **Step 3: Run both focused suites and confirm the failures**

Run:

```bash
pnpm --filter @haetteum/web test -- \
  tests/unit/features/discovery/discovery-model.test.ts \
  tests/unit/components/patterns/main-discovery.test.tsx
```

Expected: FAIL because `showThemeTravel` and the new data property are missing.

- [ ] **Step 4: Extend the discovery model without changing the query parser**

Import `ThemeTravelData`, add `themeTravel: ThemeTravelData` to `MainDiscoveryData`, add `showThemeTravel: boolean` to `DiscoveryView`, return `showThemeTravel: query.tab === "ai-course"`, and change `showAiCourse` to `query.tab === "recommended"`.

- [ ] **Step 5: Attach the mock and render the explorer**

Import `themeTravelMock` into `main-discovery.mock.ts` and assign it once as `themeTravel`. In `MainDiscovery`, render `<ThemeCourseExplorer data={data.themeTravel} />` when `view.showThemeTravel` is true. Do not change header, search, navigation, recommendation, popular-place, or festival composition.

- [ ] **Step 6: Run the focused integration suites and confirm they pass**

Run the command from Step 3.

Expected: PASS and no changes to the existing query URL assertions.

### Task 6: Refresh the design contract and run full verification

**Files:**

- Modify: `DESIGN.md`
- Verify: all files in this plan; do not modify unrelated dirty files.

**Interfaces:**

- Consumes: the completed implementation and approved spec.
- Produces: current implementation status and completion evidence.

- [ ] **Step 1: Update `DESIGN.md` narrowly**

Add the implemented `ThemeFeatureCard`, `ThemeCourseCard`, `ThemeFeatureCarousel`, and `ThemeTravelSection` names to their existing ownership lists. Record that `tab=ai-course` uses local mock data with client-only filters, sort, and non-persistent save state. Do not rewrite unrelated design sections.

- [ ] **Step 2: Run formatting and diff safety checks**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; all pre-existing unrelated changes remain present and unreverted.

- [ ] **Step 3: Run focused theme suites**

Run:

```bash
pnpm --filter @haetteum/web test -- \
  tests/unit/features/themes/theme-travel-model.test.ts \
  tests/unit/components/travel/theme-travel-components.test.tsx \
  tests/unit/components/patterns/theme-travel-section.test.tsx \
  tests/unit/features/discovery/discovery-model.test.ts \
  tests/unit/components/patterns/main-discovery.test.tsx
```

Expected: all focused tests pass.

- [ ] **Step 4: Run the complete web checks**

Run:

```bash
pnpm --filter @haetteum/web lint
pnpm --filter @haetteum/web test
pnpm --filter @haetteum/web build
```

Expected: all commands exit 0 under Node 24.19.0.

- [ ] **Step 5: Run the local app and capture the exact theme state**

Start the existing app without changing its runtime configuration. Open `/?tab=ai-course&region=gyeonggi` in the Codex in-app browser at a 480px CSS viewport, verify search, top tabs, feature rail, filter, sort, bookmark, and bottom navigation, then capture the initial state.

- [ ] **Step 6: Compare source and implementation and close visual issues**

Place the source reference and the matching browser capture into the same comparison input. Record findings in project-root `design-qa.md`, fix every P0/P1/P2 mismatch, recapture, and repeat until the report says `final result: passed`. Leave only optional P3 polish notes.

- [ ] **Step 7: Report completion without Git integration**

Report the local preview URL, exact tests run, visual QA result, changed files, and any remaining P3 notes. Do not claim API persistence or Git completion.
