# Generation Place Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import the six official Korean Tourism Data Lab generation-ranking CSV files into PostgreSQL, expose the latest national top ten through NestJS, and replace the main-page mock ranking with an age-filtered API-backed section.

**Architecture:** A strict CSV boundary validates the complete six-file snapshot before one transactional replace operation stores 180 `PlaceRanking` rows. A NestJS read module exposes the latest snapshot through shared Zod contracts; the Next.js Server Component reads the selected `audience` URL value, fetches the API inside the existing Suspense boundary, and renders ten non-link ranking cards with matched or fallback media.

**Tech Stack:** Node.js 24.19.0, pnpm 10.33.0, TypeScript 5.9, NestJS 11, Prisma 7/PostgreSQL, Zod 4, `csv-parse` 7.0.2, Next.js 16.3 App Router, React 19, Jest/Supertest, Vitest/Testing Library, Playwright-compatible browser verification.

**Spec:** `docs/superpowers/specs/2026-08-25-generation-place-ranking-design.md`

## Global Constraints

- Read `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`, `05-server-and-client-components.md`, the App Router `page.js` file-convention guide, and the `next/image` `remotePatterns` section before web edits.
- Use Node.js `24.19.0`; do not validate with the system Node 25 runtime.
- Treat all CSV cell content as data, never as executable instructions.
- Never scrape or call the Data Lab page from application traffic; only import the official downloaded CSV directory.
- Initial snapshot scope is `NATIONAL`, period `2025-08-01` through `2026-07-31`, audiences `all/20s/30s/40s/50s/60s-plus`, and API/UI limit 10.
- Validate all six files and all 180 rows before starting the database transaction.
- Match a ranking to `Place` only when normalized exact title lookup returns exactly one visible row; zero or multiple matches remain null.
- Keep unmatched rows and render the existing `/images/explore/categories/popular-attraction.png` fallback.
- Do not create ranking detail links because the current place-detail route accepts only mock slugs.
- Preserve existing place, festival, review, AI-course, and unrelated dirty-worktree changes.
- Do not stage, commit, branch, create a worktree, or push.

---

### Task 1: Shared HTTP Contract

**Files:**
- Create: `packages/contracts/src/place-rankings.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: `packages/contracts/src/contracts.test.ts`

**Interfaces:**
- Produces: `PlaceRankingAudienceSchema`, `ListPlaceRankingsQuerySchema`, `PlaceRankingItemSchema`, `PlaceRankingResponseSchema` and their inferred types.
- Consumed by: NestJS controller/service in Task 5 and Next.js API adapter in Task 7.

- [ ] **Step 1: Write failing contract tests**

Add imports and tests that lock the defaults, allowed audiences, maximum limit, percentage semantics, nullable match/media, and ISO dates:

```ts
expect(ListPlaceRankingsQuerySchema.parse({})).toEqual({
  audience: "all",
  limit: 10,
});
expect(() =>
  ListPlaceRankingsQuerySchema.parse({ audience: "teens", limit: 11 }),
).toThrow();

expect(
  PlaceRankingResponseSchema.parse({
    source: "KTO_DATALAB",
    scope: "national",
    periodStart: "2025-08-01",
    periodEnd: "2026-07-31",
    audience: "all",
    items: [
      {
        rank: 1,
        sourcePlaceId: "3f73bffa7c6d98063eebe1ecd3305da6",
        title: "에버랜드",
        category: "레저/스포츠",
        sharePercent: 9,
        placeId: null,
        primaryImageUrl: null,
        imageCopyrightType: null,
      },
    ],
  }).items[0]?.sharePercent,
).toBe(9);
```

- [ ] **Step 2: Run the focused contract test and verify failure**

Run:

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/contracts test -- contracts.test.ts
```

Expected: FAIL because `place-rankings.ts` and exports do not exist.

- [ ] **Step 3: Implement the exact Zod contract**

Create the contract with these public values and limits:

```ts
import { z } from "zod";

export const PlaceRankingAudienceSchema = z.enum([
  "all",
  "20s",
  "30s",
  "40s",
  "50s",
  "60s-plus",
]);

export const ListPlaceRankingsQuerySchema = z.object({
  audience: PlaceRankingAudienceSchema.default("all"),
  limit: z.coerce.number().int().min(1).max(10).default(10),
});

export const PlaceRankingItemSchema = z.object({
  rank: z.number().int().min(1).max(30),
  sourcePlaceId: z.string().regex(/^[0-9a-f]{32}$/i),
  title: z.string().min(1),
  category: z.string().min(1),
  sharePercent: z.number().positive().max(100),
  placeId: z.string().uuid().nullable(),
  primaryImageUrl: z.string().url().nullable(),
  imageCopyrightType: z.string().nullable(),
});

export const PlaceRankingResponseSchema = z.object({
  source: z.literal("KTO_DATALAB"),
  scope: z.literal("national"),
  periodStart: z.iso.date(),
  periodEnd: z.iso.date(),
  audience: PlaceRankingAudienceSchema,
  items: z.array(PlaceRankingItemSchema).max(10),
});

export type PlaceRankingAudience = z.infer<typeof PlaceRankingAudienceSchema>;
export type ListPlaceRankingsQuery = z.infer<typeof ListPlaceRankingsQuerySchema>;
export type PlaceRankingItem = z.infer<typeof PlaceRankingItemSchema>;
export type PlaceRankingResponse = z.infer<typeof PlaceRankingResponseSchema>;
```

Export all schemas and types from `packages/contracts/src/index.ts`.

- [ ] **Step 4: Run focused tests and build**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/contracts test -- contracts.test.ts
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/contracts build
```

Expected: PASS and TypeScript build exit 0.

- [ ] **Step 5: Review checkpoint**

Run `git diff --check -- packages/contracts`; inspect only the contract diff. Do not perform Git mutations.

---

### Task 2: Prisma Model and Migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260825170000_add_place_rankings/migration.sql`
- Modify: `apps/api/src/prisma/tourism-schema.spec.ts`
- Modify: `apps/api/test/tourism-database.e2e-spec.ts`

**Interfaces:**
- Produces: Prisma delegate `placeRanking`, nullable `PlaceRanking.placeId`, two snapshot uniqueness constraints, and latest-read indexes.
- Consumed by: importer in Task 4 and read service in Task 5.

- [ ] **Step 1: Extend the generated Prisma contract test first**

Add `placeRanking` to `ApprovedTourismDelegates` and add a typed create input that cannot
compile until the generated Prisma client contains the new model:

```ts
const placeRanking = {
  source: "KTO_DATALAB",
  scope: "NATIONAL",
  sourcePlaceId: "3f73bffa7c6d98063eebe1ecd3305da6",
  sourcePlaceName: "에버랜드",
  sourceCategory: "레저/스포츠",
  audience: "ALL",
  periodStart: "2025-08-01T00:00:00.000Z",
  periodEnd: "2026-07-31T00:00:00.000Z",
  rank: 1,
  sharePercent: "9.0",
  placeId: null,
  sourceFileName: "세대별 인기관광지(전체).csv",
  importedAt: "2026-08-25T07:45:20.000Z",
} satisfies Prisma.PlaceRankingUncheckedCreateInput;

expect(placeRanking.rank).toBe(1);
expect(placeRanking.placeId).toBeNull();
```

- [ ] **Step 2: Run the schema test and verify failure**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test -- tourism-schema.spec.ts
```

Expected: FAIL at Prisma generation/type checking because the model and generated delegate do not exist.

- [ ] **Step 3: Add the Prisma model and relation**

Add `rankings PlaceRanking[]` to `Place`, then add:

```prisma
/// 한국관광 데이터랩 공식 다운로드에서 적재한 기간·대상별 인기관광지 순위
model PlaceRanking {
  /// Haetteum 내부 순위 레코드 식별자
  id                 String   @id @default(uuid()) @db.Uuid
  /// 순위 원본 provider 식별자
  source             String   @db.VarChar(32)
  /// 전국 등 순위 집계 범위
  scope              String   @db.VarChar(32)
  /// 데이터랩 관광지 식별자
  sourcePlaceId      String   @map("source_place_id") @db.VarChar(64)
  /// 데이터랩 관광지명
  sourcePlaceName    String   @map("source_place_name") @db.VarChar(500)
  /// 데이터랩 관광지 구분
  sourceCategory     String   @map("source_category") @db.VarChar(100)
  /// 전체 또는 세대별 집계 대상
  audience           String   @db.VarChar(32)
  /// 순위 집계 시작일
  periodStart        DateTime @map("period_start") @db.Date
  /// 순위 집계 종료일
  periodEnd          DateTime @map("period_end") @db.Date
  /// 집계 범위 안의 원본 순위
  rank               Int
  /// 데이터랩 원본 비율의 퍼센트 값
  sharePercent       Decimal  @map("share_percent") @db.Decimal(5, 2)
  /// 매칭된 Haetteum 관광지 식별자
  placeId            String?  @map("place_id") @db.Uuid
  /// 감사 가능한 원본 CSV 파일명
  sourceFileName     String   @map("source_file_name") @db.VarChar(500)
  /// 순위 스냅샷 적재 시각
  importedAt         DateTime @map("imported_at") @db.Timestamptz(3)
  /// 내부 레코드 생성 시각
  createdAt          DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  /// 내부 레코드 최종 수정 시각
  updatedAt          DateTime @updatedAt @map("updated_at") @db.Timestamptz(3)

  place Place? @relation(fields: [placeId], references: [id], onDelete: SetNull)

  @@unique([source, scope, periodStart, periodEnd, audience, rank])
  @@unique([source, scope, periodStart, periodEnd, audience, sourcePlaceId])
  @@index([source, scope, audience, periodEnd, rank])
  @@index([placeId])
  @@map("place_rankings")
}
```

- [ ] **Step 4: Add the explicit SQL migration and database comments**

Create the table with PostgreSQL `UUID`, `VARCHAR`, `DATE`, `DECIMAL(5,2)`, and `TIMESTAMPTZ(3)` columns matching Prisma. Add the foreign key:

```sql
ALTER TABLE "place_rankings"
ADD CONSTRAINT "place_rankings_place_id_fkey"
FOREIGN KEY ("place_id") REFERENCES "places"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
```

Create indexes corresponding exactly to the two Prisma unique constraints and two indexes. Add a `COMMENT ON TABLE` and one `COMMENT ON COLUMN` statement for every field using the Korean schema comments above.

- [ ] **Step 5: Generate Prisma and make the schema test pass**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm db:generate
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test -- tourism-schema.spec.ts
```

