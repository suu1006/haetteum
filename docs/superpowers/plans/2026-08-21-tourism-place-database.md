# Haetteum Tourism Place Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first Haetteum tourism-domain Prisma models and PostgreSQL migration for regions, districts, places, and tourism sync-run history.

**Architecture:** `apps/api` remains the sole owner of Prisma and PostgreSQL. Four normalized models store product region configuration, TourAPI district codes, TourAPI place metadata, and synchronization run state; external API calls, public place endpoints, rankings, festivals, reviews, and schedulers remain outside this plan.

**Tech Stack:** Node.js 24.19.0, pnpm 10.33.0, NestJS 11.2.1, Prisma 7.9.1, PostgreSQL 18.4, Jest 30.4.2, TypeScript 5.9.3

**Spec:** `docs/superpowers/specs/2026-08-21-tourism-place-database-design.md`

## Global Constraints

- Preserve the existing dirty worktree and the unrelated untracked `apps/web/public/images/discovery/` assets.
- Do not run `git add`, `git commit`, create a branch or worktree, or push. Record suggested Korean conventional commit messages only.
- Do not add a Repository abstraction; this plan changes only Prisma schema, migration, focused database tests, and architecture documentation.
- Do not add TourAPI credentials, external HTTP calls, cron, queues, public place endpoints, rankings, festivals, reviews, PostGIS, or `pg_trgm`.
- The first supported TourAPI content type is exactly `12`; the schema may store another integer later, but no other type is populated in this plan.
- Store TourAPI `contentid` as a string and Haetteum entity IDs as PostgreSQL UUIDs.
- Keep ranking, rating, review count, saved state, and AI recommendation data out of `Place`.
- Represent provider removal with `Place.isVisible = false`; do not delete places as part of synchronization semantics.
- Use Prisma 7's existing explicit generated output and `@prisma/adapter-pg`; do not edit generated Prisma files.
- Use the existing ignored `apps/api/.env` for `DATABASE_URL`. Do not request, print, or commit credentials.
- Use `apply_patch` for source and migration edits. Formatting commands may rewrite mechanically generated formatting.
- Read the approved spec before starting and stop if current files no longer match its stated foundation.

## File Structure

**Modify**

- `apps/api/prisma/schema.prisma`: define `TourismRegion`, `TourismDistrict`, `Place`, and `TourismSyncRun` plus their relations, database names, indexes, and constraints.
- `ARCHITECTURE.md`: change the database/domain status from empty to the exact implemented tourism foundation without claiming API or sync behavior exists.
- `README.md`: replace the obsolete statement that no domain models or migrations exist.
- `docs/superpowers/specs/2026-08-21-tourism-place-database-design.md`: mark the approved design implemented only after all verification passes.

**Create**

- `apps/api/src/prisma/tourism-schema.spec.ts`: generated Prisma metadata contract for model names, required fields, relation shape, and the compound place identity.
- `apps/api/prisma/migrations/20260821000000_add_tourism_place_foundation/migration.sql`: deterministic first domain migration with four tables, indexes, foreign keys, and five approved region rows.
- `apps/api/test/tourism-database.e2e-spec.ts`: real PostgreSQL coverage for seeded regions, nullable districts, compound uniqueness, foreign keys, and non-destructive visibility changes.
- `apps/api/prisma/migrations/migration_lock.toml`: Prisma PostgreSQL migration provider lock, if Prisma has not generated it automatically.

---

### Task 1: Define the Prisma tourism schema through a generated-metadata contract

**Files:**

- Create: `apps/api/src/prisma/tourism-schema.spec.ts`
- Modify: `apps/api/prisma/schema.prisma`

**Interfaces:**

- Consumes: `Prisma.dmmf` from the existing generated client at `apps/api/src/generated/prisma/client.ts`.
- Produces: Prisma delegates `tourismRegion`, `tourismDistrict`, `place`, and `tourismSyncRun`; compound unique input `PlaceSourceExternalIdCompoundUniqueInput`; relations `TourismRegion.districts`, `TourismRegion.places`, `TourismDistrict.region`, `TourismDistrict.places`, `Place.region`, and `Place.district`.

- [ ] **Step 1: Confirm runtime and current foundation before editing**

Run:

