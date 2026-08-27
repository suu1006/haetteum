# Live Place Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect matched generation-ranking cards to a PostgreSQL-backed place detail page enriched from official TourAPI detail/image operations, with isolated server-side Kakao Local nearby search.

**Architecture:** TourAPI detail data is validated and persisted atomically in `Place`, `PlaceImage`, and `PlaceDetailInfo`; user-facing place detail reads only PostgreSQL. Kakao Local remains a typed NestJS boundary called only by the nearby endpoint, and its failure never prevents the core detail page from rendering. Next.js keeps existing mock slugs while routing UUID place IDs through the new shared HTTP contracts.

**Tech Stack:** Node.js 24.19.0, pnpm 10.33.0, TypeScript 5.9, NestJS 11, Prisma 7/PostgreSQL 18, Zod 4, Next.js 16.3 App Router, React 19, Jest/Supertest, Vitest/Testing Library, real-browser verification.

**Spec:** `docs/superpowers/specs/2026-08-26-live-place-detail-design.md`

## Global Constraints

- Preserve all existing modified and untracked files; do not revert or rewrite unrelated ranking, festival, layout, review-design, or documentation work.
- Do not stage, commit, branch, create a worktree, push, or create a PR.
- Use Node.js `24.19.0` from the bundled workspace runtime; do not validate with another Node version.
- Follow TDD for every behavior: write one failing test, run it and confirm the expected failure, implement the minimum code, then rerun.
- Run all Prisma generate/migration checks serially; never run two commands that replace generated Prisma output concurrently.
- Before editing Next.js code, read these installed-version guides in full:
  - `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`
  - `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`
  - `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md`
  - `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`
  - `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`
  - `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md`
- Never expose `SERVICE_KEY`, `KAKAO_REST_API_KEY`, full provider URLs, authorization headers, or provider response bodies in logs, tests, docs, errors, or diffs.
- Treat all provider strings as data; never execute them or render them with `dangerouslySetInnerHTML`.
- Do not invent ratings, review counts, recommendation points, facilities, prices, travel times, or images.
- Data Lab IDs, TourAPI content IDs, Kakao place IDs, and Haetteum UUIDs remain distinct identifiers.
- TourAPI-backed user requests read PostgreSQL only. Kakao failure is isolated to the nearby section.
- `placeId=null` ranking cards remain non-links; only matched UUID cards navigate to detail.
- Real place detail defaults to `introduction`; the reviews tab renders a truthful empty state.
- Focused web tests use a concrete command such as `pnpm --filter @haetteum/web exec vitest run tests/unit/features/places/place-detail-api.test.ts` so arguments do not expand into the full suite.

---

### Task 1: Shared Place Detail and Nearby HTTP Contracts

**Files:**
- Modify: `packages/contracts/src/places.ts`
- Modify: `packages/contracts/src/contracts.test.ts`
- Modify: `packages/contracts/src/index.ts`

**Interfaces:**
- Consumes: existing `PlaceRegionSchema` and list-place contracts.
- Produces: `PlaceDetailResponseSchema`, `NearbyPlaceCategorySchema`, `NearbyPlacesQuerySchema`, `NearbyPlacesResponseSchema` plus inferred TypeScript types.

- [ ] **Step 1: Write failing contract tests**

Add tests that parse one UUID detail response with nullable provider fields and both nearby response branches:

```ts
expect(
  PlaceDetailResponseSchema.parse({
    id: "24684077-a907-45c3-85bf-b509dab12377",
    title: "에버랜드",
    category: { primary: "VE", secondary: null, tertiary: null },
    region: "gyeonggi",
    district: "용인시",
    address: "경기도 용인시 처인구 포곡읍 에버랜드로 199",
    longitude: 127.2025,
    latitude: 37.2939,
    telephone: null,
    homepage: null,
    overview: null,
    images: [],
    introduction: {
      infoCenter: null,
      restDate: null,
      useSeason: null,
      useTime: null,
      parking: null,
      experienceAgeRange: null,
      experienceGuide: null,
      babyCarriage: null,
      creditCard: null,
      pet: null,
    },
    information: [],
    detailSyncedAt: null,
  }).title,
).toBe("에버랜드");

expect(NearbyPlacesQuerySchema.parse({})).toEqual({
  category: "attraction",
  limit: 10,
});

expect(
  NearbyPlacesResponseSchema.parse({
    status: "unavailable",
    reason: "provider_not_configured",
  }),
).toEqual({ status: "unavailable", reason: "provider_not_configured" });
```

