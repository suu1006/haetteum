# Haetteum NestJS Monorepo Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing Next.js checkout into a pnpm Workspace and add a separately runnable NestJS REST API backed by Docker PostgreSQL and Prisma 7, without changing the existing UI behavior.

**Architecture:** Keep the existing web application in `apps/web`, put the Nest application and Prisma ownership in `apps/api`, and share only transport-safe Zod contracts through `packages/contracts`. PostgreSQL runs in Docker while both application processes run on the host; `/api/v1/health` is the first and only endpoint in this foundation phase.

**Tech Stack:** Node.js 24.19.0, pnpm 10.33.0, Next.js 16.3.1, NestJS 11.2.1, PostgreSQL 18.4, Prisma 7.9.1, Zod 4.4.3, Vitest 4.1.10, Jest 30.4.2, Supertest 7.2.2

**Spec:** `docs/superpowers/specs/2026-08-20-nestjs-monorepo-foundation-design.md`

## Global Constraints

- Use exactly Node.js `24.19.0`; `.nvmrc`, root `engines.node`, and the runtime used for every verification command must match.
- Keep pnpm fixed at `10.33.0` and preserve a single root `pnpm-lock.yaml`.
- Preserve all existing tracked and untracked UI/design-system work; never reset, discard, or rewrite unrelated changes.
- Keep `/` as the future main page and `/welcome` as the future welcome page; this backend foundation does not implement either page.
- Do not add authentication, user/travel domain models, CRUD endpoints, seeds, Swagger/OpenAPI, queues, deployment, or CI.
- Do not create fake database tables or an empty migration merely to prove that Prisma runs.
- Do not commit, push, tag, create a branch, or create a worktree during this plan.
- Do not commit real `.env` values or credentials. Commit only `.env.example` files with local-development examples.
- Return successful endpoint data directly. Return errors as RFC 9457-compatible `application/problem+json`.
- Keep `CLAUDE.md` absent. Preserve root `AGENTS.md` and add the current Next.js agent block at `apps/web/AGENTS.md`.
- Before modifying Next.js-specific source beyond mechanical relocation, read the relevant guide under `apps/web/node_modules/next/dist/docs/`.
- PostgreSQL must use the fixed image `postgres:18.4-alpine`.
- The current machine has Node `v25.9.0` and no Docker CLI/runtime. Do not install machine-level tools automatically; obtain the required runtime before full execution and report the environment blocker if it remains.

---

## Planned File Map

### Repository root

- Create `.nvmrc`: the single Node version declaration.
- Create `.env.example`: Docker PostgreSQL local defaults.
- Create `compose.yaml`: PostgreSQL service, health check, and persistent volume.
- Modify `package.json`: workspace-only scripts, exact Node/pnpm versions, no application dependencies.
- Modify `pnpm-workspace.yaml`: include `apps/*` and `packages/*` while preserving pnpm build approvals.
- Modify `.gitignore`: workspace-aware build/test/generated ignores and committed env examples.
- Modify `README.md`: monorepo setup, commands, ports, environment, and health verification.
- Preserve `DESIGN.md`, `docs/`, and root `AGENTS.md`.
- Delete `CLAUDE.md` only after `apps/web/AGENTS.md` exists.

### `apps/web`

- Move `src/`, `public/`, `components.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `tsconfig.json`, and `vitest.config.mts` without content changes.
- Create `package.json`: renamed existing application package with the same dependencies and scripts.
- Create `.env.example`: `NEXT_PUBLIC_API_BASE_URL` only.
- Create `AGENTS.md`: current generated Next.js 16 agent rules.

### `packages/contracts`

- Create `package.json`, `tsconfig.json`, `eslint.config.mjs`, and `vitest.config.ts`.
- Create `src/health.ts`: Terminus-compatible success response schema.
- Create `src/problem-details.ts`: validation issue and Problem Details schemas.
- Create `src/index.ts`: public exports only.
- Create `src/contracts.test.ts`: runtime acceptance/rejection tests.

### `apps/api`

- Create Nest standard project configuration: `package.json`, `nest-cli.json`, TypeScript, ESLint, Jest, and e2e config.
- Create `src/config/environment.ts`: Zod startup environment parser.
- Create `src/common/http/request-id.middleware.ts`: UUID request correlation.
- Create `src/common/http/zod-validation.pipe.ts`: shared-schema request validation.
- Create `src/common/http/problem-details.filter.ts`: RFC 9457 error translation.
- Create `src/configure-app.ts`: prefix, URI versioning, CORS, and global filter setup.
- Create `src/prisma/prisma.module.ts` and `src/prisma/prisma.service.ts`: Prisma 7 adapter lifecycle.
- Create `src/health/health.module.ts` and `src/health/health.controller.ts`: database-backed health endpoint.
- Create `src/app.module.ts` and `src/main.ts`: module composition and listen boundary.
- Create `prisma/schema.prisma` and `prisma.config.ts`: empty domain schema with explicit generated client output.
- Create focused unit tests next to their source and HTTP e2e tests under `test/`.

---

### Task 1: Pin the Runtime and Relocate the Existing Web Application

**Files:**
- Create: `.nvmrc`
- Modify: `package.json`
- Modify: `pnpm-workspace.yaml`
- Modify: `.gitignore`
- Create: `apps/web/package.json`
- Create: `apps/web/.env.example`
- Create: `apps/web/AGENTS.md`
- Move: `src/` → `apps/web/src/`
- Move: `public/` → `apps/web/public/`
- Move: `components.json` → `apps/web/components.json`
- Move: `next.config.ts` → `apps/web/next.config.ts`
- Move: `postcss.config.mjs` → `apps/web/postcss.config.mjs`
- Move: `eslint.config.mjs` → `apps/web/eslint.config.mjs`
- Move: `tsconfig.json` → `apps/web/tsconfig.json`
- Move: `vitest.config.mts` → `apps/web/vitest.config.mts`
- Delete: `CLAUDE.md`

**Interfaces:**
- Consumes: the current Next.js package and all dirty tracked/untracked web files.
- Produces: runnable `@haetteum/web`; root pnpm Workspace discovery; exact Node version contract.

- [ ] **Step 1: Verify the execution prerequisites without installing anything**

Run:

```bash
test "$(node --version)" = "v24.19.0"
test "$(pnpm --version)" = "10.33.0"
docker --version
docker compose version
```

Expected: Node and pnpm print no error; Docker and Compose report installed versions. On the currently observed machine, Node and Docker checks fail. Stop before implementation until Node 24.19.0 is active; Docker may remain pending until Task 5 but must exist before database verification.

- [ ] **Step 2: Record and run the pre-move web baseline**

Run:

```bash
git status --short
pnpm test
pnpm lint
pnpm build
```

Expected: record the dirty file list exactly; all three project checks pass under Node 24.19.0. If a check fails, diagnose it as pre-existing before moving files.

- [ ] **Step 3: Write the root workspace declarations**

Write `.nvmrc` exactly:

```text
24.19.0
```

Replace the root `package.json` application manifest with this workspace manifest:

```json
{
  "name": "haetteum",
  "version": "0.1.0",
  "private": true,
  "engines": {
    "node": "24.19.0"
  },
  "scripts": {
    "dev:web": "pnpm --filter @haetteum/web dev",
    "build:web": "pnpm --filter @haetteum/web build",
    "lint:web": "pnpm --filter @haetteum/web lint",
    "test:web": "pnpm --filter @haetteum/web test"
  },
  "packageManager": "pnpm@10.33.0"
}
```

Update `pnpm-workspace.yaml` to preserve the existing approvals and add package discovery:

```yaml
packages:
  - "apps/*"
  - "packages/*"