```bash
node --version
pnpm --version
git status --short
sed -n '1,220p' apps/api/prisma/schema.prisma
```

Expected:

- Node prints exactly `v24.19.0`.
- pnpm prints exactly `10.33.0`.
- The Prisma schema contains only the existing generator and PostgreSQL datasource.
- Existing unrelated dirty files remain visible and untouched.

- [ ] **Step 2: Write the failing generated-metadata contract**

Create `apps/api/src/prisma/tourism-schema.spec.ts`:

```ts
import { Prisma } from "../generated/prisma/client.js";

const expectedModels = [
  "TourismRegion",
  "TourismDistrict",
  "Place",
  "TourismSyncRun",
] as const;

function modelNamed(name: (typeof expectedModels)[number]) {
  const model = Prisma.dmmf.datamodel.models.find(
    (candidate) => candidate.name === name,
  );

  if (!model) {
    throw new Error(`Missing Prisma model: ${name}`);
  }

  return model;
}

function fieldNames(name: (typeof expectedModels)[number]) {
  return modelNamed(name).fields.map((field) => field.name);
}

describe("tourism Prisma schema", () => {
  it("exposes the four approved tourism models", () => {
    expect(Prisma.dmmf.datamodel.models.map((model) => model.name)).toEqual(
      expect.arrayContaining(expectedModels),
    );
  });

  it("keeps product region identity separate from provider codes", () => {
    expect(fieldNames("TourismRegion")).toEqual(
      expect.arrayContaining([
        "id",
        "slug",
        "name",
        "providerCode",
        "displayOrder",
        "isActive",
        "districts",
        "places",
      ]),
    );
  });

  it("stores normalized place metadata without ranking or review fields", () => {
    const names = fieldNames("Place");

    expect(names).toEqual(
      expect.arrayContaining([
        "id",
        "source",
        "externalId",
        "contentTypeId",
        "regionId",
        "districtId",
        "title",
        "longitude",
        "latitude",
        "primaryImageUrl",
        "imageCopyrightType",
        "providerModifiedAt",
        "isVisible",
        "lastSyncedAt",
      ]),
    );
    expect(names).not.toEqual(
      expect.arrayContaining([
        "rank",
        "rating",
        "reviewCount",
        "saved",
        "recommendationScore",
      ]),
    );
  });

  it("uses source and externalId as the provider identity", () => {
    expect(modelNamed("Place").uniqueFields).toContainEqual([
      "source",
      "externalId",
    ]);
  });

  it("allows a place without a district but requires its region", () => {
    const place = modelNamed("Place");
    const regionId = place.fields.find((field) => field.name === "regionId");
    const districtId = place.fields.find(
      (field) => field.name === "districtId",
    );

    expect(regionId?.isRequired).toBe(true);
    expect(districtId?.isRequired).toBe(false);
  });

  it("tracks sync status, counters, and the successful-run watermark input", () => {
    expect(fieldNames("TourismSyncRun")).toEqual(
      expect.arrayContaining([
        "provider",
        "jobType",
        "status",
        "requestedFrom",
        "startedAt",
        "finishedAt",
        "fetchedCount",
        "insertedCount",
        "updatedCount",
        "deactivatedCount",
        "failedCount",
        "errorSummary",
      ]),
    );
  });
});
```

- [ ] **Step 3: Run the focused test and confirm the missing-model failure**

Run:

```bash
pnpm --filter @haetteum/api test -- tourism-schema.spec.ts
```

Expected: FAIL with `Missing Prisma model: TourismRegion` or with the model-list assertion showing the four models are absent.

- [ ] **Step 4: Add the exact four Prisma models**

Append the following to `apps/api/prisma/schema.prisma`, preserving the existing generator and datasource exactly:

```prisma
model TourismRegion {
  id           String  @id @default(uuid()) @db.Uuid
  slug         String  @unique @db.VarChar(32)
  name         String  @db.VarChar(100)
  providerCode String  @unique @map("provider_code") @db.VarChar(10)
  displayOrder Int     @map("display_order")
  isActive     Boolean @default(true) @map("is_active")

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(3)

  districts TourismDistrict[]
  places    Place[]

  @@map("tourism_regions")
}

model TourismDistrict {
  id           String  @id @default(uuid()) @db.Uuid
  regionId     String  @map("region_id") @db.Uuid
  providerCode String  @unique @map("provider_code") @db.VarChar(10)
  name         String  @db.VarChar(100)
  isActive     Boolean @default(true) @map("is_active")

  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(3)

  region TourismRegion @relation(fields: [regionId], references: [id], onDelete: Restrict)
  places Place[]

  @@index([regionId])
  @@map("tourism_districts")
}

model Place {
  id            String @id @default(uuid()) @db.Uuid
  source        String @db.VarChar(32)
  externalId    String @map("external_id") @db.VarChar(64)
  contentTypeId Int    @map("content_type_id")

  regionId   String  @map("region_id") @db.Uuid
  districtId String? @map("district_id") @db.Uuid

  title     String  @db.VarChar(500)
  address1  String? @db.VarChar(500)
  address2  String? @db.VarChar(500)
  zipcode   String? @db.VarChar(20)
  longitude Decimal? @db.Decimal(10, 7)
  latitude  Decimal? @db.Decimal(10, 7)
  mapLevel  Int?     @map("map_level")

  category1 String? @db.VarChar(20)
  category2 String? @db.VarChar(20)
  category3 String? @db.VarChar(20)
  telephone String? @db.VarChar(100)
  homepage  String? @db.Text
  overview  String? @db.Text

  primaryImageUrl      String? @map("primary_image_url") @db.Text
  primaryThumbnailUrl  String? @map("primary_thumbnail_url") @db.Text
  imageCopyrightType   String? @map("image_copyright_type") @db.VarChar(20)
  providerCreatedAt    DateTime? @map("provider_created_at") @db.Timestamptz(3)
  providerModifiedAt   DateTime @map("provider_modified_at") @db.Timestamptz(3)
  isVisible             Boolean @default(true) @map("is_visible")
  lastSyncedAt          DateTime @map("last_synced_at") @db.Timestamptz(3)
  createdAt             DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt             DateTime @updatedAt @map("updated_at") @db.Timestamptz(3)

  region   TourismRegion    @relation(fields: [regionId], references: [id], onDelete: Restrict)
  district TourismDistrict? @relation(fields: [districtId], references: [id], onDelete: SetNull)

  @@unique([source, externalId])
  @@index([regionId, isVisible])
  @@index([districtId, isVisible])
  @@index([contentTypeId, isVisible])
  @@index([providerModifiedAt])
  @@map("places")
}

model TourismSyncRun {
  id            String    @id @default(uuid()) @db.Uuid
  provider      String    @db.VarChar(32)
  jobType       String    @map("job_type") @db.VarChar(32)
  status        String    @db.VarChar(32)
  requestedFrom DateTime? @map("requested_from") @db.Timestamptz(3)
  startedAt     DateTime  @default(now()) @map("started_at") @db.Timestamptz(3)
  finishedAt    DateTime? @map("finished_at") @db.Timestamptz(3)

  fetchedCount     Int @default(0) @map("fetched_count")
  insertedCount    Int @default(0) @map("inserted_count")
  updatedCount     Int @default(0) @map("updated_count")
  deactivatedCount Int @default(0) @map("deactivated_count")
  failedCount      Int @default(0) @map("failed_count")
  errorSummary     String? @map("error_summary") @db.Text

  @@index([provider, status, finishedAt])
  @@map("tourism_sync_runs")
}
```

- [ ] **Step 5: Format, validate, and regenerate the Prisma client**

Run:

```bash
pnpm --filter @haetteum/api exec prisma format
pnpm --filter @haetteum/api exec prisma validate
pnpm db:generate
```

Expected: all commands exit 0 and the ignored generated client exposes the four new delegates.

- [ ] **Step 6: Run the focused schema contract**

Run:

```bash
pnpm --filter @haetteum/api test -- tourism-schema.spec.ts
```

Expected: PASS with six tests.

- [ ] **Step 7: Run focused API lint and inspect the schema diff**

Run:

```bash
pnpm --filter @haetteum/api exec eslint src/prisma/tourism-schema.spec.ts --max-warnings=0
git diff -- apps/api/prisma/schema.prisma apps/api/src/prisma/tourism-schema.spec.ts
git diff --check -- apps/api/prisma/schema.prisma apps/api/src/prisma/tourism-schema.spec.ts
```