Also assert rejection of a non-UUID detail ID, `limit=16`, an unapproved `placeUrl` host, and an unknown unavailable reason.

- [ ] **Step 2: Verify RED**

Run:

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/contracts test -- contracts.test.ts
```

Expected: FAIL because the new schemas and exports do not exist.

- [ ] **Step 3: Implement the exact contracts**

Add:

```ts
export const PlaceDetailImageSchema = z.object({
  url: z.string().url(),
  thumbnailUrl: z.string().url().nullable(),
  alt: z.string().min(1),
  copyrightType: z.string().nullable(),
});

export const PlaceDetailInformationItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  text: z.string().min(1),
});

export const PlaceDetailResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  category: z.object({
    primary: z.string().nullable(),
    secondary: z.string().nullable(),
    tertiary: z.string().nullable(),
  }),
  region: PlaceRegionSchema,
  district: z.string().nullable(),
  address: z.string().nullable(),
  longitude: z.number().nullable(),
  latitude: z.number().nullable(),
  telephone: z.string().nullable(),
  homepage: z.string().url().nullable(),
  overview: z.string().nullable(),
  images: z.array(PlaceDetailImageSchema),
  introduction: z.object({
    infoCenter: z.string().nullable(),
    restDate: z.string().nullable(),
    useSeason: z.string().nullable(),
    useTime: z.string().nullable(),
    parking: z.string().nullable(),
    experienceAgeRange: z.string().nullable(),
    experienceGuide: z.string().nullable(),
    babyCarriage: z.string().nullable(),
    creditCard: z.string().nullable(),
    pet: z.string().nullable(),
  }),
  information: z.array(PlaceDetailInformationItemSchema),
  detailSyncedAt: z.iso.datetime().nullable(),
});

export const NearbyPlaceCategorySchema = z.enum([
  "attraction",
  "restaurant",
  "cafe",
]);

export const NearbyPlacesQuerySchema = z.object({
  category: NearbyPlaceCategorySchema.default("attraction"),
  limit: z.coerce.number().int().min(1).max(15).default(10),
});
```

Define the nearby response without extra rating, review, photo, or travel-time fields:

```ts
const KakaoPlaceUrlSchema = z
  .string()
  .url()
  .refine((value) => new URL(value).hostname === "place.map.kakao.com");

export const NearbyPlacesResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ready"),
    category: NearbyPlaceCategorySchema,
    partial: z.boolean(),
    items: z.array(
      z.object({
        provider: z.literal("KAKAO_LOCAL"),
        providerPlaceId: z.string().min(1),
        title: z.string().min(1),
        categoryLabel: z.string().min(1),
        telephone: z.string().nullable(),
        address: z.string().nullable(),
        roadAddress: z.string().nullable(),
        longitude: z.number(),
        latitude: z.number(),
        distanceMeters: z.number().int().nonnegative().nullable(),
        placeUrl: KakaoPlaceUrlSchema,
      }),
    ),
  }),
  z.object({
    status: z.literal("unavailable"),
    reason: z.enum([
      "coordinates_missing",
      "provider_not_configured",
      "provider_unavailable",
    ]),
  }),
]);
```

- [ ] **Step 4: Verify GREEN and build**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/contracts test -- contracts.test.ts
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/contracts build
```

Expected: focused tests PASS and TypeScript build exits 0.

- [ ] **Step 5: Review checkpoint**

Run `git diff --check -- packages/contracts` and inspect that list-place contracts remain unchanged.

---

### Task 2: Prisma Place Detail Models and Migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260826150000_add_place_details/migration.sql`
- Modify: `apps/api/src/prisma/tourism-schema.spec.ts`
- Modify: `apps/api/test/tourism-database.e2e-spec.ts`
- Modify: `docs/ERD.md`

**Interfaces:**
- Consumes: `Place` and `PlaceRanking` from the current dirty schema.
- Produces: nullable detail columns on `Place`, `PlaceImage`, `PlaceDetailInfo`, Prisma delegates and DB comments.

- [ ] **Step 1: Write failing generated-client and schema expectations**

Add `placeImage` and `placeDetailInfo` to the typed delegate test and create type-checked inputs:

```ts
const placeImage = {
  placeId: "24684077-a907-45c3-85bf-b509dab12377",
  source: "TOUR_API",
  serialNumber: "1",
  name: "에버랜드 전경",
  originalUrl: "https://tong.visitkorea.or.kr/image.jpg",
  thumbnailUrl: null,
  copyrightType: "Type1",
  displayOrder: 0,
} satisfies Prisma.PlaceImageUncheckedCreateInput;

const detailInfo = {
  placeId: placeImage.placeId,
  source: "TOUR_API",
  serialNumber: "1",
  fieldGroup: null,
  name: "이용안내",
  text: "방문 전 운영시간을 확인해 주세요.",
  displayOrder: 0,
} satisfies Prisma.PlaceDetailInfoUncheckedCreateInput;
```

