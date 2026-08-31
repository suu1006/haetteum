# Feature-First Frontend Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `apps/web` so feature-specific API, model, state, components, and tests live together behind feature public APIs while preserving current product behavior.

**Architecture:** Keep Next.js `app` as the URL and server boundary, place feature-owned code under `src/features/<feature>/{api,model,components}`, and move only genuinely cross-feature code to `src/shared`. Add an executable import-boundary test before moving files so the target dependency rules drive the refactor.

**Tech Stack:** Next.js 16.3.1 App Router, React 19.2.8, TypeScript 5 strict mode, React Query 5, Zustand 5, Vitest 4, ESLint 9, pnpm 10

**Spec:** `docs/superpowers/specs/2026-08-31-feature-first-frontend-architecture-design.md`

## Global Constraints

- Preserve all existing uncommitted and staged user changes; never restore a file from `HEAD` over the working tree.
- Preserve rendered behavior, routes, API contracts, state transitions, user copy, and styles.
- Read `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md` before changing source structure and heed Next.js 16 conventions.
- Feature internals may import their own relative files, `@/shared/*`, and `@/components/ui/*`.
- Cross-feature consumers and `app` routes may import only `@/features/<feature>` public entry points.
- `shared` may not import `features` or `app`; `components/ui` may not import domain code.
- Use `@haetteum/contracts` as the API response type source; do not duplicate contract types.
- Use path-scoped commits (`git commit --only -- <paths>`) because unrelated files are already staged.

---

### Task 1: Establish the baseline and executable dependency rules

**Files:**
- Create: `apps/web/tests/unit/architecture/feature-boundaries.test.ts`
- Read: `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md`
- Read: `apps/web/tsconfig.json`
- Read: `apps/web/vitest.config.mts`

**Interfaces:**
- Consumes: current `apps/web/src` filesystem and `@/*` import convention
- Produces: a filesystem-level Vitest test that reports forbidden source/import pairs

- [ ] **Step 1: Record the existing verification baseline**

Run:

```bash
pnpm --filter @haetteum/web test
pnpm --filter @haetteum/web exec tsc --noEmit
pnpm --filter @haetteum/web lint
```

Record any pre-existing failures in the implementation log. Do not fix unrelated failures.

- [ ] **Step 2: Write the failing architecture test**

Create `apps/web/tests/unit/architecture/feature-boundaries.test.ts` with a small recursive source scanner using `node:fs` and `node:path`. It must collect `.ts` and `.tsx` files under `src`, extract static imports with `/from\s+["']([^"']+)["']/g`, and assert these violations are empty:

```ts
type Violation = { file: string; imported: string; reason: string };

// 1. src/shared/** importing @/features/** or @/app/**
// 2. src/components/ui/** importing @/features/**, @/shared/components/**,
//    or @haetteum/contracts
// 3. src/app/** deep-importing @/features/<name>/**
// 4. src/features/<owner>/** importing @/features/<other>/**
//    unless the import is exactly @/features/<other>
// 5. any source import of the legacy @/components/patterns/** or
//    @/components/travel/** paths
```

Use one assertion so the failure prints every violation:

```ts
expect(violations, violations.map(formatViolation).join("\n")).toEqual([]);
```

- [ ] **Step 3: Run the test and verify RED**

Run:

```bash
pnpm --filter @haetteum/web test -- tests/unit/architecture/feature-boundaries.test.ts
```

Expected: FAIL listing current legacy component imports, app deep imports, and cross-feature deep imports. Confirm the test fails because the current architecture violates the target rules, not because filesystem paths are wrong.

- [ ] **Step 4: Commit only the failing test**

```bash
git commit --only apps/web/tests/unit/architecture/feature-boundaries.test.ts -m "test(web): feature 경계 규칙 추가"
```

Expected: a red-test commit containing no pre-existing staged files.

---

### Task 2: Create the shared foundation and shared models

