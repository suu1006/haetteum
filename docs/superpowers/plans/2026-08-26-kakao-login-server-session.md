# Kakao Login and Server Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a testable Kakao-only login flow backed by revocable PostgreSQL sessions, protect personal routes and review ownership, expose the approved login UI, and keep minimal current-user display data in an in-memory Zustand discriminated union.

**Architecture:** NestJS owns the OAuth authorization-code exchange, Kakao profile lookup, user upsert, opaque session creation, cookie lifecycle, and authorization. Next.js renders the approved login screen, forwards cookies for protected Server Component requests, uses credentialed browser requests, and keeps only `{ id, displayName, profileImageUrl }` in a non-persistent per-browser Zustand store. PostgreSQL stores only a SHA-256 session-token hash; Kakao tokens are discarded after profile lookup.

**Tech Stack:** Node.js 24.19.0, pnpm 10.33.0, TypeScript 5.9, NestJS 11.2, Prisma 7.9/PostgreSQL, Next.js 16.3 App Router, React 19.2, Zustand 5, Zod 4.4, Jest/Supertest, Vitest/Testing Library, real-browser verification.

**Spec:** `docs/superpowers/specs/2026-08-26-kakao-login-server-session-design.md`

## Global Constraints

- Preserve every unrelated dirty-worktree change; do not stage, commit, branch, create a worktree, or push.
- Use `/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin` so all validation runs on Node.js `24.19.0`.
- Read and follow `apps/web/node_modules/next/dist/docs/01-app/02-guides/authentication.md`; do not apply older middleware conventions. Next.js 16 uses `proxy.ts`, but this implementation does not rely on Proxy for secure authorization.
- Keep Kakao keys, client secret, authorization code, access token, refresh token, session token, and full provider bodies out of source, test snapshots, shell output, and logs.
- Use official Kakao endpoints as code constants; do not make provider endpoints environment-configurable.
- Do not store Kakao access or refresh tokens after `GET /v2/user/me` succeeds.
- Do not request email. Persist only Kakao user ID, nickname, and profile image URL.
- Use a 14-day session TTL and refresh only when less than 7 days remain.
- Store the raw 256-bit session token only in an HttpOnly cookie and its SHA-256 hex hash only in PostgreSQL.
- Keep `AuthState` exactly as the approved discriminated union. Do not use Zustand `persist`, localStorage, or sessionStorage.
- Public discovery routes remain available without authentication and must not be forced into request-time rendering by a root Server Layout session lookup.
- Protect `/mypage`, `/reviews`, and `/trips` at the page boundary and protect every personal-data API at the NestJS guard/data boundary.
- The existing `TEST` user constant, resolver, and seed row must not remain an operational authentication path.
- Use successful data responses directly and the existing RFC 9457 Problem Details shape for API errors.
- The design companion under `.superpowers/` is reference evidence only and is not product source.

---

### Task 1: Auth Contract, Environment, and Cookie Middleware

**Files:**
- Create: `packages/contracts/src/auth.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/contracts/src/contracts.test.ts`
- Modify: `apps/api/src/config/environment.ts`
- Modify: `apps/api/src/config/environment.spec.ts`
- Modify: `apps/api/src/configure-app.ts`
- Modify: `apps/api/src/configure-app.spec.ts`
- Modify: `apps/api/test/set-test-env.ts`
- Modify: `apps/api/.env.example`
- Modify: `apps/api/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `AuthUserSchema`, `AuthUser`, required `KAKAO_REST_API_KEY`, `KAKAO_CLIENT_SECRET`, `KAKAO_REDIRECT_URI`, parsed `request.cookies`, and fake test configuration.
- Consumed by: Auth API tasks, review ownership, web auth client, Zustand store, and protected pages.

- [ ] **Step 1: Write failing shared-contract tests**

Add contract assertions equivalent to:

```ts
const authUser = AuthUserSchema.parse({
  id: "10000000-0000-4000-8000-000000000001",
  displayName: "해뜸 여행자",
  profileImageUrl: null,
});

expect(authUser).toEqual({
  id: "10000000-0000-4000-8000-000000000001",
  displayName: "해뜸 여행자",
  profileImageUrl: null,
});
expect(
  AuthUserSchema.parse({ ...authUser, providerUserId: "do-not-expose" }),
).toEqual(authUser);
expect(() => AuthUserSchema.parse({ ...authUser, id: "not-a-uuid" })).toThrow();
```

- [ ] **Step 2: Run the focused contract test and confirm the missing export failure**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/contracts exec vitest run src/contracts.test.ts
```

Expected: FAIL because `AuthUserSchema` is not defined or exported.

- [ ] **Step 3: Add the exact public auth contract**

```ts
import { z } from "zod";

export const AuthUserSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string().min(1).max(100),
  profileImageUrl: z.string().url().nullable(),
});

export type AuthUser = z.infer<typeof AuthUserSchema>;
```

Export the schema and type from `packages/contracts/src/index.ts`.

- [ ] **Step 4: Write failing environment tests**

Extend the valid test environment with:

```ts
KAKAO_REST_API_KEY: "kakao-rest-test-key",
KAKAO_CLIENT_SECRET: "kakao-client-secret-for-test",
KAKAO_REDIRECT_URI: "http://localhost:4000/api/v1/auth/kakao/callback",
```

Assert that each missing or blank value fails, that the redirect URI must use `http://localhost` in development/test or HTTPS outside localhost, and that its path is exactly `/api/v1/auth/kakao/callback`.

