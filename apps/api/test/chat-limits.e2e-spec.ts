import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import type { Server } from "node:http";
import { ConfigService } from "@nestjs/config";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import request from "supertest";
import { AuthCookieService } from "../src/auth/auth-cookie.service.js";
import { SessionService } from "../src/auth/session.service.js";
import { SameOriginGuard } from "../src/auth/same-origin.guard.js";
import { ChatAccessService } from "../src/chat/chat-access.service.js";
import { ChatController } from "../src/chat/chat.controller.js";
import { CHAT_LLM_PORT, type ChatLlmPort } from "../src/chat/chat.constants.js";
import {
  CHAT_QUOTA_CLOCK,
  ChatQuotaService,
} from "../src/chat/chat-quota.service.js";
import { ChatService } from "../src/chat/chat.service.js";
import { configureApp } from "../src/configure-app.js";
import type { ApiEnvironment } from "../src/config/environment.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

// Own schema only: never migrate, truncate or drop the developer's application tables.
const schema = `chat_test_${randomUUID().replaceAll("-", "")}`;
const origin = "http://localhost:3000";
const body = { messages: [{ role: "user", content: "서울 여행" }] };
let pool: Pool;
let prisma: PrismaClient;
let schemaCreated = false;
let app: INestApplication;
let now: number;
let enabled: boolean;
let failProvider: boolean;
let providerError: Error;
let partialBeforeFailure: boolean;
let providerCalls: number;
let quota: ChatQuotaService;
let config: ConfigService<ApiEnvironment, true>;