**Files:**
- Create: `apps/web/src/shared/model/image.ts`
- Create: `apps/web/src/shared/query/query-client.ts`
- Create: `apps/web/src/shared/query/query-client.server.ts`
- Create: `apps/web/src/shared/query/query-provider.tsx`
- Move: `apps/web/src/lib/utils.ts` → `apps/web/src/shared/lib/utils.ts`
- Move: `apps/web/src/lib/official-image.ts` → `apps/web/src/shared/lib/official-image.ts`
- Delete after imports are migrated: `apps/web/src/features/query/query-client.ts`
- Delete after imports are migrated: `apps/web/src/features/query/query-client.server.ts`
- Delete after imports are migrated: `apps/web/src/features/query/query-provider.tsx`
- Modify: all imports of `@/lib/utils`, `@/lib/official-image`, and `@/features/query/*`
- Modify: `apps/web/src/features/discovery/discovery-model.ts`
- Modify: `apps/web/src/features/festivals/festival-detail-model.ts`
- Modify: `apps/web/src/features/courses/course-edit-model.ts`
- Modify: `apps/web/src/features/courses/saved-course-model.ts`
- Modify: `apps/web/src/features/places/nearby-place-search-model.ts`
- Modify: all consumers of `DiscoveryImage`
- Move test: `apps/web/tests/unit/lib/official-image.test.ts` → `apps/web/tests/unit/shared/lib/official-image.test.ts`

**Interfaces:**
- Produces: `ImageAsset`, `cn`, `resolveOfficialImage`, `getQueryClient`, `getServerQueryClient`, and `QueryProvider`
- `ImageAsset` preserves the current `DiscoveryImage` fields exactly

- [ ] **Step 1: Extend the architecture test with shared-model expectations**

Add assertions that `src/shared` exists and that no file imports `DiscoveryImage` from discovery. Run the focused test and verify it still fails for the expected missing shared structure and legacy type imports.

- [ ] **Step 2: Create `ImageAsset` and migrate the type**

Move the current `DiscoveryImage` shape unchanged into:

```ts
// src/shared/model/image.ts
export type ImageAsset = {
  src: string;
  alt: string;
  blurDataURL?: string;
};
```

If the actual current type has additional or different fields, copy the exact current definition rather than the illustrative shape above. Replace `DiscoveryImage` imports/usages with `ImageAsset` without changing values.

- [ ] **Step 3: Move shared query and utility infrastructure**

Move files without changing implementation. Update imports in `app/layout.tsx`, festival/place routes, components, and tests to `@/shared/query/*` and `@/shared/lib/*`.

- [ ] **Step 4: Verify the focused model and infrastructure tests**

Run:

```bash
pnpm --filter @haetteum/web test -- \
  tests/unit/features/discovery/discovery-model.test.ts \
  tests/unit/features/festivals/festival-detail-model.test.ts \
  tests/unit/features/courses/course-edit-model.test.ts \
  tests/unit/features/courses/saved-course-model.test.ts \
  tests/unit/features/places/nearby-place-search-model.test.ts \
  tests/unit/shared/lib/official-image.test.ts
pnpm --filter @haetteum/web exec tsc --noEmit
```

Expected: PASS. The architecture test may remain red until all legacy paths are migrated.

- [ ] **Step 5: Commit only shared-foundation paths and their import consumers**

Use `git diff --name-only` to build an explicit path list, verify it contains no unrelated API or user files, then run a path-scoped commit with message:

```text
refactor(web): 공용 프론트 기반을 shared로 이동
```

---

### Task 3: Move independent features behind public entry points

**Files:**
- Create directories and `index.ts` files under:
  - `apps/web/src/features/auth/{api,model,components}`
  - `apps/web/src/features/profile/{api,model,components}`
  - `apps/web/src/features/reviews/{api,model,components}`
  - `apps/web/src/features/trips/{model,components}`
  - `apps/web/src/features/welcome/components`