Expected: lint and diff check pass; the diff contains only the approved models and the metadata contract.

Suggested commit only — do not execute Git commands: `feat: 관광지 Prisma 모델 추가`

---

### Task 2: Create the first domain migration and prove PostgreSQL constraints

**Files:**

- Create: `apps/api/test/tourism-database.e2e-spec.ts`
- Create: `apps/api/prisma/migrations/20260821000000_add_tourism_place_foundation/migration.sql`
- Create if absent: `apps/api/prisma/migrations/migration_lock.toml`

**Interfaces:**

- Consumes: generated Prisma delegates from Task 1 and the existing `AppModule`/`PrismaService` lifecycle.
- Produces: PostgreSQL tables `tourism_regions`, `tourism_districts`, `places`, and `tourism_sync_runs`; five deterministic region rows; database-enforced place provider identity and foreign keys.

- [ ] **Step 1: Start the project PostgreSQL without deleting existing data**

Run:

```bash
pnpm db:up
```

Expected: the configured PostgreSQL becomes healthy. Do not run `docker compose down -v` or delete the named volume.

- [ ] **Step 2: Write the failing real-database test**

Create `apps/api/test/tourism-database.e2e-spec.ts`:

```ts
import { randomUUID } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { AppModule } from "../src/app.module.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

const EXPECTED_REGIONS = [
  { slug: "seoul", name: "서울", providerCode: "11", displayOrder: 1 },
  { slug: "gyeonggi", name: "경기", providerCode: "41", displayOrder: 2 },
  { slug: "gangwon", name: "강원", providerCode: "51", displayOrder: 3 },
  { slug: "busan", name: "부산", providerCode: "26", displayOrder: 4 },
  { slug: "jeju", name: "제주", providerCode: "50", displayOrder: 5 },
] as const;

describe("tourism database foundation (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testRegionIds = new Set<string>();
  const testSyncRunIds = new Set<string>();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    const syncRunIds = [...testSyncRunIds];
    if (syncRunIds.length > 0) {
      await prisma.tourismSyncRun.deleteMany({
        where: { id: { in: syncRunIds } },
      });
      testSyncRunIds.clear();
    }

    const ids = [...testRegionIds];
    if (ids.length === 0) return;

    await prisma.place.deleteMany({ where: { regionId: { in: ids } } });
    await prisma.tourismDistrict.deleteMany({
      where: { regionId: { in: ids } },
    });
    await prisma.tourismRegion.deleteMany({ where: { id: { in: ids } } });
    testRegionIds.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createTestRegion() {
    const suffix = randomUUID().replaceAll("-", "");
    const region = await prisma.tourismRegion.create({
      data: {
        slug: `test-${suffix.slice(0, 20)}`,
        name: "테스트 지역",
        providerCode: `t${suffix.slice(0, 9)}`,
        displayOrder: 999,
      },
    });
    testRegionIds.add(region.id);
    return region;
  }

  function placeData(regionId: string, externalId: string) {
    const now = new Date();
    return {
      source: "TOUR_API",
      externalId,
      contentTypeId: 12,
      regionId,
      title: "테스트 관광지",
      providerModifiedAt: now,
      lastSyncedAt: now,
    };
  }

  it("contains the five approved product regions", async () => {
    const regions = await prisma.tourismRegion.findMany({
      where: { slug: { in: EXPECTED_REGIONS.map((region) => region.slug) } },
      orderBy: { displayOrder: "asc" },
      select: {
        slug: true,
        name: true,
        providerCode: true,
        displayOrder: true,
      },
    });

    expect(regions).toEqual(EXPECTED_REGIONS);
  });

  it("stores a place without a district and preserves its UUID when hidden", async () => {
    const region = await createTestRegion();
    const created = await prisma.place.create({
      data: placeData(region.id, randomUUID()),
    });
    const hidden = await prisma.place.update({
      where: { id: created.id },
      data: { isVisible: false },
    });

    expect(created.districtId).toBeNull();
    expect(hidden.id).toBe(created.id);
    expect(hidden.isVisible).toBe(false);
  });

  it("rejects duplicate provider identities", async () => {
    const region = await createTestRegion();
    const externalId = randomUUID();
    await prisma.place.create({ data: placeData(region.id, externalId) });

    await expect(
      prisma.place.create({ data: placeData(region.id, externalId) }),
    ).rejects.toMatchObject({ code: "P2002" });
  });

  it("rejects deleting a region that still owns a place", async () => {
    const region = await createTestRegion();
    await prisma.place.create({
      data: placeData(region.id, randomUUID()),
    });

    await expect(
      prisma.tourismRegion.delete({ where: { id: region.id } }),
    ).rejects.toMatchObject({ code: "P2003" });
  });

  it("sets a place district to null when that district is removed", async () => {
    const region = await createTestRegion();
    const district = await prisma.tourismDistrict.create({
      data: {
        regionId: region.id,
        providerCode: `d${randomUUID().replaceAll("-", "").slice(0, 9)}`,
        name: "테스트 시군구",
      },
    });
    const place = await prisma.place.create({
      data: {
        ...placeData(region.id, randomUUID()),
        districtId: district.id,
      },
    });

    await prisma.tourismDistrict.delete({ where: { id: district.id } });
    const updated = await prisma.place.findUniqueOrThrow({
      where: { id: place.id },
    });

    expect(updated.districtId).toBeNull();
  });

  it("stores a successful sync run with zeroed counters", async () => {
    const finishedAt = new Date();
    const run = await prisma.tourismSyncRun.create({
      data: {
        provider: "TOUR_API",
        jobType: "FULL",
        status: "SUCCEEDED",
        finishedAt,
      },
    });
    testSyncRunIds.add(run.id);

    expect(run).toMatchObject({
      provider: "TOUR_API",
      jobType: "FULL",
      status: "SUCCEEDED",
      requestedFrom: null,
      fetchedCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      deactivatedCount: 0,
      failedCount: 0,
    });
    expect(run.finishedAt).toEqual(finishedAt);
  });
});
```