beforeAll(async () => {
  const database = new URL(process.env.DATABASE_URL!);
  if (!["localhost", "127.0.0.1"].includes(database.hostname))
    throw new Error("Chat integration tests require a local database");
  pool = new Pool({ connectionString: database.toString() });
  await pool.query(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(
      readFileSync(
        new URL(
          "../prisma/migrations/20260911093000_add_chat_daily_usage/migration.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
  } finally {
    client.release();
  }
  database.searchParams.set("options", `-c search_path=${schema}`);
  config = new ConfigService({
    DATABASE_URL: database.toString(),
    NODE_ENV: "test",
    WEB_ORIGIN: origin,
  });
  prisma = new PrismaClient({
    adapter: new PrismaPg(
      { connectionString: database.toString() },
      { schema },
    ),
  });
  await prisma.$connect();
  // Both generated queries and raw quota SQL must be confined to our unique schema.
  const scope = await prisma.$queryRaw<
    { schema: string; table: string }[]
  >`SELECT current_schema() AS schema, to_regclass('chat_daily_usage')::text AS table`;
  if (scope[0]?.schema !== schema || scope[0]?.table !== "chat_daily_usage")
    throw new Error("Test database schema isolation failed");
  const llm: ChatLlmPort = {
    isConfigured: () => enabled,
    complete: () => {
      providerCalls++;
      return failProvider
        ? Promise.reject(providerError)
        : Promise.resolve("추천");
    },
    stream: async function* () {
      providerCalls++;
      if (failProvider) {
        if (partialBeforeFailure) yield "부분 답변";
        throw providerError;
      }
      yield await Promise.resolve("추천");
    },
  };
  const module = await Test.createTestingModule({
    controllers: [ChatController],
    providers: [
      ChatService,
      ChatAccessService,
      ChatQuotaService,
      AuthCookieService,
      SameOriginGuard,
      { provide: ConfigService, useValue: config },
      { provide: PrismaService, useValue: prisma },
      { provide: CHAT_LLM_PORT, useValue: llm },
      { provide: CHAT_QUOTA_CLOCK, useValue: () => now },
      {
        provide: SessionService,
        useValue: {
          resolve: (token: string) =>
            Promise.resolve(
              token === "valid" || token === "another-device"
                ? { userId: "real-user", refreshedExpiresAt: null }
                : null,
            ),
        },
      },
    ],
  }).compile();
  app = module.createNestApplication();
  app.useLogger(false);
  configureApp(app);
  await app.init();
  await app.listen(0, "127.0.0.1");
  quota = app.get(ChatQuotaService);
});

beforeEach(async () => {
  now = Date.parse("2026-09-11T14:59:59.000Z");
  enabled = true;
  failProvider = false;
  providerError = new Error("private AWS provider details");
  partialBeforeFailure = false;
  providerCalls = 0;
  await prisma.chatDailyUsage.deleteMany();
});

afterAll(async () => {
  if (app) await app.close();
  if (prisma) await prisma.$disconnect();
  if (pool) {
    try {
      if (schemaCreated) await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
    } finally {
      await pool.end();
    }
  }
});

function send(stream = false, token?: string) {
  const call = request(app.getHttpServer() as Server)
    .post(`/api/v1/chat/messages${stream ? "/stream" : ""}`)
    .set("Origin", origin);
  if (token) call.set("Cookie", `haetteum_session=${token}`);
  return call;
}

it("rejects missing or invalid sessions on both routes without charging or calling the provider", async () => {
  for (const active of [true, false]) {
    enabled = active;
    for (const stream of [false, true]) {
      for (const token of [undefined, "expired"]) {
        const result = await send(stream, token)
          .send({ ...body, userId: "forged" })
          .expect(401);
        expect(result.type).toBe("application/problem+json");
        expect(result.body).toMatchObject({ code: "UNAUTHENTICATED" });
      }
    }
  }
  expect(await prisma.chatDailyUsage.count()).toBe(0);
  expect(providerCalls).toBe(0);
});

it("shares ten authenticated calls across both routes and multiple devices", async () => {
  for (let i = 0; i < 10; i++)
    await send(i % 2 === 0, i % 2 === 0 ? "valid" : "another-device")
      .send(body)
      .expect(201);
  const result = await send(true, "valid").send(body).expect(429);
  expect(result.type).toBe("application/problem+json");
  expect(result.body).toMatchObject({
    code: "CHAT_DAILY_LIMIT",
    resetsAt: "2026-09-11T15:00:00.000Z",
  });
  expect(result.headers["retry-after"]).toBeDefined();
  await send(false, "another-device").send(body).expect(429);
  expect(providerCalls).toBe(10);
});

it("admits exactly ten out of thirty simultaneous authenticated requests", async () => {
  const results = await Promise.all(
    Array.from({ length: 30 }, (_, i) => send(i % 2 === 0, "valid").send(body)),
  );
  expect(results.filter((result) => result.status === 201)).toHaveLength(10);
  expect(results.filter((result) => result.status === 429)).toHaveLength(20);
  expect(providerCalls).toBe(10);
});

it("keeps quota across service instances and resets exactly at Korean midnight", async () => {
  for (let i = 0; i < 10; i++) await quota.consume({ userId: "real-user" });
  const restarted = new ChatQuotaService(prisma as PrismaService, () => now);
  await expect(
    restarted.consume({ userId: "real-user" }),
  ).rejects.toMatchObject({ status: 429 });
  now = Date.parse("2026-09-11T15:00:00.000Z");
  await expect(restarted.consume({ userId: "real-user" })).resolves.toEqual({
    remaining: 9,
    resetsAt: "2026-09-12T15:00:00.000Z",
  });
});

it("cannot bypass login or user quota with forged user IDs and forwarding headers", async () => {
  await send()
    .set("X-Forwarded-For", "192.0.2.50")
    .send({ ...body, userId: "real-user" })
    .expect(401);
  for (let i = 0; i < 10; i++)
    await send(false, "valid")
      .set("X-Forwarded-For", `192.0.2.${i + 1}`)
      .send({ ...body, userId: `forged-${i}` })
      .expect(201);
  await send(true, "valid")
    .set("X-Forwarded-For", "192.0.2.200")
    .send({ ...body, userId: "another-user" })
    .expect(429);
  expect(await prisma.chatDailyUsage.count()).toBe(1);
  expect((await prisma.chatDailyUsage.findFirst())?.subjectKey).toBe(
    "user:real-user",
  );
});

it("does not charge invalid requests or a disabled provider but charges failed provider attempts", async () => {
  await send(false, "valid")
    .send({ messages: [{ role: "user", content: "가".repeat(2001) }] })
    .expect(400);
  enabled = false;
  await send(false, "valid").send(body).expect(503);
  await send(true, "valid").send(body).expect(503);
  expect(await prisma.chatDailyUsage.count()).toBe(0);
  enabled = true;
  failProvider = true;
  await send(false, "valid").send(body).expect(502);
  await send(true, "valid").send(body).expect(502);
  expect((await prisma.chatDailyUsage.findFirst())?.used).toBe(2);
  expect(providerCalls).toBe(2);
});

it("rejects requests from another origin before charging a logged-in user's quota", async () => {
  await send(false, "valid")
    .set("Origin", "https://untrusted.example")
    .send(body)
    .expect(403);
  expect(await prisma.chatDailyUsage.count()).toBe(0);
  expect(providerCalls).toBe(0);
});

it("removes old usage rows while retaining recent quota", async () => {
  await quota.consume({ userId: "real-user" });
  now = Date.parse("2026-09-20T01:00:00.000Z");
  await quota.consume({ userId: "real-user" });
  await quota.cleanup();
  expect(await prisma.chatDailyUsage.count()).toBe(1);
  expect((await prisma.chatDailyUsage.findFirst())?.used).toBe(1);
});

it("returns the requested input and unavailable details on both routes", async () => {
  for (const stream of [false, true]) {
    const invalid = await send(stream, "valid")
      .send({ messages: [{ role: "user", content: "가".repeat(2001) }] })
      .expect(400);
    expect(invalid.body).toMatchObject({
      code: "CHAT_INVALID_INPUT",
      detail: "질문이 너무 깁니다.",
    });
    enabled = false;
    const unavailable = await send(stream, "valid").send(body).expect(503);
    expect(unavailable.body).toMatchObject({
      code: "CHAT_UNAVAILABLE",
      detail: "현재 챗봇을 사용할 수 없습니다.",
    });
    enabled = true;
  }
  expect(providerCalls).toBe(0);
  expect(await prisma.chatDailyUsage.count()).toBe(0);
});

it.each([
  [
    502,
    "Error",
    "AI 답변 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  ],
  [
    504,
    "ModelTimeoutException",
    "답변 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요.",
  ],
] as const)(
  "returns HTTP %i before any text is sent",
  async (status, name, detail) => {
    failProvider = true;
    providerError.name = name;
    for (const stream of [false, true]) {
      const result = await send(stream, "valid").send(body).expect(status);
      expect(result.type).toBe("application/problem+json");
      expect(result.body).toMatchObject({ status, detail });
      expect(result.text).not.toContain("private AWS");
    }
    expect((await prisma.chatDailyUsage.findFirst())?.used).toBe(2);
  },
);

it.each([
  [502, "Error"],
  [504, "ModelTimeoutException"],
] as const)(
  "preserves status %i in the stream after partial text",
  async (status, name) => {
    failProvider = true;
    partialBeforeFailure = true;
    providerError.name = name;
    const result = await send(true, "valid").send(body).expect(201);
    expect(result.type).toBe("application/x-ndjson");
    const events: unknown[] = result.text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as unknown);
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({ type: "delta", text: "부분 답변" });
    expect(events[1]).toMatchObject({ type: "error", status });
    expect(result.text).not.toContain("private AWS");
  },
);