Extend database comment expectations for every new table and column.

- [ ] **Step 2: Verify RED**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- tourism-schema.spec.ts
```

Expected: FAIL because generated Prisma types do not contain the new models or fields.

- [ ] **Step 3: Add Prisma models and migration SQL**

Add these exact `Place` fields and relations:

```prisma
infoCenter         String?   @map("info_center") @db.Text
restDate           String?   @map("rest_date") @db.Text
useSeason          String?   @map("use_season") @db.Text
useTime            String?   @map("use_time") @db.Text
parking            String?   @db.Text
experienceAgeRange String?   @map("experience_age_range") @db.Text
experienceGuide    String?   @map("experience_guide") @db.Text
babyCarriage       String?   @map("baby_carriage") @db.Text
creditCard         String?   @map("credit_card") @db.Text
pet                String?   @db.Text
detailSyncedAt      DateTime? @map("detail_synced_at") @db.Timestamptz(3)
images              PlaceImage[]
detailInfos         PlaceDetailInfo[]
```

Add `PlaceImage` with the exact fields `id`, `placeId`, `source`, `serialNumber`, `name`, `originalUrl`, `thumbnailUrl`, `copyrightType`, `displayOrder`, `createdAt`, and `updatedAt`; add `@@unique([placeId, source, serialNumber])`, `@@index([placeId, displayOrder])`, `@@map("place_images")`, and a cascade FK. Add `PlaceDetailInfo` with `id`, `placeId`, `source`, `serialNumber`, `fieldGroup`, `name`, `text`, `displayOrder`, timestamps, the same unique/index shape, `@@map("place_detail_infos")`, and a cascade FK. The migration must add nullable `Place` columns without rewriting existing rows and create explicit constraint/index names plus one Korean comment for every table and column.

- [ ] **Step 4: Generate client and verify GREEN**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm db:generate
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- tourism-schema.spec.ts
```

Expected: generation exits 0 and the schema test passes.

- [ ] **Step 5: Deploy migration and verify the real DB boundary**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm db:up
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm db:deploy
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test:e2e -- tourism-database.e2e-spec.ts
```

Expected: migration applies once, comments/FKs/indexes pass, and existing ranking/festival tables remain valid.

- [ ] **Step 6: Review checkpoint**

Run `git diff --check -- apps/api/prisma apps/api/src/prisma apps/api/test/tourism-database.e2e-spec.ts docs/ERD.md`.

---

### Task 3: TourAPI Common, Intro, Repeat, and Image Boundary

**Files:**
- Modify: `apps/api/src/tourism/tour-api.types.ts`
- Modify: `apps/api/src/tourism/tour-api.schemas.ts`
- Modify: `apps/api/src/tourism/tour-api.mapper.ts`
- Modify: `apps/api/src/tourism/tour-api.client.ts`
- Modify: `apps/api/src/tourism/tour-api.client.spec.ts`
- Modify: `apps/api/src/tourism/tour-api.mapper.spec.ts`
- Modify: `apps/api/src/tourism/tourism-smoke.command.ts`
- Modify: `apps/api/src/tourism/tourism-smoke.command.spec.ts`

**Interfaces:**
- Consumes: existing `TourApiClient.request`, retry/error sanitizer, `itemArraySchema`, `TOUR_API_PORT`.
- Produces: `getPlaceCommonDetail`, `getPlaceIntro`, `getPlaceRepeatInfo`, `getPlaceImages`, and normalized detail bundle mapper outputs.

- [ ] **Step 1: Write failing client URL/parameter tests**

Extend the injected fetch test to call each wished-for method and assert:

```ts
expect(introUrl.pathname).toBe("/B551011/KorService2/detailIntro2");
expect(introUrl.searchParams.get("contentTypeId")).toBe("12");
expect(infoUrl.pathname).toBe("/B551011/KorService2/detailInfo2");
expect(imageUrl.pathname).toBe("/B551011/KorService2/detailImage2");
expect(imageUrl.searchParams.get("imageYN")).toBe("Y");
expect(imageUrl.searchParams.has("subImageYN")).toBe(false);
```

Return object, array, and empty-string provider shapes so the tests lock normalization behavior.

- [ ] **Step 2: Verify client RED**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- tour-api.client.spec.ts
```

