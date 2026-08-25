# Haetteum TourAPI Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect four Korean Tourism Organization TourAPI operations to NestJS, synchronize five regions into PostgreSQL, expose a database-backed regional place list, and provide manual, scheduled, and smoke-test execution paths.

**Architecture:** `TourismModule` owns the external JSON provider client, mapping, full/incremental synchronization, commands, and daily trigger. `PlacesModule` owns only PostgreSQL-backed public reads, while `@haetteum/contracts` owns the HTTP query/response schemas; browser requests never call TourAPI directly.

**Tech Stack:** Node.js 24.19.0, pnpm 10.33.0, NestJS 11.2.1, `@nestjs/schedule` 6.1.3, Prisma 7.9.1, PostgreSQL 18.4, Zod 4.4.3, Jest 30.4.2, Vitest 4.1.10

**Spec:** `docs/superpowers/specs/2026-08-22-tourapi-integration-design.md`

## Global Constraints

- Preserve every pre-existing dirty frontend, design, documentation, and generated-asset change.
- Do not run `git add`, `git commit`, create a branch or worktree, push, reset, checkout, or clean. Record suggested Korean conventional commit messages only.
- Use exactly Node.js `24.19.0` and pnpm `10.33.0`; stop before edits if another Node version is active.
- Read the approved spec before starting; it is authoritative when this plan text conflicts with it.
- Read actual values only from ignored `apps/api/.env`; never print, snapshot, log, return, or commit `SERVICE_KEY`.
- Keep root `.env` Docker Compose-only. Do not change or copy secrets into tracked files.
- Use the exact provider Base URL suffix `/B551011/KorService2`, JSON `_type=json`, `MobileOS=ETC`, `MobileApp=Haetteum`, and `numOfRows=100`.
- Implement only `ldongCode2`, `areaBasedList2`, `areaBasedSyncList2`, and `detailCommon2`.
- Synchronize only `contentTypeId=12` and the approved region codes `11`, `41`, `51`, `26`, `50`.
- Do not implement rankings, reviews, festivals, images beyond the primary pair, other content types, Redis, queues, workers, or a distributed lock.
- Do not call `detailCommon2` for every place. It is manual one-place enrichment and smoke-only.
- Do not connect the current `인기 관광지 TOP 3` frontend to the new API; this plan has no popularity source.
- Do not add a Repository abstraction. Application services use `PrismaService` directly.
- Default tests must not call the real provider. Only `tourism:smoke` may use live credentials.
- All external response parsing is internal to `apps/api`; never export provider DTOs through `@haetteum/contracts`.
- Success responses remain direct endpoint contracts; errors remain RFC 9457 Problem Details.
- Do not edit Prisma generated files.

## File Structure

### Modify

- `apps/api/package.json`: add `@nestjs/schedule` and manual/smoke scripts.
- `package.json`: delegate root tourism commands to the API workspace.
- `pnpm-lock.yaml`: lock the exact scheduler version.
- `apps/api/.env.example`: document non-secret provider settings.
- `apps/api/src/config/environment.ts`: validate optional provider config and sync enablement.
- `apps/api/src/config/environment.spec.ts`: provider configuration behavior.
- `apps/api/src/app.module.ts`: import `TourismModule` and `PlacesModule`.
- `apps/api/src/prisma/tourism-schema.spec.ts`: use the canonical `TOUR_API` source fixture.
- `apps/api/test/set-test-env.ts`: explicitly disable scheduled sync in tests.
- `apps/api/test/app.e2e-spec.ts`: database-backed places route boundary.
- `packages/contracts/src/index.ts`: export places contracts.
- `packages/contracts/src/contracts.test.ts`: validate list query and response.
- `README.md`, `ARCHITECTURE.md`, `docs/ERD.md`: implementation and operation truth after verification.
- `docs/superpowers/specs/2026-08-22-tourapi-integration-design.md`: mark implemented only after all checks and the live smoke pass.

### Create

- `packages/contracts/src/places.ts`
- `apps/api/src/tourism/tour-api.types.ts`
- `apps/api/src/tourism/tour-api.schemas.ts`
- `apps/api/src/tourism/tour-api.client.ts`
- `apps/api/src/tourism/tour-api.client.spec.ts`
- `apps/api/src/tourism/tour-api.mapper.ts`
- `apps/api/src/tourism/tour-api.mapper.spec.ts`
- `apps/api/src/tourism/tourism.constants.ts`
- `apps/api/src/tourism/tourism.module.ts`
- `apps/api/src/tourism/tourism-sync.service.ts`
- `apps/api/src/tourism/tourism-sync.service.spec.ts`
- `apps/api/src/tourism/tourism-sync.scheduler.ts`
- `apps/api/src/tourism/tourism-sync.scheduler.spec.ts`
- `apps/api/src/tourism/tourism-sync.command.ts`
- `apps/api/src/tourism/tourism-smoke.command.ts`
- `apps/api/test/tourism-sync.e2e-spec.ts`
- `apps/api/src/places/places.module.ts`
- `apps/api/src/places/places.controller.ts`
- `apps/api/src/places/places.controller.spec.ts`
- `apps/api/src/places/places.service.ts`
- `apps/api/src/places/places.service.spec.ts`

