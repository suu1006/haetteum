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
import {
  ChatConversationListResponseSchema,
  ChatConversationMessagesResponseSchema,
  type AuthUser,
} from "@haetteum/contracts";
import { AuthCookieService } from "../src/auth/auth-cookie.service.js";
import { SessionAuthGuard } from "../src/auth/session-auth.guard.js";
import { SessionService } from "../src/auth/session.service.js";
import { SameOriginGuard } from "../src/auth/same-origin.guard.js";
import { ChatAccessService } from "../src/chat/chat-access.service.js";
import { ChatConversationService } from "../src/chat/chat-conversation.service.js";
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
const schema = `chat_conv_test_${randomUUID().replaceAll("-", "")}`;
const origin = "http://localhost:3000";
const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
let pool: Pool;
let prisma: PrismaClient;
let schemaCreated = false;
let app: INestApplication;
let now: number;

function authUser(id: string, displayName: string): AuthUser {
  return { id, displayName, profileImageUrl: null, provider: "EMAIL" };
}

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
    await client.query(
      readFileSync(
        new URL(
          "../prisma/migrations/20260912140000_chat_request_reservations/migration.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await client.query(`CREATE TABLE users (id UUID PRIMARY KEY)`);
    await client.query(
      `INSERT INTO users (id) VALUES ('${USER_A}'), ('${USER_B}')`,
    );
    // Minimal stand-ins so the chat_conversations migration's incidental
    // DROP/ADD CONSTRAINT on this unrelated table (a drift artifact from
    // Task 1's `prisma migrate dev` run) can apply in this isolated schema.
    await client.query(
      `CREATE TABLE weekly_recommendation_editions (id UUID PRIMARY KEY)`,
    );
    await client.query(`
      CREATE TABLE weekly_recommendation_candidates (
        id UUID PRIMARY KEY,
        edition_id UUID NOT NULL,
        CONSTRAINT weekly_recommendation_candidates_edition_id_fkey
          FOREIGN KEY (edition_id) REFERENCES weekly_recommendation_editions(id) ON DELETE CASCADE
      )
    `);
    await client.query(
      readFileSync(
        new URL(
          "../prisma/migrations/20260914055533_add_chat_conversations/migration.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
  } finally {
    client.release();
  }
  database.searchParams.set("options", `-c search_path=${schema}`);
  const config = new ConfigService<ApiEnvironment, true>({
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
  >`SELECT current_schema() AS schema, to_regclass('chat_conversations')::text AS table`;
  if (scope[0]?.schema !== schema || scope[0]?.table !== "chat_conversations")
    throw new Error("Test database schema isolation failed");
  const llm: ChatLlmPort = {
    isConfigured: () => true,
    complete: () => Promise.resolve("추천"),
    stream: async function* () {
      yield await Promise.resolve("추천");
    },
  };
  const module = await Test.createTestingModule({
    controllers: [ChatController],
    providers: [
      ChatService,
      ChatAccessService,
      ChatQuotaService,
      ChatConversationService,
      AuthCookieService,
      SameOriginGuard,
      SessionAuthGuard,
      { provide: ConfigService, useValue: config },
      { provide: PrismaService, useValue: prisma },
      { provide: CHAT_LLM_PORT, useValue: llm },
      { provide: CHAT_QUOTA_CLOCK, useValue: () => now },
      {
        provide: SessionService,
        useValue: {
          resolve: (token: string) =>
            Promise.resolve(
              token === "user-a"
                ? {
                    sessionId: "session-a",
                    userId: USER_A,
                    user: authUser(USER_A, "User A"),
                    refreshedExpiresAt: null,
                  }
                : token === "user-b"
                  ? {
                      sessionId: "session-b",
                      userId: USER_B,
                      user: authUser(USER_B, "User B"),
                      refreshedExpiresAt: null,
                    }
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
});

beforeEach(async () => {
  now = Date.parse("2026-09-14T05:00:00.000Z");
  await prisma.$executeRaw`DELETE FROM chat_requests`;
  await prisma.chatDailyUsage.deleteMany();
  await prisma.chatConversation.deleteMany();
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

function get(path: string, token?: string) {
  const call = request(app.getHttpServer() as Server)
    .get(`/api/v1/chat${path}`)
    .set("Origin", origin);
  if (token) call.set("Cookie", `haetteum_session=${token}`);
  return call;
}

function events(text: string): { type: string; conversationId?: string }[] {
  return text
    .trim()
    .split("\n")
    .map(
      (line) => JSON.parse(line) as { type: string; conversationId?: string },
    );
}

it("returns a conversation id and persists the exchange after a completed stream", async () => {
  const result = await send(true, "user-a")
    .send({ messages: [{ role: "user", content: "서울 여행" }] })
    .expect(201);
  const conversationId = events(result.text)[0].conversationId!;
  const conversation = await prisma.chatConversation.findUnique({
    where: { id: conversationId },
  });
  expect(conversation?.userId).toBe(USER_A);
  expect(conversation?.title).toBe("서울 여행");
  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
  expect(messages.map((m) => [m.role, m.content])).toEqual([
    ["user", "서울 여행"],
    ["assistant", "추천"],
  ]);
});

it("continues the same conversation when conversationId is supplied", async () => {
  const first = await send(true, "user-a")
    .send({ messages: [{ role: "user", content: "서울 여행" }] })
    .expect(201);
  const conversationId = events(first.text)[0].conversationId!;
  await send(true, "user-a")
    .send({
      conversationId,
      messages: [{ role: "user", content: "맛집도 알려줘" }],
    })
    .expect(201);
  expect(await prisma.chatMessage.count({ where: { conversationId } })).toBe(4);
  expect(await prisma.chatConversation.count()).toBe(1);
});

it("rejects continuing another user's conversation with 404", async () => {
  const first = await send(true, "user-a")
    .send({ messages: [{ role: "user", content: "서울 여행" }] })
    .expect(201);
  const conversationId = events(first.text)[0].conversationId!;
  await send(true, "user-b")
    .send({ conversationId, messages: [{ role: "user", content: "끼어들기" }] })
    .expect(404);
});

it("does not duplicate messages when a completed request is replayed", async () => {
  const payload = {
    requestId: randomUUID(),
    messages: [{ role: "user", content: "서울 여행" }],
  };
  await send(true, "user-a").send(payload).expect(201);
  await send(false, "user-a").send(payload).expect(201);
  expect(await prisma.chatMessage.count()).toBe(2);
  expect(await prisma.chatConversation.count()).toBe(1);
});

it("lists conversations newest-first with a preview and pagination", async () => {
  for (const content of ["첫번째", "두번째", "세번째"]) {
    await send(true, "user-a")
      .send({ messages: [{ role: "user", content }] })
      .expect(201);
  }
  const page1 = ChatConversationListResponseSchema.parse(
    (await get("/conversations?limit=2", "user-a").expect(200)).body,
  );
  expect(page1.items.map((i) => i.title)).toEqual(["세번째", "두번째"]);
  expect(page1.nextCursor).toBe(2);
  const page2 = ChatConversationListResponseSchema.parse(
    (
      await get(
        `/conversations?limit=2&cursor=${page1.nextCursor}`,
        "user-a",
      ).expect(200)
    ).body,
  );
  expect(page2.items.map((i) => i.title)).toEqual(["첫번째"]);
  expect(page2.nextCursor).toBeNull();
});

it("returns a conversation's messages for its owner and 404 for another user", async () => {
  const first = await send(true, "user-a")
    .send({ messages: [{ role: "user", content: "서울 여행" }] })
    .expect(201);
  const conversationId = events(first.text)[0].conversationId!;
  const owned = await get(
    `/conversations/${conversationId}/messages`,
    "user-a",
  ).expect(200);
  expect(ChatConversationMessagesResponseSchema.parse(owned.body)).toEqual({
    conversationId,
    messages: [
      { role: "user", content: "서울 여행" },
      { role: "assistant", content: "추천" },
    ],
  });
  await get(`/conversations/${conversationId}/messages`, "user-b").expect(404);
});

it("rejects listing and detail routes without a session", async () => {
  await get("/conversations").expect(401);
  await get(`/conversations/${randomUUID()}/messages`).expect(401);
});
