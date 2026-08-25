# Haetteum TourAPI Festival Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load every TourAPI festival overlapping 2026-01-01 through 2027-12-31 into PostgreSQL through a validated, paginated, idempotent repository flow and record the run in `TourismSyncRun`.

**Architecture:** The existing `TourApiClient` gains a festival-specific port method backed by `searchFestival2`, while the existing schema and mapper modules gain festival types. A new `FestivalSyncService` owns pagination and a new `FestivalRepository` owns Prisma UPSERTs and sync-run persistence; a manual command triggers the approved fixed range.

**Tech Stack:** Node.js 24.19.0, pnpm 10.33.0, NestJS 11.2.1, Prisma 7.9.1, PostgreSQL 18.4, Zod 4.4.3, Jest 30.4.2

**Spec:** `docs/superpowers/specs/2026-08-25-tourapi-festival-sync-design.md`

## Global Constraints

- Run all Node commands with `PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/opt/homebrew/bin:$PATH`; this selects Node.js `24.19.0` and pnpm `10.33.0` while the default shell is Node 25.9.0.
- Preserve every pre-existing dirty frontend, backend, documentation, migration, and asset change.
- Do not run `git add`, `git commit`, create a branch/worktree, push, reset, checkout, or clean.
- Never print, snapshot, or commit `SERVICE_KEY` or a complete provider URL.
- Keep the initial range fixed at `2026-01-01` through `2027-12-31`, inclusive.
- Use `searchFestival2`, `lclsSystm1=EV`, `lclsSystm2=EV01`, `numOfRows=100`, and traverse every page.
- Persist through `FestivalRepository` and `(source, externalId)` UPSERT; do not put festival rows in `places`.
- Record both successful and failed executions in `TourismSyncRun` with `jobType=FESTIVAL_FULL`.
- Do not add a public festivals endpoint, frontend integration, cron, deletion reconciliation, or detail enrichment.
- Do not edit Prisma generated files directly.

---

### Task 1: Festival Prisma model and migration

**Files:**

- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260825000000_add_festivals/migration.sql`
- Modify: `apps/api/src/prisma/tourism-schema.spec.ts`
- Modify: `apps/api/test/tourism-database.e2e-spec.ts`

**Interfaces:**

- Produces: generated Prisma delegate `prisma.festival` and compound unique input `source_externalId`.
- Produces: PostgreSQL table `festivals` with date/region/modified-time indexes and table/column comments.

- [ ] **Step 1: Write failing schema tests**

Add assertions that the Prisma schema contains `model Festival`, `@@unique([source, externalId])`, date-range and provider-region indexes, and `@@map("festivals")`. Extend the database comment expectation with every approved festival column.

- [ ] **Step 2: Run RED**

Run:

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/opt/homebrew/bin:$PATH pnpm --filter @haetteum/api test -- tourism-schema.spec.ts
```

Expected: FAIL because `Festival` does not exist.

- [ ] **Step 3: Add the Prisma model and SQL migration**

Implement the exact fields and indexes from the spec. The migration creates `festivals`, its unique/index constraints, and Korean PostgreSQL comments. It must not modify existing rows or tables beyond creating festival objects.

- [ ] **Step 4: Regenerate the Prisma client and run GREEN**