---

### Task 1: Provider environment contract and scheduler dependency

**Files:**

- Modify: `apps/api/src/config/environment.ts`
- Modify: `apps/api/src/config/environment.spec.ts`
- Modify: `apps/api/.env.example`
- Modify: `apps/api/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/api/test/set-test-env.ts`

**Interfaces:**

- Produces: `ApiEnvironment` fields `END_POINT?: string`, `SERVICE_KEY?: string`, `TOURISM_SYNC_ENABLED: boolean`.
- Consumes: existing `validateEnvironment(config)` bootstrap boundary.

- [ ] **Step 1: Confirm runtime, dirty scope, and secret location**

Run:

```bash
node --version
pnpm --version
git status --short
test -f apps/api/.env
test -n "$(sed -n 's/^END_POINT=//p' apps/api/.env)"
test -n "$(sed -n 's/^SERVICE_KEY=//p' apps/api/.env)"
```

Expected: Node `v24.19.0`, pnpm `10.33.0`, both secret-bearing values exist, and no value is printed.

- [ ] **Step 2: Write failing environment tests**

Add these cases to `environment.spec.ts`:

```ts
it("allows the API to boot with tourism sync disabled and no provider secret", () => {
  expect(
    validateEnvironment({
      ...validEnvironment,
      END_POINT: "",
      SERVICE_KEY: "",
      TOURISM_SYNC_ENABLED: "false",
    }),
  ).toMatchObject({
    END_POINT: undefined,
    SERVICE_KEY: undefined,
    TOURISM_SYNC_ENABLED: false,
  });
});

it("parses an enabled TourAPI configuration", () => {
  expect(
    validateEnvironment({
      ...validEnvironment,
      END_POINT: "https://apis.data.go.kr/B551011/KorService2",
      SERVICE_KEY: "secret-for-test-only",
      TOURISM_SYNC_ENABLED: "true",
    }),
  ).toMatchObject({
    END_POINT: "https://apis.data.go.kr/B551011/KorService2",
    SERVICE_KEY: "secret-for-test-only",
    TOURISM_SYNC_ENABLED: true,
  });
});

it("rejects enabled sync without both provider values", () => {
  expect(() =>
    validateEnvironment({
      ...validEnvironment,
      TOURISM_SYNC_ENABLED: "true",
    }),
  ).toThrow("END_POINT");
});

it("rejects a provider URL outside the approved HTTPS service path", () => {
  expect(() =>
    validateEnvironment({
      ...validEnvironment,
      END_POINT: "http://example.com/KorService2",
      SERVICE_KEY: "secret-for-test-only",
      TOURISM_SYNC_ENABLED: "true",
    }),
  ).toThrow("END_POINT");
});
```

- [ ] **Step 3: Run RED**

Run:

```bash
pnpm --filter @haetteum/api test -- environment.spec.ts
```

Expected: FAIL because `TOURISM_SYNC_ENABLED`, conditional provider validation, and provider URL validation do not exist.

- [ ] **Step 4: Implement the environment schema**

Use this shape in `environment.ts`:

```ts
const booleanFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const providerEndpoint = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z
    .string()
    .url()
    .refine(
      (value) =>
        value.startsWith("https://") &&
        new URL(value).pathname.replace(/\/+$/, "") ===
          "/B551011/KorService2",
      { message: "END_POINT must be the approved HTTPS KorService2 URL" },
    )
    .optional(),
);

const providerSecret = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().min(1).optional(),
);

const ApiEnvironmentSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]),
    API_PORT: z.coerce.number().int().min(1).max(65535),
    WEB_ORIGIN: z.string().url(),
    DATABASE_URL: z
      .string()
      .url()
      .refine((value) => value.startsWith("postgresql://"), {
        message: "DATABASE_URL must use postgresql://",
      }),
    END_POINT: providerEndpoint,
    SERVICE_KEY: providerSecret,
    TOURISM_SYNC_ENABLED: booleanFromString,
  })
  .superRefine((value, context) => {
    if (!value.TOURISM_SYNC_ENABLED) return;
    if (!value.END_POINT) {
      context.addIssue({
        code: "custom",
        path: ["END_POINT"],
        message: "END_POINT is required when tourism sync is enabled",
      });
    }
    if (!value.SERVICE_KEY) {
      context.addIssue({
        code: "custom",
        path: ["SERVICE_KEY"],
        message: "SERVICE_KEY is required when tourism sync is enabled",
      });
    }
  });
```

- [ ] **Step 5: Add non-secret examples and disable sync in tests**

Append to `apps/api/.env.example`:

```dotenv
END_POINT=https://apis.data.go.kr/B551011/KorService2
SERVICE_KEY=
TOURISM_SYNC_ENABLED=false
```

