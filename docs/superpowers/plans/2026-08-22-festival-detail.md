# Festival Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every festival card navigate to a reusable, image-led `/festivals/[festivalId]` detail page with working back, gallery, save, share, introduction expansion, and honest preparation notices.

**Architecture:** Keep the dynamic route and data lookup in `app` and `features/festivals`, compose the screen in `components/patterns`, and keep reusable travel presentation in `components/travel`. The route remains a Server Component; only back/save/share, gallery position, introduction expansion, and preparation notices cross a Client Component boundary.

**Tech Stack:** Next.js 16.3.1 App Router, React 19.2.8, TypeScript, Tailwind CSS 4 CSS-first tokens, Base UI/shadcn-owned components, Lucide React, Vitest, Testing Library, axe-core, Next Image, Product Design ImageGen and in-app Browser QA.

**Spec:** `docs/superpowers/specs/2026-08-22-festival-detail-design.md`

## Global Constraints

- Read the relevant local Next.js guides under `apps/web/node_modules/next/dist/docs/` before writing route code; `params` is `Promise<{ festivalId: string }>` in Next.js 16.
- Preserve the existing dirty worktree and never revert unrelated edits.
- Do not stage, commit, branch, push, tag, or create a PR without separate user approval.
- Do not add a Nest API, Prisma model, migration, React Query provider, authentication flow, real schedule write, or map integration.
- Keep `src/styles` for tokens, `components/ui` for generic Foundation, `components/travel` for travel presentation, `components/patterns` for screen composition, and `features/app` for data and routing.
- Use existing semantic colors, Pretendard, 16px screen padding, 44×44px minimum controls, primary `#6F3DE5`, pressed `#5D2FC5`, background `#FCFCFD`, card `#FFFFFF`, foreground `#18191E`, border `#E6E6EB`, rating `#FFB020`, and safe-area support.
- Do not recreate the device frame or status bar from the reference.
- Do not crop the reference screenshot into product assets, use emoji as interface icons, draw icons in CSS/SVG, or leave image placeholders.
- Use `next/image` with a positioned parent, `fill`, meaningful `alt`, and an accurate `sizes` value for responsive festival imagery.
- All current festival IDs in discovery data must resolve to a detail record; unknown IDs must call `notFound()`.
- The source reference for visual comparison is `/var/folders/18/zsywvwpj29jbnnlynpkv4qrc0000gn/T/codex-clipboard-e47713d4-d9a7-4785-97f1-639e202af442.png`.
- Run focused tests with `pnpm --filter @haetteum/web exec vitest run <test-file>` so a focused check does not accidentally execute the whole suite.

---

## File Structure

### Create

- `apps/web/src/features/festivals/festival-detail-model.ts` — detail types, icon identifiers, href builder, lookup helpers, and static parameter projection.
- `apps/web/src/features/festivals/festival-detail.mock.ts` — one typed source of truth for every festival detail record.
- `apps/web/src/components/travel/festival-detail-header.tsx` — client back/save/share controls and share feedback.
- `apps/web/src/components/travel/festival-gallery.tsx` — client scroll-snap gallery and active image counter.
- `apps/web/src/components/travel/festival-summary.tsx` — title, date, location, rating, status, and tags.
- `apps/web/src/components/travel/festival-introduction.tsx` — client overflow-aware expand/collapse section.
- `apps/web/src/components/travel/festival-program-grid.tsx` — typed program icon mapping and program items.
- `apps/web/src/components/travel/festival-recommendation-points.tsx` — reusable recommendation reason cards.
- `apps/web/src/components/travel/nearby-course-list.tsx` — image-led nearby course rail and preparation notice.
- `apps/web/src/components/travel/festival-detail-actions.tsx` — fixed safe-area action bar and preparation notice.
- `apps/web/src/components/patterns/festival-detail-screen.tsx` — complete detail-page composition and bottom-bar space reservation.
- `apps/web/src/app/festivals/[festivalId]/page.tsx` — dynamic route, static params, dynamic metadata, lookup, and `notFound()`.
- `apps/web/src/app/festivals/[festivalId]/not-found.tsx` — scoped Korean 404 with a link back to discovery.
- `apps/web/tests/unit/features/festivals/festival-detail-model.test.ts` — catalog completeness, lookup, href, and static param tests.
- `apps/web/tests/unit/components/travel/festival-detail-components.test.tsx` — travel component rendering and interaction tests.
- `apps/web/tests/unit/components/patterns/festival-detail-screen.test.tsx` — section order and accessibility test.
- `apps/web/tests/unit/app/festival-detail-page.test.tsx` — known route, static params, and metadata tests.
- `apps/web/public/images/festivals/icheon-rice-cultural-festival/entrance.png` — landscape festival entrance hero.
- `apps/web/public/images/festivals/icheon-rice-cultural-festival/food-experience.png` — rice food and hands-on activity gallery image.
- `apps/web/public/images/festivals/icheon-rice-cultural-festival/culture-stage.png` — traditional performance and family audience gallery image.
- `design-qa.md` — iterative same-viewport visual comparison report.