- [ ] **Step 5: Run the environment test and confirm missing-schema failures**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- environment.spec.ts
```

Expected: FAIL because the three login variables are still optional or unknown.

- [ ] **Step 6: Require and type the Kakao Login environment**

Add these fields to `ApiEnvironmentSchema`:

```ts
KAKAO_REST_API_KEY: z.string().trim().min(1),
KAKAO_CLIENT_SECRET: z.string().trim().min(1),
KAKAO_REDIRECT_URI: z.string().url(),
```

Use `superRefine` to require pathname `/api/v1/auth/kakao/callback`; allow `http:` only for hostname `localhost` or `127.0.0.1`, otherwise require `https:`.

- [ ] **Step 7: Add cookie parsing through Nest's documented Express integration**

Install direct dependencies:

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api add cookie-parser
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api add -D @types/cookie-parser
```

Register `cookieParser()` in `configureApp()` before request handling and add a focused test proving a `Cookie: haetteum_session=value` header becomes `request.cookies.haetteum_session`. Follow the official NestJS cookie integration: <https://docs.nestjs.com/techniques/cookies>.

- [ ] **Step 8: Make tests independent of real secrets**

Set only fake values in `apps/api/test/set-test-env.ts`:

```ts
process.env.KAKAO_REST_API_KEY ??= "kakao-rest-test-key";
process.env.KAKAO_CLIENT_SECRET ??= "kakao-client-secret-for-test";
process.env.KAKAO_REDIRECT_URI ??=
  "http://localhost:4000/api/v1/auth/kakao/callback";
```

Add the three names with empty example values to `apps/api/.env.example`; never copy real values.

- [ ] **Step 9: Run focused contract, environment, configure-app, lint, and diff checks**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/contracts exec vitest run src/contracts.test.ts
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- environment.spec.ts configure-app.spec.ts
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/contracts build
git diff --check -- packages/contracts apps/api/src/config apps/api/src/configure-app.ts apps/api/.env.example apps/api/package.json pnpm-lock.yaml
```

Expected: focused tests and contracts build pass; diff check produces no output.

---

### Task 2: Prisma User and Revocable Session Storage

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/20260826190000_add_kakao_auth_sessions/migration.sql`
- Modify: `apps/api/src/prisma/tourism-schema.spec.ts`
- Modify: `apps/api/test/place-ranking-import.e2e-spec.ts`

**Interfaces:**
- Produces: `User.profileImageUrl`, `User.lastLoginAt`, `Session` Prisma delegate, unique `tokenHash`, and no live `TEST/test-user` row after migrations.
- Consumed by: `SessionService`, `AuthService`, auth E2E, and review ownership.

- [ ] **Step 1: Write the failing generated-client/schema assertions**

Add `session` to the approved delegate keys and type-check representative inputs:

```ts
const kakaoUser = {
  provider: "KAKAO",
  providerUserId: "1234567890",
  displayName: "해뜸 여행자",
  profileImageUrl: "https://example.test/profile.jpg",
  lastLoginAt: new Date(),
} satisfies Prisma.UserCreateInput;

const session = {
  userId: "10000000-0000-4000-8000-000000000001",
  tokenHash: "a".repeat(64),
  expiresAt: new Date(),
  lastSeenAt: new Date(),
} satisfies Prisma.SessionUncheckedCreateInput;
```

Assert `profileImageUrl`, `lastLoginAt`, `sessions Session[]`, `tokenHash`, and the `session` delegate.

- [ ] **Step 2: Run generation and the focused schema test to confirm failure**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api db:generate
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- tourism-schema.spec.ts
```

Expected: FAIL because the User fields and Session model do not exist.

- [ ] **Step 3: Extend the Prisma schema**

Use this shape:

```prisma
model User {
  id              String    @id @default(uuid()) @db.Uuid
  provider        String    @db.VarChar(32)
  providerUserId  String    @map("provider_user_id") @db.VarChar(191)
  displayName     String    @map("display_name") @db.VarChar(100)
  profileImageUrl String?   @map("profile_image_url") @db.Text
  lastLoginAt     DateTime? @map("last_login_at") @db.Timestamptz(3)
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt       DateTime  @updatedAt @map("updated_at") @db.Timestamptz(3)

  reviews  Review[]
  sessions Session[]

  @@unique([provider, providerUserId])
  @@map("users")
}

model Session {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @map("user_id") @db.Uuid
  tokenHash  String   @unique @map("token_hash") @db.Char(64)
  expiresAt  DateTime @map("expires_at") @db.Timestamptz(3)
  lastSeenAt DateTime @map("last_seen_at") @db.Timestamptz(3)
  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt  DateTime @updatedAt @map("updated_at") @db.Timestamptz(3)

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([expiresAt])
  @@index([userId, expiresAt])
  @@map("sessions")
}
```

- [ ] **Step 4: Write an additive migration that also removes the fixed test account**

The migration must:

1. Add nullable `profile_image_url` and `last_login_at` to `users`.
2. Create `sessions`, its unique/indexes, and cascade FK.
3. Delete reviews belonging to `00000000-0000-4000-8000-000000000001` through the existing cascade by deleting that user.

```sql
DELETE FROM "users"
WHERE "provider" = 'TEST' AND "provider_user_id" = 'test-user';
```

Do not edit the already-created `20260826130000_add_users_and_reviews` migration; the new deletion keeps already-applied local databases and fresh databases consistent without checksum drift.

- [ ] **Step 5: Append the migration to isolated-schema E2E setup**

Add `../prisma/migrations/20260826190000_add_kakao_auth_sessions/migration.sql` after the user/review migration in `place-ranking-import.e2e-spec.ts`.

- [ ] **Step 6: Regenerate and run focused schema validation**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api db:generate
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- tourism-schema.spec.ts
git diff --check -- apps/api/prisma apps/api/src/prisma/tourism-schema.spec.ts apps/api/test/place-ranking-import.e2e-spec.ts
```