ignoredBuiltDependencies:
  - sharp
  - unrs-resolver
```

Update `.gitignore` so these exact categories are covered:

```gitignore
/node_modules
**/node_modules
**/.next/
**/out/
**/build/
**/dist/
**/coverage/
apps/api/src/generated/prisma/
*.tsbuildinfo
next-env.d.ts
.env*
!.env.example
!**/.env.example
.DS_Store
*.pem
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*
**/.vercel/
```

- [ ] **Step 4: Move the web-owned paths mechanically**

Run from the repository root:

```bash
mkdir -p apps/web
mv src public components.json next.config.ts postcss.config.mjs eslint.config.mjs tsconfig.json vitest.config.mts apps/web/
```

Do not use a formatter or codemod. Do not move `DESIGN.md`, `README.md`, `docs/`, root `AGENTS.md`, `.gitignore`, `pnpm-lock.yaml`, or `pnpm-workspace.yaml`.

- [ ] **Step 5: Restore the web package manifest at its new boundary**

Create `apps/web/package.json` by preserving every existing dependency/version and changing only these ownership fields:

```json
{
  "name": "@haetteum/web",
  "version": "0.1.0",
  "private": true,
  "engines": {
    "node": "24.19.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run"
  }
}
```

The `dependencies` and `devDependencies` objects must be copied byte-for-value from the pre-move root manifest. Create `apps/web/.env.example`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

- [ ] **Step 6: Preserve Next agent guidance and remove only the Claude compatibility file**

Create `apps/web/AGENTS.md` with the same complete managed block currently in root `AGENTS.md`. Verify the marker exists before deleting `CLAUDE.md`:

```bash
rg -n "BEGIN:nextjs-agent-rules|END:nextjs-agent-rules" AGENTS.md apps/web/AGENTS.md
```

Expected: both files contain both markers. Then remove `CLAUDE.md` with `apply_patch`. Keep root `AGENTS.md` unchanged.

- [ ] **Step 7: Reinstall and prove the relocated web application is unchanged**

Run:

```bash
pnpm install
pnpm --filter @haetteum/web test
pnpm --filter @haetteum/web lint
pnpm --filter @haetteum/web build
```

Expected: the same tests and build pass from `apps/web`; Next generates ignored artifacts only inside `apps/web`.

- [ ] **Step 8: Review the relocation boundary**

Run:

```bash
git status --short
test ! -e CLAUDE.md
test -f AGENTS.md
test -f apps/web/AGENTS.md
test ! -d src
test -d apps/web/src
```

Expected: existing edits appear as path moves/additions rather than content loss; no commit is created.

---

### Task 2: Create the Shared Zod Contract Package

**Files:**
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/eslint.config.mjs`
- Create: `packages/contracts/vitest.config.ts`
- Create: `packages/contracts/src/health.ts`
- Create: `packages/contracts/src/problem-details.ts`
- Create: `packages/contracts/src/index.ts`
- Test: `packages/contracts/src/contracts.test.ts`
- Modify: `apps/web/package.json`

**Interfaces:**
- Consumes: Zod `4.4.3` only at runtime.
- Produces: `HealthResponseSchema`, `HealthResponse`, `ValidationIssueSchema`, `ValidationIssue`, `ProblemDetailsSchema`, and `ProblemDetails` from `@haetteum/contracts`.

- [ ] **Step 1: Write failing contract tests**

Create `packages/contracts/src/contracts.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { HealthResponseSchema, ProblemDetailsSchema } from "./index.js";

describe("HealthResponseSchema", () => {
  it("accepts the direct Terminus success response", () => {
    expect(
      HealthResponseSchema.parse({
        status: "ok",
        info: { database: { status: "up" } },
        error: {},
        details: { database: { status: "up" } },
      }),
    ).toEqual({
      status: "ok",
      info: { database: { status: "up" } },
      error: {},
      details: { database: { status: "up" } },
    });
  });
});

describe("ProblemDetailsSchema", () => {
  it("accepts an RFC 9457 problem with Haetteum extensions", () => {
    expect(
      ProblemDetailsSchema.parse({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "요청값이 올바르지 않습니다.",
        instance: "/api/v1/example",
        code: "VALIDATION_ERROR",
        requestId: "f2e09553-1b48-40de-8d6e-a3d68a0d9636",
        errors: [{ path: "body.name", message: "필수 값입니다." }],
      }).code,
    ).toBe("VALIDATION_ERROR");
  });

  it("rejects success status codes", () => {
    expect(() =>
      ProblemDetailsSchema.parse({
        type: "about:blank",
        title: "OK",
        status: 200,
        detail: "not an error",
        instance: "/api/v1/health",
        code: "OK",
        requestId: "f2e09553-1b48-40de-8d6e-a3d68a0d9636",
      }),
    ).toThrow();
  });
});
```