Run:

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/opt/homebrew/bin:$PATH pnpm db:generate
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/opt/homebrew/bin:$PATH pnpm --filter @haetteum/api test -- tourism-schema.spec.ts
```

Expected: generated client succeeds and the focused schema test passes.

### Task 2: Festival provider schema, type, client, and mapper

**Files:**

- Modify: `apps/api/src/tourism/tour-api.types.ts`
- Modify: `apps/api/src/tourism/tour-api.schemas.ts`
- Modify: `apps/api/src/tourism/tour-api.client.ts`
- Modify: `apps/api/src/tourism/tour-api.client.spec.ts`
- Modify: `apps/api/src/tourism/tour-api.mapper.ts`
- Modify: `apps/api/src/tourism/tour-api.mapper.spec.ts`
- Modify: `apps/api/src/tourism/tourism.constants.ts`

**Interfaces:**

- Produces: `TourApiFestival`, `FestivalApiPort.getFestivalPage(input)`, and injection token `FESTIVAL_API_PORT`.
- Produces: `NormalizedFestival` and `mapFestival(item, lastSyncedAt)`.
- Consumes: the existing private `TourApiClient.request()` for timeout, retry, and provider-error behavior.

- [ ] **Step 1: Write failing client test**

Add a test that calls `getFestivalPage({ eventStartDate: "20260101", eventEndDate: "20271231", pageNo: 2 })` and asserts operation `/searchFestival2` plus `EV`, `EV01`, `arrange=C`, the approved dates, and page 2.

- [ ] **Step 2: Run client RED**

Run the focused client spec and confirm failure because `getFestivalPage` is absent.

- [ ] **Step 3: Add festival schema/type/client method**

Define the required and optional provider fields from the design, add the festival port, and have `TourApiClient` implement it through the existing request boundary.

- [ ] **Step 4: Run client GREEN**

Run the focused client spec and confirm all client tests pass.

- [ ] **Step 5: Write failing mapper tests**

Cover a valid festival, invalid content type, invalid `EV/EV01` classification, invalid event date, end-before-start, invalid coordinate, and invalid `lastSyncedAt`.

- [ ] **Step 6: Run mapper RED**

Run the focused mapper spec and confirm failure because `mapFestival` is absent.

- [ ] **Step 7: Implement minimal festival mapper**

Reuse the existing text, timestamp, coordinate, map-level, and sync-time rules. Add a strict calendar-date parser that produces UTC-midnight `Date` values and round-trips `YYYYMMDD`.

- [ ] **Step 8: Run mapper GREEN**

Run both focused client and mapper specs.

### Task 3: Repository, pagination service, module wiring, and command

**Files:**

- Create: `apps/api/src/tourism/festival.repository.ts`
- Create: `apps/api/src/tourism/festival.repository.spec.ts`
- Create: `apps/api/src/tourism/festival-sync.service.ts`
- Create: `apps/api/src/tourism/festival-sync.service.spec.ts`
- Create: `apps/api/src/tourism/festival-sync.command.ts`
- Create: `apps/api/src/tourism/festival-sync.command.spec.ts`
- Modify: `apps/api/src/tourism/tourism.module.ts`
- Modify: `apps/api/package.json`
- Modify: `package.json`

**Interfaces:**

- Produces: `FestivalRepository.createSyncRun()`, `upsertPage()`, `completeSyncRun()`, and `failSyncRun()`.
- Produces: `FestivalSyncService.fullSync(range)` returning a successful count summary.
- Produces: root command `pnpm festival:sync` using the approved fixed range.
- Consumes: `FestivalApiPort`, `mapFestival()`, and generated `prisma.festival`.

- [ ] **Step 1: Write failing repository unit tests**

Use a narrow Prisma mock to verify run creation fields, existing-ID classification, compound-key UPSERT data, success counts, and sanitized failure recording.

- [ ] **Step 2: Run repository RED**

Run `festival.repository.spec.ts` and confirm failure because the repository is absent.

- [ ] **Step 3: Implement `FestivalRepository`**

Query existing provider IDs once per page, perform all UPSERTs in one Prisma transaction, and return inserted/updated counts. Keep provider errors sanitized before recording them.

- [ ] **Step 4: Run repository GREEN**

Run the focused repository spec.

- [ ] **Step 5: Write failing sync-service tests**

Cover two-page success, stable `totalCount`, early empty-page failure, accumulated-count overflow, zero-result failure, mapper failure, repository failure, and safe failed-run recording.

- [ ] **Step 6: Run service RED**

Run `festival-sync.service.spec.ts` and confirm failure because the service is absent.

- [ ] **Step 7: Implement `FestivalSyncService`**

Create the run before the provider call, map and persist one complete page at a time, merge repository deltas, require at least one festival, and complete/fail the run exactly once.

- [ ] **Step 8: Run service GREEN**

Run repository and service specs together.

- [ ] **Step 9: Write command tests and run RED**

Test the exact fixed dates, successful JSON summary, sanitized failure output, and process-independent exported executor. Confirm failure before the command exists.

- [ ] **Step 10: Implement command and module/scripts**

Register the client under `FESTIVAL_API_PORT`, repository, and service in `TourismModule`. Add API/root `festival:sync` scripts without changing existing tourism scripts.

- [ ] **Step 11: Run focused GREEN**

Run all new festival unit specs and existing tourism client/mapper/service specs.

### Task 4: PostgreSQL E2E and real initial load

**Files:**

- Create: `apps/api/test/festival-sync.e2e-spec.ts`
- Modify: `docs/superpowers/specs/2026-08-25-tourapi-festival-sync-design.md`

**Interfaces:**

- Verifies: real migration, idempotent repository writes, UUID preservation, inserted/updated counts, success/failure run history, and isolation from `places`.
- Executes: live `pnpm festival:sync` against the configured TourAPI and local PostgreSQL.

- [ ] **Step 1: Write failing isolated-schema E2E**

Create a temporary PostgreSQL schema, apply every migration including `20260825000000_add_festivals`, inject a deterministic two-page festival provider, run the service twice, and assert one row per provider identity with the same UUID and `inserted → updated` counts. Add a provider-failure case that leaves a `FAILED` run without secret leakage.

- [ ] **Step 2: Run E2E RED then GREEN**

The first run must fail before the repository/service implementation is complete; after implementation, run the focused E2E and confirm cleanup drops the temporary schema.

- [ ] **Step 3: Apply the migration to the local database**

Run:

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/opt/homebrew/bin:$PATH pnpm db:deploy
```

Verify that `festivals` exists before the live sync.

- [ ] **Step 4: Capture pre-sync invariants**

Read the `places` count, festival count, duplicate provider identities, and latest sync run without printing credentials.

- [ ] **Step 5: Execute the real festival sync**

Run:

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/opt/homebrew/bin:$PATH pnpm festival:sync
```

Expected: `FESTIVAL_FULL/SUCCEEDED`, nonzero fetched/inserted count, and zero failed count.

- [ ] **Step 6: Verify idempotency with a second live run**

Run the command again. Expected: zero inserted rows, fetched rows reported as updated, unchanged total festival count, and no duplicate `(source, externalId)` identities.

- [ ] **Step 7: Run full focused verification**

Run API lint, API unit tests, API build, focused festival E2E, migration status, `git diff --check` on changed files, and DB invariants. Confirm the `places` count is unchanged from the pre-sync snapshot.

- [ ] **Step 8: Mark the spec implemented only after evidence**

Change the design status to `구현 및 검증 완료` and record the actual live counts and verification commands. Do not update unrelated documents.