- Move existing flat auth files into the matching subdirectories.
- Move `login-screen.tsx` into auth components.
- Move `my-page-*`, `profile-summary-card`, and `travel-record-summary` into profile components.
- Move `my-reviews-*`, `review-editor-*`, `review-rating-input`, and review route flow UI into reviews components.
- Move trip schedule, participant, itinerary, and trip screen components into trips components, except components proven to have multiple feature consumers.
- Move all `welcome-*` components into welcome components.
- Move matching tests from `tests/unit/components/**` into `tests/unit/features/<feature>/components/**`.
- Modify app routes: `login`, `mypage`, `reviews`, `trips`, and `welcome` to import only feature roots.

**Interfaces:**
- Produces root exports such as `AuthBootstrap`, `AuthStoreProvider`, `requireCurrentUser`, `LoginScreen`, `MyPageScreen`, `MyReviewsScreen`, `ReviewEditorScreen`, `MyTripsScreen`, and `WelcomeHero`
- Internal feature imports use relative paths and do not route back through `index.ts`

- [ ] **Step 1: Add public-API assertions and verify RED**

Extend the architecture test so every immediate `src/features/*` directory contains `index.ts`. Run it and confirm the existing flat features fail.

- [ ] **Step 2: Move auth and update its focused tests**

Preserve server-only boundaries in `auth-server.ts`; do not export server-only functions through an entry point consumed by client components. If necessary, provide `index.ts` for client-safe exports and `server.ts` as the explicit server public entry point, and allow `@/features/auth/server` in the architecture test.

Run all `tests/unit/features/auth/*` and `tests/unit/app/login-page.test.tsx`, `layout.test.ts`, `my-page.test.tsx`, `reviews-page.test.tsx`, and `trips-page.test.tsx`.

- [ ] **Step 3: Move profile, reviews, trips, and welcome one feature at a time**

After each feature move, update its tests and app imports, then run only that feature's and routes' tests. Do not combine behavior changes with moves.

- [ ] **Step 4: Run typecheck and the architecture test**

```bash
pnpm --filter @haetteum/web test -- tests/unit/architecture/feature-boundaries.test.ts
pnpm --filter @haetteum/web exec tsc --noEmit
```

Expected: remaining failures mention only features not yet migrated.

- [ ] **Step 5: Commit the independent feature moves**

Commit with explicit paths and message:

```text
refactor(web): 계정과 여행 기록 UI를 feature로 이동
```

---

### Task 4: Move festivals, explore, and themes

**Files:**
- Create/move under `apps/web/src/features/festivals/{api,model,components}`:
  - all `festival-*` files from legacy patterns/travel
  - existing festival API/query/model/content files
- Create/move under `apps/web/src/features/explore/{model,components}`:
  - `explore-screen`, section header, category link, destination card
  - existing explore model/mock
- Create/move under `apps/web/src/features/themes/{model,components}`:
  - theme carousel, travel section, course explorer/cards/items
  - existing theme model/mock
- Create/update public `index.ts` files.
- Move matching component tests to feature test directories.
- Modify festival and explore app routes to import feature roots.

**Interfaces:**
- Festivals exports route entry components, server query options, mapping functions, and href builder through public server/client-safe entries as appropriate.
- Explore exports `ExploreScreen` and mock/model values needed by its route.
- Themes exports the orchestration component and `ThemeTravelData` required by discovery through the feature root.

- [ ] **Step 1: Move festivals and eliminate discovery-model ownership from festival UI**

Use `ImageAsset` from shared. Keep festival URL and query behavior unchanged. Run festival API/model/component/page tests.

- [ ] **Step 2: Move explore and themes**

Run explore and theme model/component/page tests after each move.

- [ ] **Step 3: Resolve cross-feature imports only through public roots**

Where discovery composes festival/theme content, import `@/features/festivals` and `@/features/themes`. If a server-only export would contaminate client bundles, split the feature public API into `index.ts` and `server.ts` and encode that explicit exception in the architecture test.

- [ ] **Step 4: Verify architecture and types**

Expected: no festival/explore/theme deep-import violations and no TypeScript errors.