- [ ] **Step 2: Add the package configuration and verify the tests fail**

Create a private ESM package named `@haetteum/contracts` with:

```json
{
  "name": "@haetteum/contracts",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "lint": "eslint src --max-warnings=0",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "4.4.3"
  },
  "devDependencies": {
    "@eslint/js": "9.39.5",
    "eslint": "9.39.5",
    "globals": "17.11.0",
    "typescript": "5.9.3",
    "typescript-eslint": "8.67.0",
    "vitest": "4.1.10"
  }
}
```

Create `packages/contracts/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "rootDir": "src",
    "outDir": "dist",
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["src/**/*.test.ts", "dist", "node_modules"]
}
```

Create `packages/contracts/eslint.config.mjs`:

```js
import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
```

Create `packages/contracts/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node" },
});
```

Run:

```bash
pnpm install
pnpm --filter @haetteum/contracts test
```

Expected: FAIL because the schemas do not exist.

- [ ] **Step 3: Implement the minimal health contract**

Create `packages/contracts/src/health.ts`:

```ts
import { z } from "zod";

const HealthIndicatorSchema = z
  .object({ status: z.enum(["up", "down"]) })
  .catchall(z.unknown());

const HealthIndicatorResultSchema = z.record(
  z.string(),
  HealthIndicatorSchema,
);

export const HealthResponseSchema = z.object({
  status: z.enum(["ok", "error", "shutting_down"]),
  info: HealthIndicatorResultSchema,
  error: HealthIndicatorResultSchema,
  details: HealthIndicatorResultSchema,
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;
```

- [ ] **Step 4: Implement the minimal Problem Details contract**

Create `packages/contracts/src/problem-details.ts`:

```ts
import { z } from "zod";

export const ValidationIssueSchema = z.object({
  path: z.string().min(1),
  message: z.string().min(1),
});

export const ProblemDetailsSchema = z.object({
  type: z.literal("about:blank"),
  title: z.string().min(1),
  status: z.number().int().min(400).max(599),
  detail: z.string().min(1),
  instance: z.string().startsWith("/"),
  code: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  requestId: z.string().uuid(),
  errors: z.array(ValidationIssueSchema).optional(),
});

export type ValidationIssue = z.infer<typeof ValidationIssueSchema>;
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
```

Export both modules from `src/index.ts` using `.js` specifiers required by NodeNext.

- [ ] **Step 5: Make the web application an explicit contract consumer**

Add this dependency to `apps/web/package.json` without importing it into product code yet:

```json
"@haetteum/contracts": "workspace:*"
```

- [ ] **Step 6: Verify the package independently**

Run:

```bash
pnpm install
pnpm --filter @haetteum/contracts test
pnpm --filter @haetteum/contracts lint
pnpm --filter @haetteum/contracts build
```

Expected: all checks pass and `packages/contracts/dist/index.js` plus declarations are generated but ignored by Git.

---

### Task 3: Scaffold the Nest API and Validate Startup Configuration

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/tsconfig.build.json`
- Create: `apps/api/eslint.config.mjs`
- Create: `apps/api/.prettierrc`
- Create: `apps/api/src/config/environment.ts`
- Test: `apps/api/src/config/environment.spec.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/main.ts`

**Interfaces:**
- Consumes: `@haetteum/contracts`; process environment keys `NODE_ENV`, `API_PORT`, `WEB_ORIGIN`, `DATABASE_URL`.
- Produces: `ApiEnvironment`, `validateEnvironment(config)`, and a Nest application that refuses invalid startup configuration.

- [ ] **Step 1: Generate the standard Nest 11 project without installing or creating Git state**

Run:

```bash
cd apps
pnpm dlx @nestjs/cli@11.0.24 new api --package-manager pnpm --skip-git --skip-install --strict
cd ..
```

Delete the generated sample controller/service/tests and the nested README with `apply_patch`; they are not part of the foundation contract.

- [ ] **Step 2: Replace the generated manifest with the exact API package boundary**

Set `name` to `@haetteum/api`, `private` to true, `type` to `module`, and pin these runtime dependencies:

```json
{
  "@haetteum/contracts": "workspace:*",
  "@nestjs/common": "11.2.1",
  "@nestjs/config": "4.0.4",
  "@nestjs/core": "11.2.1",
  "@nestjs/platform-express": "11.2.1",
  "reflect-metadata": "0.2.2",
  "rxjs": "7.8.2",
  "zod": "4.4.3"
}
```

Use `typescript: 5.9.3`, `@types/node: 24.13.3`, `@nestjs/cli: 11.0.24`, `@nestjs/testing: 11.2.1`, `jest: 30.4.2`, `ts-jest: 29.4.12`, and `supertest: 7.2.2` in dev dependencies. Keep the Nest-generated NodeNext/ES2023 strict TypeScript structure. Rename scripts to `dev`, `build`, `start`, `lint`, `test`, and `test:e2e`; lint must not auto-fix.

Use these exact scripts before Prisma is introduced in Task 5:

```json
{
  "build": "nest build",
  "dev": "nest start --watch",
  "start": "node dist/main.js",
  "lint": "eslint \"{src,test}/**/*.ts\" --max-warnings=0",
  "test": "jest --runInBand",
  "test:e2e": "jest --config ./test/jest-e2e.json --runInBand"
}
```

Replace the generated `jest` field in `apps/api/package.json` with the ESM-compatible configuration:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "extensionsToTreatAsEsm": [".ts"],
  "moduleNameMapper": {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  "transform": {
    "^.+\\.ts$": [
      "ts-jest",
      {
        "useESM": true,
        "tsconfig": "<rootDir>/../tsconfig.json"
      }
    ]
  },
  "collectCoverageFrom": ["**/*.ts"],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node"
}
```