- [ ] **Step 3: Run the database test and confirm that the tables are missing**

Run:

```bash
pnpm --filter @haetteum/api exec node --experimental-vm-modules ./node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand test/tourism-database.e2e-spec.ts
```

Expected: FAIL with PostgreSQL/Prisma reporting that `tourism_regions` does not exist. If it unexpectedly passes, stop and inspect the connected database and existing migration state before proceeding.

- [ ] **Step 4: Add the exact deterministic migration SQL**

Create `apps/api/prisma/migrations/20260821000000_add_tourism_place_foundation/migration.sql`:

```sql
CREATE TABLE "tourism_regions" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(32) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "provider_code" VARCHAR(10) NOT NULL,
    "display_order" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tourism_regions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tourism_districts" (
    "id" UUID NOT NULL,
    "region_id" UUID NOT NULL,
    "provider_code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tourism_districts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "places" (
    "id" UUID NOT NULL,
    "source" VARCHAR(32) NOT NULL,
    "external_id" VARCHAR(64) NOT NULL,
    "content_type_id" INTEGER NOT NULL,
    "region_id" UUID NOT NULL,
    "district_id" UUID,
    "title" VARCHAR(500) NOT NULL,
    "address1" VARCHAR(500),
    "address2" VARCHAR(500),
    "zipcode" VARCHAR(20),
    "longitude" DECIMAL(10,7),
    "latitude" DECIMAL(10,7),
    "map_level" INTEGER,
    "category1" VARCHAR(20),
    "category2" VARCHAR(20),
    "category3" VARCHAR(20),
    "telephone" VARCHAR(100),
    "homepage" TEXT,
    "overview" TEXT,
    "primary_image_url" TEXT,
    "primary_thumbnail_url" TEXT,
    "image_copyright_type" VARCHAR(20),
    "provider_created_at" TIMESTAMPTZ(3),
    "provider_modified_at" TIMESTAMPTZ(3) NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "last_synced_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tourism_sync_runs" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(32) NOT NULL,
    "job_type" VARCHAR(32) NOT NULL,
    "status" VARCHAR(32) NOT NULL,
    "requested_from" TIMESTAMPTZ(3),
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(3),
    "fetched_count" INTEGER NOT NULL DEFAULT 0,
    "inserted_count" INTEGER NOT NULL DEFAULT 0,
    "updated_count" INTEGER NOT NULL DEFAULT 0,
    "deactivated_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "error_summary" TEXT,

    CONSTRAINT "tourism_sync_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tourism_regions_slug_key" ON "tourism_regions"("slug");
CREATE UNIQUE INDEX "tourism_regions_provider_code_key" ON "tourism_regions"("provider_code");
CREATE UNIQUE INDEX "tourism_districts_provider_code_key" ON "tourism_districts"("provider_code");
CREATE INDEX "tourism_districts_region_id_idx" ON "tourism_districts"("region_id");
CREATE UNIQUE INDEX "places_source_external_id_key" ON "places"("source", "external_id");
CREATE INDEX "places_region_id_is_visible_idx" ON "places"("region_id", "is_visible");
CREATE INDEX "places_district_id_is_visible_idx" ON "places"("district_id", "is_visible");
CREATE INDEX "places_content_type_id_is_visible_idx" ON "places"("content_type_id", "is_visible");
CREATE INDEX "places_provider_modified_at_idx" ON "places"("provider_modified_at");
CREATE INDEX "tourism_sync_runs_provider_status_finished_at_idx" ON "tourism_sync_runs"("provider", "status", "finished_at");

ALTER TABLE "tourism_districts"
ADD CONSTRAINT "tourism_districts_region_id_fkey"
FOREIGN KEY ("region_id") REFERENCES "tourism_regions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "places"
ADD CONSTRAINT "places_region_id_fkey"
FOREIGN KEY ("region_id") REFERENCES "tourism_regions"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "places"
ADD CONSTRAINT "places_district_id_fkey"
FOREIGN KEY ("district_id") REFERENCES "tourism_districts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "tourism_regions"
    ("id", "slug", "name", "provider_code", "display_order", "is_active", "created_at", "updated_at")
VALUES
    ('00000000-0000-4000-8000-000000000011', 'seoul', '서울', '11', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000041', 'gyeonggi', '경기', '41', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000051', 'gangwon', '강원', '51', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000026', 'busan', '부산', '26', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000050', 'jeju', '제주', '50', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
```