Expected: PASS with `placeRanking` included in the generated client type.

- [ ] **Step 6: Extend database-comment E2E expectations**

Add `place_rankings` to `EXPECTED_DATABASE_COMMENTS` with every table/column comment and add cleanup of ranking rows before deleting test places. Then deploy and run the focused E2E test:

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm db:up
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm db:deploy
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test:e2e -- tourism-database.e2e-spec.ts
```

Expected: migration applies and database table/comment checks pass.

- [ ] **Step 7: Review checkpoint**

Run `git diff --check -- apps/api/prisma apps/api/src/prisma apps/api/test/tourism-database.e2e-spec.ts`. Do not perform Git mutations.

---

### Task 3: Strict Six-File CSV Parser

**Files:**
- Modify: `apps/api/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/api/src/place-rankings/place-ranking.constants.ts`
- Create: `apps/api/src/place-rankings/place-ranking-csv.ts`
- Test: `apps/api/src/place-rankings/place-ranking-csv.spec.ts`

**Interfaces:**
- Produces: `parsePlaceRankingDirectory(directory: string): Promise<ParsedPlaceRankingSnapshot>`.
- Produces types: `RankingAudienceDb`, `ParsedPlaceRankingRow`, `ParsedPlaceRankingSnapshot`.
- Consumed by: `PlaceRankingImportService.importDirectory` in Task 4.

- [ ] **Step 1: Add the supported parser dependency**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api add csv-parse@7.0.2
```

Expected: only `apps/api/package.json` and `pnpm-lock.yaml` dependency metadata changes.

- [ ] **Step 2: Write parser tests with runtime temp directories**

The tests must create six temporary CSV files using `mkdtemp`, `writeFile`, and a helper that produces ranks 1–30. Cover:

```ts
await expect(parsePlaceRankingDirectory(validDirectory)).resolves.toMatchObject({
  source: "KTO_DATALAB",
  scope: "NATIONAL",
  periodStart: new Date("2025-08-01T00:00:00.000Z"),
  periodEnd: new Date("2026-07-31T00:00:00.000Z"),
});
expect(snapshot.rows).toHaveLength(180);
expect(snapshot.rows[0]).toMatchObject({
  audience: "ALL",
  rank: 1,
  sharePercent: "9.0",
});
```

Add individual rejection tests for missing audience file, duplicate rank, non-digit rank tokens
(`1x`, `1.5`, or surrounding whitespace), swapped physical rank rows, non-hex ID,
file/row audience mismatch, blank name, nonnumeric ratio, ratios with more than two fractional
digits (`9.999`, `0.001`), increasing ratio, duplicate ID, and malformed directory period.