In the Nest-generated `eslint.config.mjs`, set the first ignore block to:

```js
{
  ignores: [
    "eslint.config.mjs",
    "dist/**",
    "coverage/**",
    "src/generated/prisma/**",
  ],
}
```

Generated Prisma source remains part of the TypeScript build but is never linted or formatted as handwritten source.

- [ ] **Step 3: Write failing environment parser tests**

Create `apps/api/src/config/environment.spec.ts`:

```ts
import { validateEnvironment } from "./environment.js";

const validEnvironment = {
  NODE_ENV: "test",
  API_PORT: "4000",
  WEB_ORIGIN: "http://localhost:3000",
  DATABASE_URL: "postgresql://haetteum:local@localhost:5432/haetteum",
};

describe("validateEnvironment", () => {
  it("parses and types the API environment", () => {
    expect(validateEnvironment(validEnvironment)).toMatchObject({
      NODE_ENV: "test",
      API_PORT: 4000,
      WEB_ORIGIN: "http://localhost:3000",
    });
  });

  it("rejects a missing database URL", () => {
    const { DATABASE_URL: _removed, ...invalid } = validEnvironment;
    expect(() => validateEnvironment(invalid)).toThrow("DATABASE_URL");
  });

  it("rejects ports outside the TCP range", () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, API_PORT: "70000" }),
    ).toThrow("API_PORT");
  });
});
```

Run:

```bash
pnpm install
pnpm --filter @haetteum/api test -- environment.spec.ts
```

Expected: FAIL because `environment.ts` does not exist.

- [ ] **Step 4: Implement typed Zod startup validation**

Create `apps/api/src/config/environment.ts`:

```ts
import { z } from "zod";

const ApiEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
  API_PORT: z.coerce.number().int().min(1).max(65535),
  WEB_ORIGIN: z.string().url(),
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => value.startsWith("postgresql://"), {
      message: "DATABASE_URL must use postgresql://",
    }),
});

export type ApiEnvironment = z.infer<typeof ApiEnvironmentSchema>;

export function validateEnvironment(
  config: Record<string, unknown>,
): ApiEnvironment {
  const result = ApiEnvironmentSchema.safeParse(config);

  if (!result.success) {
    throw new Error(`Invalid API environment:\n${z.prettifyError(result.error)}`);
  }

  return result.data;
}
```

- [ ] **Step 5: Wire ConfigModule into the root module and create the listen boundary**

Create `apps/api/src/app.module.ts`:

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { validateEnvironment } from "./config/environment.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
  ],
})
export class AppModule {}
```

Create `apps/api/src/main.ts`:

```ts
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";
import type { ApiEnvironment } from "./config/environment.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const config = app.get(ConfigService<ApiEnvironment, true>);
  const port = config.get("API_PORT", { infer: true });

  await app.listen(port, "0.0.0.0");
}

