import { createHash, randomUUID } from "node:crypto";

import type { Server } from "node:http";

import { AuthUserSchema, ProblemDetailsSchema } from "@haetteum/contracts";
import type { INestApplication, LoggerService } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaPg } from "@prisma/adapter-pg";
import { jest } from "@jest/globals";
import { Pool } from "pg";
import request, {
  type Response as SupertestResponse,
  type SuperAgentTest,
} from "supertest";

import { AppModule } from "../src/app.module.js";
import { KAKAO_AUTH_FETCH } from "../src/auth/auth.constants.js";
import {
  SESSION_REFRESH_THRESHOLD_MS,
  SESSION_TTL_MS,
} from "../src/auth/session.service.js";
import { configureApp } from "../src/configure-app.js";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

import { applyMigrations } from "./apply-migrations.js";

const AUTH_CODE = "e2e-secret-authorization-code";
const ACCESS_TOKEN = "e2e-secret-provider-access-token";
const REFRESH_TOKEN = "e2e-secret-provider-refresh-token";
const PROVIDER_BODY_SECRET = "e2e-provider-body-must-not-leak";
const CLIENT_SECRET = "kakao-client-secret-for-test";
const WEB_ORIGIN = "http://localhost:3000";
const kakaoToken = {
  token_type: "bearer",
  access_token: ACCESS_TOKEN,
  expires_in: 21_599,
  refresh_token: REFRESH_TOKEN,
  refresh_token_expires_in: 5_184_000,
  scope: "profile_nickname profile_image",
};
const kakaoUser = {
  id: 987_654_321,
  connected_at: "2026-08-26T12:00:00Z",
  properties: {
    nickname: "E2E 해뜸 여행자",
    profile_image: "https://cdn.example.test/properties-profile.jpg",
    thumbnail_image: "https://cdn.example.test/properties-thumbnail.jpg",
    private_test_value: PROVIDER_BODY_SECRET,
  },
  kakao_account: {
    profile_needs_agreement: false,
    profile: {
      nickname: "E2E 해뜸 여행자",
      thumbnail_image_url: "https://cdn.example.test/profile-thumbnail.jpg",
      profile_image_url: "https://cdn.example.test/profile.jpg",
      is_default_image: false,
      is_default_nickname: false,
    },
    has_email: false,
    email_needs_agreement: false,
    is_email_valid: false,
    is_email_verified: false,
  },
};

class CapturingLogger implements LoggerService {
  readonly entries: string[] = [];

  log(message: unknown): void {
    this.capture(message);
  }

  error(message: unknown): void {
    this.capture(message);
  }

  warn(message: unknown): void {
    this.capture(message);
  }

  debug(message: unknown): void {
    this.capture(message);
  }

  verbose(message: unknown): void {
    this.capture(message);
  }

  fatal(message: unknown): void {
    this.capture(message);
  }

  private capture(message: unknown): void {
    this.entries.push(
      typeof message === "string" ? message : JSON.stringify(message),
    );
  }
}