- [ ] **Step 3: Run the parser test and verify failure**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test -- place-ranking-csv.spec.ts
```

Expected: FAIL because parser exports do not exist.

- [ ] **Step 4: Implement constants and parser**

Define stable mappings:

```ts
export const DATALAB_SOURCE = "KTO_DATALAB" as const;
export const NATIONAL_SCOPE = "NATIONAL" as const;
export const AUDIENCE_FILE_LABELS = {
  ALL: "전체",
  TWENTIES: "20대",
  THIRTIES: "30대",
  FORTIES: "40대",
  FIFTIES: "50대",
  SIXTIES_PLUS: "60대이상",
} as const;
```

Implement `parsePlaceRankingDirectory` with `readdir`, NFC filename normalization, `csv-parse/sync`, BOM removal, exact header comparison, 30-row validation, and safe errors. Use this strict directory regex:

```ts
/^\d{14}_전국_(\d{6})-(\d{6})_데이터랩_다운로드$/u
```

Capture the leading 14-digit download timestamp from the directory name and require every
CSV filename to use that same prefix, for example
`20260825164520_세대별 인기관광지(전체).csv`. Reject bare filenames, a different
timestamp prefix, duplicate audience files, and unexpected additional CSVs. Ignore unrelated
non-CSV entries such as Finder metadata because they are never parsed or executed.

The exact official CSV header after BOM removal is:

```text
순위,관광지ID,관심지점명,구분,연령대,비율
```

Map `관심지점명` to `sourcePlaceName`, `구분` to `sourceCategory`, and trim the
trailing tab/whitespace from `비율` before validating and preserving its decimal string.
Validate the row `연령대` using the official value mapping `전체→전체`, `20대→20`,
`30대→30`, `40대→40`, `50대→50`, `60대이상→60`; do not compare numeric row
values directly to filename display labels.

Require each raw rank token to contain digits only and require the 30 physical data rows to
carry exactly ranks 1 through 30 in order. Accept only ratios with at most two fractional
digits so the parser boundary matches `Decimal(5,2)`. Store `sharePercent` as the trimmed
decimal string so Prisma can construct an exact Decimal later. Convert period boundaries in
UTC and reject an end month earlier than the start month.

- [ ] **Step 5: Make parser tests pass**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test -- place-ranking-csv.spec.ts
```

Expected: all valid and invalid CSV cases pass without touching PostgreSQL.

- [ ] **Step 6: Verify the real directory through the parser only**

Expose no standalone parser CLI. Add a test-only invocation or run the importer command after Task 4; at this task, use the focused Jest test and inspect the real filenames with `file` only. Do not copy the CSV files into the repository.

- [ ] **Step 7: Review checkpoint**

Run `git diff --check -- apps/api/package.json pnpm-lock.yaml apps/api/src/place-rankings`. Do not perform Git mutations.

---

### Task 4: Transactional Import Service and Command

**Files:**
- Create: `apps/api/src/place-rankings/place-ranking-import.service.ts`
- Create: `apps/api/src/place-rankings/place-ranking-import.command.ts`
- Create: `apps/api/src/place-rankings/place-rankings.module.ts`
- Test: `apps/api/src/place-rankings/place-ranking-import.service.spec.ts`
- Test: `apps/api/src/place-rankings/place-ranking-import.command.spec.ts`
- Modify: `apps/api/package.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: `parsePlaceRankingDirectory` from Task 3 and Prisma `placeRanking` from Task 2.
- Produces: `PlaceRankingImportService.importDirectory(directory: string): Promise<PlaceRankingImportSummary>`.
- Produces: `executePlaceRankingImport(service, argv, output, errorOutput): Promise<number>` for deterministic command tests.

- [ ] **Step 1: Write import-service tests against a deterministic fake Prisma boundary**

Test exact-title normalization and transaction replacement:

```ts
await expect(service.importDirectory(directory)).resolves.toEqual({
  source: "KTO_DATALAB",
  scope: "NATIONAL",
  periodStart: "2025-08-01",
  periodEnd: "2026-07-31",
  audienceCount: 6,
  importedCount: 180,
  matchedCount: 1,
  unmatchedCount: 179,
});
expect(fakePrisma.deletedSnapshot).toMatchObject({
  source: "KTO_DATALAB",
  scope: "NATIONAL",
});
expect(fakePrisma.createdRows).toHaveLength(180);
```

Add separate tests that one normalized exact visible title matches, zero matches stays null, duplicate visible titles stay null, hidden titles stay null, and a create failure does not replace the fake committed snapshot.

- [ ] **Step 2: Write command argument/output tests**

Lock both accepted forms and failure behavior:

```ts
await executePlaceRankingImport(service, ["--directory", "/tmp/rankings"], out, err);
await executePlaceRankingImport(service, ["--directory=/tmp/rankings"], out, err);
expect(JSON.parse(output[0])).toMatchObject({ importedCount: 180 });
expect(await executePlaceRankingImport(service, [], out, err)).toBe(1);
expect(errors).toEqual(["Place ranking import command failed."]);
```

- [ ] **Step 3: Run focused tests and verify failure**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test -- place-ranking-import
```

Expected: FAIL because service and command do not exist.

- [ ] **Step 4: Implement import service with a single DB transaction**

Use this normalization without punctuation removal or fuzzy matching:

```ts
export function normalizePlaceTitle(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ");
}
```

Read visible place candidates once, build `Map<string, PlaceCandidate[]>`, attach a `placeId` only for a single result, then call:

```ts
await this.prisma.$transaction(async (transaction) => {
  await transaction.placeRanking.deleteMany({ where: snapshotIdentity });
  await transaction.placeRanking.createMany({ data: rows });
});
```

Set one `importedAt` for all 180 rows and construct `new Prisma.Decimal(row.sharePercent)`.

- [ ] **Step 5: Implement command bootstrap and scripts**

Follow `festival-sync.command.ts`: dynamically import `AppModule`, create an application context with `logger: false`, resolve `PlaceRankingImportService`, output exactly one JSON summary, close the app, and never print the absolute directory or row contents on failure.

Add scripts:

```json
// apps/api/package.json
"ranking:import": "pnpm build && node dist/place-rankings/place-ranking-import.command.js"

// package.json
"ranking:import": "pnpm --filter @haetteum/api ranking:import"
```

Register `PlaceRankingImportService` in `PlaceRankingsModule`; controller registration is added in Task 5.

- [ ] **Step 6: Make focused tests pass**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test -- place-ranking-import
```

Expected: parser, import service, command argument, command safe-failure tests pass.

- [ ] **Step 7: Review checkpoint**

Run `git diff --check -- apps/api/src/place-rankings apps/api/package.json package.json`. Do not perform Git mutations.

---

### Task 5: NestJS Ranking Read API

**Files:**
- Create: `apps/api/src/place-rankings/place-rankings.service.ts`
- Create: `apps/api/src/place-rankings/place-rankings.controller.ts`
- Test: `apps/api/src/place-rankings/place-rankings.service.spec.ts`
- Test: `apps/api/src/place-rankings/place-rankings.controller.spec.ts`
- Modify: `apps/api/src/place-rankings/place-rankings.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/test/app.e2e-spec.ts`

**Interfaces:**
- Consumes: shared `ListPlaceRankingsQuery` and `PlaceRankingResponse` from Task 1.
- Produces: `GET /api/v1/place-rankings` with `audience=all|20s|30s|40s|50s|60s-plus` and `limit=1..10`.
- Consumed by: web adapter in Task 7.

- [ ] **Step 1: Write service tests for latest snapshot and response mapping**

Use a fake Prisma result to assert audience mapping and sorting:

```ts
await expect(service.list({ audience: "20s", limit: 10 })).resolves.toEqual({
  source: "KTO_DATALAB",
  scope: "national",
  periodStart: "2025-08-01",
  periodEnd: "2026-07-31",
  audience: "20s",
  items: expect.arrayContaining([
    expect.objectContaining({ rank: 1, title: "여의도한강공원" }),
  ]),
});
```

Assert the snapshot query orders `periodEnd desc`, then `periodStart desc`; item query orders `rank asc` and uses `take: limit`. Assert no snapshot throws:

```ts
await expect(service.list({ audience: "all", limit: 10 })).rejects.toMatchObject({
  status: 404,
});
```

- [ ] **Step 2: Write controller metadata and delegation tests**

Mirror `PlacesController` tests. Assert `@Controller({ path: "place-rankings", version: "1" })`, `@Get()`, and a `ZodValidationPipe(ListPlaceRankingsQuerySchema)` on the query parameter.

- [ ] **Step 3: Run focused tests and verify failure**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test -- place-rankings.service.spec.ts place-rankings.controller.spec.ts
```

Expected: FAIL because read service/controller do not exist.

- [ ] **Step 4: Implement service and controller**

Map HTTP audience values to DB values with one exhaustive record. Throw a safe not-found body:

```ts
throw new NotFoundException({
  code: "PLACE_RANKING_SNAPSHOT_NOT_FOUND",
  detail: "세대별 인기관광지 순위 데이터를 찾을 수 없습니다.",
});
```

Select only `rank`, source fields, percentage, and joined `Place.id/primaryImageUrl/imageCopyrightType`. Convert Decimal with `toNumber()` and dates with `toISOString().slice(0, 10)`.

- [ ] **Step 5: Register module and add API E2E coverage**

Import `PlaceRankingsModule` in `AppModule`. In `app.e2e-spec.ts`, create one `PlaceRanking` snapshot, request:

```http
GET /api/v1/place-rankings?audience=all&limit=10
```

Parse with `PlaceRankingResponseSchema`; assert 200, rank order, exact percentage, nullable unmatched media, and that the TourAPI fetch mock was not called. Also assert invalid audience/limit return 400 Problem Details and delete test ranking rows during cleanup.