void bootstrap();
```

Do not add routes in this task.

- [ ] **Step 6: Verify startup configuration behavior**

Run:

```bash
pnpm --filter @haetteum/api test -- environment.spec.ts
pnpm --filter @haetteum/api lint
pnpm --filter @haetteum/api build
```

Expected: parser tests, lint, and build pass. A start attempt without the four required variables exits before listening and includes the missing keys in the error.

---

### Task 4: Add API Versioning, CORS, Request IDs, Zod Validation, and Problem Details

**Files:**
- Create: `apps/api/src/common/http/request-id.middleware.ts`
- Test: `apps/api/src/common/http/request-id.middleware.spec.ts`
- Create: `apps/api/src/common/http/zod-validation.pipe.ts`
- Test: `apps/api/src/common/http/zod-validation.pipe.spec.ts`
- Create: `apps/api/src/common/http/problem-details.filter.ts`
- Test: `apps/api/src/common/http/problem-details.filter.spec.ts`
- Create: `apps/api/src/configure-app.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`

**Interfaces:**
- Consumes: `ProblemDetailsSchema`, `ValidationIssue`, `ApiEnvironment`, and Nest `INestApplication`.
- Produces: `RequestWithId`, `RequestIdMiddleware`, `ZodValidationPipe<T>`, `ProblemDetailsFilter`, and `configureApp(app)`.

- [ ] **Step 1: Write failing request ID middleware tests**

Create the test around a minimal Express-shaped request and response:

```ts
import { RequestIdMiddleware } from "./request-id.middleware.js";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("RequestIdMiddleware", () => {
  it("owns one UUID across the request and response", () => {
    const request = {} as never;
    const response = { setHeader: jest.fn() } as never;
    const next = jest.fn();

    new RequestIdMiddleware().use(request, response, next);

    const requestId = (request as { requestId: string }).requestId;
    expect(requestId).toMatch(UUID_V4);
    expect((response as { setHeader: jest.Mock }).setHeader).toHaveBeenCalledWith(
      "X-Request-Id",
      requestId,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});
```

Run:

```bash
pnpm --filter @haetteum/api test -- request-id.middleware.spec.ts
```

Expected: FAIL because the middleware does not exist.

- [ ] **Step 2: Implement server-owned request IDs**

Create the middleware around Node's built-in UUID generator:

```ts
import { randomUUID } from "node:crypto";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

export type RequestWithId = Request & { requestId: string };

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: RequestWithId, response: Response, next: NextFunction): void {
    const requestId = randomUUID();
    request.requestId = requestId;
    response.setHeader("X-Request-Id", requestId);
    next();
  }
}
```

Register it for all routes through `AppModule implements NestModule`:

```ts
configure(consumer: MiddlewareConsumer): void {
  consumer
    .apply(RequestIdMiddleware)
    .forRoutes({ path: "{*splat}", method: RequestMethod.ALL });
}
```

The named wildcard is required by NestJS 11's Express 5 route matching and includes the root path. Do not trust an incoming client-supplied request ID.

- [ ] **Step 3: Write failing Zod validation pipe tests**

Create `zod-validation.pipe.spec.ts` with `z.object({ name: z.string().min(1) })`. Assert that `{ name: "제주" }` is returned unchanged and `{ name: "" }` throws `BadRequestException` with this response payload:

```ts
{
  code: "VALIDATION_ERROR",
  detail: "요청값이 올바르지 않습니다.",
  errors: [{ path: "body.name", message: expect.any(String) }],
}
```

Run the focused test and expect failure before implementation.

- [ ] **Step 4: Implement `ZodValidationPipe<T>`**

Create `apps/api/src/common/http/zod-validation.pipe.ts`:

```ts
import {
  BadRequestException,
  type ArgumentMetadata,
  type PipeTransform,
} from "@nestjs/common";
import type { z } from "zod";

export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: z.ZodType<T>) {}

  transform(value: unknown, metadata: ArgumentMetadata): T {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    throw new BadRequestException({
      code: "VALIDATION_ERROR",
      detail: "요청값이 올바르지 않습니다.",
      errors: result.error.issues.map((issue) => ({
        path: [metadata.type, ...issue.path].join("."),
        message: issue.message,
      })),
    });
  }
}
```

- [ ] **Step 5: Write failing Problem Details filter tests**

Create one test for each exact case:

1. `BadRequestException` with validation extensions becomes status 400, `content-type: application/problem+json`, `type: about:blank`, `title: Bad Request`, and retains safe `errors`.
2. `NotFoundException` becomes `code: NOT_FOUND` and uses `request.originalUrl` as `instance`.
3. A raw `Error("DATABASE_URL=secret")` becomes status 500 with `code: INTERNAL_SERVER_ERROR`, a generic Korean detail, and no secret text.

Use this response/host shape so the assertions exercise the actual serialized body:

```ts
const json = jest.fn();
const type = jest.fn().mockReturnValue({ json });
const status = jest.fn().mockReturnValue({ type });
const request = {
  requestId: "f2e09553-1b48-40de-8d6e-a3d68a0d9636",
  originalUrl: "/api/v1/missing",
};
const host = {
  switchToHttp: () => ({
    getRequest: () => request,
    getResponse: () => ({ status }),
  }),
} as never;
```

After `filter.catch(exception, host)`, assert calls to `status`, `type`, and `json` for the three cases above.

- [ ] **Step 6: Implement the global Problem Details filter**

Use `node:http` `STATUS_CODES` for titles and these default codes:

```ts
const DEFAULT_ERROR_CODES: Record<number, string> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "UNPROCESSABLE_ENTITY",
  429: "TOO_MANY_REQUESTS",
  500: "INTERNAL_SERVER_ERROR",
  503: "SERVICE_UNAVAILABLE",
};
```

Implement `catch(exception, host)` with this fixed flow:

```ts
const http = host.switchToHttp();
const request = http.getRequest<RequestWithId>();
const response = http.getResponse<Response>();
const status =
  exception instanceof HttpException
    ? exception.getStatus()
    : HttpStatus.INTERNAL_SERVER_ERROR;
const exceptionBody =
  exception instanceof HttpException ? exception.getResponse() : undefined;
const extensions =
  typeof exceptionBody === "object" && exceptionBody !== null
    ? (exceptionBody as Record<string, unknown>)
    : {};
const safeIssues = z.array(ValidationIssueSchema).safeParse(extensions.errors);
const title = STATUS_CODES[status] ?? "Error";

const problem = ProblemDetailsSchema.parse({
  type: "about:blank",
  title,
  status,
  detail:
    status >= 500
      ? "서버에서 요청을 처리하지 못했습니다."
      : typeof extensions.detail === "string"
        ? extensions.detail
        : title,
  instance: request.originalUrl,
  code:
    typeof extensions.code === "string" && /^[A-Z][A-Z0-9_]*$/.test(extensions.code)
      ? extensions.code
      : (DEFAULT_ERROR_CODES[status] ?? "HTTP_ERROR"),
  requestId: request.requestId ?? randomUUID(),
  errors: safeIssues.success ? safeIssues.data : undefined,
});

if (status >= 500) {
  this.logger.error(
    `requestId=${problem.requestId}`,
    exception instanceof Error ? exception.stack : undefined,
  );
}

response.status(status).type("application/problem+json").json(problem);
```

The file imports `randomUUID`, `STATUS_CODES`, Nest exception primitives, Express `Response`, Zod, both shared schemas, and `RequestWithId`. Decorate the class with `@Catch()` and keep a private Nest `Logger`.

- [ ] **Step 7: Configure the application boundary once**

Create `configureApp(app: INestApplication): void`:

```ts
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService<ApiEnvironment, true>);

  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });
  app.enableCors({
    origin: [config.get("WEB_ORIGIN", { infer: true })],
    credentials: true,
  });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.enableShutdownHooks();
}
```

Call `configureApp(app)` from `main.ts` before `listen`. Export it so e2e tests can apply exactly the production HTTP boundary.
When making this change, remove the direct `app.enableShutdownHooks()` call added in Task 3 because `configureApp` now owns that setup.

- [ ] **Step 8: Verify all HTTP-foundation units**

Run:

```bash
pnpm --filter @haetteum/api test -- request-id.middleware.spec.ts zod-validation.pipe.spec.ts problem-details.filter.spec.ts
pnpm --filter @haetteum/api lint
pnpm --filter @haetteum/api build
```

Expected: all focused tests, lint, and build pass.

---

### Task 5: Add Docker PostgreSQL and Prisma 7

**Files:**
- Create: `.env.example`
- Create: `compose.yaml`
- Create: `apps/api/.env.example`
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma.config.ts`
- Create: `apps/api/src/prisma/prisma.module.ts`
- Create: `apps/api/src/prisma/prisma.service.ts`
- Test: `apps/api/src/prisma/prisma.service.spec.ts`
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/app.module.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: validated `DATABASE_URL`; Docker environment keys `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`.
- Produces: `PrismaService`, globally exported `PrismaModule`, generated Prisma Client, and root DB lifecycle scripts.