Append to `test/set-test-env.ts`:

```ts
process.env.TOURISM_SYNC_ENABLED = "false";
```

- [ ] **Step 6: Install the exact scheduler dependency**

Run:

```bash
pnpm add --filter @haetteum/api @nestjs/schedule@6.1.3
```

Expected: only `apps/api/package.json` and `pnpm-lock.yaml` dependency state changes.

- [ ] **Step 7: Run GREEN and focused validation**

Run:

```bash
pnpm --filter @haetteum/api test -- environment.spec.ts
pnpm --filter @haetteum/api exec eslint src/config/environment.ts src/config/environment.spec.ts test/set-test-env.ts --max-warnings=0
git diff --check -- apps/api/src/config apps/api/.env.example apps/api/package.json pnpm-lock.yaml apps/api/test/set-test-env.ts
```

Expected: all environment tests and lint pass; no secret value appears in the diff.

Suggested commit only: `feat: TourAPI 환경변수 계약 추가`

---

### Task 2: Typed TourAPI JSON schemas and resilient client

**Files:**

- Create: `apps/api/src/tourism/tour-api.types.ts`
- Create: `apps/api/src/tourism/tour-api.schemas.ts`
- Create: `apps/api/src/tourism/tour-api.client.ts`
- Create: `apps/api/src/tourism/tour-api.client.spec.ts`
- Create: `apps/api/src/tourism/tourism.constants.ts`

**Interfaces:**

- Produces:

```ts
export type TourApiPage<T> = {
  items: readonly T[];
  pageNo: number;
  numOfRows: number;
  totalCount: number;
};

export interface TourApiPort {
  getDistrictPage(input: {
    regionCode: string;
    pageNo: number;
  }): Promise<TourApiPage<TourApiDistrict>>;
  getPlacePage(input: {
    regionCode: string;
    pageNo: number;
  }): Promise<TourApiPage<TourApiPlace>>;
  getChangedPlacePage(input: {
    regionCode: string;
    modifiedDate: string;
    showflag: "0" | "1";
    pageNo: number;
  }): Promise<TourApiPage<TourApiChangedPlace>>;
  getChangedPlaceProbePage(input: {
    regionCode: string;
    showflag: "0" | "1";
    pageNo: number;
  }): Promise<TourApiPage<TourApiChangedPlace>>;
  getPlaceDetail(contentId: string): Promise<TourApiPlaceDetail>;
}
```

- Produces DI tokens `TOUR_API_PORT`, `TOUR_API_FETCH`, `TOUR_API_SLEEP`.
- Consumes Task 1 provider configuration.

- [ ] **Step 1: Define complete provider fixtures in the test first**

In `tour-api.client.spec.ts`, define a complete successful response fixture rather than a partial mock:

```ts
const placeItem = {
  contentid: "2704412",
  contenttypeid: "12",
  title: "아침미소목장",
  addr1: "제주특별자치도 제주시 첨단동길 160-20",
  addr2: "",
  zipcode: "63312",
  mapx: "126.5851000000",
  mapy: "33.4541000000",
  mlevel: "6",
  tel: "064-727-2545",
  firstimage: "https://example.test/original.jpg",
  firstimage2: "https://example.test/thumb.jpg",
  cpyrhtDivCd: "Type1",
  createdtime: "20190717123456",
  modifiedtime: "20260720123456",
  lDongRegnCd: "50",
  lDongSignguCd: "110",
  lclsSystm1: "VE",
  lclsSystm2: "VE03",
  lclsSystm3: "VE030500",
};

const pageResponse = {
  response: {
    header: { resultCode: "0000", resultMsg: "OK" },
    body: {
      items: { item: [placeItem] },
      pageNo: 1,
      numOfRows: 100,
      totalCount: 1,
    },
  },
};
```

Write tests named exactly for these breaks:

```ts
it("calls areaBasedList2 with encoded credentials and fixed JSON parameters", async () => {});
it("normalizes a single item object, an item array, and empty items", async () => {});
it("throws a sanitized provider error for resultCode other than 0000", async () => {});
it("detects an XML gateway error without exposing the service key", async () => {});
it("retries timeout, 429, and 5xx twice but does not retry a validation error", async () => {});
it("supports ldongCode2, areaBasedSyncList2, and detailCommon2 parameters", async () => {});
```

- [ ] **Step 2: Run RED**

Run:

```bash
pnpm --filter @haetteum/api test -- tour-api.client.spec.ts
```

Expected: FAIL because the tourism client files and DI tokens do not exist.

- [ ] **Step 3: Implement schemas and public provider types**

Use Zod preprocessors that accept an object, array, empty string, or absent `item`:

```ts
function itemArraySchema<T extends z.ZodTypeAny>(item: T) {
  return z.preprocess((value) => {
    if (value === "" || value == null) return [];
    return Array.isArray(value) ? value : [value];
  }, z.array(item));
}

export function tourApiPageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    response: z.object({
      header: z.object({
        resultCode: z.string(),
        resultMsg: z.string(),
      }),
      body: z.object({
        items: z
          .union([
            z.object({ item: itemArraySchema(item) }),
            z.literal(""),
          ])
          .optional(),
        pageNo: z.coerce.number().int().positive(),
        numOfRows: z.coerce.number().int().nonnegative(),
        totalCount: z.coerce.number().int().nonnegative(),
      }),
    }),
  });
}
```

Define complete district, place, changed-place, and common-detail schemas with every field consumed by the mapper. Keep provider values as strings at this boundary.

- [ ] **Step 4: Implement client request construction and sanitization**

Use these constants and error shape:

```ts
export const TOUR_API_PORT = Symbol("TOUR_API_PORT");
export const TOUR_API_FETCH = Symbol("TOUR_API_FETCH");
export const TOUR_API_SLEEP = Symbol("TOUR_API_SLEEP");
export const TOUR_API_SOURCE = "TOUR_API";
export const TOURISM_REGION_CODES = ["11", "41", "51", "26", "50"] as const;

export class TourApiError extends Error {
  constructor(
    readonly operation: string,
    readonly providerCode: string,
    readonly httpStatus?: number,
  ) {
    super(`TourAPI ${operation} failed (${providerCode})`);
  }
}
```

The private request method must:

```ts
const url = new URL(`${endpoint.replace(/\/+$/, "")}/${operation}`);
url.searchParams.set("serviceKey", normalizeServiceKey(serviceKey));
url.searchParams.set("MobileOS", "ETC");
url.searchParams.set("MobileApp", "Haetteum");
url.searchParams.set("_type", "json");
url.searchParams.set("pageNo", String(pageNo));
url.searchParams.set("numOfRows", "100");
```

Decode a percent-encoded key at most once before `URLSearchParams` so encoded and decoded portal keys both work. Never interpolate the final URL into an error or log.
Do not read or validate the optional endpoint/key in the constructor. Resolve them only when an operation method runs so the API can boot while sync is disabled and provider values are absent.

- [ ] **Step 5: Implement operation methods**

Use the exact provider parameter mapping:

```ts
getDistrictPage({ regionCode, pageNo })
// ldongCode2: lDongRegnCd, lDongListYn=Y

getPlacePage({ regionCode, pageNo })
// areaBasedList2: contentTypeId=12, lDongRegnCd, arrange=C

getChangedPlacePage({ regionCode, modifiedDate, showflag, pageNo })
// areaBasedSyncList2: contentTypeId=12, lDongRegnCd,
// modifiedtime=YYYYMMDD, showflag, arrange=C

getChangedPlaceProbePage({ regionCode, showflag, pageNo })
// areaBasedSyncList2 smoke-only request with no modifiedtime

getPlaceDetail(contentId)
// detailCommon2: contentId, pageNo=1, numOfRows=1
```

- [ ] **Step 6: Run GREEN and focused checks**

Run:

```bash
pnpm --filter @haetteum/api test -- tour-api.client.spec.ts
pnpm --filter @haetteum/api exec eslint "src/tourism/tour-api*.ts" src/tourism/tourism.constants.ts --max-warnings=0
pnpm --filter @haetteum/api build
git diff --check -- apps/api/src/tourism
```

Expected: client tests, lint, and API build pass with no secret in output.

Suggested commit only: `feat: TourAPI JSON 클라이언트 추가`

---

### Task 3: Provider-to-domain mapping

**Files:**

- Create: `apps/api/src/tourism/tour-api.mapper.ts`
- Create: `apps/api/src/tourism/tour-api.mapper.spec.ts`
- Modify: `apps/api/src/prisma/tourism-schema.spec.ts`

**Interfaces:**

- Produces:

```ts
export type NormalizedDistrict = {
  providerCode: string;
  name: string;
};

export type NormalizedPlace = {
  source: "TOUR_API";
  externalId: string;
  contentTypeId: 12;
  title: string;
  address1: string | null;
  address2: string | null;
  zipcode: string | null;
  longitude: Prisma.Decimal | null;
  latitude: Prisma.Decimal | null;
  mapLevel: number | null;
  category1: string | null;
  category2: string | null;
  category3: string | null;
  telephone: string | null;
  primaryImageUrl: string | null;
  primaryThumbnailUrl: string | null;
  imageCopyrightType: string | null;
  providerCreatedAt: Date | null;
  providerModifiedAt: Date;
  isVisible: boolean;
  lastSyncedAt: Date;
};
```

- Produces `mapDistrict`, `mapPlace`, `mapChangedPlace`, `mapPlaceDetail`.
- Consumes Task 2 provider types.

- [ ] **Step 1: Write mapper tests before implementation**

Cover these exact behaviors:

```ts
it("maps a complete place item into normalized database values", () => {});
it("trims optional strings and maps empty strings to null", () => {});
it("parses WGS84 decimals, map level, and 14-digit provider timestamps", () => {});
it("rejects a malformed content ID, coordinate, content type, or timestamp", () => {});
it("maps showflag 0 to invisible and preserves oldContentid separately", () => {});
it("maps detail overview and homepage without overwriting absent fields", () => {});
```