- [ ] **Step 6: Run focused unit and E2E tests**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test -- place-rankings
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test:e2e -- app.e2e-spec.ts
```

Expected: unit tests and ranking endpoint E2E pass.

- [ ] **Step 7: Review checkpoint**

Run `git diff --check -- apps/api/src/place-rankings apps/api/src/app.module.ts apps/api/test/app.e2e-spec.ts`. Do not perform Git mutations.

---

### Task 6: Real CSV Import and Database Invariants

**Files:**
- Test: `apps/api/test/place-ranking-import.e2e-spec.ts`
- Modify: `apps/api/test/jest-e2e.json` only if the existing regex cannot discover the new file; the current `.e2e-spec.ts` regex should require no change.

**Interfaces:**
- Consumes: importer command from Task 4 and database/API from Tasks 2 and 5.
- Produces: verified initial PostgreSQL snapshot with 180 rows.

- [ ] **Step 1: Write a rollback/idempotency database E2E test**

Build a valid temporary six-file directory, import twice, and assert:

```ts
expect(await prisma.placeRanking.count({ where: snapshotWhere })).toBe(180);
expect(
  await prisma.placeRanking.groupBy({
    by: ["audience"],
    where: snapshotWhere,
    _count: { _all: true },
  }),
).toEqual(expect.arrayContaining([
  expect.objectContaining({ audience: "ALL", _count: { _all: 30 } }),
]));
```

Seed an existing sentinel snapshot, force a malformed CSV parse, and assert the sentinel remains because parsing happens before the transaction.

- [ ] **Step 2: Run the new E2E test**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test:e2e -- place-ranking-import.e2e-spec.ts
```

Expected: PASS with a healthy migrated PostgreSQL container.

- [ ] **Step 3: Execute the real import**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm ranking:import -- --directory="/Users/jeongsu/Downloads/20260825164520_전국_202508-202607_데이터랩_다운로드"
```

Expected: one JSON line reporting `audienceCount=6`, `importedCount=180`, and matched/unmatched totals summing to 180.

- [ ] **Step 4: Verify database invariants with read-only Prisma/SQL checks**

Verify all of the following:

- total snapshot rows = 180
- each of six audiences = 30
- duplicate `(audience, rank)` = 0
- duplicate `(audience, sourcePlaceId)` = 0
- period is exactly `2025-08-01` through `2026-07-31`
- ALL top three are 에버랜드 9.0, 코엑스 8.0, 킨텍스제2전시장 5.0
- `matchedCount + unmatchedCount = 180`

- [ ] **Step 5: Verify live API**

With API running, request:

```bash
curl -fsS 'http://127.0.0.1:4000/api/v1/place-rankings?audience=all&limit=10' | jq '{periodStart,periodEnd,audience,count:(.items|length),top3:.items[:3]}'
```

Expected: HTTP 200, count 10, exact period, and expected top three.

- [ ] **Step 6: Review checkpoint**

Record counts in the final report only; do not add downloaded CSVs or database dumps to Git.

---

### Task 7: Next.js Query Parsing and API Adapter

**Files:**
- Modify: `apps/web/src/features/discovery/discovery-model.ts`
- Create: `apps/web/src/features/discovery/place-ranking-api.ts`
- Test: `apps/web/tests/unit/features/discovery/discovery-model.test.ts`
- Test: `apps/web/tests/unit/features/discovery/place-ranking-api.test.ts`

**Interfaces:**
- Consumes: shared `PlaceRankingAudience` and `PlaceRankingResponseSchema` from Task 1.
- Produces: `DiscoveryQuery.audience`, preserved audience URLs, and `loadPlaceRankings(audience): Promise<PlaceRankingLoadState>`.
- Consumed by: `DiscoveryContent` and UI in Task 8.

- [ ] **Step 1: Write query parsing and href tests**

Lock valid/default behavior and preservation:

```ts
expect(parseDiscoveryQuery({ audience: "30s" }).audience).toBe("30s");
expect(parseDiscoveryQuery({ audience: "teens" }).audience).toBe("all");
expect(
  buildDiscoveryHref(
    { ...defaultDiscoveryQuery, audience: "40s" },
    { audience: "50s" },
    "places",
  ),
).toContain("audience=50s");
```

Default `all` may be omitted from generated URLs, but non-default audiences must be preserved by search and tab links.

- [ ] **Step 2: Write API-adapter tests**

Mock `globalThis.fetch` and assert:

```ts
expect(fetch).toHaveBeenCalledWith(
  "http://localhost:4000/api/v1/place-rankings?audience=20s&limit=10",
  { cache: "no-store" },
);
expect(result).toEqual({ status: "ready", data: response });
```

Add tests for non-OK response, invalid JSON/contract, thrown network error, and missing `NEXT_PUBLIC_API_BASE_URL`; all return `{ status: "error" }` without leaking raw response bodies.

- [ ] **Step 3: Run focused web tests and verify failure**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/web test -- discovery-model.test.ts place-ranking-api.test.ts
```

