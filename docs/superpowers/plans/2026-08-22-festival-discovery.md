# Festival Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 해뜸 메인 화면을 유지하면서 `관광 축제` 탭에 URL 기반 필터, 순위형 축제 카드, 월간 테마와 AI 축제 코스를 추가한다.

**Architecture:** `features/discovery`가 query와 필터링된 표시 모델을 계산하고, `components/travel`이 props 기반 축제 UI를 표현하며, `FestivalDiscovery` pattern이 축제 탭을 조합한다. 추천 탭의 기존 `FestivalSection`은 유지하고 `MainDiscovery`가 탭에 따라 간단 축제 목록과 전용 축제 탐색 화면을 분기한다.

**Tech Stack:** Next.js 16.3.1 App Router, React 19.2.8, TypeScript, Tailwind CSS 4, shadcn/Base UI, Next Image, Vitest, Testing Library, axe-core

**Spec:** `docs/superpowers/specs/2026-08-22-festival-discovery-design.md`

## Global Constraints

- 공통 히어로, 검색 패널, 콘텐츠 탭, 지역 선택과 하단 내비게이션의 현재 디자인을 유지한다.
- 사용자 참고 이미지의 서비스명, 축제명, 날짜, 순위와 사진을 제품 데이터로 복제하지 않는다.
- 실제 API, React Query, Zustand, 인증 또는 신규 route를 추가하지 않는다.
- `components/ui`에는 여행 도메인 타입이나 화면 조건을 넣지 않는다.
- 필터 상태는 기존 `q`, `region`, `tab`과 함께 URL query로 직렬화한다.
- Client Component는 `더 많은 축제 보기`와 기존 AI CTA처럼 상태가 필요한 가장 작은 경계에만 사용한다.
- 모든 필터와 CTA의 최소 터치 높이는 44px이다.
- 이미지 자산은 `apps/web/public/images/discovery/festivals/`에 저장하고 외부 런타임 이미지 의존성을 만들지 않는다.
- 현재 사용자 작업을 보존하고 Git stage, commit, branch, push를 수행하지 않는다.

---

## File Map

- Modify `apps/web/src/features/discovery/discovery-model.ts`: 축제 query, 필터링과 URL 생성
- Modify `apps/web/src/features/discovery/main-discovery.mock.ts`: 축제 카드, 월간 테마와 이미지 경로
- Create `apps/web/src/components/ui/badge.tsx`: shadcn Badge Foundation
- Create `apps/web/src/components/travel/festival-filter-group.tsx`: URL 링크형 축제 필터
- Create `apps/web/src/components/travel/festival-ranking-card.tsx`: 순위형 축제 표현
- Create `apps/web/src/components/travel/festival-feature-banner.tsx`: 이달의 축제 표현
- Create `apps/web/src/components/travel/festival-card-rail.tsx`: 더 보기 상태를 소유하는 최소 Client Component
- Modify `apps/web/src/components/travel/ai-course-banner.tsx`: 기본값을 유지하는 문구 주입 API
- Create `apps/web/src/components/patterns/festival-discovery.tsx`: 축제 탭 조합과 더 보기 상태
- Modify `apps/web/src/components/patterns/main-discovery.tsx`: 추천/축제 패턴 분기
- Modify `apps/web/src/components/patterns/discovery-search-panel.tsx`: 축제 query를 보존하는 탭·지역 링크
- Modify focused tests under `apps/web/tests/unit/features/discovery` and `apps/web/tests/unit/components`
- Modify `DESIGN.md`: 구현된 축제 컴포넌트와 축제 탭 패턴 기록
- Create `design-qa.md`: 참고 이미지와 최종 구현 비교 결과
- Create local PNG assets under `apps/web/public/images/discovery/festivals/`

---

### Task 1: Festival Query And View Model

**Files:**
- Modify: `apps/web/src/features/discovery/discovery-model.ts`
- Test: `apps/web/tests/unit/features/discovery/discovery-model.test.ts`

**Interfaces:**
- Consumes: 기존 `DiscoverySearchParams`, `DiscoveryQuery`, `buildDiscoveryHref`, `selectDiscoveryView`
- Produces: `FestivalFilterKey`, `FestivalFilters`, 확장된 `FestivalItem`, `buildFestivalFilterHref(query, filter)`, `buildFestivalResetHref(query)`, `DiscoveryView.showFestivalDiscovery`

- [ ] **Step 1: Write failing query parsing tests**