- [ ] **Step 2: Run RED**

```bash
pnpm --filter @haetteum/api test -- tour-api.mapper.spec.ts
```

Expected: FAIL because mapper functions do not exist.

- [ ] **Step 3: Implement strict conversion helpers**

Use helpers with no fallback defaults:

```ts
function optionalText(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function providerTimestamp(value: string): Date {
  if (!/^\d{14}$/.test(value)) throw new Error("Invalid TourAPI timestamp");
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}+09:00`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) throw new Error("Invalid TourAPI timestamp");
  return parsed;
}

function coordinate(value: string | undefined): Prisma.Decimal | null {
  const text = optionalText(value);
  if (text == null) return null;
  if (!/^-?\d+(\.\d+)?$/.test(text)) throw new Error("Invalid coordinate");
  return new Prisma.Decimal(text);
}
```

Require `contenttypeid === "12"`, a non-empty `contentid`, title, region code, and valid `modifiedtime`.

- [ ] **Step 4: Align the generated-client contract fixture**

Change Task 1's type-only fixture source from `tour-api` to exactly:

```ts
source: "TOUR_API"
```

- [ ] **Step 5: Run GREEN and mutation-focused checks**

```bash
pnpm --filter @haetteum/api test -- tour-api.mapper.spec.ts tourism-schema.spec.ts
pnpm --filter @haetteum/api exec eslint "src/tourism/tour-api.mapper*.ts" src/prisma/tourism-schema.spec.ts --max-warnings=0
git diff --check -- apps/api/src/tourism apps/api/src/prisma/tourism-schema.spec.ts
```

Expected: all mapping and generated-client tests pass.

Suggested commit only: `feat: TourAPI 관광지 매핑 추가`

---

### Task 4: Full, incremental, and detail synchronization use cases

**Files:**

- Create: `apps/api/src/tourism/tourism-sync.service.ts`
- Create: `apps/api/src/tourism/tourism-sync.service.spec.ts`
- Create: `apps/api/test/tourism-sync.e2e-spec.ts`
- Create: `apps/api/src/tourism/tourism.module.ts`

**Interfaces:**

- Produces:

```ts
export type SyncSummary = {
  runId: string;
  status: "SUCCEEDED";
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  deactivatedCount: number;
  failedCount: 0;
};