### Modify

- `apps/web/src/features/discovery/main-discovery.mock.ts` — replace the inline festival array with the shared typed detail catalog.
- `apps/web/src/components/travel/festival-list-item.tsx` — accept `href` and expose the whole compact card as a link.
- `apps/web/src/components/travel/festival-ranking-card.tsx` — accept `href` and expose the whole ranking card as a link.
- `apps/web/src/components/travel/festival-card-rail.tsx` — build and pass each detail href.
- `apps/web/src/components/patterns/festival-section.tsx` — build and pass each compact-card detail href.
- `apps/web/tests/unit/components/travel/discovery-components.test.tsx` — update existing card contracts to include the href.
- `apps/web/tests/unit/components/travel/festival-discovery-components.test.tsx` — verify the ranking rail link contract.
- `apps/web/tests/unit/components/patterns/main-discovery.test.tsx` — verify the recommendation-tab festival link without altering existing region/order assertions.

---

### Task 1: Establish the festival detail contract and a complete shared catalog

**Files:**
- Create: `apps/web/src/features/festivals/festival-detail-model.ts`
- Create: `apps/web/src/features/festivals/festival-detail.mock.ts`
- Modify: `apps/web/src/features/discovery/main-discovery.mock.ts`
- Test: `apps/web/tests/unit/features/festivals/festival-detail-model.test.ts`

**Interfaces:**
- Consumes: `FestivalItem`, `DiscoveryImage`, and all current festival summary fields from `@/features/discovery/discovery-model`.
- Produces: `FestivalDetail`, `FestivalProgram`, `FestivalRecommendationPoint`, `NearbyCourse`, `festivalDetails`, `buildFestivalDetailHref(id)`, `getFestivalDetailById(id)`, and `getFestivalStaticParams()`.

- [ ] **Step 1: Write a failing completeness and lookup test**

```ts
import { describe, expect, it } from "vitest";

import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";
import { buildFestivalDetailHref } from "@/features/festivals/festival-detail-model";
import {
  festivalDetails,
  getFestivalDetailById,
  getFestivalStaticParams,
} from "@/features/festivals/festival-detail.mock";

describe("festival detail catalog", () => {
  it("resolves every discovery festival to a non-empty gallery", () => {
    for (const festival of mainDiscoveryMock.festivals) {
      const detail = getFestivalDetailById(festival.id);
      expect(detail?.title).toBe(festival.title);
      expect(detail?.gallery.length).toBeGreaterThan(0);
    }
  });

  it("returns undefined for an unknown id and builds stable routes", () => {
    expect(getFestivalDetailById("missing-festival")).toBeUndefined();
    expect(buildFestivalDetailHref("icheon-rice-cultural-festival")).toBe(
      "/festivals/icheon-rice-cultural-festival",
    );
  });

  it("projects every record into Next static params", () => {
    expect(getFestivalStaticParams()).toEqual(
      festivalDetails.map(({ id }) => ({ festivalId: id })),
    );
  });
});
```

- [ ] **Step 2: Run the focused test and verify the missing module failure**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/features/festivals/festival-detail-model.test.ts`

Expected: FAIL because `@/features/festivals/festival-detail-model` and `festival-detail.mock` do not exist.

- [ ] **Step 3: Add exact types and pure helper contracts**

```ts
import type {
  DiscoveryImage,
  FestivalItem,
} from "@/features/discovery/discovery-model";

export const festivalProgramIconIds = [
  "rice-bowl",
  "pavilion",
  "performance",
  "camera",
] as const;
export const festivalPointIconIds = [
  "leaf",
  "family",
  "food",
  "parking",
] as const;

export type FestivalProgramIconId =
  (typeof festivalProgramIconIds)[number];
export type FestivalPointIconId = (typeof festivalPointIconIds)[number];

export type FestivalProgram = {
  id: string;
  title: string;
  description: string;
  icon: FestivalProgramIconId;
};

export type FestivalRecommendationPoint = {
  id: string;
  title: string;
  description: string;
  icon: FestivalPointIconId;
};

export type NearbyCourse = {
  id: string;
  title: string;
  category: string;
  distanceLabel: string;
  image: DiscoveryImage;
};

export type FestivalDetail = FestivalItem & {
  rating: number;
  reviewCount: number;
  gallery: readonly DiscoveryImage[];
  introduction: string;
  programs: readonly FestivalProgram[];
  recommendationPoints: readonly FestivalRecommendationPoint[];
  nearbyCourses: readonly NearbyCourse[];
};

export function buildFestivalDetailHref(id: string) {
  return `/festivals/${encodeURIComponent(id)}`;
}
```

Keep `festival-detail-model.ts` limited to the types above and `buildFestivalDetailHref`. Implement the data-aware helpers in `festival-detail.mock.ts` with these exact signatures so the typed catalog depends on the model without a reverse import:

```ts
export function getFestivalDetailById(id: string) {
  return festivalDetails.find((festival) => festival.id === id);
}