Expected: generation and focused test pass; diff check is empty.

---

### Task 3: Kakao OAuth State and Provider Client

**Files:**
- Create: `apps/api/src/auth/auth.constants.ts`
- Create: `apps/api/src/auth/auth.types.ts`
- Create: `apps/api/src/auth/oauth-state.service.ts`
- Create: `apps/api/src/auth/oauth-state.service.spec.ts`
- Create: `apps/api/src/auth/kakao-auth.client.ts`
- Create: `apps/api/src/auth/kakao-auth.client.spec.ts`

**Interfaces:**
- Produces: `OAuthStateService.create(returnTo)`, `OAuthStateService.consume(queryState, cookieValue)`, `KakaoAuthClient.exchangeCode(code)`, `KakaoAuthClient.getUser(accessToken)`, `KAKAO_AUTH_FETCH`, and typed provider profile `{ providerUserId, displayName, profileImageUrl }`.
- Consumed by: `AuthService` and `AuthController`.

- [ ] **Step 1: Write failing OAuth state tests**

Cover these exact behaviors:

```ts
expect(service.sanitizeReturnTo("/reviews?tab=written")).toBe(
  "/reviews?tab=written",
);
expect(service.sanitizeReturnTo("https://evil.example")).toBe("/");
expect(service.sanitizeReturnTo("//evil.example/path")).toBe("/");

const attempt = service.create("/reviews");
expect(attempt.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
expect(service.consume(attempt.state, attempt.cookieValue)).toEqual({
  returnTo: "/reviews",
});
expect(() => service.consume("different", attempt.cookieValue)).toThrow(
  "OAUTH_STATE_INVALID",
);
```

Inject a clock so a cookie payload older than 10 minutes fails with `OAUTH_STATE_EXPIRED`. Corrupt base64/JSON and missing state must fail safely.

- [ ] **Step 2: Run the state test and confirm missing implementation**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- oauth-state.service.spec.ts
```

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement state creation and one-request validation**

Use `randomBytes(32).toString("base64url")`, base64url JSON `{ state, returnTo, createdAt }`, Zod parsing, `timingSafeEqual`, 10-minute expiry, and strict internal-return-path sanitation. The controller deletes the cookie on every callback, so consuming a browser attempt is one-shot.

- [ ] **Step 4: Write failing Kakao client tests with injected fetch**

Assert the token request is:

```text
POST https://kauth.kakao.com/oauth/token
Content-Type: application/x-www-form-urlencoded;charset=utf-8
grant_type=authorization_code
client_id=<REST key>
client_secret=<Client Secret>
redirect_uri=<exact configured URI>
code=<authorization code>
```

Assert user info is:

```text
GET https://kapi.kakao.com/v2/user/me
Authorization: Bearer <access token>
```

Parse only numeric/string `id`, `kakao_account.profile.nickname`, and `profile_image_url`; map absent nickname to `카카오 여행자` and absent image to `null`. Test non-2xx, malformed JSON, missing ID, timeout, and verify thrown errors do not contain code/token/profile bodies.

- [ ] **Step 5: Run the client test and confirm missing implementation**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- kakao-auth.client.spec.ts
```

Expected: FAIL because the client and injection token do not exist.

- [ ] **Step 6: Implement the provider client with fixed endpoints and timeout**

Use internal Zod schemas, `URLSearchParams`, injected `KAKAO_AUTH_FETCH`, and `AbortSignal.timeout(5_000)`. Return only:

```ts
type KakaoIdentity = {
  providerUserId: string;
  displayName: string;
  profileImageUrl: string | null;
};
```

Do not return refresh token or preserve the raw provider response.

- [ ] **Step 7: Run both auth-foundation suites and diff check**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- oauth-state.service.spec.ts kakao-auth.client.spec.ts
git diff --check -- apps/api/src/auth
```

Expected: both suites pass and diff check is empty.

---

### Task 4: Session Service, Cookies, Guard, Current User, and Origin Guard

**Files:**
- Create: `apps/api/src/auth/session.service.ts`
- Create: `apps/api/src/auth/session.service.spec.ts`
- Create: `apps/api/src/auth/session-cleanup.service.ts`
- Create: `apps/api/src/auth/session-cleanup.service.spec.ts`
- Create: `apps/api/src/auth/auth-cookie.service.ts`
- Create: `apps/api/src/auth/auth-cookie.service.spec.ts`
- Create: `apps/api/src/auth/session-auth.guard.ts`
- Create: `apps/api/src/auth/session-auth.guard.spec.ts`
- Create: `apps/api/src/auth/current-user.decorator.ts`
- Create: `apps/api/src/auth/current-user.decorator.spec.ts`
- Create: `apps/api/src/auth/same-origin.guard.ts`
- Create: `apps/api/src/auth/same-origin.guard.spec.ts`

**Interfaces:**
- Produces: `SessionService.create(userId)`, `SessionService.resolve(rawToken)`, `SessionService.revoke(rawToken)`, daily `SessionCleanupService`, `AuthCookieService`, `SessionAuthGuard`, `SameOriginGuard`, `@CurrentUser()`, and `AuthenticatedRequest.auth`.
- Consumed by: Auth controller, Reviews controller, protected API modules, and E2E.

- [ ] **Step 1: Write failing SessionService tests**

Prove:

- `create()` returns a 43-character base64url raw token and stores only `sha256(raw).hex`.
- expiry is exactly 14 days from an injected clock.
- `resolve()` returns public `AuthUser` and internal `userId/sessionId` for a live row.
- an expired row is deleted and resolves to `null`.
- a row with 7 days or more remaining is not updated.
- a row with less than 7 days remaining gets `expiresAt=now+14d` and `lastSeenAt=now`.
- `revoke()` deletes by token hash and is idempotent.

- [ ] **Step 2: Run the focused session test and confirm failure**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- session.service.spec.ts
```