If absent, create `apps/api/prisma/migrations/migration_lock.toml`:

```toml
provider = "postgresql"
```

- [ ] **Step 5: Validate the schema and inspect the migration before applying it**

Run:

```bash
pnpm --filter @haetteum/api exec prisma validate
rg -n 'CREATE TABLE|CREATE (UNIQUE )?INDEX|FOREIGN KEY|INSERT INTO' apps/api/prisma/migrations/20260821000000_add_tourism_place_foundation/migration.sql
```

Expected: schema validation passes and the inspection lists four tables, all approved indexes, three foreign keys, and the one five-row region insert.

- [ ] **Step 6: Apply the migration to the project database**

Run:

```bash
pnpm db:deploy
pnpm --filter @haetteum/api exec prisma migrate status
```

Expected: the migration applies once and status reports the database schema up to date.

- [ ] **Step 7: Run the focused real-database test**

Run:

```bash
pnpm --filter @haetteum/api exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
pnpm --filter @haetteum/api exec node --experimental-vm-modules ./node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand test/tourism-database.e2e-spec.ts
```

Expected: the database-to-schema diff exits 0 with no drift, then all six tests pass. The test leaves the five approved regions intact and removes only its UUID-suffixed test places, districts, regions, and sync runs.

- [ ] **Step 8: Verify migration idempotence and focused lint**

Run:

```bash
pnpm db:deploy
pnpm --filter @haetteum/api exec prisma migrate status
pnpm --filter @haetteum/api exec eslint test/tourism-database.e2e-spec.ts --max-warnings=0
git diff --check -- apps/api/prisma apps/api/test/tourism-database.e2e-spec.ts
```

Expected: the second deploy applies nothing, status stays current, the five seeded rows are not duplicated, lint and diff check pass.

Suggested commit only — do not execute Git commands: `feat: 관광지 데이터베이스 마이그레이션 추가`

---

### Task 3: Update architecture truth and run full regression verification

**Files:**