export function getFestivalStaticParams() {
  return festivalDetails.map(({ id }) => ({ festivalId: id }));
}
```

- [ ] **Step 4: Create all current detail records with explicit content**

Create typed records for these exact IDs:

| ID | Title | Gallery source |
|---|---|---|
| `icheon-rice-cultural-festival` | 이천쌀문화축제 | three new generated images |
| `jeju-summer-light-garden` | 제주 여름빛 정원축제 | existing `festival-jeju.png` |
| `seogwipo-lantern-water` | 서귀포 등불 물빛축제 | existing `jeju-lantern-night.png` |
| `jeju-sea-fireworks-culture` | 제주 바다불꽃 문화제 | existing `jeju-fireworks-night.png` |
| `aewol-blue-sea-market` | 애월 푸른바다 마켓 | existing `aewol-seaside-market.png` |
| `halla-forest-music` | 한라 숲속 음악회 | existing `halla-forest-music.png` |
| `seongsan-sunrise-culture` | 성산 해맞이 문화마당 | existing `seongsan-sunrise-culture.png` |

Each record must contain:

- four programs using all four program icon identifiers;
- four recommendation points using all four point icon identifiers;
- three nearby courses drawn from the existing Icheon/Jeju place images with honest `category` and `distanceLabel` text;
- rating between `0` and `5`, a non-negative integer review count, and an introduction longer than 120 Korean characters so the expansion control can be exercised;
- the existing summary `image` unchanged so discovery screenshots do not regress.

Export the same `festivalDetails` array into `mainDiscoveryMock.festivals` instead of maintaining the current inline array. Structural typing allows `readonly FestivalDetail[]` to satisfy `readonly FestivalItem[]` while preserving one source of truth.

- [ ] **Step 5: Run the focused model test**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/features/festivals/festival-detail-model.test.ts`

Expected: PASS with three tests and no circular dependency error.

- [ ] **Step 6: Review checkpoint without Git mutation**

Run: `git diff --check -- apps/web/src/features/festivals apps/web/src/features/discovery/main-discovery.mock.ts apps/web/tests/unit/features/festivals/festival-detail-model.test.ts`

Expected: no output. Do not stage or commit.

---

### Task 2: Turn both festival card variants into accessible detail links

**Files:**
- Modify: `apps/web/src/components/travel/festival-list-item.tsx`
- Modify: `apps/web/src/components/travel/festival-ranking-card.tsx`
- Modify: `apps/web/src/components/travel/festival-card-rail.tsx`
- Modify: `apps/web/src/components/patterns/festival-section.tsx`
- Modify: `apps/web/tests/unit/components/travel/discovery-components.test.tsx`
- Modify: `apps/web/tests/unit/components/travel/festival-discovery-components.test.tsx`
- Modify: `apps/web/tests/unit/components/patterns/main-discovery.test.tsx`

**Interfaces:**
- Consumes: `buildFestivalDetailHref(id: string): string` from Task 1.
- Produces: `FestivalListItemProps = { festival: FestivalItem; href: string }` and `FestivalRankingCardProps = { festival: FestivalItem; href: string }` with one named link covering each complete card.

- [ ] **Step 1: Update tests first to require full-card links**

Add these assertions to the existing component suites:

```tsx
render(
  <FestivalRankingCard
    festival={festival}
    href="/festivals/jeju-summer-light-garden"
  />,
);

expect(
  screen.getByRole("link", { name: /1위 제주 여름빛 정원축제/ }),
).toHaveAttribute("href", "/festivals/jeju-summer-light-garden");
```

```tsx
render(
  <FestivalListItem
    festival={festival}
    href="/festivals/icheon-rice-cultural-festival"
  />,
);

expect(
  screen.getByRole("link", { name: /이천쌀문화축제/ }),
).toHaveAttribute("href", "/festivals/icheon-rice-cultural-festival");
```

In the assembled main test, assert that the recommendation-tab festival link points to `/festivals/icheon-rice-cultural-festival`. In the festival-tab test, assert all visible festival article cards have corresponding links.

- [ ] **Step 2: Run the two focused suites and verify prop/role failures**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/discovery-components.test.tsx tests/unit/components/travel/festival-discovery-components.test.tsx tests/unit/components/patterns/main-discovery.test.tsx`

Expected: FAIL because the card components do not accept `href` and render no detail links.

- [ ] **Step 3: Wrap each visual card with a Next Link without nested controls**

Use this semantic shape in both card components:

```tsx
<article aria-label={accessibleCardName} className={articleClassName}>
  <Link
    href={href}
    className="block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
  >
    <Card className="h-full transition-transform active:translate-y-px">
      {cardContent}
    </Card>
  </Link>