- [ ] **Step 3: Implement the minimal session service**

Use Node `randomBytes(32)` and `createHash("sha256")`. Define constants:

```ts
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1_000;
export const SESSION_REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1_000;
```

Return a refresh expiry only when the guard must rewrite the cookie.

- [ ] **Step 4: Write and implement cookie policy tests**

`AuthCookieService` must use development names `haetteum_session` and `haetteum_oauth_state`, production names `__Host-haetteum_session` and `__Secure-haetteum_oauth_state`, `httpOnly: true`, `sameSite: "lax"`, `path: "/"` for the session, callback path for OAuth state, and `secure: NODE_ENV === "production"`. `__Host-` cannot be used for the callback-scoped OAuth cookie because that prefix requires `Path=/`. Clearing must repeat the same path/secure/sameSite attributes.

- [ ] **Step 5: Write and implement daily expired-session cleanup tests**

`SessionCleanupService.removeExpired()` calls:

```ts
prisma.session.deleteMany({ where: { expiresAt: { lte: now } } });
```

Inject the clock for deterministic unit tests, decorate the scheduled entry point with `@Cron(CronExpression.EVERY_DAY_AT_3AM)`, and log only the deleted row count. Do not log session IDs, hashes, or users. Task 5 registers the cleanup provider in `AuthModule`; the app's existing `ScheduleModule.forRoot()` remains the single scheduler bootstrap.

- [ ] **Step 6: Write failing guard and decorator tests**

Cover missing cookie, unknown hash, expired session, live session, refreshed cookie, and exact request attachment:

```ts
request.auth = {
  sessionId,
  sessionToken: rawToken,
  user: { id, displayName, profileImageUrl },
};
```

Unauthenticated cases throw:

```ts
new UnauthorizedException({
  code: "UNAUTHENTICATED",
  detail: "로그인이 필요합니다.",
});
```

`@CurrentUser()` returns only `request.auth.user`; it never accepts a client-supplied user ID.

- [ ] **Step 7: Implement the session guard and current-user decorator**

Read the parsed cookie from `request.cookies`, resolve it through `SessionService`, clear invalid cookies when a response is available, attach `request.auth`, and rewrite the cookie only when the service reports a refreshed expiry.

- [ ] **Step 8: Write and implement SameOriginGuard tests**

Safe methods `GET`, `HEAD`, and `OPTIONS` pass. Unsafe methods pass only when `Origin` exactly equals `WEB_ORIGIN`; missing or mismatched Origin throws `403 FORBIDDEN_ORIGIN`. Do not infer trust from `Referer`.

- [ ] **Step 9: Run the complete auth-boundary unit set**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- \
  session.service.spec.ts session-cleanup.service.spec.ts auth-cookie.service.spec.ts session-auth.guard.spec.ts \
  current-user.decorator.spec.ts same-origin.guard.spec.ts