export class TourismSyncService {
  fullSync(): Promise<SyncSummary>;
  incrementalSync(now?: Date): Promise<SyncSummary>;
  enrichPlace(contentId: string): Promise<void>;
}
```

- Consumes `TOUR_API_PORT`, mapper functions, and `PrismaService`.
- `TourismModule` exports `TourismSyncService` and `TOUR_API_PORT`.

- [ ] **Step 1: Write unit tests with a fake provider and fake Prisma boundary**

Tests must name these breaks:

```ts
it("creates a RUNNING full run and completes it with exact counters", async () => {});
it("paginates districts and places for all five configured regions", async () => {});
it("upserts by provider codes and source_externalId without duplicating rows", async () => {});
it("deactivates missing districts and places only after a successful full region sync", async () => {});
it("processes every date since the last success with both show flags", async () => {});
it("requires full sync when no success exists or the gap exceeds 30 days", async () => {});
it("moves oldContentid to the new externalId and preserves the internal UUID", async () => {});
it("marks the run FAILED, keeps completed page writes, and does not advance the watermark", async () => {});
it("enriches only overview and homepage for one existing content ID", async () => {});
```

- [ ] **Step 2: Run unit RED**

```bash
pnpm --filter @haetteum/api test -- tourism-sync.service.spec.ts
```

Expected: FAIL because the service and module do not exist.

- [ ] **Step 3: Implement page traversal and one-page transactions**

Use a shared page loop:

```ts
async function forEachPage<T>(
  load: (pageNo: number) => Promise<TourApiPage<T>>,
  consume: (items: readonly T[]) => Promise<void>,
): Promise<number> {
  let pageNo = 1;
  let fetched = 0;
  for (;;) {
    const page = await load(pageNo);
    await consume(page.items);
    fetched += page.items.length;
    if (pageNo * page.numOfRows >= page.totalCount) return fetched;
    pageNo += 1;
  }
}
```

Do not open the Prisma transaction until the provider page has been parsed and mapped. In each page transaction:

1. Fetch existing IDs for counter classification.
2. Resolve region/district IDs.
3. Apply idempotent upserts.
4. Return inserted/updated/deactivated deltas.

- [ ] **Step 4: Implement full-sync ordering**

```text
create RUNNING run
→ load five active TourismRegion rows
→ per region: sync district pages and deactivate unseen districts
→ per region: sync visible place pages and deactivate unseen TOUR_API places
→ update run SUCCEEDED with counters
```

If a region returns zero places, fail the run instead of deactivating the region's existing places.

- [ ] **Step 5: Implement incremental date traversal**

Use `Asia/Seoul` calendar dates, not UTC dates. The algorithm is:

```text
last successful FULL or INCREMENTAL finishedAt
→ next KST calendar date
→ each date through current KST date
→ each active region
→ showflag=1 pages
→ showflag=0 pages
```

If no success exists, or the number of dates is greater than 30, throw a sanitized error instructing `--mode=full` before creating provider calls.

- [ ] **Step 6: Write real PostgreSQL integration tests before final GREEN**

Start the project database first without deleting its named volume:

```bash
pnpm db:up
pnpm db:deploy
```

In `test/tourism-sync.e2e-spec.ts`, override `TOUR_API_PORT` with deterministic page fixtures and use UUID-scoped cleanup. Verify:

- full sync creates two districts and two places;
- rerunning does not duplicate rows;
- an omitted visible place becomes `isVisible=false` only after successful completion;
- incremental hidden rows preserve place UUID;
- failed second page leaves the run `FAILED` and the earlier page committed;
- no test row or run remains after cleanup.

Register the production providers in `TourismModule`:

```ts
@Module({
  providers: [
    TourismSyncService,
    TourApiClient,
    { provide: TOUR_API_PORT, useExisting: TourApiClient },
    { provide: TOUR_API_FETCH, useValue: globalThis.fetch.bind(globalThis) },
    {
      provide: TOUR_API_SLEEP,
      useValue: (milliseconds: number) =>
        new Promise<void>((resolve) => setTimeout(resolve, milliseconds)),
    },
  ],
  exports: [TourismSyncService, TOUR_API_PORT],
})
export class TourismModule {}
```

- [ ] **Step 7: Run GREEN**

```bash
pnpm --filter @haetteum/api test -- tourism-sync.service.spec.ts
pnpm --filter @haetteum/api exec node --experimental-vm-modules ./node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand test/tourism-sync.e2e-spec.ts
pnpm --filter @haetteum/api exec eslint "src/tourism/**/*.ts" test/tourism-sync.e2e-spec.ts --max-warnings=0
pnpm --filter @haetteum/api build
```

Expected: unit, real database, lint, and build checks pass; database cleanup leaves zero UUID-scoped test rows.

Suggested commit only: `feat: 관광지 전체 증분 동기화 추가`

---

### Task 5: Manual commands, live smoke command, and daily scheduler

**Files:**

- Create: `apps/api/src/tourism/tourism-sync.command.ts`
- Create: `apps/api/src/tourism/tourism-smoke.command.ts`
- Create: `apps/api/src/tourism/tourism-sync.scheduler.ts`
- Create: `apps/api/src/tourism/tourism-sync.scheduler.spec.ts`
- Modify: `apps/api/src/tourism/tourism.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/package.json`
- Modify: `package.json`

**Interfaces:**

- Produces root commands:

```bash
pnpm tourism:sync -- --mode=full
pnpm tourism:sync -- --mode=incremental
pnpm tourism:enrich -- --content-id=2704412
pnpm tourism:smoke
```

- Produces `TourismSyncScheduler.runDailySync()`.
- Consumes Task 4 `TourismSyncService` and Task 2 `TourApiPort`.

- [ ] **Step 1: Write scheduler tests first**

```ts
it("does not call the provider when tourism sync is disabled", async () => {});
it("runs incremental sync when enabled", async () => {});
it("propagates sync failures to Nest scheduler logging without exposing credentials", async () => {});
```

Use the actual method directly; do not wait for cron time.

- [ ] **Step 2: Run RED**

```bash
pnpm --filter @haetteum/api test -- tourism-sync.scheduler.spec.ts
```

Expected: FAIL because the scheduler does not exist.

- [ ] **Step 3: Implement the scheduler**

```ts
@Injectable()
export class TourismSyncScheduler {
  constructor(
    private readonly config: ConfigService<ApiEnvironment, true>,
    private readonly sync: TourismSyncService,
  ) {}