</article>
```

The actual implementation must keep the existing image sizing, rank/status badges, typography, date, location, and tag rendering unchanged. Do not put a link around an existing button and do not add `onClick` to a non-interactive container.

Use `buildFestivalDetailHref(festival.id)` inside `FestivalCardRail` and `FestivalSection`, then pass the result as `href`. This keeps route construction in the feature helper while letting the travel components render a supplied navigation target.

- [ ] **Step 4: Run the focused link tests**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/discovery-components.test.tsx tests/unit/components/travel/festival-discovery-components.test.tsx tests/unit/components/patterns/main-discovery.test.tsx`

Expected: PASS with existing card and page-order assertions preserved.

- [ ] **Step 5: Review checkpoint without Git mutation**

Run: `git diff --check -- apps/web/src/components/travel/festival-list-item.tsx apps/web/src/components/travel/festival-ranking-card.tsx apps/web/src/components/travel/festival-card-rail.tsx apps/web/src/components/patterns/festival-section.tsx apps/web/tests/unit/components/travel/discovery-components.test.tsx apps/web/tests/unit/components/travel/festival-discovery-components.test.tsx apps/web/tests/unit/components/patterns/main-discovery.test.tsx`

Expected: no output. Do not stage or commit.

---

### Task 3: Produce and inspect the three Icheon festival gallery assets

**Files:**
- Create: `apps/web/public/images/festivals/icheon-rice-cultural-festival/entrance.png`
- Create: `apps/web/public/images/festivals/icheon-rice-cultural-festival/food-experience.png`
- Create: `apps/web/public/images/festivals/icheon-rice-cultural-festival/culture-stage.png`
- Modify: `apps/web/src/features/festivals/festival-detail.mock.ts`

**Interfaces:**
- Consumes: the exact gallery paths declared by the Task 1 record.
- Produces: three coherent landscape raster assets suitable for an aspect-ratio `12/5` mobile hero with safe center cropping.

- [ ] **Step 1: Load and follow the `imagegen` skill before making assets**

Read `/Users/jeongsu/.codex/skills/.system/imagegen/SKILL.md` completely. Use ImageGen rather than CSS art, screenshot crops, emoji, handwritten SVG, or generic placeholders.

- [ ] **Step 2: Generate the entrance image**

Use the attached reference image only for composition density and warm autumn atmosphere. Generate a photorealistic Korean regional rice culture festival entrance in Icheon: a welcoming open plaza, golden rice fields, families walking toward cream-colored festival arches, subtle orange harvest decorations, clean late-afternoon light, spacious central focal area, landscape composition, no readable text, no logo, no phone frame, no watermark. Save the result to `entrance.png`.

- [ ] **Step 3: Generate the food and activity image**

Generate a photorealistic hands-on rice culture activity at the same Korean festival: families making rice cakes beside bowls of freshly cooked rice and harvest ingredients, warm cream and golden palette, candid documentary feeling, landscape composition, faces natural and secondary to the activity, no readable text, no logo, no watermark. Save the result to `food-experience.png`.

- [ ] **Step 4: Generate the culture stage image**

Generate a photorealistic traditional Korean outdoor performance at the same harvest festival: colorful performers on a small stage, seated families, golden rice decorations and soft evening light, cohesive visual grading with the other two images, landscape composition, no readable text, no logo, no watermark. Save the result to `culture-stage.png`.

- [ ] **Step 5: Inspect every asset at original detail**

Open all three files with the local image viewer. Reject and regenerate any asset with malformed faces or hands, accidental text, watermarking, mismatched season, insufficient landscape crop room, or a visual style that does not match the other two.

- [ ] **Step 6: Verify the files and catalog paths**

Run: `file apps/web/public/images/festivals/icheon-rice-cultural-festival/*.png`

Expected: exactly three valid PNG image files. Confirm the Icheon `gallery` array lists `entrance.png`, `food-experience.png`, and `culture-stage.png` in that order with distinct Korean alt text.

- [ ] **Step 7: Review checkpoint without Git mutation**

Run: `git status --short -- apps/web/public/images/festivals/icheon-rice-cultural-festival apps/web/src/features/festivals/festival-detail.mock.ts`

Expected: the three new assets and the intended mock update only. Do not stage or commit.

---

### Task 4: Build the reusable static detail presentation components

**Files:**
- Create: `apps/web/src/components/travel/festival-summary.tsx`
- Create: `apps/web/src/components/travel/festival-program-grid.tsx`
- Create: `apps/web/src/components/travel/festival-recommendation-points.tsx`
- Create: `apps/web/src/components/travel/nearby-course-list.tsx`
- Test: `apps/web/tests/unit/components/travel/festival-detail-components.test.tsx`

**Interfaces:**
- Consumes: `FestivalDetail`, `FestivalProgram`, `FestivalRecommendationPoint`, and `NearbyCourse` from Task 1.
- Produces: server-safe presentational components with no API calls, global state, routing logic, or untyped icon data.