git diff --check -- apps/api/src/auth
```

Expected: all focused suites pass and diff check is empty.

---

### Task 5: Auth Service, Controller, Module, and Full API Flow

**Files:**
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/auth.service.spec.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.controller.spec.ts`
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/auth/auth.module.spec.ts`
- Modify: `apps/api/src/app.module.ts`
- Create: `apps/api/test/auth.e2e-spec.ts`

**Interfaces:**
- Produces: `/api/v1/auth/kakao/start`, `/api/v1/auth/kakao/callback`, `/api/v1/auth/me`, `/api/v1/auth/logout`, and exported guards/services for personal API modules.
- Consumed by: Next.js login, bootstrap, protected-page checks, logout, and review APIs.

- [ ] **Step 1: Write failing AuthService tests**

Assert `completeKakaoLogin(code)`:

1. exchanges the code;
2. fetches the minimal identity;
3. upserts `provider: "KAKAO"` and `providerUserId`;
4. updates nickname, image, and `lastLoginAt` on every login;
5. creates a Haetteum session;
6. returns only `{ user, sessionToken, expiresAt }`.

Test a first login, repeat login, provider failure, DB failure before cookie creation, and absence of Kakao tokens in returned/logged values.

- [ ] **Step 2: Implement the AuthService transaction boundary**

Keep the Kakao network calls outside the Prisma transaction. Upsert the user, then create the session through `SessionService`. If session creation fails, surface a safe error and do not let the controller set a cookie.

- [ ] **Step 3: Write failing controller metadata/behavior tests**

Assert exact routes, versions, status codes, redirects, cookie calls, response-schema parsing, and guards:

```text
GET  auth/kakao/start
GET  auth/kakao/callback
GET  auth/me             + SessionAuthGuard
POST auth/logout         + SessionAuthGuard + SameOriginGuard + 204
```

Success callback redirects to the validated internal path. Kakao denial redirects to `/login?error=cancelled`; invalid state to `invalid_request`; provider/DB failure to `provider_unavailable`. Every callback clears the OAuth state cookie.

- [ ] **Step 4: Implement AuthController and AuthModule**

Build the authorization URL with:

```text
https://kauth.kakao.com/oauth/authorize
response_type=code
client_id=<REST key>
redirect_uri=<exact configured URI>
state=<random state>
```

Use full `@Res()` handling for the two redirect endpoints. Use `@Res({ passthrough: true })` only for logout cookie clearing while Nest supplies the 204 response. Parse `/auth/me` with `AuthUserSchema` before returning it. Register `SessionCleanupService`, export `SessionAuthGuard`, `SameOriginGuard`, and session services through `AuthModule`, import `@CurrentUser()` directly from its TypeScript module, and import `AuthModule` in `AppModule`.

- [ ] **Step 5: Write an auth E2E suite with fake Kakao fetch and real PostgreSQL**

Use Supertest agent cookie persistence and override `KAKAO_AUTH_FETCH`. Verify:

1. start returns 302, exact Kakao host/params, and OAuth state cookie;
2. callback with matching state creates a KAKAO user/session and redirects internally;
3. session DB contains only the hash, not the raw cookie token;
4. `/auth/me` returns only public fields;
5. refresh threshold rewrites expiry only when appropriate;
6. logout with trusted Origin returns 204, deletes current session, and clears cookie;
7. logout without/mismatched Origin returns 403;
8. invalid state and provider failure create no session;
9. external returnTo becomes `/`;
10. no response/log contains client secret, code, access token, or provider body.

- [ ] **Step 6: Run focused API unit and auth E2E validation**

First verify PostgreSQL readiness with `docker compose ps` and a real `SELECT 1`. Start it with `pnpm db:up` only if it is not already healthy.

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- auth.service.spec.ts auth.controller.spec.ts auth.module.spec.ts
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test:e2e -- auth.e2e-spec.ts
git diff --check -- apps/api/src/auth apps/api/src/app.module.ts apps/api/test/auth.e2e-spec.ts
```

Expected: unit and auth E2E suites pass; no secret appears in output; diff check is empty.

---

### Task 6: Replace the Fixed Review User with Authenticated Ownership

**Files:**
- Delete: `apps/api/src/reviews/current-review-user.service.ts`
- Delete: `apps/api/src/reviews/current-review-user.service.spec.ts`
- Modify: `apps/api/src/reviews/reviews.controller.ts`
- Modify: `apps/api/src/reviews/reviews.controller.spec.ts`
- Modify: `apps/api/src/reviews/reviews.service.ts`
- Modify: `apps/api/src/reviews/reviews.service.spec.ts`
- Modify: `apps/api/src/reviews/reviews.module.ts`
- Modify: `apps/api/src/reviews/reviews.module.spec.ts`
- Create: `apps/api/test/reviews-auth.e2e-spec.ts`

**Interfaces:**
- Consumes: `AuthModule`, `SessionAuthGuard`, `SameOriginGuard`, and `@CurrentUser()` from Task 5.
- Produces: all review queries/mutations scoped explicitly to the session user's UUID, with no fixed test identity.

- [ ] **Step 1: Rewrite controller tests first**

Controllers must pass `currentUser.id` explicitly:

```ts
await controller.listMine(currentUser);
await controller.findMine(currentUser, params);
await controller.create(currentUser, createInput);
await controller.update(currentUser, params, updateInput);
```

Assert `@UseGuards(SessionAuthGuard, SameOriginGuard)` at the controller level and `@CurrentUser()` route-argument metadata.

- [ ] **Step 2: Rewrite service tests first**

Construct `ReviewsService` with Prisma only and call:

```ts
service.listMine(USER_ID);
service.findMine(USER_ID, REVIEW_ID);
service.create(USER_ID, createInput);
service.update(USER_ID, REVIEW_ID, updateInput);
```

Keep existing safe 404 and duplicate-review cases, but assert every Prisma `where`/`data` uses the passed `USER_ID`.

- [ ] **Step 3: Run focused review tests and confirm signature failures**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- \
  reviews.controller.spec.ts reviews.service.spec.ts reviews.module.spec.ts \
  current-review-user.service.spec.ts
```

Expected: FAIL because production code still depends on `CurrentReviewUser`.

- [ ] **Step 4: Replace the ownership boundary**

Delete the fixed service and constant. Make user ID an explicit first service argument. Import `AuthModule` in `ReviewsModule`, remove `CurrentReviewUser` from providers, add the two guards to the controller, and receive `AuthUser` only through `@CurrentUser()`.

- [ ] **Step 5: Add two-user review E2E isolation**

Create two KAKAO test users and sessions through test helpers. Prove user A cannot read/update user B's review, receives the same safe 404 as a missing review, and cannot create/mutate without a session or trusted Origin.

- [ ] **Step 6: Run focused review unit/E2E and fixed-identity scans**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test -- reviews.controller.spec.ts reviews.service.spec.ts reviews.module.spec.ts
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/api test:e2e -- reviews-auth.e2e-spec.ts
! rg -n "CurrentReviewUser|TEST_REVIEW_USER_ID|00000000-0000-4000-8000-000000000001" \
  apps/api/src apps/api/test packages/contracts/src apps/web/src
git diff --check -- apps/api/src/reviews apps/api/test/reviews-auth.e2e-spec.ts
```

