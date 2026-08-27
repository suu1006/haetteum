# Persisted User Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the fixed test user create one PostgreSQL-backed review per place, see those reviews in My Reviews, and edit the rating and content through dedicated Next.js forms.

**Architecture:** Shared Zod contracts define review requests and responses. A Prisma `User`/`Review` relationship and deterministic test-user migration back a NestJS review module whose current-user boundary returns the test user now and can later read a Kakao-backed server session; Next.js Server Components load real written reviews, while client editor screens call create/update endpoints and return to the refreshed list.

**Tech Stack:** Node.js 24.19.0, pnpm 10.33.0, TypeScript, Prisma 7/PostgreSQL, NestJS 11, Zod 4, Next.js 16.3 App Router, React 19, Jest/Supertest, Vitest/Testing Library, in-app browser verification.

**Spec:** `docs/superpowers/specs/2026-08-26-persisted-user-reviews-design.md`

## Global Constraints

- Use the fixed user `id=00000000-0000-4000-8000-000000000001`, `provider=TEST`, `providerUserId=test-user`, `displayName=테스트 여행자`.
- Accept rating integers from 1 through 5 and content trimmed to 1 through 500 characters.
- Enforce one review per `(userId, placeId)` in PostgreSQL; do not rely only on UI filtering.
- Derive place title, region, district, and image from `Place`; do not duplicate them in `Review`.
- Written reviews come only from PostgreSQL; bookmarked reviews keep the existing mock for this scope.
- Do not add authentication headers or accept a client-supplied `userId`; `CurrentReviewUser` owns the temporary identity boundary.
- Do not add photo upload, review deletion, likes, comments, bookmark persistence, place-detail review synchronization, or aggregate-rating updates.
- Successful writes return data directly; errors use the existing Problem Details response.
- Preserve all unrelated dirty tourism, festival, ranking, API, contract, documentation, and lockfile changes.
- Do not stage, commit, branch, create a worktree, or push.
- Use Node.js `24.19.0` through `/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`; do not validate with system Node 25.
- Before web edits, read the installed Next.js 16.3 guides at `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md`, `05-server-and-client-components.md`, `06-fetching-data.md`, `03-api-reference/03-file-conventions/page.md`, `dynamic-routes.md`, and `not-found.md`.

---

### Task 1: Shared Review HTTP Contracts

**Files:**
- Create: `packages/contracts/src/reviews.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/src/contracts.test.ts`

**Interfaces:**
- Produces: `CreateReviewRequestSchema`, `UpdateReviewRequestSchema`, `ReviewIdParamsSchema`, `ReviewItemSchema`, `MyReviewsResponseSchema` and inferred TypeScript types.
- Consumed by: NestJS controller/service in Task 3 and the Next.js adapter/editor in Tasks 5 and 7.

- [ ] **Step 1: Write failing contract tests**

Add imports and tests with hand-derived values:

```ts
const review = {
  id: "347c54e6-91ac-46b0-a371-176364401f82",
  placeId: "6c9bc5a5-836e-420c-bce4-ef68ff421233",
  placeTitle: "에버랜드",
  location: "경기 용인",
  rating: 5,
  content: "다시 방문하고 싶은 곳이에요.",
  primaryImageUrl: null,
  createdAt: "2026-08-26T03:00:00.000Z",
  updatedAt: "2026-08-26T03:00:00.000Z",
};

expect(
  CreateReviewRequestSchema.parse({
    placeId: review.placeId,
    rating: 5,
    content: "  다시 방문하고 싶은 곳이에요.  ",
  }),
).toEqual({
  placeId: review.placeId,
  rating: 5,
  content: "다시 방문하고 싶은 곳이에요.",
});
expect(() =>
  CreateReviewRequestSchema.parse({
    placeId: "not-a-uuid",
    rating: 4.5,
    content: "",
  }),
).toThrow();
expect(() =>
  UpdateReviewRequestSchema.parse({
    placeId: review.placeId,
    rating: 4,
    content: "수정 내용",
  }),
).toThrow();
expect(MyReviewsResponseSchema.parse({ items: [review] })).toEqual({
  items: [review],
});
```

- [ ] **Step 2: Run the contract test and verify the missing-contract failure**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/contracts test -- contracts.test.ts
```

Expected: FAIL because `reviews.ts` and its exports do not exist.

- [ ] **Step 3: Implement the exact Zod contracts**

```ts
import { z } from "zod";

const RatingSchema = z.number().int().min(1).max(5);
const ReviewContentSchema = z.string().trim().min(1).max(500);

export const ReviewIdParamsSchema = z.object({
  reviewId: z.string().uuid(),
});

export const CreateReviewRequestSchema = z.object({
  placeId: z.string().uuid(),
  rating: RatingSchema,
  content: ReviewContentSchema,
}).strict();