- [ ] **Step 1: Write failing presentation tests**

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FestivalProgramGrid } from "@/components/travel/festival-program-grid";
import { FestivalRecommendationPoints } from "@/components/travel/festival-recommendation-points";
import { FestivalSummary } from "@/components/travel/festival-summary";
import { NearbyCourseList } from "@/components/travel/nearby-course-list";
import { festivalDetails } from "@/features/festivals/festival-detail.mock";

const festival = festivalDetails[0];

it("renders summary metadata and tags", () => {
  render(<FestivalSummary festival={festival} />);
  expect(screen.getByRole("heading", { name: festival.title })).toBeVisible();
  expect(screen.getByText(festival.dateLabel)).toBeVisible();
  expect(screen.getByText(festival.location)).toBeVisible();
  expect(screen.getByText(`${festival.rating.toFixed(1)}`)).toBeVisible();
});

it("renders every named program and recommendation point", () => {
  render(
    <>
      <FestivalProgramGrid programs={festival.programs} />
      <FestivalRecommendationPoints points={festival.recommendationPoints} />
    </>,
  );
  expect(screen.getAllByRole("listitem")).toHaveLength(8);
});

it("renders nearby courses as an image list", () => {
  render(<NearbyCourseList courses={festival.nearbyCourses} />);
  expect(
    within(screen.getByRole("list", { name: "주변 추천 코스" })).getAllByRole(
      "listitem",
    ),
  ).toHaveLength(3);
});
```

- [ ] **Step 2: Run the focused component test and verify missing component failures**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/festival-detail-components.test.tsx`

Expected: FAIL because the four component modules do not exist.

- [ ] **Step 3: Implement summary and icon-backed lists**

Implement these exact public signatures:

```ts
type FestivalSummaryProps = { festival: FestivalDetail };
type FestivalProgramGridProps = {
  programs: readonly FestivalProgram[];
};
type FestivalRecommendationPointsProps = {
  points: readonly FestivalRecommendationPoint[];
};
type NearbyCourseListProps = { courses: readonly NearbyCourse[] };
```

Map icon identifiers inside their consuming components:

```ts
const programIcons = {
  "rice-bowl": CookingPotIcon,
  pavilion: LandmarkIcon,
  performance: Music2Icon,
  camera: CameraIcon,
} satisfies Record<FestivalProgramIconId, LucideIcon>;

const pointIcons = {
  leaf: LeafIcon,
  family: UsersIcon,
  food: SoupIcon,
  parking: CircleParkingIcon,
} satisfies Record<FestivalPointIconId, LucideIcon>;
```

Use semantic section headings exactly `주요 프로그램`, `추천 포인트`, and `주변 추천 코스`. Render the program and point collections as semantic lists. Use a horizontally scrollable, snap-aligned nearby course list with `NextImage`, a positioned fixed-size thumbnail parent, `fill`, and `sizes="72px"`.

The summary must use `CalendarDaysIcon`, `MapPinIcon`, and `StarIcon`; display review count with `Intl.NumberFormat("ko-KR")`; and render status text as `진행 중` or `예정`. Do not add new raw hex colors.

- [ ] **Step 4: Run the focused component test**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/festival-detail-components.test.tsx`

Expected: PASS for summary, lists, and course images.

- [ ] **Step 5: Review checkpoint without Git mutation**

Run: `git diff --check -- apps/web/src/components/travel/festival-summary.tsx apps/web/src/components/travel/festival-program-grid.tsx apps/web/src/components/travel/festival-recommendation-points.tsx apps/web/src/components/travel/nearby-course-list.tsx apps/web/tests/unit/components/travel/festival-detail-components.test.tsx`

Expected: no output. Do not stage or commit.

---

### Task 5: Implement the isolated client interactions

**Files:**
- Create: `apps/web/src/components/travel/festival-detail-header.tsx`
- Create: `apps/web/src/components/travel/festival-gallery.tsx`
- Create: `apps/web/src/components/travel/festival-introduction.tsx`
- Create: `apps/web/src/components/travel/festival-detail-actions.tsx`
- Modify: `apps/web/src/components/travel/nearby-course-list.tsx`
- Modify: `apps/web/tests/unit/components/travel/festival-detail-components.test.tsx`

**Interfaces:**
- Consumes: `title: string`, `gallery: readonly DiscoveryImage[]`, `introduction: string`, and fixed Korean action labels.
- Produces: four explicit Client Components with local-only state and no persistence or API dependency.

- [ ] **Step 1: Add failing interaction tests**

Add `vi` to the Vitest imports, then add tests covering these outcomes:

```tsx
const routerMocks = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}));