Expected: focused suites pass, identity scan has no matches, and diff check is empty.

---

### Task 7: Next.js Auth Client and In-Memory Zustand Union Store

**Files:**
- Create: `apps/web/src/features/auth/auth-model.ts`
- Create: `apps/web/src/features/auth/auth-server.ts`
- Create: `apps/web/src/features/auth/auth-client.ts`
- Create: `apps/web/src/features/auth/auth-store.tsx`
- Create: `apps/web/src/features/auth/auth-bootstrap.tsx`
- Create: `apps/web/src/features/auth/auth-user-hydrator.tsx`
- Create: `apps/web/tests/unit/features/auth/auth-model.test.ts`
- Create: `apps/web/tests/unit/features/auth/auth-server.test.ts`
- Create: `apps/web/tests/unit/features/auth/auth-client.test.ts`
- Create: `apps/web/tests/unit/features/auth/auth-store.test.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/tests/unit/app/layout.test.ts`

**Interfaces:**
- Consumes: `AuthUserSchema`, Nest `/auth/me`, `/auth/logout`, and `NEXT_PUBLIC_API_BASE_URL`.
- Produces: exact `AuthState`, `useAuthStore`, `AuthStoreProvider`, `AuthBootstrap`, `AuthUserHydrator`, `loadCurrentUser`, `requireCurrentUser`, `logout`, and a credentialed fetch boundary.

- [ ] **Step 1: Write exact union/model tests**

Define without broadening:

```ts
export type AuthUser = {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
};

export type AuthState =
  | { status: "unknown"; user: null }
  | { status: "anonymous"; user: null }
  | { status: "authenticated"; user: AuthUser };
```

Test `safeReturnTo()` accepts internal path/query, rejects absolute/protocol-relative paths, and `loginErrorMessage()` maps `cancelled`, `invalid_request`, and `provider_unavailable` to approved Korean copy.

- [ ] **Step 2: Write server/client API tests**

`auth-server.ts` must import `server-only`, call `/auth/me` with the incoming Cookie and `cache: "no-store"`, return `null` on 401, parse 200 with `AuthUserSchema`, and surface other failures safely. `requireCurrentUser(returnTo)` redirects to `/login?returnTo=<encoded internal path>` on null.

`auth-client.ts` must call `/auth/me` and `/auth/logout` with `credentials: "include"`; logout uses POST, `Content-Type: application/json`, body `{}`, and accepts only 204.

- [ ] **Step 3: Write Zustand provider/store tests before implementation**

Prove:

- initial state is exactly `{ status: "unknown", user: null }`;
- `setAuthenticated(user)` narrows to authenticated with non-null user;
- `setAnonymous()` produces anonymous/null;
- two providers do not share state;
- no `persist` middleware or browser storage access occurs;
- bootstrap maps `/auth/me` 200 to authenticated and 401 to anonymous;
- hydrator applies a server-verified user.

- [ ] **Step 4: Run the focused web auth tests and confirm missing modules**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/web exec vitest run \
  tests/unit/features/auth/auth-model.test.ts \
  tests/unit/features/auth/auth-server.test.ts \
  tests/unit/features/auth/auth-client.test.ts \
  tests/unit/features/auth/auth-store.test.tsx
```

- [ ] **Step 5: Implement the per-provider Zustand store**

Use Zustand vanilla `createStore`, React context, and `useStore`. Keep actions merged with the discriminated union without changing the union itself:

```ts
type AuthActions = {
  setAuthenticated: (user: AuthUser) => void;
  setAnonymous: () => void;
};

type AuthStore = AuthState & AuthActions;
```

Never create a module-level mutable store that can leak across server requests. Do not import `persist`.

- [ ] **Step 6: Add root client provider/bootstrap without a root server session fetch**

Wrap `children` in `AuthStoreProvider` and render `AuthBootstrap`. Bootstrap fetches only when store status is unknown. This leaves public Server Components free of `cookies()`/`headers()` access and avoids turning all public routes dynamic.

- [ ] **Step 7: Run focused tests and layout regression**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/web exec vitest run \
  tests/unit/features/auth/auth-model.test.ts \
  tests/unit/features/auth/auth-server.test.ts \
  tests/unit/features/auth/auth-client.test.ts \
  tests/unit/features/auth/auth-store.test.tsx \
  tests/unit/app/layout.test.ts
git diff --check -- apps/web/src/features/auth apps/web/src/app/layout.tsx apps/web/tests/unit/features/auth apps/web/tests/unit/app/layout.test.ts
```

Expected: all focused tests pass, no storage APIs are used, and diff check is empty.

---

### Task 8: Approved Login UI, Protected Pages, Real Profile, and Logout