```ts
it("parses approved festival filters and rejects unknown values", () => {
  expect(
    parseDiscoveryQuery({
      tab: "festivals",
      festivalStatus: "ongoing",
      festivalPeriod: "week",
      festivalPrice: "free",
      festivalAudience: "family",
    }),
  ).toMatchObject({
    tab: "festivals",
    festivalFilters: {
      ongoing: true,
      thisWeek: true,
      free: true,
      family: true,
    },
  });

  expect(
    parseDiscoveryQuery({ festivalStatus: "ended" }).festivalFilters,
  ).toEqual({ ongoing: false, thisWeek: false, free: false, family: false });
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/features/discovery/discovery-model.test.ts`

Expected: FAIL because `festivalFilters` is not part of `DiscoveryQuery`.

- [ ] **Step 3: Add exact festival model types**

```ts
export const festivalFilterKeys = [
  "ongoing",
  "thisWeek",
  "free",
  "family",
] as const;

export type FestivalFilterKey = (typeof festivalFilterKeys)[number];
export type FestivalFilters = Record<FestivalFilterKey, boolean>;
export type FestivalStatus = "ongoing" | "upcoming";
export type FestivalAudience = "family" | "friends" | "couple";

export type DiscoveryQuery = {
  q: string;
  region: RegionId;
  tab: DiscoveryTabId;
  festivalFilters: FestivalFilters;
};
```

Extend `FestivalItem` with `rank: number`, `status`, `isThisWeek`, `isFree`, `audiences`, and `tags`. Add a serializable `FestivalFeature` type with `eyebrow`, `title`, `description`, `dateLabel`, `tags`, and `image`.

- [ ] **Step 4: Implement parsing and URL serialization**

`parseDiscoveryQuery` maps only these exact query pairs to `true`:

```ts
festivalStatus === "ongoing"
festivalPeriod === "week"
festivalPrice === "free"
festivalAudience === "family"
```

`buildDiscoveryHref` serializes each active filter after `tab`. `buildFestivalFilterHref` toggles one filter and preserves the other query state. `buildFestivalResetHref` clears only festival filters and preserves `q`, `region`, and `tab`.

- [ ] **Step 5: Write and run filtering tests**