Expected: FAIL because the client methods and schemas do not exist.

- [ ] **Step 3: Add external schemas and client methods**

Define optional provider text schemas for:

```ts
type TourApiPlaceIntro = {
  contentid: string;
  contenttypeid?: string;
  infocenter?: string;
  restdate?: string;
  useseason?: string;
  usetime?: string;
  parking?: string;
  expagerange?: string;
  expguide?: string;
  chkbabycarriage?: string;
  chkcreditcard?: string;
  chkpet?: string;
};

type TourApiPlaceInfo = {
  contentid: string;
  contenttypeid?: string;
  fldgubun?: string;
  infoname: string;
  infotext: string;
  serialnum: string;
};

type TourApiPlaceImage = {
  contentid: string;
  imgname?: string;
  originimgurl: string;
  smallimageurl?: string;
  serialnum: string;
  cpyrhtDivCd?: string;
};
```

Rename `getPlaceDetail` to `getPlaceCommonDetail` at every call site. Keep the existing request and secret-sanitization code; do not create a second HTTP client.

- [ ] **Step 4: Verify client GREEN**

Run the focused client test again. Expected: PASS with no secret or full URL in captured errors.

- [ ] **Step 5: Write failing mapper tests**

Assert exact mapping of intro fields, rejection of mismatched content IDs, removal of duplicate image URLs, HTTP-to-HTTPS normalization for `tong.visitkorea.or.kr`, rejection of other image hosts, stable display order, and rejection of blank repeat names/text.

- [ ] **Step 6: Verify mapper RED**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- tour-api.mapper.spec.ts
```

Expected: FAIL because bundle mapping functions do not exist.

- [ ] **Step 7: Implement normalized detail mappers**

Produce:

```ts
type NormalizedPlaceDetailBundle = {
  place: NormalizedPlaceDetail & NormalizedPlaceIntro & { detailSyncedAt: Date };
  images: readonly NormalizedPlaceImage[];
  information: readonly NormalizedPlaceDetailInfo[];
};

function mapPlaceDetailBundle(input: {
  contentId: string;
  common: TourApiPlaceDetail;
  intro: TourApiPlaceIntro;
  information: readonly TourApiPlaceInfo[];
  images: readonly TourApiPlaceImage[];
  syncedAt: Date;
}): NormalizedPlaceDetailBundle;
```

Use plain strings, URL validation, and deterministic ordering only; do not derive facilities, recommendations, prices, ratings, or travel times.

- [ ] **Step 8: Verify mapper and smoke command GREEN**

Run `tour-api.mapper.spec.ts` and `tourism-smoke.command.spec.ts`. Expected: PASS and smoke output lists operation/count booleans without raw provider payload.

- [ ] **Step 9: Review checkpoint**

Run `git diff --check -- apps/api/src/tourism`.

---

### Task 4: Atomic Detail Enrichment and Ranked Batch Command

**Files:**
- Modify: `apps/api/src/tourism/tourism-sync.service.ts`
- Modify: `apps/api/src/tourism/tourism-sync.service.spec.ts`
- Modify: `apps/api/src/tourism/tourism-sync.command.ts`
- Create: `apps/api/src/tourism/tourism-sync.command.spec.ts`
- Modify: `apps/api/package.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: `NormalizedPlaceDetailBundle`, Prisma `placeImage` and `placeDetailInfo` delegates.
- Produces: `enrichPlaceDetails(contentId)`, `enrichRankedPlaceDetails()`, `tourism:enrich-ranked` command.

- [ ] **Step 1: Write failing atomic enrichment tests**

Test that four provider operations are called in order, no Prisma write occurs until all resolve, an operation failure preserves existing details, and success updates `Place` then replaces images/information inside one transaction.

```ts
expect(provider.calls).toEqual([
  "common:100",
  "intro:100",
  "info:100",
  "images:100",
]);
expect(transaction.place.update).toHaveBeenCalledWith(
  expect.objectContaining({ where: expect.any(Object) }),
);
expect(transaction.placeImage.deleteMany).toHaveBeenCalledWith({
  where: { placeId },
});
```