- [ ] **Step 5: Commit with explicit feature and test paths**

```text
refactor(web): 축제와 탐색 UI를 feature로 이동
```

---

### Task 5: Move places and courses and relocate interactive flows

**Files:**
- Create/move under `apps/web/src/features/places/{api,model,components}`:
  - existing place API/query/model/mock files
  - place detail screens, information, gallery, tabs, nearby, course/review content
- Create/move under `apps/web/src/features/courses/{api,model,components}`:
  - existing course model/mock/editor files
  - course edit/save screens and course-specific travel components
  - `random-course-banner`, `random-course-dialog`, `ai-course-banner`
  - generated-course content/map/stop-list
- Create/update both public entry points.
- Move matching component and model tests into feature test directories.
- Modify course and place routes to consume public roots/server entry points.

**Interfaces:**
- Places owns place detail/nearby query options, place screens, and place href generation.
- Courses owns random-course candidate selection and query-driven random-course UI.
- Shared travel components receive only explicit props and perform no query, auth, or routing operations.

- [ ] **Step 1: Move places without changing query behavior**

Move `live-place-information-content`, `live-place-course-content`, and `live-generated-course-content` into feature components so query hooks no longer live in shared/legacy components. Run all place tests and `place-detail-page.test.tsx`.

- [ ] **Step 2: Move courses and random-course flow**

Keep `MAX_ATTEMPTS`, candidate selection, React Query calls, dialog phases, and generated stop rendering unchanged. Run all course tests plus course edit/saved-course page tests and current random/reel discovery tests that exercise the banner.

- [ ] **Step 3: Evaluate remaining travel components by actual consumer count**

Use `rg` to count imports. Move a component to `shared/components/travel` only when at least two distinct feature owners consume it and it performs no API/query/auth/navigation flow. Otherwise place it in the sole owning feature.

- [ ] **Step 4: Verify no place/course deep imports remain**

Run the architecture test, all place/course tests, and TypeScript. Expected: failures, if any, are limited to discovery legacy paths.

- [ ] **Step 5: Commit with explicit paths**

```text
refactor(web): 장소와 코스 흐름을 feature로 이동
```

---

### Task 6: Move discovery and remove legacy component layers

**Files:**
- Create/move under `apps/web/src/features/discovery/{api,model,components}`:
  - existing discovery API/model/mock/content/feed files
  - main discovery, app header, search panel, ranking sections and filters
  - popular places/reels/video components and viewers
  - discovery navigation and load/retry UI owned only by discovery
- Create/update: `apps/web/src/features/discovery/index.ts`
- Move matching tests into `apps/web/tests/unit/features/discovery/components`
- Move genuinely shared pure presentation files into `apps/web/src/shared/components/travel`
- Delete emptied directories: `apps/web/src/components/patterns`, `apps/web/src/components/travel`, `apps/web/src/features/query`, `apps/web/src/lib`
- Modify: `apps/web/src/app/page.tsx`, reel routes, and all remaining source/test imports

**Interfaces:**
- Discovery public API exports `DiscoveryContent` and reel route entry components/data loaders required by app routes.
- Discovery may compose feature-root exports from festivals, themes, courses, and places but no internal paths.

- [ ] **Step 1: Move discovery components and tests**

Preserve server/client component directives exactly. Update relative imports inside discovery and feature-root imports for composed features.

- [ ] **Step 2: Move only verified shared presentation components**

For each remaining legacy travel component, document its two or more feature consumers before moving it to shared. Convert props from feature model types to narrow shared props where necessary without changing rendering.

- [ ] **Step 3: Remove legacy directories and run the architecture test**

Run:

```bash
pnpm --filter @haetteum/web test -- tests/unit/architecture/feature-boundaries.test.ts
```

Expected: PASS for the first time. Verify `rg --files apps/web/src/components/patterns apps/web/src/components/travel apps/web/src/features/query apps/web/src/lib` returns no files.

- [ ] **Step 4: Run discovery and route regression tests**