- [ ] **Step 1: Create the committed environment examples**

Create root `.env.example`:

```dotenv
POSTGRES_DB=haetteum
POSTGRES_USER=haetteum
POSTGRES_PASSWORD=local-development-only
POSTGRES_PORT=5432
```

Create `apps/api/.env.example`:

```dotenv
NODE_ENV=development
API_PORT=4000
WEB_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://haetteum:local-development-only@localhost:5432/haetteum
```

- [ ] **Step 2: Write the PostgreSQL-only Compose service**

Create `compose.yaml`:

```yaml
services:
  postgres:
    image: postgres:18.4-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - haetteum_postgres_data:/var/lib/postgresql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 5s

volumes:
  haetteum_postgres_data:
```

PostgreSQL 18 changed the official image's `PGDATA` to `/var/lib/postgresql/18/docker` and its declared volume to `/var/lib/postgresql`; do not use the pre-18 `/var/lib/postgresql/data` mount target.

Copy examples to ignored local files only when absent:

```bash
test -f .env || cp .env.example .env
test -f apps/api/.env || cp apps/api/.env.example apps/api/.env
```

- [ ] **Step 3: Add exact Prisma dependencies and scripts**

Pin runtime packages `@prisma/adapter-pg`, `@prisma/client`, and dev package `prisma` to `7.9.1`; pin `pg` to `8.23.0`, `@types/pg` to `8.23.1`, and `dotenv` to `17.4.2`.

Add API scripts:

```json
{
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:deploy": "prisma migrate deploy",
  "db:studio": "prisma studio"
}
```

Make API `prebuild`, `pretest`, and `pretest:e2e` build `@haetteum/contracts` and run `db:generate` before their main command.

- [ ] **Step 4: Configure Prisma 7 without a fake model**

Create `apps/api/prisma/schema.prisma`:

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "esm"
  runtime      = "nodejs"
}

datasource db {
  provider = "postgresql"
}
```

Create `apps/api/prisma.config.ts`:

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
```

Run `pnpm --filter @haetteum/api db:generate`. Expected: generated Client appears under ignored `apps/api/src/generated/prisma`; no migration file or domain table is created.

- [ ] **Step 5: Write a failing Prisma lifecycle unit test**

Create `prisma.service.spec.ts` using a typed fake ConfigService and method spies:

```ts
const config = {
  get: jest.fn().mockReturnValue(
    "postgresql://haetteum:local@localhost:5432/haetteum",
  ),
} as never;

const service = new PrismaService(config);
const connect = jest.spyOn(service, "$connect").mockResolvedValue();
const disconnect = jest.spyOn(service, "$disconnect").mockResolvedValue();

await service.onModuleInit();
await service.onModuleDestroy();

expect(config.get).toHaveBeenCalledWith("DATABASE_URL", { infer: true });
expect(connect).toHaveBeenCalledTimes(1);
expect(disconnect).toHaveBeenCalledTimes(1);
```

Run the focused test and expect failure before `PrismaService` exists.

- [ ] **Step 6: Implement the Prisma module and service**

Create `apps/api/src/prisma/prisma.service.ts`:

```ts
import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client.js";
import type { ApiEnvironment } from "../config/environment.js";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(config: ConfigService<ApiEnvironment, true>) {
    const connectionString = config.get("DATABASE_URL", { infer: true });
    super({ adapter: new PrismaPg({ connectionString }) });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
```

Create `apps/api/src/prisma/prisma.module.ts`:

```ts
import { Global, Module } from "@nestjs/common";

import { PrismaService } from "./prisma.service.js";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

Import `PrismaModule` in `AppModule` after `ConfigModule`.

- [ ] **Step 7: Add root database commands**

Add these root scripts:

```json
{
  "db:up": "docker compose up -d --wait postgres",
  "db:down": "docker compose down",
  "db:generate": "pnpm --filter @haetteum/api db:generate",
  "db:migrate": "pnpm --filter @haetteum/api db:migrate",
  "db:deploy": "pnpm --filter @haetteum/api db:deploy",
  "db:studio": "pnpm --filter @haetteum/api db:studio"
}
```

Do not add a volume-deleting reset script.

- [ ] **Step 8: Verify Compose, generation, and real connectivity**

Run:

```bash
docker compose config
pnpm db:up
docker compose ps
pnpm db:generate
pnpm --filter @haetteum/api test -- prisma.service.spec.ts
```

Expected: Compose config is valid, PostgreSQL reports healthy, Prisma generation succeeds, and lifecycle tests pass. If Docker remains unavailable, report Task 5 integration verification as blocked rather than claiming success.

---

### Task 6: Implement the Database-Backed Health Endpoint

**Files:**
- Create: `apps/api/src/health/health.module.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Test: `apps/api/src/health/health.controller.spec.ts`
- Modify: `apps/api/package.json`
- Modify: `apps/api/src/app.module.ts`

**Interfaces:**
- Consumes: `HealthCheckService`, `PrismaHealthIndicator`, and `PrismaService`.
- Produces: `GET /api/v1/health`, returning a direct Terminus success body or a globally translated 503 Problem Details body.

- [ ] **Step 1: Add and pin Terminus**

Add `@nestjs/terminus: 11.1.1` to API runtime dependencies.

- [ ] **Step 2: Write the failing health controller unit test**

Create `health.controller.spec.ts` with a fake `HealthCheckService` that executes the supplied indicator and normalizes the result exactly as Terminus does:

```ts
const up = { database: { status: "up" as const } };
const health = {
  check: jest.fn(async (indicators: Array<() => Promise<typeof up>>) => {
    const result = await indicators[0]();
    return { status: "ok", info: result, error: {}, details: result };
  }),
};
const prismaHealth = { pingCheck: jest.fn().mockResolvedValue(up) };
const prisma = {};

const controller = new HealthController(
  health as never,
  prismaHealth as never,
  prisma as never,
);

await expect(controller.check()).resolves.toEqual({
  status: "ok",
  info: up,
  error: {},
  details: up,
});
expect(prismaHealth.pingCheck).toHaveBeenCalledWith(
  "database",
  prisma,
  { timeout: 1000 },
);
```

The asserted direct response is:

```ts
{
  status: "ok",
  info: { database: { status: "up" } },
  error: {},
  details: { database: { status: "up" } },
}
```

Run the focused test and expect failure because the health files do not exist.

- [ ] **Step 3: Implement the versioned controller**

Create `HealthController` with `@Controller({ path: "health", version: "1" })`, `@Get()`, and `@HealthCheck()`. Its `check()` method returns:

```ts
return this.health.check([
  () =>
    this.prismaHealth.pingCheck("database", this.prisma, {
      timeout: 1000,
    }),
]);
```

Do not add a duplicated API-self indicator or a database URL to the result.

- [ ] **Step 4: Compose `HealthModule`**

Import `TerminusModule`, register `HealthController`, and import `HealthModule` in `AppModule`. Do not expose an unversioned `/health` path.

- [ ] **Step 5: Verify the unit and build boundary**

Run:

```bash
pnpm --filter @haetteum/api test -- health.controller.spec.ts
pnpm --filter @haetteum/api lint
pnpm --filter @haetteum/api build
```

Expected: focused test, lint, Prisma generation hook, and Nest build pass.

---

### Task 7: Add HTTP and Database Integration Tests

**Files:**
- Create: `apps/api/test/set-test-env.ts`
- Create: `apps/api/test/jest-e2e.json`
- Create: `apps/api/test/app.e2e-spec.ts`
- Modify: `apps/api/package.json`

**Interfaces:**
- Consumes: `AppModule`, `configureApp(app)`, real local PostgreSQL, shared response schemas.
- Produces: executable proof for health success, Problem Details 404/503, request IDs, and CORS behavior.

- [ ] **Step 1: Establish deterministic test environment defaults**

Create `test/set-test-env.ts` that assigns these values only when the key is absent:

```ts
process.env.NODE_ENV ??= "test";
process.env.API_PORT ??= "4001";
process.env.WEB_ORIGIN ??= "http://localhost:3000";
process.env.DATABASE_URL ??=
  "postgresql://haetteum:local-development-only@localhost:5432/haetteum";
```

Create `test/jest-e2e.json`:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "..",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "setupFiles": ["<rootDir>/test/set-test-env.ts"],
  "extensionsToTreatAsEsm": [".ts"],
  "moduleNameMapper": {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  "transform": {
    "^.+\\.ts$": [
      "ts-jest",
      {
        "useESM": true,
        "tsconfig": "<rootDir>/tsconfig.json"
      }
    ]
  }
}
```

- [ ] **Step 2: Write a failing real-health e2e test**

Create an application from `Test.createTestingModule({ imports: [AppModule] })`, apply `configureApp(app)`, and call `app.init()`. Assert:

```ts
const response = await request(app.getHttpServer())
  .get("/api/v1/health")
  .expect(200);

expect(HealthResponseSchema.parse(response.body).status).toBe("ok");
expect(response.body.details.database.status).toBe("up");
expect(response.headers["x-request-id"]).toMatch(
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
);
```

Run with PostgreSQL healthy. Expected: FAIL until all application middleware and health wiring are correct.

- [ ] **Step 3: Add 404 and CORS e2e assertions**

Add these assertions to `app.e2e-spec.ts`:

```ts
const missing = await request(app.getHttpServer())
  .get("/api/v1/missing")
  .expect(404)
  .expect("content-type", /application\/problem\+json/);

const problem = ProblemDetailsSchema.parse(missing.body);
expect(problem.code).toBe("NOT_FOUND");
expect(problem.requestId).toBe(missing.headers["x-request-id"]);
expect(JSON.stringify(problem)).not.toContain("stack");

await request(app.getHttpServer())
  .options("/api/v1/health")
  .set("Origin", "http://localhost:3000")
  .set("Access-Control-Request-Method", "GET")
  .expect("access-control-allow-origin", "http://localhost:3000")
  .expect("access-control-allow-credentials", "true");

const untrusted = await request(app.getHttpServer())
  .options("/api/v1/health")
  .set("Origin", "https://untrusted.example")
  .set("Access-Control-Request-Method", "GET");
expect(untrusted.headers["access-control-allow-origin"]).toBeUndefined();
```

- [ ] **Step 4: Add a deterministic 503 e2e case**

Build a second testing module overriding `PrismaHealthIndicator`:

```ts
const downModule = await Test.createTestingModule({ imports: [AppModule] })
  .overrideProvider(PrismaHealthIndicator)
  .useValue({
    pingCheck: jest
      .fn()
      .mockResolvedValue({ database: { status: "down" } }),
  })
  .compile();
const downApp = downModule.createNestApplication();
configureApp(downApp);
await downApp.init();

const response = await request(downApp.getHttpServer())
  .get("/api/v1/health")
  .expect(503);