- [ ] **Step 2: Verify service RED**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- tourism-sync.service.spec.ts
```

Expected: FAIL because the new methods and delegates are missing.

- [ ] **Step 3: Implement one-place atomic enrichment**

Fetch and map outside the transaction. Inside one transaction update the `Place`, delete old provider-owned images/info, and `createMany` the mapped rows. Leave non-TourAPI rows untouched if a future provider exists by filtering deletes with `source: "TOUR_API"`.

- [ ] **Step 4: Verify one-place GREEN**

Run the focused service spec. Expected: PASS with failure preserving prior rows.

- [ ] **Step 5: Write failing ranked-batch and command tests**

Assert selection of distinct, non-null, visible ranked places; UUID-stable order; continue-on-place-failure; counts; `DETAIL_RANKED` run status; and one safe JSON output line.

```ts
expect(summary).toEqual({
  requestedCount: 2,
  succeededCount: 1,
  failedCount: 1,
});
expect(runUpdate.data.status).toBe("FAILED");
```

- [ ] **Step 6: Verify batch RED**

Run `tourism-sync.service.spec.ts` and `tourism-sync.command.spec.ts`; expect missing batch mode failures.

- [ ] **Step 7: Implement the ranked batch and scripts**

Add API/root scripts:

```json
"tourism:enrich-ranked": "pnpm build && node dist/tourism/tourism-sync.command.js --mode=enrich-ranked"
```

Use sequential processing and safe summary output. Do not automatically call the batch during application startup or the daily incremental sync.

- [ ] **Step 8: Verify batch GREEN**

Run the two focused specs. Expected: PASS with no raw error, key, or URL in output.

- [ ] **Step 9: Review checkpoint**

Run `git diff --check -- apps/api/src/tourism apps/api/package.json package.json`.

---

### Task 5: Kakao Local Configuration and Typed Client

**Files:**
- Modify: `apps/api/src/config/environment.ts`
- Modify: `apps/api/src/config/environment.spec.ts`
- Modify: `apps/api/.env.example`
- Create: `apps/api/src/places/kakao-local.schemas.ts`
- Create: `apps/api/src/places/kakao-local.client.ts`
- Create: `apps/api/src/places/kakao-local.client.spec.ts`
- Modify: `apps/api/src/places/places.module.ts`

**Interfaces:**
- Consumes: optional `KAKAO_REST_API_KEY`, Node fetch.
- Produces: injectable `KAKAO_LOCAL_PORT`, `KakaoLocalClient.searchCategory(input)`, provider-specific error without secrets.

- [ ] **Step 1: Write failing environment tests**

Assert missing/blank Kakao key parses as `undefined` and a nonblank key is retained, without making API startup require the key.

- [ ] **Step 2: Verify environment RED**

Run the focused environment spec. Expected: FAIL because the key is absent from `ApiEnvironmentSchema`.

- [ ] **Step 3: Add the optional secret**

Reuse `providerSecret` for `KAKAO_REST_API_KEY`; add only the variable name to `.env.example`.

- [ ] **Step 4: Write failing Kakao client tests**

Use injected fetch/sleep. Assert fixed host/path, `KakaoAK` header, WGS84 coordinates, radius `20000`, distance sort, page/size, 5-second timeout, one retry on 429/5xx/network, no retry on 400/401, and schema parsing of the approved document fields.

- [ ] **Step 5: Verify client RED**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- kakao-local.client.spec.ts
```

Expected: FAIL because the client does not exist.

- [ ] **Step 6: Implement the client boundary**

Expose:

```ts
type KakaoCategoryCode = "AT4" | "CT1" | "FD6" | "CE7";

type KakaoLocalPlace = {
  id: string;
  placeName: string;
  categoryName: string;
  phone: string | null;
  addressName: string | null;
  roadAddressName: string | null;
  longitude: number;
  latitude: number;
  placeUrl: string;
  distanceMeters: number | null;
};

interface KakaoLocalPort {
  isConfigured(): boolean;
  searchCategory(input: {
    categoryCode: KakaoCategoryCode;
    longitude: number;
    latitude: number;
    size: number;
  }): Promise<readonly KakaoLocalPlace[]>;
}
```

Keep constants and tokens in `places` module. Sanitize errors to operation/provider-code/HTTP-status only.

- [ ] **Step 7: Verify client GREEN**

Run environment and Kakao client specs. Expected: PASS, no network access, no credential text in output.

- [ ] **Step 8: Review checkpoint**

Run `git diff --check -- apps/api/src/config apps/api/src/places apps/api/.env.example`.

---

### Task 6: PostgreSQL Place Detail and Isolated Nearby Endpoints

**Files:**
- Modify: `apps/api/src/places/places.service.ts`
- Modify: `apps/api/src/places/places.service.spec.ts`
- Modify: `apps/api/src/places/places.controller.ts`
- Modify: `apps/api/src/places/places.controller.spec.ts`
- Modify: `apps/api/test/app.e2e-spec.ts`