**Files:**
- Create: `apps/web/src/app/login/page.tsx`
- Create: `apps/web/src/components/patterns/login-screen.tsx`
- Create: `apps/web/tests/unit/app/login-page.test.tsx`
- Create: `apps/web/tests/unit/components/patterns/login-screen.test.tsx`
- Modify: `apps/web/src/app/mypage/page.tsx`
- Modify: `apps/web/src/app/reviews/page.tsx`
- Modify: `apps/web/src/app/trips/page.tsx`
- Modify: `apps/web/src/components/patterns/my-page-screen.tsx`
- Modify: `apps/web/src/components/travel/profile-summary-card.tsx`
- Modify: `apps/web/src/components/travel/my-page-menu-list.tsx`
- Modify: `apps/web/src/features/profile/my-page-model.ts`
- Modify: `apps/web/src/features/profile/my-page.mock.ts`
- Create: `apps/web/src/features/profile/my-page-data.ts`
- Create: `apps/web/src/features/reviews/my-reviews-api.ts`
- Create: `apps/web/tests/unit/features/reviews/my-reviews-api.test.ts`
- Create: `apps/web/tests/unit/features/profile/my-page-data.test.ts`
- Modify: `apps/web/tests/unit/app/my-page.test.tsx`
- Modify: `apps/web/tests/unit/app/reviews-page.test.tsx`
- Modify: `apps/web/tests/unit/app/trips-page.test.tsx`
- Modify: `apps/web/tests/unit/components/patterns/my-page-screen.test.tsx`
- Modify: `apps/web/next.config.ts`

**Interfaces:**
- Consumes: `requireCurrentUser`, `AuthUserHydrator`, auth store/client, `MyReviewsResponseSchema`, and approved visual companion v3.
- Produces: `/login`, protected page redirects, real Kakao profile display, truthful zero/actual counts, and working current-session logout.

- [ ] **Step 1: Write login page/screen tests from the approved v3**

Assert:

- heading `여행 기록을 이어서 관리해보세요`;
- brand text `해뜸` and an accessible decorative ON-toggle mark;
- one link/button named `카카오로 계속하기` to `${API_BASE}/auth/kakao/start?returnTo=<safe path>`;
- privacy copy mentions only identifier, nickname, and profile image;
- no `로그인 후 내 후기로 돌아가요` text;
- no fake terms/privacy links;
- mobile full surface and desktop centered-card class contract;
- back uses router history and falls back to `/` when direct-loaded;
- approved error copy and retry action.

- [ ] **Step 2: Implement the approved login screen**

Translate `login-responsive-direction-v3.html` into existing Tailwind tokens and component conventions. Do not ship the companion HTML. The purple brand track must be a rounded capsule with a white knob aligned right so it reads as ON. The Kakao action is a normal top-level anchor to Nest, not client fetch.

- [ ] **Step 3: Write protected-page tests first**

Mock `requireCurrentUser` and assert `/mypage`, `/reviews`, and `/trips` each call it with their exact route. Assert the server-verified user is passed to `AuthUserHydrator`. For unauthorized behavior, mock the helper's Next `redirect()` outcome rather than relying on a layout-only check.

- [ ] **Step 4: Protect the three page components close to their data**

Make each page async, call `requireCurrentUser("/<route>")`, render `AuthUserHydrator`, and then render its personal surface. Do not create a catch-all auth layout that can be skipped through partial rendering.

- [ ] **Step 5: Load actual current-user reviews and remove personal review mocks**

Create a server-only `loadMyReviews(cookieHeader)` adapter that calls `GET /reviews/mine`, forwards Cookie, uses `cache: "no-store"`, parses `MyReviewsResponseSchema`, and maps API items into the existing review view model. Use `likeCount: 0`, `commentCount: 0`, and `bookmarked: false` because those values are not persisted. Use the existing neutral fallback image only when `primaryImageUrl` is null. Return a discriminated load result:

```ts
type MyReviewsLoadResult =
  | { status: "ready"; data: MyReviewsData }
  | { status: "error" };
```

`/reviews` shows actual written reviews and an empty bookmarked list. On adapter failure it renders an explicit retry/unavailable message rather than mock items or a false empty state. Add adapter tests for cookie forwarding, `no-store`, schema rejection, mapping, and non-2xx handling.

- [ ] **Step 6: Replace mock profile data with a truthful mapper**

Create `createMyPageData(user, counts)` that maps nickname and profile image, uses the existing local avatar only as a fallback, removes fake level/points/progress, and uses actual counts when available or `0개` for unimplemented storage. Update `ProfileSummaryCard` to render only real nickname/avatar and a neutral `카카오로 로그인됨` label.

Pass the actual `loadMyReviews()` written-review count when its status is ready; show `0개` only when the ready result is empty. If review loading fails, omit the review count instead of displaying a false zero. `/trips` receives `{ scheduled: [], past: [] }` until trip persistence exists.

- [ ] **Step 7: Implement logout as a real button**

Change the logout menu item into a button that calls the credentialed POST endpoint. On 204, call `setAnonymous()`, replace navigation with `/`, and refresh. On failure, retain authenticated state and expose an accessible retry status. Do not call Kakao logout or unlink.

- [ ] **Step 8: Handle Kakao profile images safely**

Allow HTTPS profile URLs whose hostname is exactly `k.kakaocdn.net` or ends with `.kakaocdn.net` through `next.config.ts` remote patterns and an application-level URL validator. Reject all other protocols/hosts and use the local profile image fallback so a missing or unexpected provider image never breaks rendering.