function getHttpServer(application: INestApplication): Server {
  return application.getHttpServer() as Server;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function responseCookies(response: SupertestResponse): string[] {
  const value = response.headers["set-cookie"] as string | string[] | undefined;
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function cookieValue(response: SupertestResponse, name: string): string {
  const cookie = responseCookies(response).find((value) =>
    value.startsWith(`${name}=`),
  );
  if (!cookie) throw new Error(`Expected ${name} Set-Cookie header`);

  return cookie.slice(name.length + 1).split(";", 1)[0] ?? "";
}

function responseEvidence(response: SupertestResponse): string {
  return JSON.stringify({
    headers: response.headers,
    text: response.text,
  });
}

describe("Kakao auth API PostgreSQL flow (e2e)", () => {
  let app: INestApplication | undefined;
  let prisma: PrismaClient | undefined;
  let adminPool: Pool | undefined;
  let schemaName: string | undefined;
  let providerUnavailable = false;
  const logger = new CapturingLogger();
  const observedResponses: SupertestResponse[] = [];
  const kakaoFetch = jest.fn<typeof globalThis.fetch>((input) => {
    const url = requestUrl(input);
    if (url === "https://kauth.kakao.com/oauth/token") {
      if (providerUnavailable) {
        return Promise.resolve(
          jsonResponse(
            {
              error: "temporarily_unavailable",
              error_description: PROVIDER_BODY_SECRET,
              error_code: "KOE_TEST",
            },
            503,
          ),
        );
      }
      return Promise.resolve(jsonResponse(kakaoToken));
    }
    if (url === "https://kapi.kakao.com/v2/user/me") {
      return Promise.resolve(jsonResponse(kakaoUser));
    }

    return Promise.reject(new Error("Unexpected fake Kakao endpoint"));
  });

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required for E2E tests");

    schemaName = `auth_e2e_${randomUUID().replaceAll("-", "")}`;
    adminPool = new Pool({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 5_000,
      query_timeout: 5_000,
    });
    const client = await adminPool.connect();
    try {
      await client.query(`CREATE SCHEMA "${schemaName}"`);
      await client.query(`SET search_path TO "${schemaName}"`);
      await applyMigrations(client);
    } finally {
      client.release();
    }

    prisma = new PrismaClient({
      adapter: new PrismaPg(
        { connectionString: databaseUrl },
        { schema: schemaName },
      ),
    });
    await prisma.$connect();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(KAKAO_AUTH_FETCH)
      .useValue(kakaoFetch)
      .compile();
    app = moduleRef.createNestApplication();
    app.useLogger(logger);
    configureApp(app);
    await app.init();
  });

  beforeEach(async () => {
    providerUnavailable = false;
    kakaoFetch.mockClear();
    observedResponses.length = 0;
    logger.entries.length = 0;
    await requirePrisma(prisma).session.deleteMany();
    await requirePrisma(prisma).user.deleteMany({
      where: { provider: "KAKAO" },
    });
  });

  afterEach(() => {
    const evidence = [
      ...observedResponses.map(responseEvidence),
      ...logger.entries,
    ].join("\n");
    for (const secret of [
      AUTH_CODE,
      ACCESS_TOKEN,
      REFRESH_TOKEN,
      PROVIDER_BODY_SECRET,
      CLIENT_SECRET,
    ]) {
      expect(evidence).not.toContain(secret);
    }
  });

  afterAll(async () => {
    const appToClose = app;
    const prismaToDisconnect = prisma;
    const poolToClose = adminPool;
    const schemaToDrop = schemaName;

    app = undefined;
    prisma = undefined;
    adminPool = undefined;
    schemaName = undefined;

    try {
      await appToClose?.close();
    } finally {
      try {
        await prismaToDisconnect?.$disconnect();
      } finally {
        try {
          if (poolToClose && schemaToDrop) {
            await poolToClose.query(`DROP SCHEMA "${schemaToDrop}" CASCADE`);
          }
        } finally {
          await poolToClose?.end();
        }
      }
    }
  });

  it("starts at Kakao with exact parameters and a callback-scoped OAuth cookie", async () => {
    const agent = newAgent(app);

    const start = observe(
      await agent
        .get("/api/v1/auth/kakao/start?returnTo=%2Freviews%3Ftab%3Dwritten")
        .expect(302),
    );
    const location = new URL(start.headers.location);

    expect(location.origin + location.pathname).toBe(
      "https://kauth.kakao.com/oauth/authorize",
    );
    expect(location.searchParams.get("state")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    location.searchParams.delete("state");
    expect(Object.fromEntries(location.searchParams)).toEqual({
      response_type: "code",
      client_id: "kakao-rest-test-key",
      redirect_uri: "http://localhost:4000/api/v1/auth/kakao/callback",
    });
    expect(responseCookies(start)).toEqual([
      expect.stringMatching(
        /^haetteum_oauth_state=[A-Za-z0-9_-]+; Max-Age=600; Path=\/api\/v1\/auth\/kakao\/callback; Expires=.*; HttpOnly; SameSite=Lax$/,
      ),
    ]);
  });

  it("creates one KAKAO user and a hash-only session, then exposes only AuthUser", async () => {
    const agent = newAgent(app);
    const callback = await login(agent, "/reviews?tab=written");
    const rawSessionToken = cookieValue(callback, "haetteum_session");
    const database = requirePrisma(prisma);

    expect(callback.headers.location).toBe(
      "http://localhost:3000/reviews?tab=written",
    );
    expect(rawSessionToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const persistedUser = await database.user.findUniqueOrThrow({
      where: {
        provider_providerUserId: {
          provider: "KAKAO",
          providerUserId: "987654321",
        },
      },
    });
    expect(persistedUser).toMatchObject({
      displayName: "E2E 해뜸 여행자",
      profileImageUrl: "https://cdn.example.test/profile.jpg",
    });
    expect(persistedUser.lastLoginAt).toBeInstanceOf(Date);

    const persistedSession = await database.session.findFirstOrThrow({
      where: { userId: persistedUser.id },
    });
    expect(persistedSession.tokenHash).toBe(
      createHash("sha256").update(rawSessionToken).digest("hex"),
    );
    expect(JSON.stringify(persistedSession)).not.toContain(rawSessionToken);

    const meResponse = observe(await agent.get("/api/v1/auth/me").expect(200));
    const me = AuthUserSchema.parse(meResponse.body as unknown);
    expect(me).toEqual({
      id: persistedUser.id,
      displayName: "E2E 해뜸 여행자",
      profileImageUrl: "https://cdn.example.test/profile.jpg",
    });
    expect(Object.keys(meResponse.body as object).sort()).toEqual([
      "displayName",
      "id",
      "profileImageUrl",
    ]);
  });

  it("refreshes expiry below the threshold and does not rewrite a fresh cookie", async () => {
    const agent = newAgent(app);
    await login(agent, "/");
    const database = requirePrisma(prisma);
    const session = await database.session.findFirstOrThrow();

    const fresh = observe(await agent.get("/api/v1/auth/me").expect(200));
    expect(
      responseCookies(fresh).some((cookie) =>
        cookie.startsWith("haetteum_session="),
      ),
    ).toBe(false);

    const nearExpiry = new Date(
      Date.now() + SESSION_REFRESH_THRESHOLD_MS - 60_000,
    );
    await database.session.update({
      where: { id: session.id },
      data: { expiresAt: nearExpiry },
    });
    const refreshedAt = Date.now();
    const refreshed = observe(await agent.get("/api/v1/auth/me").expect(200));

    expect(
      responseCookies(refreshed).some((cookie) =>
        cookie.startsWith("haetteum_session="),
      ),
    ).toBe(true);
    const persisted = await database.session.findUniqueOrThrow({
      where: { id: session.id },
    });
    expect(persisted.expiresAt.getTime()).toBeGreaterThanOrEqual(
      refreshedAt + SESSION_TTL_MS - 2_000,
    );
  });

  it("requires the exact trusted Origin before logout, then revokes and clears", async () => {
    const agent = newAgent(app);
    await login(agent, "/reviews");
    const database = requirePrisma(prisma);

    const missingOrigin = observe(
      await agent.post("/api/v1/auth/logout").expect(403),
    );
    expect(ProblemDetailsSchema.parse(missingOrigin.body as unknown).code).toBe(
      "FORBIDDEN_ORIGIN",
    );
    const mismatchedOrigin = observe(
      await agent
        .post("/api/v1/auth/logout")
        .set("Origin", "https://untrusted.example")
        .expect(403),
    );
    expect(
      ProblemDetailsSchema.parse(mismatchedOrigin.body as unknown).code,
    ).toBe("FORBIDDEN_ORIGIN");
    expect(await database.session.count()).toBe(1);

    const logout = observe(
      await agent
        .post("/api/v1/auth/logout")
        .set("Origin", WEB_ORIGIN)
        .expect(204),
    );
    expect(logout.text).toBe("");
    expect(await database.session.count()).toBe(0);
    expect(responseCookies(logout)).toEqual([
      expect.stringMatching(
        /^haetteum_session=; Path=\/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax$/,
      ),
    ]);
  });

  it("creates no session for invalid state or a fake provider failure", async () => {
    const invalidAgent = newAgent(app);
    const invalidStart = observe(
      await invalidAgent.get("/api/v1/auth/kakao/start").expect(302),
    );
    const invalidLocation = new URL(invalidStart.headers.location);
    const validState = invalidLocation.searchParams.get("state");
    if (!validState) throw new Error("Expected OAuth state");

    const invalid = observe(
      await invalidAgent
        .get("/api/v1/auth/kakao/callback")
        .query({ code: AUTH_CODE, state: "W".repeat(43) })
        .expect(302),
    );
    expect(invalid.headers.location).toBe(
      "http://localhost:3000/login?error=invalid_request",
    );
    expect(kakaoFetch).not.toHaveBeenCalled();
    expect(await requirePrisma(prisma).session.count()).toBe(0);

    providerUnavailable = true;
    const failed = await login(newAgent(app), "/reviews");
    expect(failed.headers.location).toBe(
      "http://localhost:3000/login?error=provider_unavailable",
    );
    expect(await requirePrisma(prisma).session.count()).toBe(0);
  });

  it.each([
    "https://evil.example/steal",
    "/%0A/evil.example",
    "/\r/evil.example",
    "/\n/evil.example",
    "/\t/evil.example",
  ])("sanitizes unsafe returnTo %p to the web root", async (returnTo) => {
    const callback = await login(newAgent(app), returnTo);

    expect(callback.headers.location).toBe("http://localhost:3000/");
  });

  function newAgent(application: INestApplication | undefined): SuperAgentTest {
    if (!application) throw new Error("Expected initialized application");
    return request.agent(getHttpServer(application));
  }

  function observe(response: SupertestResponse): SupertestResponse {
    observedResponses.push(response);
    return response;
  }

  async function login(
    agent: SuperAgentTest,
    returnTo: string,
  ): Promise<SupertestResponse> {
    const start = observe(
      await agent
        .get("/api/v1/auth/kakao/start")
        .query({ returnTo })
        .expect(302),
    );
    const authorizeLocation = new URL(start.headers.location);
    const state = authorizeLocation.searchParams.get("state");
    if (!state) throw new Error("Expected OAuth state");

    return observe(
      await agent
        .get("/api/v1/auth/kakao/callback")
        .query({ code: AUTH_CODE, state })
        .expect(302),
    );
  }
});

function requirePrisma(value: PrismaClient | undefined): PrismaClient {
  if (!value) throw new Error("Expected initialized Prisma client");
  return value;
}