**Interfaces:**
- Consumes: Task 1 contracts, Prisma detail relations, `KAKAO_LOCAL_PORT`.
- Produces: `PlacesService.detail(placeId)`, `PlacesService.nearby(placeId, query)`, `GET /places/:placeId`, `GET /places/:placeId/nearby`.

- [ ] **Step 1: Write failing service detail tests**

Assert visible-place query by UUID, region/district selection, provider image order, representative-image fallback, URL/text trimming, ISO `detailSyncedAt`, and 404 for missing/nonvisible rows.

```ts
await expect(service.detail(placeId)).resolves.toMatchObject({
  id: placeId,
  title: "에버랜드",
  images: [{ alt: "에버랜드 전경" }],
});
```

- [ ] **Step 2: Verify detail RED**

Run `places.service.spec.ts`; expected missing `detail` method failure.

- [ ] **Step 3: Implement DB-only detail mapping**

Use one Prisma query with selected scalar fields, region/district, ordered images and detail infos. Do not select ranking rows or call TourAPI/Kakao.

- [ ] **Step 4: Verify detail GREEN**

Run the focused service spec. Expected: PASS.

- [ ] **Step 5: Write failing nearby tests**

Cover:

- missing place/nonvisible → 404
- missing coordinates → unavailable `coordinates_missing`
- unconfigured port → unavailable `provider_not_configured`
- restaurant/cafe → one category request
- attraction → AT4+CT1, dedupe by Kakao ID, stable distance/id sort
- one attraction category failure → ready with `partial=true`
- all provider requests fail → unavailable `provider_unavailable`
- `distance=""` → `null`, no travel-time conversion

- [ ] **Step 6: Verify nearby RED**

Run `places.service.spec.ts`; expected missing `nearby` method failure.

- [ ] **Step 7: Implement nearby orchestration**

Map only approved response fields, convert blank phone/address to null, validate numeric WGS84 values, and apply limit after dedupe/sort.

- [ ] **Step 8: Verify nearby GREEN**

Run the focused service spec. Expected: PASS.

- [ ] **Step 9: Write failing controller/E2E tests**

Assert Zod UUID param validation, query defaults/limit/category rejection, `application/json` success, Problem Details 400/404, and provider-unavailable success union. Inject a fake Kakao port in E2E; never call the network.

- [ ] **Step 10: Verify controller/E2E RED**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- places.controller.spec.ts
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test:e2e -- app.e2e-spec.ts
```

Expected: new route assertions fail.

- [ ] **Step 11: Add controller routes and verify GREEN**

Add a UUID Zod param schema in the shared or API-local HTTP boundary and pass parsed query to service. Rerun the two commands; expected PASS.

- [ ] **Step 12: Review checkpoint**

Run `git diff --check -- apps/api/src/places apps/api/test/app.e2e-spec.ts`.

---

### Task 7: Next.js Place Detail Data Boundary and Default Introduction

**Files:**
- Read before edits: installed Next.js documents listed in Global Constraints
- Create: `apps/web/src/features/places/place-detail-api.ts`
- Create: `apps/web/tests/unit/features/places/place-detail-api.test.ts`
- Modify: `apps/web/src/features/places/place-detail-model.ts`
- Modify: `apps/web/tests/unit/features/places/place-detail-model.test.ts`
- Modify: `apps/web/src/app/places/[placeId]/page.tsx`
- Modify: `apps/web/tests/unit/app/place-detail-page.test.tsx`

**Interfaces:**
- Consumes: shared detail/nearby schemas and `NEXT_PUBLIC_API_BASE_URL`.
- Produces: `loadPlaceDetail(placeId)`, `loadNearbyPlaces(placeId, category)`, UUID/mock data selection, `defaultPlaceDetailQuery.tab="introduction"`.

- [ ] **Step 1: Read the installed Next.js guides completely**

Run `sed -n` in successive ranges until EOF for every path in Global Constraints. Record no code changes in this step.

- [ ] **Step 2: Write failing API adapter tests**

Mock fetch and assert:

```ts
expect(await loadPlaceDetail(placeId)).toEqual({ status: "ready", data });
expect(fetch).toHaveBeenCalledWith(
  `http://localhost:4000/api/v1/places/${placeId}`,
  { cache: "no-store" },
);
```

Cover missing base URL, 404 as `not-found`, non-OK as `error`, invalid JSON contract as `error`, and nearby ready/unavailable parsing.

- [ ] **Step 3: Verify adapter RED**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/web exec vitest run tests/unit/features/places/place-detail-api.test.ts
```

Expected: FAIL because the adapter does not exist.