Expected: FAIL because `audience` and adapter do not exist.

- [ ] **Step 4: Implement the query field and adapter**

Add audience to `DiscoveryQuery` and `defaultDiscoveryQuery`. Parse it with the shared schema or a local readonly allowed-value check. The adapter must build the URL with `URL`/`URLSearchParams`, call `fetch(..., { cache: "no-store" })`, and validate with `PlaceRankingResponseSchema.safeParse`.

Define:

```ts
export type PlaceRankingLoadState =
  | { status: "ready"; data: PlaceRankingResponse }
  | { status: "error" };
```

Do not throw raw fetch errors into the page and do not fall back to `mainDiscoveryMock.places`.

- [ ] **Step 5: Make focused tests pass**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/web test -- discovery-model.test.ts place-ranking-api.test.ts
```

Expected: query and adapter tests pass.

- [ ] **Step 6: Review checkpoint**

Run `git diff --check -- apps/web/src/features/discovery apps/web/tests/unit/features/discovery`. Do not perform Git mutations.

---

### Task 8: API-Backed Generation Ranking UI

**Files:**
- Modify: `apps/web/src/features/discovery/discovery-content.tsx`
- Modify: `apps/web/src/components/patterns/main-discovery.tsx`
- Modify: `apps/web/src/components/patterns/ranked-place-section.tsx`
- Modify: `apps/web/src/components/travel/place-ranking-card.tsx`
- Modify: `apps/web/src/components/patterns/discovery-search-panel.tsx`
- Modify: `apps/web/next.config.ts`
- Test: `apps/web/tests/unit/features/discovery/discovery-content.test.tsx`
- Test: `apps/web/tests/unit/components/patterns/main-discovery.test.tsx`
- Test: `apps/web/tests/unit/components/travel/discovery-components.test.tsx`

**Interfaces:**
- Consumes: `PlaceRankingLoadState`, `DiscoveryQuery.audience`, and shared API response.
- Produces: accessible `세대별 인기관광지 순위` section with six URL filters and exactly ten cards on ready state.

- [ ] **Step 1: Replace mock-ranking expectations with API-backed fixtures**

Create an in-test `PlaceRankingResponse` fixture with ten items. Update tests to assert:

```ts
expect(screen.getByRole("heading", { name: "세대별 인기관광지 순위" })).toBeVisible();
expect(screen.getByText("전국 · 2025.08~2026.07")).toBeVisible();
expect(
  within(screen.getByRole("navigation", { name: "세대 필터" }))
    .getAllByRole("link")
    .map((link) => link.textContent),
).toEqual(["전체", "20대", "30대", "40대", "50대", "60대 이상"]);
expect(within(screen.getByRole("list", { name: "세대별 인기관광지 순위" })).getAllByRole("listitem")).toHaveLength(10);
expect(screen.queryByRole("link", { name: /1위 에버랜드/ })).not.toBeInTheDocument();
```

Add separate matched-image and fallback-image assertions, ready/error states, non-default `30s` aria-current/href behavior, and axe coverage.

- [ ] **Step 2: Update DiscoveryContent tests before implementation**

Mock `loadPlaceRankings` or `fetch` so the default recommended page gets the fixture. Assert the adapter receives `all`; render with `audience=30s` and assert it receives `30s`; render `tab=places` and assert the separate reels tab remains unchanged and ranking fetch is skipped.

- [ ] **Step 3: Run focused component tests and verify failure**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/web test -- discovery-content.test.tsx main-discovery.test.tsx discovery-components.test.tsx
```

Expected: FAIL on old title, region filter, three mock cards, rating/review UI, and link behavior.

- [ ] **Step 4: Wire the Server Component fetch**

In `DiscoveryContent`, await search params, parse query, compute the existing view, and fetch only when `view.showRankedPlaces`:

```ts
const ranking = view.showRankedPlaces
  ? await loadPlaceRankings(query.audience)
  : null;

return (
  <MainDiscovery
    data={mainDiscoveryMock}
    query={query}
    view={view}
    ranking={ranking}
  />
);
```

Keep this inside the existing page-level Suspense boundary; do not add a Client Component solely for fetching.

- [ ] **Step 5: Refactor the section and card for ranking fields**

`RankedPlaceSection` accepts `{ ranking: PlaceRankingLoadState; query: DiscoveryQuery }`, renders the API period, audience links, and ready/error body. The period formatter must consume ISO dates and output `YYYY.MM~YYYY.MM` without using the current clock.