const problem = ProblemDetailsSchema.parse(response.body);
expect(problem.code).toBe("SERVICE_UNAVAILABLE");
expect(JSON.stringify(problem)).not.toMatch(/DATABASE_URL|SELECT|postgresql:\/\//);

await downApp.close();
```

- [ ] **Step 5: Run the complete API test layers**

Run:

```bash
pnpm db:up
pnpm --filter @haetteum/api test
pnpm --filter @haetteum/api test:e2e
```

Expected: all unit and e2e tests pass against PostgreSQL 18.4.

- [ ] **Step 6: Verify a real post-start database outage and restore it**

Start the API with PostgreSQL healthy, verify 200, then execute the following in a separate shell while keeping the API process alive:

```bash
curl --fail --silent http://localhost:4000/api/v1/health
docker compose stop postgres
curl --silent --output /tmp/haetteum-health-down.json --write-out "%{http_code}\n" http://localhost:4000/api/v1/health
docker compose start postgres
docker compose up -d --wait postgres
curl --fail --silent http://localhost:4000/api/v1/health
```

Expected: first and last requests return 200; the middle request prints 503 and its saved body validates as Problem Details. Always restore PostgreSQL before ending the step.

---

### Task 8: Complete Root Orchestration, Documentation, and Full Verification

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-20-nestjs-monorepo-foundation-design.md` only if implementation evidence forces a factual correction
- Verify: all workspace packages and existing user changes

**Interfaces:**
- Consumes: all deliverables from Tasks 1–7.
- Produces: documented one-command workspace checks and final evidence that the foundation works without domain scope creep.

- [ ] **Step 1: Finalize root orchestration scripts**

The final root scripts must be:

```json
{
  "dev": "pnpm --filter @haetteum/contracts build && pnpm db:generate && pnpm --parallel --stream --filter @haetteum/web --filter @haetteum/api dev",
  "dev:web": "pnpm --filter @haetteum/web dev",
  "dev:api": "pnpm --filter @haetteum/contracts build && pnpm db:generate && pnpm --filter @haetteum/api dev",
  "build": "pnpm --filter @haetteum/contracts build && pnpm --filter @haetteum/api build && pnpm --filter @haetteum/web build",
  "lint": "pnpm -r --if-present lint",
  "test": "pnpm -r --if-present test",
  "test:e2e": "pnpm --filter @haetteum/api test:e2e",
  "db:up": "docker compose up -d --wait postgres",
  "db:down": "docker compose down",
  "db:generate": "pnpm --filter @haetteum/api db:generate",
  "db:migrate": "pnpm --filter @haetteum/api db:migrate",
  "db:deploy": "pnpm --filter @haetteum/api db:deploy",
  "db:studio": "pnpm --filter @haetteum/api db:studio"
}
```

Check that the recursive `lint` and `test` commands do not recursively execute the root package; pnpm's workspace-root exclusion must remain in effect.

- [ ] **Step 2: Rewrite README for a first-time developer**

Document, in this order:

1. exact prerequisites: Node 24.19.0, pnpm 10.33.0, Docker with Compose;
2. `nvm use` and `pnpm install`;
3. copying both root and API env examples without exposing production secrets;
4. `pnpm db:up`, `pnpm db:generate`, `pnpm dev`;
5. URLs for web 3000, API 4000, and `/api/v1/health`;
6. workspace directory ownership;
7. every root script and the fact that `db:down` preserves volume data;
8. the absence of domain tables/migrations in this foundation phase.

- [ ] **Step 3: Run the full static and automated suite**

Run under Node 24.19.0:

```bash
test "$(node --version)" = "v24.19.0"
test "$(pnpm --version)" = "10.33.0"
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

Expected: all commands pass with no warning promoted to failure.

- [ ] **Step 4: Run both development servers and smoke the public addresses**

Run `pnpm dev` in a persistent terminal. In a second terminal:

```bash
curl --fail --silent --show-error http://127.0.0.1:3000/ | rg "Haetteum"
curl --fail --silent --show-error http://127.0.0.1:4000/api/v1/health
```

Expected: web returns HTTP 200 and existing content; API returns HTTP 200 and a health body with `database.status: up`. Stop only the application processes after evidence is recorded.

- [ ] **Step 5: Confirm generated-file and scope hygiene**

Run:

```bash
git status --short
test ! -e CLAUDE.md
test -f AGENTS.md
test -f apps/web/AGENTS.md
test ! -e apps/api/prisma/migrations
git check-ignore apps/web/.next apps/api/dist packages/contracts/dist apps/api/src/generated/prisma apps/api/.env .env
if git check-ignore .env.example apps/api/.env.example apps/web/.env.example; then exit 1; fi
```

Expected: generated/private paths are ignored; all three `.env.example` files are visible to Git; no auth, domain, migration, deployment, or CI files were added.

- [ ] **Step 6: Stop PostgreSQL without deleting data and report evidence**

Run:

```bash
pnpm db:down
docker volume ls --format '{{.Name}}' | rg "haetteum_postgres_data"
```

Expected: containers stop and the named volume remains. Report each verification command and its outcome, plus any unrelated pre-existing failure. Do not create a commit.

---

## Execution Stop Conditions

- Stop before Task 1 implementation if Node.js 24.19.0 cannot be activated.
- Tasks 1–4 may be planned/reviewed without Docker, but Task 5 integration onward cannot be claimed complete without a working Docker Compose runtime.
- Stop and report if moving the existing web app changes test behavior or loses any dirty file.
- Stop and ask for scope expansion before adding any authentication or travel-domain table/endpoint.
- Never resolve a port conflict by killing an unidentified process; inspect the listener and report it first.
- Never use `docker compose down --volumes`, `docker volume rm`, or an equivalent data-deleting command.

## Official References

- Node.js releases: https://nodejs.org/en/about/previous-releases
- PostgreSQL versioning: https://www.postgresql.org/support/versioning/
- PostgreSQL official Docker image PGDATA: https://github.com/docker-library/docs/blob/master/postgres/content.md
- NestJS Workspaces: https://docs.nestjs.com/cli/monorepo
- NestJS Configuration: https://docs.nestjs.com/techniques/configuration
- NestJS 11 migration guide: https://docs.nestjs.com/migration-guide
- NestJS URI Versioning: https://docs.nestjs.com/techniques/versioning
- NestJS CORS: https://docs.nestjs.com/security/cors
- NestJS Health Checks: https://docs.nestjs.com/recipes/terminus
- Prisma NestJS guide: https://docs.prisma.io/docs/guides/frameworks/nestjs
- Prisma Client generation: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client
- RFC 9457: https://www.rfc-editor.org/rfc/rfc9457.html