```ts
it("combines region, search, and active festival filters", () => {
  const view = selectDiscoveryView(mainDiscoveryMock, {
    q: "제주",
    region: "jeju",
    tab: "festivals",
    festivalFilters: {
      ongoing: true,
      thisWeek: false,
      free: true,
      family: true,
    },
  });

  expect(view.showFestivalDiscovery).toBe(true);
  expect(view.showFestivals).toBe(false);
  expect(
    view.festivals.every(
      (festival) =>
        festival.status === "ongoing" &&
        festival.isFree &&
        festival.audiences.includes("family"),
    ),
  ).toBe(true);
});
```

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/features/discovery/discovery-model.test.ts`

Expected: PASS.

- [ ] **Step 6: Check the task diff**

Run: `git diff --check -- apps/web/src/features/discovery/discovery-model.ts apps/web/tests/unit/features/discovery/discovery-model.test.ts`

Expected: no output. Do not stage or commit.

---

### Task 2: Mock Festival Content And Local Assets

**Files:**
- Modify: `apps/web/src/features/discovery/main-discovery.mock.ts`
- Create: `apps/web/public/images/discovery/festivals/jeju-lantern-night.png`
- Create: `apps/web/public/images/discovery/festivals/jeju-fireworks-night.png`
- Create: `apps/web/public/images/discovery/festivals/aewol-seaside-market.png`
- Create: `apps/web/public/images/discovery/festivals/halla-forest-music.png`
- Create: `apps/web/public/images/discovery/festivals/seongsan-sunrise-culture.png`
- Create: `apps/web/public/images/discovery/festivals/jeju-autumn-walk-feature.png`
- Test: `apps/web/tests/unit/features/discovery/discovery-model.test.ts`

**Interfaces:**
- Consumes: Task 1 `FestivalItem` and `FestivalFeature`
- Produces: six Jeju festival records, `festivalFeature`, reusable existing `aiCourse` image

- [ ] **Step 1: Add a failing mock-shape test**

```ts
it("provides enough ranked Jeju festivals for preview and expansion", () => {
  expect(mainDiscoveryMock.festivals).toHaveLength(6);
  expect(mainDiscoveryMock.festivals.map((festival) => festival.rank)).toEqual([
    1, 2, 3, 4, 5, 6,
  ]);
  expect(mainDiscoveryMock.festivalFeature.title).toBe("제주 가을 산책 주간");
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/features/discovery/discovery-model.test.ts`

Expected: FAIL because only one festival and no `festivalFeature` exist.

- [ ] **Step 3: Generate the missing raster assets**

Use the ImageGen workflow once per output with these art directions:

```text
jeju-lantern-night.png: vertical 4:5 realistic editorial travel photo, floating lanterns and warm lights beside a calm Jeju pond at blue hour, Korean festival atmosphere, no text, no logo, no UI
jeju-fireworks-night.png: vertical 4:5 realistic editorial travel photo, colorful fireworks above a Jeju coastal night festival, silhouettes safely behind a railing, no text, no logo, no UI
aewol-seaside-market.png: vertical 4:5 realistic editorial travel photo, cheerful daytime seaside craft market in Aewol, canvas booths and ocean light, no readable signs, no logo, no UI
halla-forest-music.png: vertical 4:5 realistic editorial travel photo, intimate acoustic music gathering in a green Jeju forest clearing, warm natural light, no text, no logo, no UI
seongsan-sunrise-culture.png: vertical 4:5 realistic editorial travel photo, dawn cultural gathering near Seongsan Ilchulbong with subtle traditional fabric decorations, no text, no logo, no UI
jeju-autumn-walk-feature.png: horizontal 16:9 realistic editorial travel photo, autumn walking path on Jeju with orange foliage and a small group walking away, focal point on right half, quiet morning light, no text, no logo, no UI
```

Inspect each generated image before placing it in `apps/web/public/images/discovery/festivals/`. The existing `festival-jeju.png` remains the first card image.

- [ ] **Step 4: Add six exact mock festival records**

Use product-owned mock titles: `제주 여름빛 정원축제`, `서귀포 등불 물빛축제`, `제주 바다불꽃 문화제`, `애월 푸른바다 마켓`, `한라 숲속 음악회`, `성산 해맞이 문화마당`. All six use `region: "jeju"`; statuses, week/free/family flags and tags must be varied so every filter and the empty state are testable.

- [ ] **Step 5: Run model tests and inspect assets**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/features/discovery/discovery-model.test.ts`

Expected: PASS.

Open each of the six new PNG files with the image viewer and confirm the required subject, crop and absence of embedded UI text.

- [ ] **Step 6: Check the task diff**

Run: `git diff --check -- apps/web/src/features/discovery/main-discovery.mock.ts apps/web/tests/unit/features/discovery/discovery-model.test.ts`

Expected: no output. Do not stage or commit.

---

### Task 3: Reusable shadcn Festival Components

**Files:**
- Create: `apps/web/src/components/ui/badge.tsx`
- Create: `apps/web/src/components/travel/festival-filter-group.tsx`
- Create: `apps/web/src/components/travel/festival-ranking-card.tsx`
- Create: `apps/web/src/components/travel/festival-feature-banner.tsx`
- Create: `apps/web/src/components/travel/festival-card-rail.tsx`
- Modify: `apps/web/src/components/travel/ai-course-banner.tsx`
- Modify: `apps/web/tests/unit/components/travel/discovery-components.test.tsx`
- Modify: `apps/web/tests/unit/components/ui/components.test.tsx`

**Interfaces:**
- Consumes: Task 1 `FestivalFilterKey`, `FestivalItem`, `FestivalFeature`, URL builders
- Produces: `FestivalFilterGroup`, `FestivalRankingCard`, `FestivalFeatureBanner`, `FestivalCardRail`, configurable `AiCourseBanner`

- [ ] **Step 1: Write failing component contract tests**

```tsx
expect(
  screen.getByRole("article", { name: "1위 제주 여름빛 정원축제" }),
).toBeVisible();
expect(screen.getByText("진행 중")).toBeVisible();
expect(screen.getByRole("link", { name: /이번 주/ })).toHaveAttribute(
  "aria-current",
  "true",
);
expect(
  screen.getByRole("heading", { name: "제주 가을 산책 주간" }),
).toBeVisible();
```

- [ ] **Step 2: Run focused component tests and confirm RED**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/discovery-components.test.tsx tests/unit/components/ui/components.test.tsx`

Expected: FAIL because the four new component modules do not exist.

- [ ] **Step 3: Add the shadcn Badge component**

From `apps/web`, run `pnpm exec shadcn add badge --yes`. Inspect the generated file and retain Base UI/Rhea conventions already configured by `apps/web/components.json`. Add a Foundation test that renders default and secondary variants without travel-specific props.

- [ ] **Step 4: Implement `FestivalFilterGroup`**

Render an aria-labelled horizontal list of four Next `Link` pills using `buildFestivalFilterHref`. Each link has `h-11`, `scroll={false}`, `aria-current="true"` only when active, visible label, and an `sr-only` `선택됨` suffix when active. Do not nest links inside Toggle buttons.

- [ ] **Step 5: Implement `FestivalRankingCard`**

Use Next `Image`, shadcn `Card` and `Badge`. Render a fixed-width `article` named `${rank}위 ${title}`, a 4:5 image region, rank badge at top-left, status badge at top-right, title, date, location and at most two tags. The component receives only `festival: FestivalItem`.

- [ ] **Step 6: Implement `FestivalFeatureBanner`**

Use shadcn `Card` with a two-column mobile layout. Text occupies 58%, the `fill` Next Image occupies the right 42%, and the image uses `sizes="(max-width: 480px) 42vw, 202px"`. Render eyebrow, heading, description, date and tags from `FestivalFeature`.

- [ ] **Step 7: Implement the minimal `FestivalCardRail` client boundary**

Create a `"use client"` component that receives `festivals: readonly FestivalItem[]`, renders the first four items initially, and uses one `expanded` boolean to render all items after `더 많은 축제 보기` is pressed. After expansion, replace the button with `role="status"` text `추가 축제를 모두 펼쳤어요`. Keep `FestivalRankingCard` itself server-compatible and free of state.

- [ ] **Step 8: Generalize `AiCourseBanner` without breaking defaults**

Add optional props with these defaults:

```ts
eyebrow = "AI 여행 코스"
title = "제주 여행 코스를 추천받아 보세요"
description = "지금 선택한 여행지와 축제를 바탕으로 하루 코스를 준비해요."
buttonLabel = "코스 추천받기"
successMessage = "제주 하루 코스 추천을 준비했어요."
```

Existing callers and tests must remain valid; the festival pattern will provide festival-specific strings.

- [ ] **Step 9: Run focused tests and check the task diff**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/discovery-components.test.tsx tests/unit/components/ui/components.test.tsx`

Expected: PASS.

Run: `git diff --check -- apps/web/src/components/ui apps/web/src/components/travel apps/web/tests/unit/components`

Expected: no output. Do not stage or commit.

---

### Task 4: Festival Tab Pattern And Main Integration

**Files:**
- Create: `apps/web/src/components/patterns/festival-discovery.tsx`
- Modify: `apps/web/src/components/patterns/main-discovery.tsx`
- Modify: `apps/web/src/components/patterns/discovery-search-panel.tsx`
- Modify: `apps/web/tests/unit/components/patterns/main-discovery.test.tsx`
- Modify: `apps/web/tests/unit/features/discovery/discovery-content.test.tsx`

**Interfaces:**
- Consumes: Task 1 `DiscoveryQuery`, filtered `DiscoveryView.festivals`, Task 2 `festivalFeature`, Task 3 presentation components
- Produces: server-compatible `FestivalDiscovery` composition and the festival-tab branch in `MainDiscovery`

- [ ] **Step 1: Write failing festival-tab composition tests**

```tsx
const query = parseDiscoveryQuery({ tab: "festivals", region: "jeju" });
const view = selectDiscoveryView(mainDiscoveryMock, query);
render(<MainDiscovery data={mainDiscoveryMock} query={query} view={view} />);

expect(screen.getByRole("heading", { name: "관광 축제" })).toBeVisible();
expect(
  screen.queryByRole("heading", { name: "지역별 인기 관광지 TOP 3" }),
).not.toBeInTheDocument();
expect(screen.queryByText("AI 여행 코스")).not.toBeInTheDocument();
expect(screen.getByText("AI 축제 코스")).toBeVisible();
expect(screen.getAllByRole("article", { name: /위 / })).toHaveLength(4);
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/patterns/main-discovery.test.tsx tests/unit/features/discovery/discovery-content.test.tsx`

Expected: FAIL because `FestivalDiscovery` does not exist and `MainDiscovery` still renders the compact festival section.

- [ ] **Step 3: Implement `FestivalDiscovery`**

Keep this pattern server-compatible. Render title, `FestivalFilterGroup`, `FestivalCardRail`, `FestivalFeatureBanner`, and `AiCourseBanner` configured with:

```text
eyebrow: AI 축제 코스
title: 선택한 축제로 하루 코스를 만들어 보세요
description: 축제 일정과 주변 여행지를 자연스럽게 이어 드려요.
buttonLabel: 축제 코스 추천받기
successMessage: 제주 축제 하루 코스 추천을 준비했어요.
```

When the filtered result is empty, render the approved empty message and `buildFestivalResetHref(query)` link before the two banners.

- [ ] **Step 4: Branch `MainDiscovery` by tab**

For `query.tab === "festivals"`, render only `FestivalDiscovery` inside the list region. For other tabs preserve the existing place/banner/compact festival ordering. Keep the five main region test IDs and fixed navigation unchanged.

- [ ] **Step 5: Preserve festival query through shared links**

Ensure every `DiscoverySearchPanel` tab and region link uses the extended `buildDiscoveryHref`. When moving between tab or region, active festival filters remain serialized; `q`, `region`, and `tab` remain present according to existing rules.

- [ ] **Step 6: Test expansion, empty state and accessibility**

Use `userEvent` to click `더 많은 축제 보기`, assert six ranked articles and `추가 축제를 모두 펼쳤어요`. Add a filtered-empty render that asserts the reset link. Run axe on the assembled festival tab with color contrast disabled for jsdom consistency, matching the existing test convention.

- [ ] **Step 7: Run focused tests and check the task diff**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/patterns/main-discovery.test.tsx tests/unit/features/discovery/discovery-content.test.tsx`

Expected: PASS.

Run: `git diff --check -- apps/web/src/components/patterns apps/web/tests/unit/components/patterns apps/web/tests/unit/features/discovery`

Expected: no output. Do not stage or commit.

---

### Task 5: Design-System Documentation And Automated Regression

**Files:**
- Modify: `DESIGN.md`
- Modify: all focused festival tests from Tasks 1–4

**Interfaces:**
- Consumes: completed festival tab implementation
- Produces: current design-system inventory and full automated verification evidence

- [ ] **Step 1: Update `DESIGN.md`**

Record `Badge` under implemented Foundation, `FestivalFilterGroup`, `FestivalRankingCard`, and `FestivalFeatureBanner` under implemented travel components, and `FestivalDiscovery` under implemented patterns. Add the URL-filtered festival tab to the MainDiscovery interaction contract without changing `/welcome` or unimplemented route claims.

- [ ] **Step 2: Run all web unit and component tests**

Run: `pnpm --filter @haetteum/web test`

Expected: all web Vitest files pass.

- [ ] **Step 3: Run lint and production build**

Run: `pnpm --filter @haetteum/web lint`

Expected: exit 0.

Run: `pnpm --filter @haetteum/web build`

Expected: exit 0 with `/`, `/welcome`, and `/design-system` successfully built according to the current route configuration.

- [ ] **Step 4: Check the complete scoped diff**

Run: `git diff --check -- DESIGN.md apps/web docs/superpowers/specs/2026-08-22-festival-discovery-design.md docs/superpowers/plans/2026-08-22-festival-discovery.md`

Expected: no output. Do not stage or commit.

---

### Task 6: Browser Verification And Design QA

**Files:**
- Create: `design-qa.md`
- Modify: only scoped festival UI/assets/tests if visible P0/P1/P2 issues are found

**Interfaces:**
- Consumes: reference PNG `/var/folders/18/zsywvwpj29jbnnlynpkv4qrc0000gn/T/codex-clipboard-c630852c-475d-4103-bd67-80ae114d7a2e.png` and running local `/` implementation
- Produces: same-state screenshots, interaction evidence and a passing Product Design QA report

- [ ] **Step 1: Start only the web development server**

Run: `pnpm dev:web`

Use a free local port selected by Next.js and record the actual URL. Do not start `next build` while this development process is using the same `.next` directory.

- [ ] **Step 2: Open the festival state in the in-app browser**

Open `/?region=jeju&tab=festivals#festivals`. Verify the common hero/search/navigation remain unchanged, then test each filter link, `더 많은 축제 보기`, and `축제 코스 추천받기`.

- [ ] **Step 3: Capture matching responsive states**

Capture 320px, 390px and 480px mobile widths plus a wide viewport showing the centered 480px app surface. Confirm only the filter and card rails scroll horizontally, card image crops remain stable, and the bottom navigation does not cover the final banner.

- [ ] **Step 4: Run the Product Design comparison gate**

Open the reference PNG and the latest 390px festival screenshot together. Write `design-qa.md` with visible difference severity, fix all P0/P1/P2 items, recapture and repeat until the final line is exactly `final result: passed`. Remaining P3 polish may be listed separately.

- [ ] **Step 5: Final verification after visual fixes**

Run:

```bash
pnpm --filter @haetteum/web test
pnpm --filter @haetteum/web lint
pnpm --filter @haetteum/web build
git diff --check -- DESIGN.md apps/web design-qa.md docs/superpowers/specs/2026-08-22-festival-discovery-design.md docs/superpowers/plans/2026-08-22-festival-discovery.md
```

Expected: all commands exit 0 and `design-qa.md` ends with `final result: passed`. Do not stage or commit.