- Modify: `ARCHITECTURE.md`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-21-tourism-place-database-design.md`

**Interfaces:**

- Consumes: the verified Prisma models and applied migration from Tasks 1–2.
- Produces: documentation that distinguishes implemented database storage from still-missing TourAPI clients, synchronization jobs, public place endpoints, rankings, festivals, and reviews.

- [ ] **Step 1: Update `ARCHITECTURE.md` without overstating implementation**

Make these exact semantic changes:

1. In the current implementation diagram and repository tree, describe the Prisma schema as containing the tourism database foundation.
2. Keep `places` API module and tourism synchronization module marked unimplemented.
3. Replace the statement that no domain models or migrations exist with the four implemented models and first migration.
4. State that the database contains five product regions but no TourAPI place rows until the later synchronization flow runs.
5. Keep external API calls, public place HTTP contracts, ranking, festivals, reviews, and AI recommendations marked unimplemented.

Use this replacement text for the database status subsection:

```markdown
### 8.1 현재 데이터베이스 범위

Prisma schema에는 관광 데이터 기반인 `TourismRegion`, `TourismDistrict`, `Place`,
`TourismSyncRun` 모델과 첫 migration이 구현되어 있다. migration은 메인 화면에서
승인된 서울·경기·강원·부산·제주 다섯 지역을 기준 데이터로 생성한다.

이 구현은 저장 구조와 제약만 제공한다. 시군구와 관광지 실데이터를 가져오는
TourAPI client, 일일 동기화 실행, 공개 관광지 조회 endpoint, 인기순위·축제·후기
데이터는 아직 구현되지 않았다.

PostgreSQL은 로컬에서 Docker Compose로 실행하고 named volume
`haetteum_postgres_data`에 데이터를 보존한다. `pnpm db:down`은 volume을
삭제하지 않는다.
```

- [ ] **Step 2: Update the obsolete README foundation statement**

Replace the final `현재 foundation 범위` paragraph with:

```markdown
## 현재 데이터베이스 범위

API 공통 기반과 함께 관광 지역·시군구·관광지·동기화 실행 이력을 위한 첫 Prisma
모델과 migration이 존재합니다. migration은 메인 화면의 서울·경기·강원·부산·제주
기준 지역을 생성합니다.

TourAPI 실제 호출, 시군구·관광지 데이터 동기화, 공개 관광지 조회 API, 인기순위,
축제와 후기는 아직 구현되지 않았습니다.
```

- [ ] **Step 3: Mark the approved spec implemented only after verification**

Change only the status line in `docs/superpowers/specs/2026-08-21-tourism-place-database-design.md` to:

```markdown
**상태:** 구현 및 검증 완료
```

Do not change the approved scope or rewrite the decision history.

- [ ] **Step 4: Run focused Prisma and database verification**

Run:

```bash
pnpm --filter @haetteum/api exec prisma format
pnpm --filter @haetteum/api exec prisma validate
pnpm db:generate
pnpm --filter @haetteum/api test -- tourism-schema.spec.ts
pnpm --filter @haetteum/api exec node --experimental-vm-modules ./node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand test/tourism-database.e2e-spec.ts
pnpm --filter @haetteum/api exec prisma migrate status
```

Expected: schema formatting/validation/generation pass, six metadata tests pass, six real-database tests pass, and migration status is current.

- [ ] **Step 5: Run full repository verification**

Run in this order:

```bash
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
git diff --check
```

Expected:

- all workspace lint commands pass with no warnings;
- all unit tests pass;
- contracts, API, and web production builds pass;
- all API e2e tests, including the tourism database file, pass against PostgreSQL;
- diff check reports no whitespace errors.

- [ ] **Step 6: Inspect final scope and preserve unrelated changes**

Run:

```bash
git status --short
git diff -- apps/api/prisma/schema.prisma apps/api/prisma/migrations apps/api/src/prisma/tourism-schema.spec.ts apps/api/test/tourism-database.e2e-spec.ts ARCHITECTURE.md README.md docs/superpowers/specs/2026-08-21-tourism-place-database-design.md
```

Expected: only the approved tourism database files and documentation appear in the scoped diff. Do not stage them. Report unrelated dirty files separately without modifying them.

Suggested commit grouping only — do not execute Git commands:

1. `feat: 관광지 데이터베이스 기반 추가`
2. `docs: 관광 데이터베이스 구현 상태 반영`

## Completion Boundary

This plan is complete when the four Prisma models, deterministic migration, five region rows, focused metadata tests, real PostgreSQL constraint tests, architecture documentation, and full regression checks all pass. Completion does not claim that TourAPI data has been fetched, that a scheduler runs, or that the main page can call a places endpoint.