  @Cron("0 30 3 * * *", {
    name: "tourism-daily-sync",
    timeZone: "Asia/Seoul",
    waitForCompletion: true,
  })
  async runDailySync(): Promise<void> {
    if (!this.config.get("TOURISM_SYNC_ENABLED", { infer: true })) return;
    await this.sync.incrementalSync();
  }
}
```

Import `ScheduleModule.forRoot()` once in `TourismModule` and register the scheduler there. Import `TourismModule` into `AppModule`.

- [ ] **Step 4: Implement application-context commands**

Both command files use:

```ts
const app = await NestFactory.createApplicationContext(AppModule);
try {
  // resolve service/client and execute the selected action
} finally {
  await app.close();
}
```

`tourism-sync.command.ts` accepts only:

```text
--mode=full
--mode=incremental
--mode=enrich --content-id=2704412
```

Unknown, duplicate, or missing arguments exit nonzero with a usage message that contains no environment values.

`tourism-smoke.command.ts` must call, in order:

```text
ldongCode2(region 50, first page)
areaBasedList2(region 50, first page)
areaBasedSyncList2(region 50, visible, no modifiedtime probe method)
detailCommon2(first areaBasedList2 contentid)
```

Use Task 2's `getChangedPlaceProbePage`; do not overload incremental semantics.

Print only operation, HTTP/provider result, totalCount, sample content ID/title, and whether overview/homepage exists. Never print endpoint query strings or the key.

- [ ] **Step 5: Add exact scripts**

API scripts:

```json
{
  "tourism:sync": "pnpm build && node dist/tourism/tourism-sync.command.js",
  "tourism:enrich": "pnpm build && node dist/tourism/tourism-sync.command.js --mode=enrich",
  "tourism:smoke": "pnpm build && node dist/tourism/tourism-smoke.command.js"
}
```

Root scripts delegate with `pnpm --filter @haetteum/api` and preserve forwarded arguments.

- [ ] **Step 6: Run scheduler GREEN and command validation without live sync**

```bash
pnpm --filter @haetteum/api test -- tourism-sync.scheduler.spec.ts
pnpm --filter @haetteum/api build
pnpm --filter @haetteum/api exec node --experimental-vm-modules ./node_modules/jest/bin/jest.js --config ./test/jest-e2e.json --runInBand test/app.e2e-spec.ts
pnpm --filter @haetteum/api exec eslint "src/tourism/*command.ts" "src/tourism/tourism-sync.scheduler*.ts" --max-warnings=0
```

For the start check, launch on an unused API port, verify health once, then stop only that process. Do not run full sync yet.

Suggested commit only: `feat: 관광 동기화 실행 명령과 스케줄러 추가`

---

### Task 6: Shared places contract and database-backed Nest endpoint

**Files:**

- Create: `packages/contracts/src/places.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/src/contracts.test.ts`
- Create: `apps/api/src/places/places.module.ts`
- Create: `apps/api/src/places/places.controller.ts`
- Create: `apps/api/src/places/places.controller.spec.ts`
- Create: `apps/api/src/places/places.service.ts`
- Create: `apps/api/src/places/places.service.spec.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/test/app.e2e-spec.ts`

**Interfaces:**

- Produces `GET /api/v1/places` and shared schemas:

```ts
export const PlaceRegionSchema = z.enum([
  "seoul",
  "gyeonggi",
  "gangwon",
  "busan",
  "jeju",
]);

export const ListPlacesQuerySchema = z.object({
  region: PlaceRegionSchema,
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).default(""),
});

export const PlaceListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  region: PlaceRegionSchema,
  district: z.string().nullable(),
  address: z.string().nullable(),
  longitude: z.number().nullable(),
  latitude: z.number().nullable(),
  primaryImageUrl: z.string().url().nullable(),
  imageCopyrightType: z.string().nullable(),
});

export const PlacesPageSchema = z.object({
  items: z.array(PlaceListItemSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalCount: z.number().int().nonnegative(),
});
```

- `PlacesService.list(input: ListPlacesQuery): Promise<PlacesPage>`.

- [ ] **Step 1: Write shared contract tests first**

Add tests proving defaults, invalid region, page size cap, trim behavior, nullable media/location, and direct response shape.

- [ ] **Step 2: Run contract RED**

```bash
pnpm --filter @haetteum/contracts test
```

Expected: FAIL because places exports do not exist.

- [ ] **Step 3: Implement and export the contracts**

Define inferred types `PlaceRegion`, `ListPlacesQuery`, `PlaceListItem`, and `PlacesPage` beside the schemas, then export them from `index.ts`.

- [ ] **Step 4: Write service and controller tests before implementation**

Service tests must verify the exact Prisma input:

```ts
where: {
  isVisible: true,
  region: { is: { slug: "jeju", isActive: true } },
  OR: [
    { title: { contains: "성산", mode: "insensitive" } },
    { address1: { contains: "성산", mode: "insensitive" } },
    { address2: { contains: "성산", mode: "insensitive" } },
  ],
}
```

Verify `skip`, `take`, `orderBy: [{ title: "asc" }, { id: "asc" }]`, the count query, district inclusion, and Decimal-to-number mapping.

Controller tests verify `ZodValidationPipe` receives the query schema and that service results are returned without an envelope.

- [ ] **Step 5: Run API RED**

```bash
pnpm --filter @haetteum/api test -- places.service.spec.ts places.controller.spec.ts
```

Expected: FAIL because Places module files do not exist.

- [ ] **Step 6: Implement service, controller, and module**

```ts
@Controller({ path: "places", version: "1" })
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(ListPlacesQuerySchema))
    query: ListPlacesQuery,
  ): Promise<PlacesPage> {
    return this.places.list(query);
  }
}
```

Use one `$transaction([findMany, count])` for a consistent page result. Map `address` as trimmed `address1` plus `address2`, or null if both are absent.

- [ ] **Step 7: Add real route e2e coverage**

In `app.e2e-spec.ts`, insert UUID-scoped visible, hidden, and inactive-region places, then verify:

- create `const uniqueTitle = \`e2e-place-${randomUUID()}\`;` and verify the
  request built from `new URLSearchParams({ region: "jeju", q: uniqueTitle })`
  returns only the visible active-region row, even after live data exists;