- [ ] **Step 4: Implement the server-only adapters**

Use `encodeURIComponent(placeId)`, `cache: "no-store"`, and Zod safe parsing. Do not fall back to mock on API failure.

- [ ] **Step 5: Verify adapter GREEN**

Run the focused adapter test. Expected: PASS.

- [ ] **Step 6: Write failing model/default tests**

Change the expected no-param query to `{ tab: "introduction", source: "all" }`; keep explicit review/source and href behavior.

- [ ] **Step 7: Verify model RED, then change the default**

Run `place-detail-model.test.ts`, confirm failure is only the default tab expectation, change the constant, rerun and expect PASS.

- [ ] **Step 8: Write failing page data-source tests**

Assert UUID → API adapter, UUID 404 → `notFound`, UUID error → detail error UI, slug → existing mock, and UUID never falls back to mock.

- [ ] **Step 9: Verify page RED, implement data selection, verify GREEN**

Use a strict UUID predicate before selecting the source. Run `place-detail-page.test.tsx`; expected PASS.

- [ ] **Step 10: Review checkpoint**

Run `git diff --check -- apps/web/src/features/places apps/web/src/app/places apps/web/tests/unit/features/places apps/web/tests/unit/app`.

---

### Task 8: Ranking Links and Honest Real-Data Detail UI

**Files:**
- Modify: `apps/web/src/components/travel/place-ranking-card.tsx`
- Modify: `apps/web/src/components/patterns/ranked-place-section.tsx`
- Modify: `apps/web/src/components/patterns/place-detail-screen.tsx`
- Modify: `apps/web/src/components/travel/place-introduction.tsx`
- Modify: `apps/web/src/components/travel/place-information.tsx`
- Create: `apps/web/src/components/travel/place-review-empty-state.tsx`
- Modify: `apps/web/tests/unit/components/travel/discovery-components.test.tsx`
- Modify: `apps/web/tests/unit/components/patterns/main-discovery.test.tsx`
- Modify: `apps/web/tests/unit/components/patterns/place-detail-screen.test.tsx`
- Modify: `apps/web/tests/unit/components/travel/place-detail-components.test.tsx`

**Interfaces:**
- Consumes: real detail response, nearby response unions, existing mock `ResolvedPlaceDetail`.
- Produces: matched ranking links, UUID introduction/info/review rendering, mock compatibility.

- [ ] **Step 1: Write failing ranking-card tests**

Assert `placeId` card link href `/places/{uuid}?tab=introduction`, accessible name, unchanged article/image/rank copy, and `placeId=null` with no link.

- [ ] **Step 2: Verify ranking RED**

Run focused discovery and main-discovery tests. Expected: matched link assertions fail while current no-link assertions identify the exact behavior change.

- [ ] **Step 3: Implement matched-only links**

Keep `PlaceRankingCard` presentation controlled by an optional `href` prop or derive it in one owner, not both. Use Next `Link`; do not attach click handlers to the article.

- [ ] **Step 4: Verify ranking GREEN**

Rerun focused tests. Expected: matched link and unmatched article pass.

- [ ] **Step 5: Write failing real-detail component tests**

Test:

- introduction gallery/address/overview and only non-null usage fields
- copyright label for provider images
- no fabricated facilities/recommendations/prices
- information address/phone/homepage/repeat info
- nearby ready with local category fallback and `직선거리 N m`
- nearby unavailable scoped message
- reviews empty copy and no rating summary/mock review cards
- mock slug still renders existing introduction/reviews/course/information

- [ ] **Step 6: Verify detail UI RED**

Run place-detail screen/component focused tests. Expected: type/prop/render assertions fail for the missing real-data path.

- [ ] **Step 7: Add a discriminated detail view model**

Do not force the API response into the current mock intersection type. Introduce:

```ts
type PlaceDetailView =
  | { source: "mock"; place: ResolvedPlaceDetail }
  | { source: "live"; place: PlaceDetailResponse };
```

Branch in `PlaceDetailScreen` and reuse small presentational pieces where their props are factual for both sources. Keep mock-only fields out of the live branch.

- [ ] **Step 8: Implement real introduction/information/empty reviews**

Render only returned fields. Convert nearby category to existing local fallback image paths without assigning ratings or travel time. Keep course preparation for live data.

- [ ] **Step 9: Verify detail UI GREEN**

Rerun the focused component suites. Expected: PASS with no React warnings.