- [ ] **Step 9: Run login, protection, profile, and existing screen regressions**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH \
  pnpm --filter @haetteum/web exec vitest run \
  tests/unit/app/login-page.test.tsx \
  tests/unit/components/patterns/login-screen.test.tsx \
  tests/unit/app/my-page.test.tsx \
  tests/unit/app/reviews-page.test.tsx \
  tests/unit/app/trips-page.test.tsx \
  tests/unit/components/patterns/my-page-screen.test.tsx \
  tests/unit/features/reviews/my-reviews-api.test.ts \
  tests/unit/features/profile/my-page-data.test.ts
git diff --check -- apps/web/src/app/login apps/web/src/app/mypage apps/web/src/app/reviews apps/web/src/app/trips apps/web/src/components apps/web/src/features/profile apps/web/next.config.ts apps/web/tests/unit
```

Expected: focused tests pass, mock personal identity/counts are absent from runtime pages, and diff check is empty.

---

### Task 9: Environment Placement, Full Validation, and Real Kakao Browser Test

**Files:**
- Modify only if documentation drift is found: `README.md`
- Modify only if implementation status drift is found: `ARCHITECTURE.md`
- Read without printing secrets: `.env`, `apps/api/.env`, `apps/web/.env.local`

**Interfaces:**
- Consumes: all implementation tasks, user-created Kakao app, real local secrets, PostgreSQL, API port 4000, and web port 3000.
- Produces: verified local login URL and evidence separating automated fake-provider coverage from real Kakao coverage.

- [ ] **Step 1: Correct secret placement without exposing values**

Current verified state before implementation:

```text
./.env: KAKAO_REST_API_KEY, KAKAO_CLIENT_SECRET, KAKAO_REDIRECT_URI present
apps/api/.env: the three Kakao Login entries absent
apps/web/.env.local: NEXT_PUBLIC_API_BASE_URL present
```

Nest scripts execute with cwd `apps/api`, so `ConfigModule.forRoot()` reads `apps/api/.env`, not the root `.env`. Ask the user to move the three Kakao lines into `apps/api/.env`, or perform a silent local move only with explicit secret-file authorization. Never print or patch the values through tool output. Confirm only `SET/EMPTY` status.

- [ ] **Step 2: Verify the registered callback contract**

Confirm the environment value and Kakao Developers registered Redirect URI both exactly equal:

```text
http://localhost:4000/api/v1/auth/kakao/callback
```

Scheme, host, port, and path must all match. Confirm Kakao Login is enabled, client secret is enabled, and profile nickname/image consent items are available.

- [ ] **Step 3: Apply migrations serially and verify PostgreSQL**

Avoid concurrent Prisma generation or migration commands.

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm db:up
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api db:generate
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api db:deploy
```

Run a real `SELECT 1`, verify the sessions table exists, and confirm the `TEST/test-user` row is absent without selecting secret/token columns.

- [ ] **Step 4: Run focused then package-wide automated checks**

```bash
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/contracts test
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/contracts build
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api lint
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api build
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/api test:e2e
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/web lint
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/web test
PATH=/Users/jeongsu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH pnpm --filter @haetteum/web build
git diff --check
```

Report focused auth results separately from unrelated pre-existing suite failures.

- [ ] **Step 5: Start or reuse the correct local servers**

Inspect port 3000 and 4000 owners before starting anything. Reuse a healthy Haetteum process whose cwd matches `apps/web` or `apps/api`; do not kill it only to restart. Start missing services with Node 24 and verify:

```text
http://localhost:3000/login
http://localhost:4000/api/v1/health
```

- [ ] **Step 6: Run real browser Kakao login verification**

Using the in-app browser:

1. Open a public discovery page while anonymous.
2. Visit `/reviews` and verify redirect to `/login?returnTo=%2Freviews`.
3. Confirm the approved v3 login UI and absence of the removed return chip.
4. Click `카카오로 계속하기` and complete real Kakao consent.
5. Verify callback returns to `/reviews` and no external return URL is accepted.
6. Open `/mypage`; confirm actual Kakao nickname/image and truthful counts.
7. Reload; confirm `/auth/me` and Zustand re-bootstrap retain the UI state through the server session.
8. Confirm no session token is readable through JavaScript and no Kakao token is in storage/network application responses.
9. Log out; verify only the current Haetteum session is deleted and `/reviews` redirects to login again.
10. Inspect URL, cookies, network status, and browser console for errors.

- [ ] **Step 7: Update implementation-status documentation only with verified facts**

Mark Kakao auth as implemented only if automated checks and the real browser flow both pass. If Kakao console setup blocks the live flow, report automated fake-provider verification as passed and real provider verification as blocked; do not label login complete.

---

## Plan Self-Review Results

- Spec coverage: OAuth, session hashing/refresh/revoke, CSRF state, same-origin unsafe requests, shared contracts, review ownership, protected routes, approved UI, real profile/truthful counts, Zustand union, env placement, automated tests, and real browser verification are each mapped to a task.
- Placeholder scan: no implementation step delegates unspecified error handling, testing, or type definitions. Conditional documentation/profile-count steps define the safe fallback instead of leaving a placeholder.
- Type consistency: `AuthUser`, `AuthState`, `AuthenticatedRequest.auth`, `SessionService`, `@CurrentUser()`, and review service signatures are defined once and consumed consistently in later tasks.
- Scope boundary: membership deletion/Kakao unlink, all-device logout, multiple providers, policy-document authoring, and unimplemented trip/bookmark persistence remain excluded.