- pagination metadata is correct;
- invalid region and `pageSize=101` return 400 Problem Details;
- no provider HTTP call is possible from the route path;
- cleanup removes only inserted rows.

- [ ] **Step 8: Run GREEN**

```bash
pnpm --filter @haetteum/contracts test
pnpm --filter @haetteum/api test -- places.service.spec.ts places.controller.spec.ts
pnpm test:e2e
pnpm lint
pnpm build
```

Expected: contracts, unit, e2e, lint, and build all pass.

Suggested commit only: `feat: 지역별 관광지 조회 API 추가`

---

### Task 7: Live smoke, controlled full sync, documentation, and final verification

**Files:**

- Modify: `README.md`
- Modify: `ARCHITECTURE.md`
- Modify: `docs/ERD.md`
- Modify: `docs/superpowers/specs/2026-08-22-tourapi-integration-design.md`

**Interfaces:**

- Consumes all prior tasks and ignored `apps/api/.env` credentials.
- Produces verified live provider evidence, real synchronized DB rows, and accurate operation docs.

- [ ] **Step 1: Run the opt-in live smoke before mutating DB**

```bash
pnpm db:up
pnpm tourism:smoke
```

Expected:

```text
ldongCode2: HTTP 200, JSON, resultCode 0000, 제주 시군구 totalCount 2
areaBasedList2: HTTP 200, JSON, resultCode 0000, contentid present
areaBasedSyncList2: HTTP 200, JSON, resultCode 0000
detailCommon2: HTTP 200, JSON, resultCode 0000, matching contentid
```

Inspect output for the absence of `SERVICE_KEY`, decoded key fragments, and full query URLs.

- [ ] **Step 2: Record pre-sync DB counts without deleting data**

Use a read-only Prisma or `psql` query to record counts for `tourism_regions`, `tourism_districts`, `places`, and `tourism_sync_runs`. Do not truncate tables.

- [ ] **Step 3: Run the controlled full sync**

```bash
pnpm tourism:sync -- --mode=full
```

Expected: one `SUCCEEDED` run, districts and visible `TOUR_API` places populated for all five regions, zero failed items, and no secret in output.

- [ ] **Step 4: Prove idempotence and database invariants**

Run full sync a second time, then verify:

- region count remains 5;
- `(source, externalId)` has no duplicates;
- all synchronized places have `contentTypeId=12`, a valid region FK, and non-empty title;
- second run inserts 0 for already-known rows and preserves place UUIDs;
- existing comment and FK tests still pass.

- [ ] **Step 5: Run one incremental sync**

```bash
pnpm tourism:sync -- --mode=incremental
```

Expected: the run uses dates after the last success, completes without deleting rows, and records exact counters. If full sync finished on the current KST day, a zero-change incremental run is valid.

- [ ] **Step 6: Update documentation truth**

Document:

- environment variable names without values;
- manual commands and daily 03:30 schedule;
- four operations and JSON-only application contract;
- database-backed `/api/v1/places` example;
- actual synchronized counts with verification date;
- provider outage behavior and ranking non-goal;
- ERD relationship status without adding ranking tables.

Change the spec status only after Steps 1–5 succeed:

```markdown
**상태:** 구현 및 검증 완료
```

- [ ] **Step 7: Run fresh final verification**

```bash
pnpm --filter @haetteum/api exec prisma validate
pnpm --filter @haetteum/api exec prisma migrate status
pnpm --filter @haetteum/api exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
git diff --check
```

Expected: all commands exit 0; migration status is current and no drift exists.

- [ ] **Step 8: Inspect final scope and secret hygiene**

```bash
git status --short
git diff -- apps/api packages/contracts package.json pnpm-lock.yaml README.md ARCHITECTURE.md docs/ERD.md docs/superpowers/specs/2026-08-22-tourapi-integration-design.md
git diff | rg -n "SERVICE_KEY=.+|serviceKey=[^\[]|apis\.data\.go\.kr.*serviceKey" && exit 1 || true
```

Expected: only approved backend/contracts/docs changes appear; no credential value, request URL containing a key, frontend implementation, ranking schema, or unrelated cleanup is present.

Suggested commit groups only — do not execute Git commands:

1. `feat: TourAPI 관광지 동기화 추가`
2. `feat: 지역별 관광지 조회 API 추가`
3. `docs: TourAPI 운영 방법 반영`

## Completion Boundary

This plan is complete only when the four provider operations pass the opt-in live smoke, full and incremental sync write verified rows, `/api/v1/places` serves PostgreSQL data without provider calls, default tests remain offline, all repository checks pass, and no secret appears in source, logs, reports, or diffs. Popularity/ranking CSV import and frontend TOP 3 integration remain separate work.