`PlaceRankingCard` accepts `PlaceRankingItem`, renders an `article` with accessible name `${rank}위 ${title}`, uses top-three medal colors and the normal primary color for ranks 4–10, renders `category` and `인기 비율 ${sharePercent.toFixed(1)}%`, and selects:

```ts
const imageSrc = place.primaryImageUrl ?? "/images/explore/categories/popular-attraction.png";
```

Remove `Link`, `RatingSummary`, location, rating, and review-count dependencies from this card.

Configure only the known provider host in `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL("https://tong.visitkorea.or.kr/**")],
  },
};
```

- [ ] **Step 6: Preserve audience through search/tab navigation**

Add a hidden `audience` field to the search form only when non-default, and ensure `buildDiscoveryHref` carries the value for generation filter and discovery tab links. Remove the old regional ranking filter UI only from `RankedPlaceSection`; do not remove regional query behavior from festivals or other tabs.

- [ ] **Step 7: Make focused web tests pass**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/web test -- discovery-content.test.tsx main-discovery.test.tsx discovery-components.test.tsx discovery-model.test.ts
```

Expected: new generation ranking tests pass and unrelated discovery tab tests remain green.

- [ ] **Step 8: Review checkpoint**

Run `git diff --check -- apps/web/src apps/web/tests`. Inspect that the popular reels tab and festival UI were not structurally changed. Do not perform Git mutations.

---

### Task 9: Integrated Verification, Browser QA, and Documentation

**Files:**
- Modify: `README.md`
- Modify: `ARCHITECTURE.md`
- Modify: `docs/ERD.md`
- Modify: `docs/superpowers/specs/2026-08-25-generation-place-ranking-design.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: verified runtime behavior and current implementation documentation.

- [ ] **Step 1: Update documentation with implemented boundaries**

Document:

- `pnpm ranking:import -- --directory="/absolute/path/to/download-directory"`
- official-download-only ingestion, no scraping
- `GET /api/v1/place-rankings?audience=all&limit=10`
- 180-row initial national snapshot and actual matched/unmatched counts
- frontend API connection and fallback image behavior
- `PlaceRanking` as implemented in current ERD, not future-only

Change the design status to `구현 및 검증 완료` only after all verification below passes.

- [ ] **Step 2: Run focused then package-level checks**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/contracts test
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/web test
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm lint
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm build
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm test:e2e
```

Expected: all changed-package unit, lint, production build, and API E2E checks pass. Report any unrelated existing failure separately with exact command/output.

- [ ] **Step 3: Start or confirm both local servers**

Confirm PID, port, and cwd before drawing runtime conclusions. Start the API on 4000 only if not already healthy and keep the existing web server on its actual port.

Ensure the ignored local file `apps/web/.env.local` contains exactly:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

Verify:

```bash
curl -fsS http://127.0.0.1:4000/api/v1/health
curl -fsS 'http://127.0.0.1:4000/api/v1/place-rankings?audience=all&limit=10'
```

- [ ] **Step 4: Browser-verify the default and age transitions**

At mobile width, open the actual local URL and verify:

1. `/?tab=recommended` shows `세대별 인기관광지 순위`.
2. period is `전국 · 2025.08~2026.07`.
3. list has exactly ten cards in rank order.
4. first three ALL names are 에버랜드, 코엑스, 킨텍스제2전시장.
5. clicking `20대` changes URL to `audience=20s`, marks it current, and first place becomes 여의도한강공원.
6. clicking `60대 이상` changes URL to `audience=60s-plus` and first place becomes 코엑스.
7. matched rows use provider images; unmatched rows use the local fallback without broken images.
8. cards are not links and do not navigate to unsupported detail pages.
9. horizontal scrolling remains available and scrollbar remains hidden.
10. browser console has no runtime, image-host, hydration, or accessibility errors.

- [ ] **Step 5: Verify API failure UI without corrupting data**

Temporarily point the web process at an unavailable API base or stop only the API process after recording its PID. Reload the recommended page and confirm the ranking section shows its retry message while the AI-course and festival sections still render. Restore the API process and re-verify the ready state.

- [ ] **Step 6: Final integrity review**

```bash
git diff --check
git status --short
```

Confirm downloaded CSVs, temporary fixtures, database dumps, logs, and screenshots are not added to the repository. Summarize only files changed for this feature and preserve all unrelated user changes.

- [ ] **Step 7: Final report**

Report implementation outcome first, then exact import counts, matched/unmatched counts, API sample, focused/full verification, browser URL/results, and any unrelated failures. Do not claim a check passed without current command evidence.