- [ ] **Step 10: Run focused web integration tests**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/web exec vitest run \
  tests/unit/features/places/place-detail-api.test.ts \
  tests/unit/features/places/place-detail-model.test.ts \
  tests/unit/app/place-detail-page.test.tsx \
  tests/unit/components/patterns/place-detail-screen.test.tsx \
  tests/unit/components/travel/place-detail-components.test.tsx \
  tests/unit/components/travel/discovery-components.test.tsx \
  tests/unit/components/patterns/main-discovery.test.tsx
```

Expected: all listed files PASS.

- [ ] **Step 11: Review checkpoint**

Run `git diff --check -- apps/web/src apps/web/tests` and inspect that existing festival/layout edits remain present.

---

### Task 9: Documentation, Provider Smoke, Full Verification, and Browser QA

**Files:**
- Modify: `README.md`
- Modify: `ARCHITECTURE.md`
- Modify: `docs/ERD.md`
- Modify only if behavior evidence requires it: `docs/superpowers/specs/2026-08-26-live-place-detail-design.md`

**Interfaces:**
- Consumes: all implemented tasks.
- Produces: accurate operational docs and completion evidence; no Git mutation.

- [ ] **Step 1: Update documentation from implemented facts only**

Document:

- new tables and fields
- `tourism:enrich-ranked`
- DB-only detail endpoint
- live Kakao nearby endpoint and `KAKAO_REST_API_KEY`
- introduction default and empty reviews
- explicit Kakao key/provider-smoke verification status

Do not mark Kakao live verification complete without a configured key and successful response.

- [ ] **Step 2: Run fresh focused API verification**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/contracts test -- contracts.test.ts
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- \
  tour-api.client.spec.ts tour-api.mapper.spec.ts tourism-sync.service.spec.ts \
  tourism-sync.command.spec.ts kakao-local.client.spec.ts places.service.spec.ts \
  places.controller.spec.ts
```

Expected: all focused contract/API tests PASS.

- [ ] **Step 3: Run fresh DB/E2E verification serially**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm db:generate
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm db:deploy
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test:e2e
```

Expected: migration current, all API E2E suites pass against the ready DB.

- [ ] **Step 4: Run TourAPI smoke and one-place enrichment**

Resolve one known matched ranking place content ID from PostgreSQL without printing secrets, then pass it to the existing command:

```bash
set -a
source .env
source apps/api/.env
set +a
HAETTEUM_MATCHED_CONTENT_ID=$(psql "$DATABASE_URL" -X -Atc \
  "SELECT p.external_id FROM places p JOIN place_rankings r ON r.place_id = p.id WHERE p.source = 'TOUR_API' AND p.is_visible = true ORDER BY p.id LIMIT 1;")
test -n "$HAETTEUM_MATCHED_CONTENT_ID"
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm tourism:smoke
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm tourism:enrich -- --content-id="$HAETTEUM_MATCHED_CONTENT_ID"
```

Expected: common/intro/info/image operations report safe success metadata and DB contains `detailSyncedAt`; if provider data is legitimately empty, counts may be zero but contracts must remain valid.

- [ ] **Step 5: Run ranked enrichment**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm tourism:enrich-ranked
```

Expected: one JSON summary with requested/succeeded/failed counts. Do not claim full success if `failedCount > 0`; retain per-place prior data.

- [ ] **Step 6: Verify Kakao according to configuration**

If `KAKAO_REST_API_KEY` is configured, call one nearby endpoint and verify `status=ready` or an evidence-backed provider result. If absent, verify `200 { status: "unavailable", reason: "provider_not_configured" }` and report live Kakao as unverified, not failed implementation.

- [ ] **Step 7: Run fresh full repository checks**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm lint
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm test
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm build
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm test:e2e
git diff --check
```

Expected: record exact exit codes and separate any pre-existing unrelated failure from focused feature evidence.

- [ ] **Step 8: Run real-browser QA**

Reuse healthy existing servers only after confirming PID/cwd/HTTP status. At 390px and 480px verify:

1. Home shows ten generation-ranking cards.
2. A matched card is a link and navigates to `/places/{uuid}?tab=introduction`.
3. The live introduction shows official provider data without mock rating/recommendation copy.
4. Information shows DB details and Kakao ready/unavailable nearby state.
5. Reviews shows the truthful empty state.
6. Course shows preparation for live data.
7. An unmatched ranking card leaves the URL unchanged.
8. Native/app navigation returns to home according to the existing route contract.
9. Browser console has zero application errors; record warnings separately.

- [ ] **Step 9: Final requirements audit**

Read the spec acceptance criteria line by line, map each to a test/DB/browser result, run `git status --short`, and confirm no unrelated file was reverted and no Git mutation occurred.