Run all discovery feature tests, main page test, reels page tests, festival tests, and place/course integration-facing component tests.

- [ ] **Step 5: Commit the discovery and legacy-layer removal**

```text
refactor(web): 탐색 UI를 feature 구조로 통합
```

---

### Task 7: Document the final frontend architecture

**Files:**
- Create: `FRONTEND_ARCHITECTURE.md`
- Modify: `ARCHITECTURE.md`
- Modify: `README.md`
- Modify: `DESIGN.md`

**Interfaces:**
- Produces: the canonical frontend ownership and dependency reference
- `ARCHITECTURE.md`, `README.md`, and `DESIGN.md` link to the canonical document rather than duplicating stale directory rules

- [ ] **Step 1: Write `FRONTEND_ARCHITECTURE.md` from the implemented tree**

Include:

```text
1. Purpose and architectural principles
2. Actual directory tree
3. Responsibilities of app, feature api/model/components, shared, and ui
4. Allowed dependency diagram
5. Public entry-point and server-only entry-point rules
6. File-placement decision checklist
7. Concrete examples from auth, places, courses, and discovery
8. Testing and architecture enforcement
9. How to add a new feature
```

Do not copy the planned tree blindly; generate the tree from the final filesystem and ensure every cited path exists.

- [ ] **Step 2: Update existing documentation**

Replace the old `components/travel → components/patterns → features` ownership description in `ARCHITECTURE.md` with a concise feature-first overview and link. Add the new document to `README.md`. Keep visual design rules in `DESIGN.md`, replace obsolete ownership paths with a link, and preserve unrelated user edits already present in both files.

- [ ] **Step 3: Check documentation consistency**

Run:

```bash
rg -n 'components/patterns|components/travel|features/query|src/lib' \
  FRONTEND_ARCHITECTURE.md ARCHITECTURE.md DESIGN.md README.md
```

Expected: legacy paths appear only in migration/history context, not as current guidance. Verify every Markdown local path with `test -e`.

- [ ] **Step 4: Commit documentation only**

```text
docs(web): feature-first 프론트 아키텍처 문서화
```

---

### Task 8: Full verification and final boundary audit

**Files:**
- Modify only files required to correct failures caused by this refactor
- Inspect: complete `apps/web/src` and `apps/web/tests/unit` trees

**Interfaces:**
- Produces: a verified feature-first frontend with no legacy ownership paths

- [ ] **Step 1: Run complete web verification**

```bash
pnpm --filter @haetteum/web test
pnpm --filter @haetteum/web exec tsc --noEmit
pnpm --filter @haetteum/web lint
pnpm --filter @haetteum/web build
```

Expected: all commands exit 0 with no new warnings attributable to the refactor.

- [ ] **Step 2: Audit the final import graph and filesystem**

```bash
rg -n '@/components/(patterns|travel)|@/features/query|@/lib/' apps/web/src apps/web/tests
find apps/web/src/features -maxdepth 2 -type d | sort
find apps/web/src/shared -maxdepth 3 -type f | sort
```

Expected: the first command has no matches; each product feature contains the applicable `api`, `model`, and/or `components` directory plus a public entry point; shared contains no feature imports.

- [ ] **Step 3: Review the final diff against pre-existing user changes**

Use `git status --short`, `git diff --stat`, and path-scoped diffs. Confirm API files and unrelated existing changes have not been overwritten. Confirm the originally staged deleted mock files remain deleted/staged unless their movement was intentionally incorporated by this refactor.

- [ ] **Step 4: Fix only refactor-caused failures and re-run all verification**

For every discovered regression, first add or identify the failing focused test, verify RED, make the minimal correction, then repeat the complete command set from Step 1.

- [ ] **Step 5: Final commit and completion review**

If verification fixes remain uncommitted, commit only their explicit paths with:

```text
refactor(web): feature-first 구조 검증 완료
```

Review `git show --stat` for every new commit to ensure unrelated pre-staged files were never included.