it("toggles the local saved state", async () => {
  const user = userEvent.setup();
  render(<FestivalDetailHeader title="이천쌀문화축제" />);
  const save = screen.getByRole("button", { name: "축제 찜하기" });
  await user.click(save);
  expect(screen.getByRole("button", { name: "축제 찜 해제" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

it("copies the page URL when Web Share is unavailable", async () => {
  const user = userEvent.setup();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  Object.defineProperty(navigator, "share", {
    configurable: true,
    value: undefined,
  });
  render(<FestivalDetailHeader title="이천쌀문화축제" />);
  await user.click(screen.getByRole("button", { name: "축제 공유" }));
  expect(writeText).toHaveBeenCalledWith(window.location.href);
  expect(screen.getByRole("status")).toHaveTextContent("링크를 복사했어요");
});

it("expands and collapses the introduction", async () => {
  const user = userEvent.setup();
  const scrollHeight = vi
    .spyOn(HTMLElement.prototype, "scrollHeight", "get")
    .mockReturnValue(96);
  const clientHeight = vi
    .spyOn(HTMLElement.prototype, "clientHeight", "get")
    .mockReturnValue(42);
  render(
    <FestivalIntroduction
      introduction="임금님표 이천쌀의 우수성을 알리고 온 가족이 체험과 공연을 즐기는 축제 소개 문장입니다."
    />,
  );
  await user.click(screen.getByRole("button", { name: "축제 소개 더보기" }));
  expect(screen.getByRole("button", { name: "축제 소개 접기" })).toBeVisible();
  scrollHeight.mockRestore();
  clientHeight.mockRestore();
});

it("announces schedule and directions as upcoming features", async () => {
  const user = userEvent.setup();
  render(<FestivalDetailActions />);
  await user.click(screen.getByRole("button", { name: "일정에 추가" }));
  expect(screen.getByRole("status")).toHaveTextContent(
    "일정 추가는 준비 중인 기능이에요",
  );
});
```

Also add a gallery scroll test with `fireEvent.scroll` after defining `clientWidth` and `scrollLeft` on the list element, then assert the counter changes from `1/3` to `2/3`.

- [ ] **Step 2: Run the focused test and verify missing interaction modules**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/festival-detail-components.test.tsx`

Expected: FAIL because the four client modules do not exist.

- [ ] **Step 3: Implement header back, save, and share behavior**

Use `useRouter()` for the back control:

```ts
function handleBack() {
  if (window.history.length > 1) {
    router.back();
    return;
  }
  router.push("/");
}
```

Use `aria-pressed={saved}` and toggle the button label between `축제 찜하기` and `축제 찜 해제`. For share:

```ts
async function handleShare() {
  const url = window.location.href;
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      setShareStatus("공유했어요");
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    setShareStatus("링크를 복사했어요");
  } catch {
    setShareStatus("공유하지 못했어요");
  }
}
```

Render feedback as a visible compact status surface anchored below the header actions and also expose `role="status"`.

- [ ] **Step 4: Implement gallery and introduction behavior**

`FestivalGallery` must render an `aria-label="축제 이미지"` list, one `NextImage` per gallery record, CSS scroll snap, and this scroll calculation:

```ts
function handleScroll(event: UIEvent<HTMLUListElement>) {
  const { clientWidth, scrollLeft } = event.currentTarget;
  if (clientWidth === 0) return;
  setCurrentIndex(
    Math.min(gallery.length - 1, Math.max(0, Math.round(scrollLeft / clientWidth))),
  );
}
```

Use a `relative aspect-[12/5]` image parent, `fill`, `className="object-cover"`, and `sizes="(max-width: 480px) 100vw, 480px"`.

`FestivalIntroduction` must compare `scrollHeight` and `clientHeight` in a layout effect while collapsed. Only render the control when overflow exists; do not add a production prop whose only consumer is a test.

- [ ] **Step 5: Implement action and nearby-course preparation notices**

Use the existing `Button` component for `일정에 추가` and `길찾기`. Keep each actionable and announce distinct messages:

- `일정 추가는 준비 중인 기능이에요`
- `길찾기는 준비 중인 기능이에요`
- `주변 코스 전체보기는 준비 중인 기능이에요`

The fixed action bar must include `safe-area-bottom`, an opaque card surface, a top border, and two equal-width 52px actions. It must not render the main bottom navigation.

- [ ] **Step 6: Run the focused interaction tests**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/festival-detail-components.test.tsx`

Expected: PASS for save, share fallback, gallery counter, introduction, and preparation notices.

- [ ] **Step 7: Review checkpoint without Git mutation**

Run: `git diff --check -- apps/web/src/components/travel/festival-detail-header.tsx apps/web/src/components/travel/festival-gallery.tsx apps/web/src/components/travel/festival-introduction.tsx apps/web/src/components/travel/festival-detail-actions.tsx apps/web/src/components/travel/nearby-course-list.tsx apps/web/tests/unit/components/travel/festival-detail-components.test.tsx`

Expected: no output. Do not stage or commit.

---

### Task 6: Compose the page and connect the Next.js 16 route

**Files:**
- Create: `apps/web/src/components/patterns/festival-detail-screen.tsx`
- Create: `apps/web/src/app/festivals/[festivalId]/page.tsx`
- Create: `apps/web/src/app/festivals/[festivalId]/not-found.tsx`
- Test: `apps/web/tests/unit/components/patterns/festival-detail-screen.test.tsx`
- Test: `apps/web/tests/unit/app/festival-detail-page.test.tsx`

**Interfaces:**
- Consumes: `FestivalDetail`, `festivalDetails`, `getFestivalDetailById`, `getFestivalStaticParams`, and all detail components from Tasks 4–5.
- Produces: `FestivalDetailScreen({ festival })`, static route params, dynamic metadata, scoped 404, and the working `/festivals/[festivalId]` page.

- [ ] **Step 1: Write the failing screen order and accessibility test**

```tsx
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import { describe, expect, it, vi } from "vitest";

import { FestivalDetailScreen } from "@/components/patterns/festival-detail-screen";
import { festivalDetails } from "@/features/festivals/festival-detail.mock";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

describe("FestivalDetailScreen", () => {
  it("renders the approved section order and reserves fixed-action space", () => {
    const { container } = render(
      <FestivalDetailScreen festival={festivalDetails[0]} />,
    );
    expect(
      Array.from(container.querySelectorAll("[data-detail-region]")).map(
        (node) => node.getAttribute("data-detail-region"),
      ),
    ).toEqual([
      "header",
      "gallery",
      "summary",
      "introduction",
      "programs",
      "points",
      "nearby",
      "actions",
    ]);
    expect(container.firstElementChild).toHaveClass(
      "pb-[var(--festival-detail-action-reserve)]",
    );
  });

  it("has no detectable accessibility violations", async () => {
    const { container } = render(
      <FestivalDetailScreen festival={festivalDetails[0]} />,
    );
    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
```

- [ ] **Step 2: Write the failing route export test**

```tsx
import { describe, expect, it } from "vitest";

import FestivalDetailPage, {
  generateMetadata,
  generateStaticParams,
} from "@/app/festivals/[festivalId]/page";

describe("festival detail page", () => {
  it("exports every detail id as a static param", async () => {
    expect(await generateStaticParams()).toContainEqual({
      festivalId: "icheon-rice-cultural-festival",
    });
  });

  it("builds festival-specific metadata", async () => {
    await expect(
      generateMetadata({
        params: Promise.resolve({
          festivalId: "icheon-rice-cultural-festival",
        }),
      }),
    ).resolves.toMatchObject({
      title: "이천쌀문화축제 | 해뜸",
    });
  });

  it("returns the reusable screen for a known festival", async () => {
    const result = await FestivalDetailPage({
      params: Promise.resolve({ festivalId: "icheon-rice-cultural-festival" }),
    });
    expect(result.type).toBeDefined();
  });
});
```

- [ ] **Step 3: Run both focused tests and verify missing route/screen failures**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/patterns/festival-detail-screen.test.tsx tests/unit/app/festival-detail-page.test.tsx`

Expected: FAIL because the screen and route modules do not exist.

- [ ] **Step 4: Compose the detail screen**

Implement this public contract:

```tsx
type FestivalDetailScreenProps = { festival: FestivalDetail };

const detailStyle = {
  "--festival-detail-action-height": "5.25rem",
  "--festival-detail-action-reserve":
    "calc(var(--festival-detail-action-height) + var(--safe-area-bottom) + 24px)",
} as CSSProperties;
```

Render a `min-h-screen`, `max-w-[30rem]`, centered background surface and the exact approved data-region order. Wrap introduction, programs, points, and nearby content in bordered card sections with existing radius and border tokens. Do not create a desktop-only alternate information architecture.

Render `programs`, `points`, and `nearby` regions only when their corresponding arrays contain at least one item. The approved Icheon record contains all three regions, so its order test remains exact; sparse future records must not receive empty bordered sections.

- [ ] **Step 5: Implement the Next.js 16 route and scoped 404**

Use the Promise-based route contract confirmed in the local Next.js docs:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FestivalDetailScreen } from "@/components/patterns/festival-detail-screen";
import {
  getFestivalDetailById,
  getFestivalStaticParams,
} from "@/features/festivals/festival-detail.mock";

type FestivalDetailPageProps = {
  params: Promise<{ festivalId: string }>;
};

export function generateStaticParams() {
  return getFestivalStaticParams();
}

export async function generateMetadata({
  params,
}: FestivalDetailPageProps): Promise<Metadata> {
  const { festivalId } = await params;
  const festival = getFestivalDetailById(festivalId);
  if (!festival) notFound();
  return {
    title: `${festival.title} | 해뜸`,
    description: `${festival.dateLabel} ${festival.location}에서 열리는 ${festival.title} 정보를 확인해 보세요.`,
  };
}

export default async function FestivalDetailPage({
  params,
}: FestivalDetailPageProps) {
  const { festivalId } = await params;
  const festival = getFestivalDetailById(festivalId);
  if (!festival) notFound();
  return <FestivalDetailScreen festival={festival} />;
}
```

The scoped `not-found.tsx` must render `축제를 찾을 수 없어요`, explain that the festival may have ended or the address may be incorrect, and provide a Next Link labeled `축제 목록으로 돌아가기` pointing to `/?region=gyeonggi&tab=festivals`.

- [ ] **Step 6: Run the focused route and screen tests**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/patterns/festival-detail-screen.test.tsx tests/unit/app/festival-detail-page.test.tsx`

Expected: PASS for section order, axe, static params, metadata, and known-page composition.

- [ ] **Step 7: Review checkpoint without Git mutation**

Run: `git diff --check -- apps/web/src/components/patterns/festival-detail-screen.tsx apps/web/src/app/festivals/[festivalId]/page.tsx apps/web/src/app/festivals/[festivalId]/not-found.tsx apps/web/tests/unit/components/patterns/festival-detail-screen.test.tsx apps/web/tests/unit/app/festival-detail-page.test.tsx`

Expected: no output. Do not stage or commit.

---

### Task 7: Run full verification and blocking visual QA

**Files:**
- Create: `design-qa.md`
- Modify only when visual or functional evidence identifies a defect: files created or modified in Tasks 1–6.

**Interfaces:**
- Consumes: the complete card-to-detail journey and the original reference image.
- Produces: fresh test/lint/build evidence, responsive screenshots, verified interactions, and `design-qa.md` with `final result: passed` or an honest blocked result.

- [ ] **Step 1: Run focused feature verification together**

Run:

```bash
pnpm --filter @haetteum/web exec vitest run \
  tests/unit/features/festivals/festival-detail-model.test.ts \
  tests/unit/components/travel/festival-detail-components.test.tsx \
  tests/unit/components/travel/discovery-components.test.tsx \
  tests/unit/components/travel/festival-discovery-components.test.tsx \
  tests/unit/components/patterns/festival-detail-screen.test.tsx \
  tests/unit/components/patterns/main-discovery.test.tsx \
  tests/unit/app/festival-detail-page.test.tsx
```

Expected: all named files pass. Fix only feature-related failures and rerun this command until green.

- [ ] **Step 2: Run the complete web checks**

Run these commands independently:

```bash
pnpm --filter @haetteum/web test
pnpm --filter @haetteum/web lint
pnpm --filter @haetteum/web build
```

Expected: all web tests pass, ESLint exits 0, and the production build lists `/festivals/[festivalId]` without route or metadata errors. Report unrelated failures separately rather than changing unrelated code.

- [ ] **Step 3: Start the local web app without colliding with another Next process**

First inspect existing listeners and processes. If no matching web dev server exists, run `pnpm --filter @haetteum/web dev` from the repository root in a persistent terminal session. Do not run `next build` while that same `.next` directory is actively being mutated by `next dev`.

- [ ] **Step 4: Load the in-app Browser skill and inspect the core journey**

Use the in-app Browser for Codex Desktop. Open the local main page with the 경기 추천 state, click the visible 이천쌀문화축제 card, and confirm the URL becomes `/festivals/icheon-rice-cultural-festival`.

Verify:

- back returns to the prior list;
- the three gallery images scroll and the counter changes;
- save toggles visibly and accessibly;
- share uses the available browser behavior without a console error;
- introduction expands and collapses;
- schedule, directions, and nearby-course full view show preparation notices;
- an unknown festival URL renders the scoped 404;
- the browser console contains no page errors.

- [ ] **Step 5: Capture responsive evidence**

Capture the same top-of-detail state at 320px, 390px, 480px, and a viewport wider than 480px. Capture the lower page with the fixed action bar at 390px. Confirm:

- no horizontal overflow;
- no content hidden under the fixed action bar;
- the gallery crop preserves the subject;
- program and point labels remain readable;
- the app surface is centered at wide viewport;
- safe-area and 44px touch targets remain intact.

- [ ] **Step 6: Run the blocking Product Design comparison**

Load and follow the Product Design `design-qa` skill. Open the original reference and the 390px implementation capture together, compare the same scroll position and interaction state, and create `design-qa.md` with categorized P0–P3 findings.

Fix every P0, P1, and P2 issue, recapture, and repeat the combined-image comparison. Stop only when the report contains exactly:

```text
final result: passed
```

If the reference, implementation capture, or browser comparison cannot be performed, write `final result: blocked` and report the missing evidence instead of claiming visual completion.

- [ ] **Step 7: Final workspace and scope audit**

Run:

```bash
git diff --check
git status --short
```

Expected: no whitespace errors. Review every changed path against this plan, preserve all pre-existing unrelated changes, and do not stage or commit.

- [ ] **Step 8: Prepare the evidence-based handoff**

Report:

- the working local detail URL;
- the card-to-detail, save, share, gallery, introduction, preparation notice, and 404 outcomes actually observed;
- exact focused/full test counts, lint result, build result, and route output;
- visual QA result and remaining P3 polish only;
- that Git operations were not performed.
