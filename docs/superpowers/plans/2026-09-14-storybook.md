# Storybook Implementation Plan

**Goal:** Run a backend-independent UI catalog inside `apps/web` using existing components and styles.

**Architecture:** Use `@storybook/nextjs-vite`, colocated CSF stories, shared global CSS and local fixture assets. Follow the current `ui/<component>` and `domain/<area>` structure. Preserve ongoing component migration changes.

**Tech Stack:** Next.js 16.3.1, React 19.2.8, Tailwind 4, Storybook 10.6, pnpm 10.33.0.

**Spec:** User approved the preceding proposal: configuration, foundations, about ten representative components, documentation/controls/accessibility and static build CI. Screen-level API mocking, authentication decorators and maps are deferred until a story needs them.

## Constraints

- No backend, database, authentication bootstrap or TourAPI calls.
- No application behavior changes; existing design-system page stays available.
- Run in the current checkout to use the ongoing uncommitted component migration.
- Use static build, TypeScript, lint, existing unit tests and browser smoke checks to verify this configuration/story-only change.

## Tasks

- [x] Install compatible Storybook packages in `apps/web`; add root `storybook` and `build-storybook` shortcuts.
- [x] Configure `.storybook/main.ts`, `preview.tsx`, Korean document language, shared globals, App Router mocks, responsive viewports and story ordering.
- [x] Add foundations for colors, typography and spacing; add colocated Button, Input, Badge, Toggle, Select, Switch, PlaceCard, PlaceRankingCard, ReviewCard and RatingSummary stories with meaningful edge states.
- [x] Use local images; keep production image validation intact. If a ranking image requires a remote URL, use a Storybook-only network fixture handler.
- [x] Ignore generated output in Git, ESLint and TypeScript; add a separate PR/push static build workflow with no deployment or secrets.
- [x] Document commands, story placement, fixture rules and later testing scope in `docs/storybook.md`.
- [x] Run `pnpm build-storybook`, `pnpm --filter @haetteum/web exec tsc --noEmit`, changed-file ESLint and web unit tests; open and check representative stories in browser.
- [x] Request independent code review, address material findings and report commands and verification results.

## Verification results

- Storybook static build passed (10.6.0 / Vite 8.2.1).
- Web TypeScript including `.storybook` and changed-file ESLint passed.
- Browser: PlaceCard saved state toggles; local images/fonts load; Select changes to 제주.
- Independent review found an autodocs MSW handler collision; separate success/failure URLs and common handlers resolve it.
- Baseline web suite: 689 passed / 7 failed. Post-change: 692 passed / 4 failed, all remaining failures in existing review-moderation integration tests (후기 메뉴 query). Unrelated files were changing concurrently; no new failures observed.
- No production database, API or TourAPI commands executed.