export const UpdateReviewRequestSchema = z.object({
  rating: RatingSchema,
  content: ReviewContentSchema,
}).strict();

export const ReviewItemSchema = z.object({
  id: z.string().uuid(),
  placeId: z.string().uuid(),
  placeTitle: z.string().min(1),
  location: z.string().min(1),
  rating: RatingSchema,
  content: ReviewContentSchema,
  primaryImageUrl: z.string().url().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const MyReviewsResponseSchema = z.object({
  items: z.array(ReviewItemSchema),
});
```

Export all schemas and inferred types from `packages/contracts/src/index.ts`.

- [ ] **Step 4: Run focused tests and build**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/contracts test -- contracts.test.ts
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/contracts build
```

Expected: PASS and build exit 0.

- [ ] **Step 5: Review the task diff without Git mutations**

Run `git diff --check -- packages/contracts`; confirm only review contract additions plus already-present unrelated contract work remain.

---

### Task 2: Prisma User, Review, and Deterministic Test User

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260826130000_add_users_and_reviews/migration.sql`
- Modify: `apps/api/src/prisma/tourism-schema.spec.ts`
- Modify: `apps/api/test/place-ranking-import.e2e-spec.ts`

**Interfaces:**
- Produces: Prisma delegates `user` and `review`, `User.reviews`, `Place.reviews`, compound identity `userId_placeId`, and the deterministic test-user row.
- Consumed by: `CurrentReviewUser` and `ReviewsService` in Task 3 and PostgreSQL E2E in Task 4.

- [ ] **Step 1: Write the failing generated-client contract**

Extend the approved delegate type and keys with `user` and `review`. Add typed inputs that fail until generation includes the models:

```ts
const testUser = {
  id: "00000000-0000-4000-8000-000000000001",
  provider: "TEST",
  providerUserId: "test-user",
  displayName: "테스트 여행자",
} satisfies Prisma.UserCreateInput;

const review = {
  userId: testUser.id,
  placeId: "6c9bc5a5-836e-420c-bce4-ef68ff421233",
  rating: 5,
  content: "다시 방문하고 싶은 곳이에요.",
} satisfies Prisma.ReviewUncheckedCreateInput;

const reviewIdentity = {
  userId_placeId: { userId: testUser.id, placeId: review.placeId },
} satisfies Prisma.ReviewWhereUniqueInput;
```

Assert the two delegate names, the fixed user ID, integer rating, and compound identity.

- [ ] **Step 2: Run Prisma generation/schema test and verify failure**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api db:generate
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test -- tourism-schema.spec.ts
```

Expected: FAIL because `User`, `Review`, and their delegates do not exist.

- [ ] **Step 3: Add the Prisma models and relations**

Add `reviews Review[]` to `Place`, then add:

```prisma
model User {
  id             String   @id @default(uuid()) @db.Uuid
  provider       String   @db.VarChar(32)
  providerUserId String   @map("provider_user_id") @db.VarChar(191)
  displayName    String   @map("display_name") @db.VarChar(100)
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamptz(3)

  reviews Review[]

  @@unique([provider, providerUserId])
  @@map("users")
}

model Review {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  placeId   String   @map("place_id") @db.Uuid
  rating    Int      @db.SmallInt
  content   String   @db.VarChar(500)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(3)

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  place Place @relation(fields: [placeId], references: [id], onDelete: Restrict)

  @@unique([userId, placeId])
  @@index([userId, updatedAt])
  @@index([placeId])
  @@map("reviews")
}
```

- [ ] **Step 4: Write the explicit SQL migration**

Create `users` and `reviews`, exact unique/index names, foreign keys, and a rating check:

```sql
ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5);

INSERT INTO "users" (
  "id", "provider", "provider_user_id", "display_name", "created_at", "updated_at"
) VALUES (
  '00000000-0000-4000-8000-000000000001',
  'TEST',
  'test-user',
  '테스트 여행자',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("provider", "provider_user_id") DO NOTHING;
```

Include PostgreSQL comments for both tables and every column. Append the new migration path after `20260825170000_add_place_rankings` in `place-ranking-import.e2e-spec.ts` so its isolated schema still matches `AppModule`.

- [ ] **Step 5: Regenerate Prisma and make schema tests pass**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api db:generate
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test -- tourism-schema.spec.ts
```

Expected: PASS with `user` and `review` delegates.

- [ ] **Step 6: Verify the migration against PostgreSQL**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm db:up
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api db:deploy
```

Query through Prisma in the later E2E rather than manually editing rows. Expected: migration exits 0 and the fixed user is present exactly once.

- [ ] **Step 7: Review the task diff**

Run `git diff --check -- apps/api/prisma apps/api/src/prisma apps/api/test/place-ranking-import.e2e-spec.ts`; do not disturb the existing ranking migration.

---

### Task 3: NestJS Review Ownership and CRUD Module

**Files:**
- Create: `apps/api/src/reviews/current-review-user.service.ts`
- Create: `apps/api/src/reviews/current-review-user.service.spec.ts`
- Create: `apps/api/src/reviews/reviews.service.ts`
- Create: `apps/api/src/reviews/reviews.service.spec.ts`
- Create: `apps/api/src/reviews/reviews.controller.ts`
- Create: `apps/api/src/reviews/reviews.controller.spec.ts`
- Create: `apps/api/src/reviews/reviews.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: review contract types from Task 1 and Prisma delegates from Task 2.
- Produces: `CurrentReviewUser.getUserId(): string`, `ReviewsService.listMine()`, `findMine(reviewId)`, `create(input)`, `update(reviewId, input)`, and four versioned REST routes.
- Consumed by: PostgreSQL E2E in Task 4 and Next.js adapter in Task 5.

- [ ] **Step 1: Write the failing current-user boundary test**

```ts
expect(new CurrentReviewUser().getUserId()).toBe(
  "00000000-0000-4000-8000-000000000001",
);
```

Run the focused spec and verify it fails because the service is missing.

- [ ] **Step 2: Implement the fixed-user boundary**

```ts
export const TEST_REVIEW_USER_ID =
  "00000000-0000-4000-8000-000000000001";

@Injectable()
export class CurrentReviewUser {
  getUserId(): string {
    return TEST_REVIEW_USER_ID;
  }
}
```

This is the only runtime location that owns the fixed identity.

- [ ] **Step 3: Write failing service tests for list and ownership**

Use complete Prisma-shaped rows and verify:

```ts
await expect(service.listMine()).resolves.toEqual({ items: [publicReview] });
expect(findMany).toHaveBeenCalledWith({
  where: { userId: TEST_REVIEW_USER_ID },
  orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
  select: REVIEW_SELECT,
});

await expect(service.findMine(otherReviewId)).rejects.toEqual(
  new NotFoundException({
    code: "REVIEW_NOT_FOUND",
    detail: "후기를 찾을 수 없습니다.",
  }),
);
```

The selected place relation must include title, primary image, active region name, and optional district name. Assert `location` is `경기 용인` when both names exist and falls back to region name when district is null.

- [ ] **Step 4: Write failing create/update tests**

Verify these exact boundaries:

```ts
expect(placeFindUnique).toHaveBeenCalledWith({
  where: { id: input.placeId, isVisible: true },
  select: { id: true },
});
expect(reviewCreate).toHaveBeenCalledWith({
  data: { userId: TEST_REVIEW_USER_ID, ...input },
  select: REVIEW_SELECT,
});
expect(reviewUpdate).toHaveBeenCalledWith({
  where: { id: reviewId, userId: TEST_REVIEW_USER_ID },
  data: { rating: 4, content: "수정한 후기" },
  select: REVIEW_SELECT,
});
```

Also assert missing/hidden place gives `404 PLACE_NOT_FOUND`, Prisma `P2002` gives `409 REVIEW_ALREADY_EXISTS`, and a missing/foreign review gives `404 REVIEW_NOT_FOUND`.

- [ ] **Step 5: Implement `ReviewsService` minimally**

Define one exported `REVIEW_SELECT` and one mapper:

```ts
const REVIEW_SELECT = {
  id: true,
  placeId: true,
  rating: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  place: {
    select: {
      title: true,
      primaryImageUrl: true,
      region: { select: { name: true } },
      district: { select: { name: true } },
    },
  },
} satisfies Prisma.ReviewSelect;
```

`listMine`, `findMine`, `create`, and `update` must always obtain the owner ID from `CurrentReviewUser`. Catch only known `P2002` duplicate errors; rethrow every other Prisma error.

- [ ] **Step 6: Write failing controller metadata/delegation tests**

Test body and params validation pipes with:

```ts
CreateReviewRequestSchema,
UpdateReviewRequestSchema,
ReviewIdParamsSchema,
```

Verify the controller parses every service result with `ReviewItemSchema` or `MyReviewsResponseSchema` and that method signatures delegate exact values.

- [ ] **Step 7: Implement controller and module**

```ts
@Controller({ path: "reviews", version: "1" })
export class ReviewsController {
  @Get("mine") listMine(): Promise<MyReviewsResponse>;
  @Get(":reviewId") findMine(@Param(...) params: ReviewIdParams): Promise<ReviewItem>;
  @Post() create(@Body(...) input: CreateReviewRequest): Promise<ReviewItem>;
  @Patch(":reviewId") update(
    @Param(...) params: ReviewIdParams,
    @Body(...) input: UpdateReviewRequest,
  ): Promise<ReviewItem>;
}
```

Register `CurrentReviewUser`, `ReviewsService`, and `ReviewsController` in `ReviewsModule`, then import it in `AppModule` without changing existing module order beyond adding reviews beside other public read/write modules.

- [ ] **Step 8: Run all review module tests**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test -- reviews
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api lint
```

Expected: review specs PASS and API lint exit 0.

- [ ] **Step 9: Review the task diff**

Run `git diff --check -- apps/api/src/reviews apps/api/src/app.module.ts`; preserve concurrent festival/ranking imports already present in `AppModule`.

---

### Task 4: Real PostgreSQL Review API E2E

**Files:**
- Create: `apps/api/test/reviews.e2e-spec.ts`

**Interfaces:**
- Consumes: migration from Task 2, `ReviewsModule` from Task 3, existing `configureApp`, and actual PostgreSQL.
- Produces: end-to-end proof that API responses and database ownership/uniqueness agree.

- [ ] **Step 1: Create an isolated failing E2E harness**

Follow the existing schema-per-test pattern. Apply these migrations in order:

```ts
const MIGRATIONS = [
  "../prisma/migrations/20260821000000_add_tourism_place_foundation/migration.sql",
  "../prisma/migrations/20260822000000_add_tourism_database_comments/migration.sql",
  "../prisma/migrations/20260824135934_scope_tourism_district_provider_code/migration.sql",
  "../prisma/migrations/20260825000000_add_festivals/migration.sql",
  "../prisma/migrations/20260825170000_add_place_rankings/migration.sql",
  "../prisma/migrations/20260826130000_add_users_and_reviews/migration.sql",
] as const;
```

Create an active region, district, and visible place with Prisma. Compile `AppModule`, override `PrismaService` with the isolated client, call `configureApp(app)`, and initialize the app.

- [ ] **Step 2: Prove the migration created exactly one test user**

```ts
await expect(
  prisma.user.findMany({ where: { provider: "TEST", providerUserId: "test-user" } }),
).resolves.toEqual([
  expect.objectContaining({
    id: "00000000-0000-4000-8000-000000000001",
    displayName: "테스트 여행자",
  }),
]);
```

Expected before Task 2 completion: FAIL because `user` does not exist.

- [ ] **Step 3: Test POST → GET mine → PATCH → GET mine**

Use Supertest against versioned URLs:

```ts
await request(app.getHttpServer())
  .post("/api/v1/reviews")
  .send({ placeId, rating: 5, content: "처음 작성한 후기" })
  .expect(201);

await request(app.getHttpServer())
  .get("/api/v1/reviews/mine")
  .expect(200)
  .expect(({ body }) => expect(body.items[0].content).toBe("처음 작성한 후기"));

await request(app.getHttpServer())
  .patch(`/api/v1/reviews/${reviewId}`)
  .send({ rating: 4, content: "수정한 후기" })
  .expect(200);
```

Assert the final database row has rating 4, content `수정한 후기`, the fixed user ID, and the original place ID. Assert the PATCH response `updatedAt` equals the persisted row; do not require a strictly later millisecond because a fast test may update within the timestamp precision.

- [ ] **Step 4: Test duplicate and ownership failure paths**

- Second POST for the same place returns `409` with code `REVIEW_ALREADY_EXISTS` and DB count stays 1.
- POST with missing place returns `404 PLACE_NOT_FOUND`.
- Insert another user's review directly; GET and PATCH through the fixed-user API both return `404 REVIEW_NOT_FOUND`.
- PATCH with `placeId` or rating 4.5 returns `400` Problem Details.

- [ ] **Step 5: Run the real database E2E**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm db:up
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test:e2e -- reviews.e2e-spec.ts
```

Expected: every review E2E passes and temporary schemas are removed in `afterEach`.

- [ ] **Step 6: Review the E2E diff**

Run `git diff --check -- apps/api/test/reviews.e2e-spec.ts`; confirm cleanup covers app, Prisma, pool, and schema even after a failed assertion.

---

### Task 5: Next.js Review API Adapter and Real Written-Review List

**Files:**
- Create: `apps/web/src/features/profile/my-reviews-api.ts`
- Create: `apps/web/tests/unit/features/profile/my-reviews-api.test.ts`
- Modify: `apps/web/src/features/profile/my-reviews-model.ts`
- Modify: `apps/web/src/features/profile/my-reviews.mock.ts`
- Modify: `apps/web/src/app/reviews/page.tsx`
- Modify: `apps/web/tests/unit/app/reviews-page.test.tsx`
- Modify: `apps/web/src/components/patterns/my-reviews-screen.tsx`
- Modify: `apps/web/tests/unit/components/patterns/my-reviews-screen.test.tsx`

**Interfaces:**
- Consumes: `MyReviewsResponseSchema`, `ReviewItem`, and existing bookmarked mock.
- Produces: `loadMyReviews(fetchImpl?, baseUrl?)`, `mapReviewItem(item)`, `MyWrittenReviewsLoadState`, and an async `/reviews` page using real written reviews.
- Consumed by: list UI in Task 6 and new/edit routes in Task 8.

- [ ] **Step 1: Write failing adapter tests**

Use a real contract-shaped response and a fetch stub. Verify:

```ts
await expect(loadMyReviews(fetchImpl, "http://api.test/api/v1")).resolves.toEqual({
  status: "ready",
  items: [
    expect.objectContaining({
      id: review.id,
      placeId: review.placeId,
      title: "에버랜드",
      location: "경기 용인",
      rating: 5,
      date: "2026.08.26",
      likeCount: 0,
      commentCount: 0,
      bookmarked: false,
      image: {
        src: "/images/explore/categories/popular-attraction.png",
        alt: "에버랜드 대표 이미지",
      },
    }),
  ],
});
```

Also verify malformed JSON, non-OK response, thrown fetch, and blank base URL return `{ status: "error" }` without mock fallback. Verify a real `primaryImageUrl` is preserved.

- [ ] **Step 2: Run the adapter test and verify failure**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/web exec vitest run tests/unit/features/profile/my-reviews-api.test.ts
```

Expected: FAIL because the adapter is missing.

- [ ] **Step 3: Implement the list adapter and expression model**

```ts
export type MyWrittenReviewsLoadState =
  | { status: "ready"; items: MyReviewItem[] }
  | { status: "error" };

export async function loadMyReviews(
  fetchImpl: typeof fetch = fetch,
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
): Promise<MyWrittenReviewsLoadState>;
```

Request `${baseUrlWithoutTrailingSlash}/reviews/mine` with `{ cache: "no-store" }`, validate with `MyReviewsResponseSchema`, map `updatedAt` to Korean dot date, and use the approved fallback image. Do not catch mapping bugs outside the adapter's single safe error result.

- [ ] **Step 4: Write failing async page tests**

Mock only `my-reviews-api.ts`, keep `MyReviewsScreen` real, and verify:

- ready API items appear in the written tab;
- the three old written mocks do not appear;
- bookmarked mock items remain after selecting the bookmark tab;
- error state renders `후기를 불러오지 못했어요` and no written mock cards.

Because `ReviewsPage` becomes async, render it with `render(await ReviewsPage())`; do not pass the unresolved promise to Testing Library.

- [ ] **Step 5: Implement the async page and load-state screen contract**

`ReviewsPage` awaits `loadMyReviews()` and passes:

```ts
type MyReviewsScreenProps = {
  data: MyReviewsData;
  writtenLoadState: "ready" | "error";
};
```

Build `data` as `{ written: ready ? items : [], bookmarked: myReviewsMock.bookmarked }`. In the written panel, render the error or empty state instead of an empty `<ul>`; the bookmark tab continues to render its existing list.

- [ ] **Step 6: Run focused page, screen, and adapter tests**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/web exec vitest run tests/unit/features/profile/my-reviews-api.test.ts tests/unit/app/reviews-page.test.tsx tests/unit/components/patterns/my-reviews-screen.test.tsx
```

Expected: PASS with real written-review state and mock bookmarks only.

- [ ] **Step 7: Review the task diff**

Run `git diff --check -- apps/web/src/features/profile apps/web/src/app/reviews/page.tsx apps/web/src/components/patterns/my-reviews-screen.tsx apps/web/tests/unit`; preserve the already-approved padding/title changes.

---

### Task 6: Floating Create Button and Written-Card Edit Link

**Files:**
- Modify: `apps/web/src/components/patterns/my-reviews-screen.tsx`
- Modify: `apps/web/tests/unit/components/patterns/my-reviews-screen.test.tsx`
- Modify: `apps/web/src/components/travel/my-review-card.tsx`
- Create: `apps/web/tests/unit/components/travel/my-review-card.test.tsx`

**Interfaces:**
- Consumes: `MyReviewItem` and current tab state.
- Produces: accessible `/reviews/new` floating link and optional `editHref` card action.
- Consumed by: edit route in Task 8.

- [ ] **Step 1: Write the failing floating-button screen test**

```ts
const createLink = screen.getByRole("link", { name: "후기 작성하기" });
expect(createLink).toHaveAttribute("href", "/reviews/new");
expect(createLink).toHaveTextContent("+");
expect(screen.queryByRole("button", { name: "작성하기" })).not.toBeInTheDocument();
```

Assert the link wrapper has the bottom-navigation reserve and max-width alignment classes rather than testing only that a plus symbol exists.

- [ ] **Step 2: Implement the floating link and remove obsolete status state**

Remove the header `Button`, `message`, and its status paragraph. Add a fixed wrapper inside the max-width screen:

```tsx
<div className="pointer-events-none fixed inset-x-0 bottom-[var(--reviews-navigation-reserve)] z-40 mx-auto flex w-full max-w-[30rem] justify-end px-5 pb-1">
  <Link
    href="/reviews/new"
    aria-label="후기 작성하기"
    className="pointer-events-auto flex size-14 items-center justify-center rounded-full bg-primary text-[2rem] leading-none font-light text-primary-foreground shadow-floating outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
  >
    <span aria-hidden="true">+</span>
  </Link>
</div>
```

The exact bottom offset may be adjusted only after browser measurement, while retaining the CSS variable and safe-area reserve.

- [ ] **Step 3: Write the failing card edit-action test**

Use two separate tests so one render cannot satisfy the other test's query:

```ts
const editable = render(
  <MyReviewCard review={review} editHref="/reviews/review-1/edit" />,
);
expect(editable.getByRole("link", { name: "에버랜드 후기 수정" })).toHaveAttribute(
  "href",
  "/reviews/review-1/edit",
);

const readonly = render(<MyReviewCard review={review} />);
expect(
  readonly.queryByRole("link", {
    name: "에버랜드 후기 수정",
  }),
).not.toBeInTheDocument();
```

- [ ] **Step 4: Implement `editHref?: string`**

Add a compact `수정` link in the card text header without changing the image or engagement layout. In `MyReviewsScreen`, pass `/reviews/${review.id}/edit` only when `activeTab === "written"`; bookmarked cards receive no edit action.

- [ ] **Step 5: Run focused UI and accessibility tests**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/web exec vitest run tests/unit/components/patterns/my-reviews-screen.test.tsx tests/unit/components/travel/my-review-card.test.tsx
```

Expected: PASS, including existing axe checks.

- [ ] **Step 6: Review the UI diff**

Run `git diff --check` on the four files. Confirm the bottom navigation remains fixed and unchanged.

---

### Task 7: Review Mutation and Place-Search Adapters

**Files:**
- Modify: `apps/web/src/features/profile/my-reviews-api.ts`
- Modify: `apps/web/tests/unit/features/profile/my-reviews-api.test.ts`

**Interfaces:**
- Consumes: create/update/review/place shared contracts.
- Produces: `loadReview`, `createReview`, `updateReview`, and `searchReviewPlaces` with discriminated success/error results.
- Consumed by: review editor screen and routes in Task 8.

- [ ] **Step 1: Write failing adapter tests for every HTTP boundary**

Verify exact method, URL, JSON body, `Content-Type`, and response validation:

```ts
await createReview(input, fetchImpl, "http://api.test/api/v1");
expect(fetchImpl).toHaveBeenCalledWith(
  "http://api.test/api/v1/reviews",
  expect.objectContaining({ method: "POST", body: JSON.stringify(input) }),
);

await updateReview(reviewId, update, fetchImpl, baseUrl);
expect(fetchImpl).toHaveBeenCalledWith(
  `http://api.test/api/v1/reviews/${reviewId}`,
  expect.objectContaining({ method: "PATCH", body: JSON.stringify(update) }),
);
```

Test `409 REVIEW_ALREADY_EXISTS` as a typed duplicate result, validation failure as a generic error with safe Korean copy, `404` from `loadReview` as `not-found`, and malformed success JSON as error. For place search, parse the captured request URL and assert `pathname=/api/v1/places`, `region=jeju`, `page=1`, `pageSize=20`, and decoded `q=성산`; validate the response with `PlacesPageSchema`.

- [ ] **Step 2: Run the adapter test and verify failure**

Run the Task 5 adapter test command. Expected: FAIL because mutation/search functions are missing.

- [ ] **Step 3: Implement stable adapter results**

```ts
export type ReviewMutationResult =
  | { status: "success"; review: ReviewItem }
  | { status: "duplicate" }
  | { status: "error"; message: string };

export type ReviewDetailLoadState =
  | { status: "ready"; review: ReviewItem }
  | { status: "not-found" }
  | { status: "error" };

export type ReviewPlacesLoadState =
  | { status: "ready"; items: PlaceListItem[] }
  | { status: "error" };
```

Use one `apiUrl(baseUrl, path)` helper that trims trailing slashes and returns null for blank base URL. Parse Problem Details only to distinguish the approved duplicate code; never display raw server errors.

- [ ] **Step 4: Run adapter tests**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/web exec vitest run tests/unit/features/profile/my-reviews-api.test.ts
```

Expected: PASS for read, create, update, duplicate, not-found, and place search.

- [ ] **Step 5: Review the adapter diff**

Run `git diff --check -- apps/web/src/features/profile/my-reviews-api.ts apps/web/tests/unit/features/profile/my-reviews-api.test.ts`.

---

### Task 8: Create and Edit Review Screens

**Files:**
- Create: `apps/web/src/components/travel/review-rating-input.tsx`
- Create: `apps/web/src/components/travel/review-editor-form.tsx`
- Create: `apps/web/src/components/patterns/review-editor-screen.tsx`
- Create: `apps/web/tests/unit/components/patterns/review-editor-screen.test.tsx`
- Create: `apps/web/src/app/reviews/new/page.tsx`
- Create: `apps/web/tests/unit/app/review-new-page.test.tsx`
- Create: `apps/web/src/app/reviews/[reviewId]/edit/page.tsx`
- Create: `apps/web/src/app/reviews/[reviewId]/edit/not-found.tsx`
- Create: `apps/web/tests/unit/app/review-edit-page.test.tsx`

**Interfaces:**
- Consumes: `loadMyReviews`, `loadReview`, `searchReviewPlaces`, `createReview`, and `updateReview` from Tasks 5 and 7.
- Produces: keyboard-accessible rating input, create/edit editor modes, and routable form pages.

- [ ] **Step 1: Write failing rating/form validation tests**

Render create mode and verify:

- the region select has `서울/경기/강원/부산/제주`;
- no place search is issued until a region is selected;
- search results exclude every `reviewedPlaceId`;
- submit is disabled without place, rating, or nonblank content;
- rating buttons expose `aria-pressed` and arrow-key selection;
- content displays `0/500`, trims on submit, and rejects 501 characters;
- a second click while the first mutation is pending triggers one POST only.

Use complete `PlaceListItem` fixtures rather than partial mocks.

- [ ] **Step 2: Implement `ReviewRatingInput`**

Expose:

```ts
type ReviewRatingInputProps = {
  value: number | null;
  onChange: (rating: number) => void;
  disabled?: boolean;
};
```

Render five real buttons in a `role="radiogroup"` named `별점`. Each button uses `role="radio"`, `aria-checked`, an accessible name such as `5점`, and roving `tabIndex`; Left/Down decrements and Right/Up increments within 1–5.

- [ ] **Step 3: Implement the editor form and screen state**

Use a discriminated prop:

```ts
type ReviewEditorScreenProps =
  | {
      mode: "create";
      reviewedPlaceIds: readonly string[];
      initialReview?: never;
    }
  | {
      mode: "edit";
      reviewedPlaceIds?: never;
      initialReview: ReviewItem;
    };
```

Create mode renders region, query, place result selection, rating, content, and `후기 등록`. Edit mode renders fixed place title/location, rating, content, and `수정 저장`. Use `router.replace('/reviews')` and `router.refresh()` only after a success result. Duplicate result shows `이미 이 관광지에 작성한 후기가 있어요.` and retains all input.

Keep `ReviewEditorScreen` responsible for API calls, selected region/place, pending state, and navigation. Keep `ReviewEditorForm` presentational with this explicit interface:

```ts
import type { ReactNode } from "react";

type ReviewEditorFormProps = {
  mode: "create" | "edit";
  placeLabel: string | null;
  rating: number | null;
  content: string;
  submitting: boolean;
  errorMessage: string | null;
  onRatingChange: (rating: number) => void;
  onContentChange: (content: string) => void;
  onSubmit: () => void;
  createPlaceControls?: ReactNode;
};
```

Only create mode supplies `createPlaceControls`, containing the region selector, search input/button, result status, and place selection. The form owns labels, character count, disabled-state rendering, and the submit button but performs no fetch or routing.

- [ ] **Step 4: Run editor component tests**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/web exec vitest run tests/unit/components/patterns/review-editor-screen.test.tsx
```

Expected: PASS for validation, filtering, keyboard rating, pending state, success navigation, duplicate, and generic error.

- [ ] **Step 5: Write failing route tests**

For `/reviews/new`, mock `loadMyReviews` and verify it passes ready `placeId` values to create mode; on list-load error it still renders the form but relies on API `409` as the final guard.

For `/reviews/[reviewId]/edit`, use Next.js 16 async params:

```ts
await ReviewEditPage({ params: Promise.resolve({ reviewId }) });
```

Verify ready detail renders edit mode, `not-found` calls `notFound()`, and generic error renders a safe retry state rather than a blank form.

- [ ] **Step 6: Implement new/edit pages and not-found UI**

- Both pages export Korean metadata.
- The new page renders the create editor with reviewed place IDs.
- The edit page validates/loads the ID through the adapter and never accepts place data from URL query.
- The not-found page links back to `/reviews`.
- Both screens use `max-w-[30rem]`, `px-5`, `pt-[25px]`, and a header link named `내 후기로 돌아가기`.

- [ ] **Step 7: Run all review web tests and lint**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/web exec vitest run tests/unit/features/profile/my-reviews-api.test.ts tests/unit/app/reviews-page.test.tsx tests/unit/app/review-new-page.test.tsx tests/unit/app/review-edit-page.test.tsx tests/unit/components/patterns/my-reviews-screen.test.tsx tests/unit/components/patterns/review-editor-screen.test.tsx tests/unit/components/travel/my-review-card.test.tsx
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/web exec eslint src/app/reviews src/components/patterns/my-reviews-screen.tsx src/components/patterns/review-editor-screen.tsx src/components/travel/my-review-card.tsx src/components/travel/review-editor-form.tsx src/components/travel/review-rating-input.tsx src/features/profile/my-reviews-api.ts tests/unit/app tests/unit/components/patterns tests/unit/components/travel tests/unit/features/profile
```

Expected: focused tests PASS and changed-scope lint exit 0.

- [ ] **Step 8: Review the complete web diff**

Run `git diff --check -- apps/web/src/app/reviews apps/web/src/components/patterns apps/web/src/components/travel apps/web/src/features/profile apps/web/tests/unit`; confirm unrelated discovery UI remains untouched.

---

### Task 9: Full Verification and Real Browser Workflow

**Files:**
- No product file should be added solely for this task.
- Verify all files from Tasks 1–8 plus `docs/superpowers/specs/2026-08-26-persisted-user-reviews-design.md`.

**Interfaces:**
- Consumes: the completed database, API, web UI, and local services.
- Produces: fresh completion evidence only.

- [ ] **Step 1: Run contract, API, and web verification with Node 24.19.0**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/contracts test
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/contracts build
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api build
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/web test
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/web lint
```

Record pass/fail counts. Separate any unrelated dirty-worktree failures from review-focused failures; do not report a partial run as a full pass.

- [ ] **Step 2: Run real PostgreSQL E2E**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm db:up
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test:e2e -- reviews.e2e-spec.ts
```

Expected: create/list/update/duplicate/ownership cases pass with temporary schema cleanup.

- [ ] **Step 3: Confirm local processes before browser work**

Inspect port 3000 and the API port, PID, cwd, and `.next` owner. Start only missing services with the repository Node 24 runtime; do not stop unrelated processes or run `next build` against an active `.next` directory.

- [ ] **Step 4: Run the 390px browser workflow**

Use the in-app browser on the local app:

1. Open `/reviews`; verify no header `작성하기` button.
2. Measure the circular `+` control: it is inside the 30rem shell, 20px from the right edge, above the bottom navigation, and named `후기 작성하기`.
3. Click `+`; verify URL `/reviews/new` and the create heading.
4. Select `경기`, search for a seeded real place, choose it, select `5점`, enter `처음 작성한 후기`, and submit.
5. Verify URL `/reviews`, the new card is first, and its place/rating/content match the API response.
6. Click the card's `수정`; verify `/reviews/{reviewId}/edit`, place is read-only, change to `4점 / 수정한 후기`, and save.
7. Verify `/reviews` shows the modified card first.
8. Reopen `/reviews/new`; verify the reviewed place is absent from candidates.

- [ ] **Step 5: Repeat layout checks at 480px and inspect console**

At 480px, verify the floating button, form fields, error/status regions, and bottom navigation do not overlap or overflow. Read console error/warning logs for the complete workflow; expected count is zero.

- [ ] **Step 6: Verify API and database evidence**

Call `GET /api/v1/reviews/mine` and compare the first item to the UI. Query Prisma in a read-only command and verify exactly one row for the fixed `(userId, placeId)`, rating 4, content `수정한 후기`, and matching review ID.

- [ ] **Step 7: Final diff and scope audit**

```bash
git diff --check -- packages/contracts/src apps/api/prisma apps/api/src/reviews apps/api/test/reviews.e2e-spec.ts apps/web/src/app/reviews apps/web/src/components/patterns/my-reviews-screen.tsx apps/web/src/components/patterns/review-editor-screen.tsx apps/web/src/components/travel/my-review-card.tsx apps/web/src/components/travel/review-editor-form.tsx apps/web/src/components/travel/review-rating-input.tsx apps/web/src/features/profile apps/web/tests/unit docs/superpowers/specs/2026-08-26-persisted-user-reviews-design.md docs/superpowers/plans/2026-08-26-persisted-user-reviews.md
```

Inspect `git status --short` and identify review-owned files separately from unrelated dirty files. Do not stage or commit.
