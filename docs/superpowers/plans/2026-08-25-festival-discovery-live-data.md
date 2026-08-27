# Haetteum Festival Discovery Live Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the festival tab's mock ranking and list with validated PostgreSQL-backed festival discovery data while preserving the existing carousel interaction.

**Architecture:** A shared Zod contract defines one `/api/v1/festivals/discovery` response containing deterministic top-three ranking and paginated items. NestJS reads `Festival` rows through Prisma; the Next.js Server Component fetches that endpoint only for the festival tab, validates the response, maps it to the display model, and renders explicit ready/empty/error states without mock fallback.

**Tech Stack:** Node.js 24.19.0, pnpm 10.33.0, NestJS 11.2.1, Prisma 7.9.1, PostgreSQL 18.4, Zod 4.4.3, Next.js 16.3.1, React 19, Vitest 4.1.10, Jest 30.4.2

**Spec:** `docs/superpowers/specs/2026-08-25-festival-discovery-live-data-design.md`

## Global Constraints

- Use `PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/opt/homebrew/bin:$PATH` for Node 24.19.0 and pnpm 10.33.0.
- Preserve every pre-existing dirty change; edit only the approved contracts/API/web files.
- Do not stage, commit, create a branch/worktree, push, reset, checkout, or clean.
- Keep TourAPI reads out of user requests; serve only PostgreSQL data.
- Never invent popularity, saved, review, description, or tag values.
- Preserve carousel swipe, loop, three-second autoplay, and reduced-motion behavior.
- Use Next.js 16 server `fetch(..., { cache: "no-store" })` as confirmed in the installed docs.
- Restrict remote images to HTTPS `tong.visitkorea.or.kr` with an explicit `remotePatterns` object.
- Do not connect the mock festival detail route, user save state, or other discovery tabs.

---

### Task 1: Shared festival discovery contract

**Files:**

- Create: `packages/contracts/src/festivals.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/src/contracts.test.ts`

**Interfaces:**

- Produces: `FestivalBrowseRegionSchema`, `FestivalDiscoveryQuerySchema`, `FestivalDiscoveryItemSchema`, `FestivalDiscoveryResponseSchema` and inferred types.
- Consumes: no API or Prisma types.

- [ ] Write failing contract tests for defaults, invalid region/page/pageSize, nullable image/address, date-only strings, `ONGOING|UPCOMING`, rank 1-3, and full response parsing.
- [ ] Run the contracts test and confirm RED because exports/schemas are absent.
- [ ] Implement the minimal Zod schemas and exports.
- [ ] Run contracts tests and type build to confirm GREEN.

### Task 2: NestJS PostgreSQL festival discovery endpoint

**Files:**

- Create: `apps/api/src/festivals/festivals.service.ts`
- Create: `apps/api/src/festivals/festivals.service.spec.ts`
- Create: `apps/api/src/festivals/festivals.controller.ts`
- Create: `apps/api/src/festivals/festivals.controller.spec.ts`
- Create: `apps/api/src/festivals/festivals.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/test/app.e2e-spec.ts`

**Interfaces:**

- Produces: `GET /api/v1/festivals/discovery` returning `FestivalDiscoveryResponse`.
- Consumes: shared query/response types and `PrismaService.festival`.

- [ ] Write failing service tests for KST date conversion, `all` and every regional code mapping, ended exclusion, ongoing-before-upcoming ordering, deterministic ties, category labels, rank 1-3, page slicing, and nullable provider fields.
- [ ] Run service RED because `FestivalsService` is absent.
- [ ] Implement the service with an injectable/default `now` argument for deterministic tests, two bounded Prisma queries (ongoing and upcoming), exact total count, shared ordering, and response mapping.
- [ ] Run service GREEN.
- [ ] Write controller RED for Zod query validation and service delegation.
- [ ] Implement controller/module/AppModule wiring and run controller GREEN.
- [ ] Add PostgreSQL-backed E2E fixtures and assert the exact public response plus invalid query Problem Details.
- [ ] Run focused API unit and E2E GREEN.

### Task 3: Next.js server loader and display mapping

**Files:**

- Create: `apps/web/src/features/festivals/festival-discovery-api.ts`
- Create: `apps/web/tests/unit/features/festivals/festival-discovery-api.test.ts`
- Modify: `apps/web/src/features/discovery/discovery-content.tsx`
- Modify: `apps/web/src/features/discovery/discovery-model.ts`
- Modify: `apps/web/tests/unit/features/discovery/discovery-content.test.tsx`
- Modify: `apps/web/src/features/discovery/main-discovery.mock.ts` only where required for the revised display type.

**Interfaces:**

- Produces: `loadFestivalDiscovery(region, fetchImpl?)` with `ready|error` result and no mock fallback.
- Produces: real `FestivalDiscoveryData` containing static filter labels and mapped ranking/items.
- Consumes: `NEXT_PUBLIC_API_BASE_URL`, shared response schema, server `fetch` with `cache: "no-store"`.

- [ ] Write loader RED for URL/query, `no-store`, successful schema parsing/mapping, missing base URL, non-2xx, malformed JSON, and schema mismatch.
- [ ] Implement the loader and run GREEN.
- [ ] Write `DiscoveryContent` RED proving only the festival tab fetches and merges live `festivalDiscovery` data while other tabs make no request.
- [ ] Implement the async server data injection and explicit error state; run GREEN.

### Task 4: Festival tab real-data UI

**Files:**

- Create: `apps/web/src/components/travel/festival-remote-image.tsx`
- Create: `apps/web/tests/unit/components/travel/festival-remote-image.test.tsx`
- Modify: `apps/web/src/components/patterns/festival-discovery.tsx`
- Modify: `apps/web/src/components/travel/festival-ranking-showcase.tsx`
- Modify: `apps/web/src/components/travel/festival-discovery-list-item.tsx`
- Modify: `apps/web/tests/unit/components/travel/festival-discovery-components.test.tsx`
- Modify: `apps/web/tests/unit/components/patterns/main-discovery.test.tsx`
- Modify: `apps/web/next.config.ts`

**Interfaces:**

- Consumes: mapped live ranking/items and `loadState`.
- Preserves: Embla carousel API, progress motion, loop, autoplay, pointer pause/restart, and reduced motion.

- [ ] Write component RED proving the heading is `지금 만날 수 있는 축제`, actual date/status/address/category render, fake popularity/save/review/heart/detail CTA are absent, and ready/empty/error states differ.
- [ ] Write image RED for provider URL, null placeholder, and failed-load placeholder.
- [ ] Implement the reusable client image wrapper and strict `remotePatterns` configuration.
- [ ] Adapt ranking/list components without changing motion functions or timer behavior.
- [ ] Run component/model GREEN including existing carousel tests.

### Task 5: Full verification and browser evidence

**Files:**

- Modify: `docs/superpowers/specs/2026-08-25-festival-discovery-live-data-design.md` only after evidence.

- [ ] Run contracts, API, and web focused tests.
- [ ] Run API/web lint and builds under Node 24.19.0.
- [ ] Run API E2E and verify live `/api/v1/festivals/discovery` responses for all seven regions.
- [ ] Start/confirm localhost API and web servers without changing product code.
- [ ] Use the real browser to verify `/?tab=festivals&region=all|jeju|seoul|busan|gangwon|gyeongju|jeonju`, URL state, non-mock titles, provider images/placeholder, empty/error behavior where applicable, scroll preservation, swipe/autoplay, and console errors.
- [ ] Run scoped `git diff --check` and preserve unrelated dirty changes.
- [ ] Mark the spec `구현 및 검증 완료` with exact test/browser evidence.
