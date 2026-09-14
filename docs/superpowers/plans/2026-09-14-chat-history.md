# 챗봇 히스토리 (대화 저장 + 조회 패널) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 챗봇 대화를 PostgreSQL에 저장하고, 헤더의 시계 아이콘으로 여는 오른쪽 슬라이드 패널에서 과거 대화 목록을 조회해 이어서 대화할 수 있게 한다.

**Architecture:** 기존 stateless 챗봇 API(`ChatRequestSchema.messages` 전체 전송) 위에 `conversationId`를 얹는다. 대화 해석·생성·메시지 저장은 기존 `ChatQuotaService`의 requestId 기반 advisory-lock 트랜잭션 안에서 원자적으로 처리해 재시도로 인한 중복 생성/저장을 막는다. 조회 전용 신규 엔드포인트 2개는 기존 `SessionAuthGuard`+`@CurrentUser()` 패턴을 그대로 재사용한다.

**Tech Stack:** NestJS, Prisma(PostgreSQL), Zod(공유 contracts), Next.js(React), `@base-ui/react/dialog`, Jest(api), Vitest(contracts, web)

**Spec:** [docs/superpowers/specs/2026-09-14-chat-history-design.md](../specs/2026-09-14-chat-history-design.md)

## Global Constraints

- 기존 `POST /chat/messages` / `POST /chat/messages/stream`의 quota·idempotency 동작(일일 10회, requestId 재시도 처리)은 변경하지 않는다.
- 대화 삭제/이름변경, "새 대화" 버튼은 이번 범위에서 구현하지 않는다.
- 타인 소유 대화 접근은 항상 `404`(존재 여부 비노출).
- 신규 목록 조회 기본 `limit=12`, 최대 `30`(`place-reels`와 동일).
- 프론트 API 베이스 URL은 기존 `getApiBaseUrl()`(`apps/web/src/lib/api-base.ts`)을 재사용한다.

---

## Task 1: Prisma 스키마 — ChatConversation / ChatMessage 테이블

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: `apps/api/prisma/migrations/<timestamp>_add_chat_conversations/migration.sql` (Prisma가 생성)

**Interfaces:**
- Produces: `ChatConversation`(`id, userId, title, createdAt, updatedAt`), `ChatMessage`(`id, conversationId, role, content, createdAt`) Prisma 모델. `ChatRequestUsage.conversationId`(nullable UUID) 컬럼. 이후 모든 태스크가 이 스키마의 Prisma Client 타입(`prisma.chatConversation.*`, `prisma.chatMessage.*`)을 사용한다.

- [ ] **Step 1: `schema.prisma`에 두 모델 추가**

`ChatDailyUsage` 모델(13~21행) 바로 다음, `TourismRegion` 모델 앞에 삽입한다.

```prisma
/// 로그인 사용자별 챗봇 대화 스레드
model ChatConversation {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @map("user_id") @db.Uuid
  /// 첫 사용자 메시지에서 자동 생성. 사용자가 직접 수정하는 기능은 없음
  title     String   @db.VarChar(80)
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt DateTime @updatedAt @map("updated_at") @db.Timestamptz(3)

  user     User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  messages ChatMessage[]

  @@index([userId, updatedAt])
  @@map("chat_conversations")
}

/// ChatConversation에 속한 개별 메시지(사용자 질문 또는 어시스턴트 답변)
model ChatMessage {
  id             String   @id @default(uuid()) @db.Uuid
  conversationId String   @map("conversation_id") @db.Uuid
  role           String   @db.VarChar(20)
  content        String   @db.Text
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz(3)

  conversation ChatConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
  @@map("chat_messages")
}
```

- [ ] **Step 2: `User` 모델에 역방향 관계 추가**

`favorites`/`savedCourses` 줄 옆에 한 줄 추가한다.

```prisma
  reports          ReviewReport[]
  blocks           UserBlock[]     @relation("Blocker")
  blockedBy        UserBlock[]     @relation("BlockedUser")
  reviews          Review[]
  sessions         Session[]
  favorites        PlaceFavorite[]
  savedCourses     SavedCourse[]
  chatConversations ChatConversation[]
```

- [ ] **Step 3: `ChatRequestUsage`에 `conversationId` 컬럼 추가**

기존 모델(799~811행)의 `reply` 필드 다음 줄에 추가한다. 기존 행에는 값이 없을 수 있으므로 nullable로 둔다(캐시 재생 시 null이면 코드에서 새로 resolve하도록 Task 4에서 처리).

```prisma
model ChatRequestUsage {
  subjectKey String @map("subject_key")
  requestId String @map("request_id") @db.Uuid
  payloadHash String @map("payload_hash")
  day DateTime @db.Date
  status String @db.VarChar(20)
  attemptId String @map("attempt_id") @db.Uuid
  reply String?
  conversationId String? @map("conversation_id") @db.Uuid
  updatedAt DateTime @default(now()) @map("updated_at") @db.Timestamptz(3)
  @@id([subjectKey, requestId])
  @@index([day])
  @@map("chat_requests")
}
```

- [ ] **Step 4: 마이그레이션 생성(적용 전, 수정 목적)**

```bash
pnpm --filter @haetteum/api exec prisma migrate dev --name add_chat_conversations --create-only
```

- [ ] **Step 5: 생성된 SQL에 `role` CHECK 제약 추가**

생성된 `apps/api/prisma/migrations/<timestamp>_add_chat_conversations/migration.sql`을 열어, `chat_messages` 테이블의 `role` 컬럼 정의 줄 끝에 CHECK를 인라인으로 추가한다(기존 `chat_requests.status` CHECK 관례와 동일, `reviews_rating_check`처럼 별도 `ALTER TABLE`로 추가해도 무방). 예:

```sql
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);
```
위 `"role" VARCHAR(20) NOT NULL,` 줄을 아래로 교체:
```sql
    "role" VARCHAR(20) NOT NULL CHECK ("role" IN ('user', 'assistant')),
```

- [ ] **Step 6: 마이그레이션 적용 및 클라이언트 재생성**

```bash
pnpm --filter @haetteum/api db:migrate
pnpm db:generate
```

- [ ] **Step 7: 타입 검증**

```bash
pnpm --filter @haetteum/api build
```
Expected: 컴파일 오류 없음(아직 `prisma.chatConversation`/`prisma.chatMessage`를 쓰는 코드는 없으므로 스키마 변경만으로 실패하지 않아야 함).

- [ ] **Step 8: 커밋**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(api): add chat_conversations and chat_messages tables"
```

---

## Task 2: 공유 계약 — conversationId, meta 이벤트, 히스토리 스키마

**Files:**
- Modify: `packages/contracts/src/chat.ts`
- Modify: `packages/contracts/src/chat-errors.ts`
- Create: `packages/contracts/src/chat-conversations.ts`
- Modify: `packages/contracts/src/index.ts`
- Test: `packages/contracts/src/chat.test.ts` (추가)
- Test: `packages/contracts/src/chat-errors.test.ts` (신규)
- Test: `packages/contracts/src/chat-conversations.test.ts` (신규)

**Interfaces:**
- Produces: `ChatRequestSchema`에 `conversationId?: string`, `ChatResponseSchema`에 `conversationId: string`. `ChatStreamEventSchema`에 `{type:"meta", conversationId}` variant. `ListChatConversationsQuerySchema`, `ChatConversationSummarySchema`, `ChatConversationListResponseSchema`, `ChatConversationIdParamsSchema`, `ChatConversationMessagesResponseSchema`, 상수 `CHAT_CONVERSATIONS_DEFAULT_LIMIT`/`CHAT_CONVERSATIONS_MAX_LIMIT`.이후 백엔드 컨트롤러(Task 6)와 프론트 API 클라이언트(Task 9)가 이 타입들을 그대로 import한다.

- [ ] **Step 1: 실패하는 테스트 작성 — `ChatRequestSchema`/`ChatResponseSchema`에 `conversationId`**

`packages/contracts/src/chat.test.ts` 맨 아래에 추가:

```ts
it("accepts an optional conversationId and rejects a malformed one", () => {
  expect(
    ChatRequestSchema.safeParse({
      messages: [{ role: "user", content: "질문" }],
      conversationId: "11111111-1111-4111-8111-111111111111",
    }).success,
  ).toBe(true);
  expect(
    ChatRequestSchema.safeParse({
      messages: [{ role: "user", content: "질문" }],
      conversationId: "not-a-uuid",
    }).success,
  ).toBe(false);
});

it("requires a conversationId in the response", () => {
  expect(
    ChatResponseSchema.safeParse({ status: "ready", reply: "답변" }).success,
  ).toBe(false);
  expect(
    ChatResponseSchema.safeParse({
      status: "ready",
      reply: "답변",
      conversationId: "11111111-1111-4111-8111-111111111111",
    }).success,
  ).toBe(true);
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
pnpm --filter @haetteum/contracts test -- chat.test.ts
```
Expected: FAIL — `conversationId` 필드가 스키마에 없어 위 두 테스트가 실패.

- [ ] **Step 3: `chat.ts`에 필드 추가**

```ts
export const ChatRequestSchema = z.object({
  requestId: z.uuid().optional(),
  conversationId: z.uuid().optional(),
  messages: z.array(ChatMessageSchema).min(1).max(101).refine(
    (messages) => messages.length % 2 === 1 && messages.every((message, index) => message.role === (index % 2 === 0 ? "user" : "assistant")),
    "대화는 사용자 질문과 답변이 번갈아 나오고 사용자 질문으로 끝나야 합니다.",
  ),
});

export const ChatResponseSchema = z.object({
  status: z.literal("ready"),
  reply: z.string(),
  conversationId: z.uuid(),
});
```

- [ ] **Step 4: 테스트 재실행하여 통과 확인**

```bash
pnpm --filter @haetteum/contracts test -- chat.test.ts
```
Expected: PASS

- [ ] **Step 5: 실패하는 테스트 작성 — `meta` 스트림 이벤트**

`packages/contracts/src/chat-errors.test.ts` 신규 생성:

```ts
import { describe, expect, it } from "vitest";
import { ChatStreamEventSchema } from "./chat-errors.js";

describe("ChatStreamEventSchema", () => {
  it("accepts a leading meta event carrying the conversation id", () => {
    const result = ChatStreamEventSchema.safeParse({
      type: "meta",
      conversationId: "11111111-1111-4111-8111-111111111111",
    });
    expect(result.success).toBe(true);
  });

  it("still discriminates delta/done/error", () => {
    expect(ChatStreamEventSchema.safeParse({ type: "delta", text: "안녕" }).success).toBe(true);
    expect(ChatStreamEventSchema.safeParse({ type: "done" }).success).toBe(true);
    expect(ChatStreamEventSchema.safeParse({ type: "error", status: 503, message: "실패" }).success).toBe(true);
  });

  it("rejects a meta event without a valid conversation id", () => {
    expect(ChatStreamEventSchema.safeParse({ type: "meta", conversationId: "x" }).success).toBe(false);
  });
});
```

- [ ] **Step 6: 테스트 실행하여 실패 확인**

```bash
pnpm --filter @haetteum/contracts test -- chat-errors.test.ts
```
Expected: FAIL — `meta` variant가 아직 없어 첫 번째 테스트 실패.

- [ ] **Step 7: `chat-errors.ts`에 `meta` variant 추가**

```ts
export const ChatStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("meta"), conversationId: z.uuid() }),
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("done") }),
  z.object({ type: z.literal("error"), status: ChatErrorStatusSchema, message: z.string() }),
]);
```

- [ ] **Step 8: 테스트 재실행하여 통과 확인**

```bash
pnpm --filter @haetteum/contracts test -- chat-errors.test.ts
```
Expected: PASS

- [ ] **Step 9: 히스토리 계약 신규 파일 작성**

`packages/contracts/src/chat-conversations.ts`:

```ts
import { z } from "zod";

import { ChatMessageSchema } from "./chat.js";

export const CHAT_CONVERSATIONS_DEFAULT_LIMIT = 12;
export const CHAT_CONVERSATIONS_MAX_LIMIT = 30;

export const ListChatConversationsQuerySchema = z.object({
  cursor: z.coerce.number().int().nonnegative().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(CHAT_CONVERSATIONS_MAX_LIMIT)
    .default(CHAT_CONVERSATIONS_DEFAULT_LIMIT),
});

export const ChatConversationSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  updatedAt: z.iso.datetime(),
  preview: z.string(),
});

export const ChatConversationListResponseSchema = z.object({
  items: z.array(ChatConversationSummarySchema),
  nextCursor: z.number().int().nonnegative().nullable(),
});

export const ChatConversationIdParamsSchema = z.object({
  conversationId: z.uuid(),
});

export const ChatConversationMessagesResponseSchema = z.object({
  conversationId: z.uuid(),
  messages: z.array(ChatMessageSchema),
});

export type ListChatConversationsQuery = z.infer<typeof ListChatConversationsQuerySchema>;
export type ChatConversationSummary = z.infer<typeof ChatConversationSummarySchema>;
export type ChatConversationListResponse = z.infer<typeof ChatConversationListResponseSchema>;
export type ChatConversationIdParams = z.infer<typeof ChatConversationIdParamsSchema>;
export type ChatConversationMessagesResponse = z.infer<typeof ChatConversationMessagesResponseSchema>;
```

- [ ] **Step 10: 계약 테스트 작성**

`packages/contracts/src/chat-conversations.test.ts` 신규:

```ts
import { describe, expect, it } from "vitest";
import {
  ChatConversationListResponseSchema,
  ChatConversationMessagesResponseSchema,
  ListChatConversationsQuerySchema,
} from "./chat-conversations.js";

describe("chat conversation contracts", () => {
  it("defaults the list query limit and rejects an oversized one", () => {
    expect(ListChatConversationsQuerySchema.parse({})).toEqual({ limit: 12 });
    expect(ListChatConversationsQuerySchema.safeParse({ limit: 31 }).success).toBe(false);
  });

  it("parses a conversation list response with a null cursor", () => {
    const result = ChatConversationListResponseSchema.safeParse({
      items: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          title: "서울 여행",
          updatedAt: "2026-09-14T00:00:00.000Z",
          preview: "안녕하세요",
        },
      ],
      nextCursor: null,
    });
    expect(result.success).toBe(true);
  });

  it("parses a conversation messages response", () => {
    const result = ChatConversationMessagesResponseSchema.safeParse({
      conversationId: "11111111-1111-4111-8111-111111111111",
      messages: [{ role: "user", content: "안녕" }],
    });
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 11: 테스트 실행하여 통과 확인**

```bash
pnpm --filter @haetteum/contracts test -- chat-conversations.test.ts
```
Expected: PASS

- [ ] **Step 12: `index.ts`에 export 추가**

`chat-errors.js` export 블록 바로 다음에 추가:

```ts
export {
  CHAT_CONVERSATIONS_DEFAULT_LIMIT,
  CHAT_CONVERSATIONS_MAX_LIMIT,
  ChatConversationIdParamsSchema,
  ChatConversationListResponseSchema,
  ChatConversationMessagesResponseSchema,
  ChatConversationSummarySchema,
  ListChatConversationsQuerySchema,
  type ChatConversationIdParams,
  type ChatConversationListResponse,
  type ChatConversationMessagesResponse,
  type ChatConversationSummary,
  type ListChatConversationsQuery,
} from "./chat-conversations.js";
```

- [ ] **Step 13: 패키지 빌드 및 전체 테스트**

```bash
pnpm --filter @haetteum/contracts build
pnpm --filter @haetteum/contracts test
```
Expected: 빌드 성공, 전체 PASS

- [ ] **Step 14: 커밋**

```bash
git add packages/contracts
git commit -m "feat(contracts): add conversationId and chat conversation history schemas"
```

---

## Task 3: `ChatConversationService` — 대화 해석·저장·조회

**Files:**
- Create: `apps/api/src/chat/chat-conversation.service.ts`
- Test: `apps/api/src/chat/chat-conversation.service.spec.ts`

**Interfaces:**
- Consumes: Task 1의 `prisma.chatConversation.*`/`prisma.chatMessage.*`, `Prisma.TransactionClient`(`../generated/prisma/client.js`).
- Produces: `resolve(tx, userId, conversationId, latestUserMessage): Promise<string>`, `appendExchange(tx, conversationId, userContent, assistantReply): Promise<void>`, `listForUser(userId, {cursor, limit}): Promise<{items, nextCursor}>`, `getMessages(userId, conversationId): Promise<{role: string; content: string}[]>`, `ChatConversationService.titleFrom(text): string`(static). Task 4가 `resolve`/`appendExchange`를, Task 6이 `listForUser`/`getMessages`를 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성 — `resolve`**

`apps/api/src/chat/chat-conversation.service.spec.ts` 신규:

```ts
import { jest } from "@jest/globals";
import { NotFoundException } from "@nestjs/common";
import { ChatConversationService } from "./chat-conversation.service.js";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";
const CONVERSATION_ID = "33333333-3333-4333-8333-333333333333";

function txMock() {
  return {
    chatConversation: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    chatMessage: {
      createMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  };
}

describe("ChatConversationService.resolve", () => {
  it("creates a new conversation with a title from the first message when no id is given", async () => {
    const tx = txMock();
    tx.chatConversation.create.mockResolvedValue({ id: CONVERSATION_ID });
    const service = new ChatConversationService({} as never);

    const conversationId = await service.resolve(tx as never, USER_ID, undefined, "서울 당일치기 코스 추천해줘");

    expect(conversationId).toBe(CONVERSATION_ID);
    expect(tx.chatConversation.create).toHaveBeenCalledWith({
      data: { userId: USER_ID, title: "서울 당일치기 코스 추천해줘" },
      select: { id: true },
    });
  });

  it("truncates a long first message into an 80-character title", async () => {
    const tx = txMock();
    tx.chatConversation.create.mockResolvedValue({ id: CONVERSATION_ID });
    const service = new ChatConversationService({} as never);
    const longMessage = "가".repeat(100);

    await service.resolve(tx as never, USER_ID, undefined, longMessage);

    expect(tx.chatConversation.create).toHaveBeenCalledWith({
      data: { userId: USER_ID, title: `${"가".repeat(79)}…` },
      select: { id: true },
    });
  });

  it("reuses an existing conversation owned by the caller", async () => {
    const tx = txMock();
    tx.chatConversation.findUnique.mockResolvedValue({ userId: USER_ID });
    const service = new ChatConversationService({} as never);

    const conversationId = await service.resolve(tx as never, USER_ID, CONVERSATION_ID, "다음 질문");

    expect(conversationId).toBe(CONVERSATION_ID);
    expect(tx.chatConversation.create).not.toHaveBeenCalled();
  });

  it("rejects a conversation id owned by another user", async () => {
    const tx = txMock();
    tx.chatConversation.findUnique.mockResolvedValue({ userId: OTHER_USER_ID });
    const service = new ChatConversationService({} as never);

    await expect(
      service.resolve(tx as never, USER_ID, CONVERSATION_ID, "다음 질문"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects a conversation id that does not exist", async () => {
    const tx = txMock();
    tx.chatConversation.findUnique.mockResolvedValue(null);
    const service = new ChatConversationService({} as never);

    await expect(
      service.resolve(tx as never, USER_ID, CONVERSATION_ID, "다음 질문"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("ChatConversationService.appendExchange", () => {
  it("stores the user question and assistant reply and bumps updatedAt", async () => {
    const tx = txMock();
    const service = new ChatConversationService({} as never);

    await service.appendExchange(tx as never, CONVERSATION_ID, "질문", "답변");

    expect(tx.chatMessage.createMany).toHaveBeenCalledWith({
      data: [
        { conversationId: CONVERSATION_ID, role: "user", content: "질문" },
        { conversationId: CONVERSATION_ID, role: "assistant", content: "답변" },
      ],
    });
    expect(tx.chatConversation.update).toHaveBeenCalledWith({
      where: { id: CONVERSATION_ID },
      data: { updatedAt: expect.any(Date) },
    });
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
pnpm --filter @haetteum/api test -- chat-conversation.service.spec.ts
```
Expected: FAIL — `./chat-conversation.service.js` 모듈이 없어 import 오류.

- [ ] **Step 3: 서비스 구현**

`apps/api/src/chat/chat-conversation.service.ts` 신규:

```ts
import { Injectable, NotFoundException } from "@nestjs/common";

import { type Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

const TITLE_MAX_LENGTH = 80;

export type ChatConversationSummaryRow = {
  id: string;
  title: string;
  updatedAt: Date;
  preview: string;
};

function conversationNotFound(): NotFoundException {
  return new NotFoundException({
    code: "CHAT_CONVERSATION_NOT_FOUND",
    detail: "대화를 찾을 수 없습니다.",
  });
}

@Injectable()
export class ChatConversationService {
  constructor(private readonly prisma: PrismaService) {}

  static titleFrom(latestUserMessage: string): string {
    const trimmed = latestUserMessage.trim();
    return trimmed.length > TITLE_MAX_LENGTH
      ? `${trimmed.slice(0, TITLE_MAX_LENGTH - 1)}…`
      : trimmed;
  }

  async resolve(
    tx: Prisma.TransactionClient,
    userId: string,
    conversationId: string | undefined,
    latestUserMessage: string,
  ): Promise<string> {
    if (conversationId) {
      const existing = await tx.chatConversation.findUnique({
        where: { id: conversationId },
        select: { userId: true },
      });
      if (!existing || existing.userId !== userId) throw conversationNotFound();
      return conversationId;
    }
    const created = await tx.chatConversation.create({
      data: { userId, title: ChatConversationService.titleFrom(latestUserMessage) },
      select: { id: true },
    });
    return created.id;
  }

  async appendExchange(
    tx: Prisma.TransactionClient,
    conversationId: string,
    userContent: string,
    assistantReply: string,
  ): Promise<void> {
    await tx.chatMessage.createMany({
      data: [
        { conversationId, role: "user", content: userContent },
        { conversationId, role: "assistant", content: assistantReply },
      ],
    });
    await tx.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });
  }

  async listForUser(
    userId: string,
    { cursor, limit }: { cursor?: number; limit: number },
  ): Promise<{ items: ChatConversationSummaryRow[]; nextCursor: number | null }> {
    const offset = cursor ?? 0;
    const conversations = await this.prisma.chatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      skip: offset,
      take: limit + 1,
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
    });
    const page = conversations.slice(0, limit);
    return {
      items: page.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        updatedAt: conversation.updatedAt,
        preview: conversation.messages[0]?.content ?? "",
      })),
      nextCursor: conversations.length > limit ? offset + limit : null,
    };
  }

  async getMessages(
    userId: string,
    conversationId: string,
  ): Promise<{ role: string; content: string }[]> {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { userId: true },
    });
    if (!conversation || conversation.userId !== userId) throw conversationNotFound();
    return this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });
  }
}
```

- [ ] **Step 4: 테스트 재실행하여 통과 확인**

```bash
pnpm --filter @haetteum/api test -- chat-conversation.service.spec.ts
```
Expected: PASS (7개 테스트)

- [ ] **Step 5: 실패하는 테스트 작성 — `listForUser`/`getMessages`**

같은 파일 맨 아래에 추가:

```ts
describe("ChatConversationService.listForUser", () => {
  it("returns a nextCursor only when more rows remain", async () => {
    const findMany = jest
      .fn<(...args: unknown[]) => Promise<unknown[]>>()
      .mockResolvedValue(
        Array.from({ length: 2 }, (_, i) => ({
          id: `conv-${i}`,
          title: `대화 ${i}`,
          updatedAt: new Date("2026-09-14T00:00:00.000Z"),
          messages: [{ content: `최근 메시지 ${i}` }],
        })),
      );
    const service = new ChatConversationService({
      chatConversation: { findMany },
    } as never);

    const result = await service.listForUser(USER_ID, { limit: 1 });

    expect(result.items).toEqual([
      {
        id: "conv-0",
        title: "대화 0",
        updatedAt: new Date("2026-09-14T00:00:00.000Z"),
        preview: "최근 메시지 0",
      },
    ]);
    expect(result.nextCursor).toBe(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID }, skip: 0, take: 2 }),
    );
  });

  it("returns a null nextCursor on the last page", async () => {
    const findMany = jest
      .fn<(...args: unknown[]) => Promise<unknown[]>>()
      .mockResolvedValue([
        { id: "conv-0", title: "대화 0", updatedAt: new Date(), messages: [] },
      ]);
    const service = new ChatConversationService({
      chatConversation: { findMany },
    } as never);

    const result = await service.listForUser(USER_ID, { limit: 12 });

    expect(result.nextCursor).toBeNull();
    expect(result.items[0].preview).toBe("");
  });
});

describe("ChatConversationService.getMessages", () => {
  it("returns messages in chronological order for the owner", async () => {
    const findUnique = jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({ userId: USER_ID });
    const findMany = jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue([{ role: "user", content: "안녕" }]);
    const service = new ChatConversationService({
      chatConversation: { findUnique },
      chatMessage: { findMany },
    } as never);

    const messages = await service.getMessages(USER_ID, CONVERSATION_ID);

    expect(messages).toEqual([{ role: "user", content: "안녕" }]);
    expect(findMany).toHaveBeenCalledWith({
      where: { conversationId: CONVERSATION_ID },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });
  });

  it("rejects a conversation not owned by the caller with 404", async () => {
    const findUnique = jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue({ userId: OTHER_USER_ID });
    const service = new ChatConversationService({
      chatConversation: { findUnique },
    } as never);

    await expect(service.getMessages(USER_ID, CONVERSATION_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
```

- [ ] **Step 6: 테스트 실행하여 실패 확인 후 통과 확인**

```bash
pnpm --filter @haetteum/api test -- chat-conversation.service.spec.ts
```
Step 3의 구현이 이미 `listForUser`/`getMessages`를 포함하므로 바로 PASS해야 한다. FAIL한다면 구현과 위 테스트의 인자 형태(`skip`/`take`/`select`)가 일치하는지 확인한다.
Expected: PASS (전체 11개 테스트)

- [ ] **Step 7: 커밋**

```bash
git add apps/api/src/chat/chat-conversation.service.ts apps/api/src/chat/chat-conversation.service.spec.ts
git commit -m "feat(api): add ChatConversationService for resolving and persisting chat threads"
```

---

## Task 4: `ChatQuotaService` 통합 — 예약 트랜잭션 안에서 대화 해석·저장

**Files:**
- Modify: `apps/api/src/chat/chat-quota.service.ts`
- Modify: `apps/api/src/chat/chat-quota.service.spec.ts`
- Modify: `apps/api/src/chat/chat.module.ts`
- Modify: `apps/api/test/chat-limits.e2e-spec.ts`

**Interfaces:**
- Consumes: Task 3의 `ChatConversationService.resolve`/`appendExchange`.
- Produces: `ChatReservation`에 `conversationId: string` 필드 추가. `ChatQuotaService.settle(reservation, status, reply?, userMessage?)`(4번째 인자 추가). Task 5(`ChatAccessService`)와 Task 6(`ChatController`)이 이 시그니처를 사용한다.

- [ ] **Step 1: `ChatReservation` 타입과 생성자에 의존성 추가**

`apps/api/src/chat/chat-quota.service.ts` 상단 import와 타입을 수정한다.

```ts
import { createHash, randomUUID } from "node:crypto";
import { type ChatRequest } from "@haetteum/contracts";
import { type Prisma } from "../generated/prisma/client.js";
import { chatHttpError } from "./chat-errors.js";
import { HttpException, Inject, Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

import { PrismaService } from "../prisma/prisma.service.js";
import { ChatConversationService } from "./chat-conversation.service.js";

export const CHAT_QUOTA_CLOCK = Symbol("CHAT_QUOTA_CLOCK");
const DAY_MS = 86_400_000;
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;

export type ChatIdentity = { userId: string };

export type ChatReservation = {
  subjectKey: string;
  requestId: string;
  attemptId: string;
  conversationId: string;
  reply?: string;
};

@Injectable()
export class ChatQuotaService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CHAT_QUOTA_CLOCK) private readonly now: () => number,
    private readonly conversations: ChatConversationService,
  ) {}

  // consume()은 변경 없음 — 그대로 둔다
```

- [ ] **Step 2: `reserve()`를 대화 해석 포함하도록 교체**

```ts
  async reserve(
    identity: ChatIdentity,
    request: ChatRequest,
  ): Promise<ChatReservation> {
    const subjectKey = `user:${identity.userId}`;
    const requestId = (request.requestId ?? randomUUID()).toLowerCase();
    const attemptId = randomUUID();
    const payloadHash = createHash("sha256")
      .update(
        JSON.stringify({
          conversationId: request.conversationId ?? null,
          messages: request.messages,
        }),
      )
      .digest("hex");
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtextextended(${subjectKey + ":" + requestId}, 0))`;
      const rows = await tx.$queryRaw<
        {
          status: string;
          payload_hash: string;
          reply: string | null;
          conversation_id: string | null;
        }[]
      >`
        SELECT status, payload_hash, reply, conversation_id FROM chat_requests
        WHERE subject_key = ${subjectKey} AND request_id = ${requestId}::uuid FOR UPDATE
      `;
      const existing = rows[0];
      const latestMessage = request.messages.at(-1)!.content;
      if (existing) {
        if (existing.payload_hash !== payloadHash) throw chatHttpError(409);
        if (existing.status === "COMPLETED") {
          const conversationId =
            existing.conversation_id ??
            (await this.conversations.resolve(
              tx,
              identity.userId,
              request.conversationId,
              latestMessage,
            ));
          return { subjectKey, requestId, attemptId, conversationId, reply: existing.reply! };
        }
        if (existing.status !== "REFUNDED") throw chatHttpError(409);
      }
      const conversationId = await this.conversations.resolve(
        tx,
        identity.userId,
        request.conversationId,
        latestMessage,
      );
      const timestamp = this.now();
      const day = new Date(timestamp + KOREA_OFFSET_MS)
        .toISOString()
        .slice(0, 10);
      await this.consume(identity, tx, timestamp);
      await tx.$executeRaw`
        INSERT INTO chat_requests (subject_key, request_id, payload_hash, day, status, attempt_id, conversation_id)
        VALUES (${subjectKey}, ${requestId}::uuid, ${payloadHash}, ${day}::date, 'RESERVED', ${attemptId}::uuid, ${conversationId}::uuid)
        ON CONFLICT (subject_key, request_id) DO UPDATE
        SET day = EXCLUDED.day, status = 'RESERVED', attempt_id = EXCLUDED.attempt_id,
            reply = NULL, conversation_id = EXCLUDED.conversation_id, updated_at = CURRENT_TIMESTAMP
      `;
      return { subjectKey, requestId, attemptId, conversationId };
    });
  }
```

- [ ] **Step 3: `settle()`에 메시지 저장 추가**

```ts
  async settle(
    reservation: ChatReservation,
    status: "COMPLETED" | "REFUNDED" | "CANCELLED",
    reply?: string,
    userMessage?: string,
  ): Promise<void> {
    if (reservation.reply !== undefined) return;
    await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ day: Date }[]>`
        UPDATE chat_requests SET status = ${status}, reply = ${reply ?? null}, updated_at = CURRENT_TIMESTAMP
        WHERE subject_key = ${reservation.subjectKey} AND request_id = ${reservation.requestId}::uuid
          AND attempt_id = ${reservation.attemptId}::uuid AND status = 'RESERVED'
        RETURNING day
      `;
      if (status === "REFUNDED" && rows[0]) {
        await tx.$executeRaw`
          UPDATE chat_daily_usage SET used = used - 1
          WHERE subject_key = ${reservation.subjectKey} AND day = ${rows[0].day}::date AND used > 0
        `;
      }
      if (status === "COMPLETED" && rows[0] && reply !== undefined && userMessage !== undefined) {
        await this.conversations.appendExchange(tx, reservation.conversationId, userMessage, reply);
      }
    });
  }
```

`cleanup()`은 변경하지 않는다.

- [ ] **Step 4: 유닛 테스트의 생성자 호출 보정**

`apps/api/src/chat/chat-quota.service.spec.ts`의 `setup()`에 3번째 인자를 추가한다(`consume()`만 테스트하므로 실제 동작은 불필요):

```ts
function setup(result: { used: number }[] = [{ used: 1 }]) {
  const query = jest
    .fn<() => Promise<{ used: number }[]>>()
    .mockResolvedValue(result);
  const service = new ChatQuotaService(
    { $queryRaw: query } as unknown as PrismaService,
    () => Date.parse("2026-09-11T14:59:59.000Z"),
    {} as never,
  );
  return { service, query };
}
```

- [ ] **Step 5: 유닛 테스트 실행**

```bash
pnpm --filter @haetteum/api test -- chat-quota.service.spec.ts
```
Expected: PASS(기존 3개 테스트, `consume()` 동작은 변경 없음)

- [ ] **Step 6: `chat.module.ts`에 `ChatConversationService` 등록**

```ts
import { Module } from "@nestjs/common";

import { BedrockChatClient } from "./bedrock-chat.client.js";
import { CHAT_LLM_PORT } from "./chat.constants.js";
import { ChatController } from "./chat.controller.js";
import { ChatConversationService } from "./chat-conversation.service.js";
import { ChatService } from "./chat.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { ChatAccessService } from "./chat-access.service.js";
import { CHAT_QUOTA_CLOCK, ChatQuotaService } from "./chat-quota.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [
    ChatAccessService,
    ChatConversationService,
    ChatQuotaService,
    { provide: CHAT_QUOTA_CLOCK, useValue: Date.now },
    ChatService,
    BedrockChatClient,
    { provide: CHAT_LLM_PORT, useExisting: BedrockChatClient },
  ],
})
export class ChatModule {}
```

- [ ] **Step 7: 기존 e2e 픽스처가 새 필수 테이블/의존성을 갖추도록 수정 (1) — 세션 mock의 사용자 id를 UUID로 교체**

`ChatConversation.userId`가 `@db.Uuid`이므로, 지금까지 세션 mock이 쓰던 `"real-user"`(비-UUID 문자열)로는 `ChatConversationService.resolve()`가 대화를 생성할 수 없다. `apps/api/test/chat-limits.e2e-spec.ts`에서 `"real-user"` 문자열 전체를 UUID로 치환한다(macOS `sed`, 빈 백업 확장자 `''`):

```bash
sed -i '' 's/real-user/11111111-1111-4111-8111-111111111111/g' apps/api/test/chat-limits.e2e-spec.ts
grep -n "real-user" apps/api/test/chat-limits.e2e-spec.ts
```
Expected: `grep`이 아무것도 출력하지 않음(모두 치환됨). `"another-device"`, `"forged-*"`, `"another-user"`(요청 body에 위조로 넣는 값) 등 다른 문자열은 `real-user`를 포함하지 않으므로 영향받지 않는다.

- [ ] **Step 8: 기존 e2e 픽스처 수정 (2) — users 스텁 테이블과 신규 마이그레이션 적용**

같은 파일 `beforeAll`에서 기존 두 마이그레이션을 적용하는 블록 바로 다음에 추가한다(`ChatConversation.userId`가 `users(id)`를 참조하므로 최소한의 스텁 테이블이 필요하다):

```ts
    await client.query(`CREATE TABLE users (id UUID PRIMARY KEY)`);
    await client.query(
      `INSERT INTO users (id) VALUES ('11111111-1111-4111-8111-111111111111')`,
    );
    await client.query(
      readFileSync(
        new URL(
          "../prisma/migrations/<TASK1_MIGRATION_FOLDER>/migration.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
```
`<TASK1_MIGRATION_FOLDER>`는 Task 1 Step 4에서 생성된 실제 폴더명(`<timestamp>_add_chat_conversations`)으로 바꿔 적는다.

- [ ] **Step 9: 기존 e2e 픽스처 수정 (3) — provider와 정리 로직**

`Test.createTestingModule`의 `providers` 배열에 `ChatConversationService`를 추가:

```ts
  const module = await Test.createTestingModule({
    controllers: [ChatController],
    providers: [
      ChatService,
      ChatAccessService,
      ChatQuotaService,
      ChatConversationService,
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
                ? { userId: "11111111-1111-4111-8111-111111111111", refreshedExpiresAt: null }
                : null,
            ),
        },
      },
    ],
  }).compile();
```
(위 `SessionService` mock은 Step 7의 `sed`로 이미 치환되어 있어야 한다 — 값이 다르면 Step 7을 다시 확인한다.) 파일 상단 import에 `import { ChatConversationService } from "../src/chat/chat-conversation.service.js";`를 추가한다.

`beforeEach`의 정리 블록에 대화 테이블 초기화를 추가(Cascade로 메시지도 함께 삭제됨):

```ts
beforeEach(async () => {
  now = Date.parse("2026-09-11T14:59:59.000Z");
  enabled = true;
  failProvider = false;
  providerError = new Error("private AWS provider details");
  partialBeforeFailure = false;
  providerCalls = 0;
  await prisma.$executeRaw`DELETE FROM chat_requests`;
  await prisma.chatDailyUsage.deleteMany();
  await prisma.chatConversation.deleteMany();
});
```

- [ ] **Step 10: 기존 e2e 전체 실행하여 회귀 없음 확인**

```bash
pnpm --filter @haetteum/api test:e2e -- chat-limits.e2e-spec.ts
```
Expected: 기존 테스트가 모두 그대로 PASS(동작은 바뀌지 않고, 내부적으로 매 요청이 대화를 하나씩 만들 뿐).

- [ ] **Step 11: 커밋**

```bash
git add apps/api/src/chat/chat-quota.service.ts apps/api/src/chat/chat-quota.service.spec.ts apps/api/src/chat/chat.module.ts apps/api/test/chat-limits.e2e-spec.ts
git commit -m "feat(api): resolve and persist chat conversations inside the quota reservation transaction"
```

---

## Task 5: `ChatAccessService` — settle 시그니처 전달

**Files:**
- Modify: `apps/api/src/chat/chat-access.service.ts`
- Test: `apps/api/src/chat/chat-access.service.spec.ts`

**Interfaces:**
- Consumes: Task 4의 `ChatQuotaService.settle(reservation, status, reply?, userMessage?)`.
- Produces: `ChatAccessService.settle(reservation, status, reply?, userMessage?)`. Task 6의 컨트롤러가 이 시그니처로 호출한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/api/src/chat/chat-access.service.spec.ts` 맨 아래에 추가:

```ts
it("passes the user message through to the quota service on settle", async () => {
  const { service, reserve, response } = setup();
  const settle = jest.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined);
  const withSettle = new ChatAccessService(
    { isConfigured: () => true } as never,
    { reserve, settle } as never,
    { resolve: jest.fn() } as never,
    { sessionCookieName: "session", setSession: jest.fn(), clearSession: jest.fn() } as never,
  );
  const reservation = { subjectKey: "s", requestId: "r", attemptId: "a", conversationId: "c" };

  await withSettle.settle(reservation as never, "COMPLETED", "답변", "질문");

  expect(settle).toHaveBeenCalledWith(reservation, "COMPLETED", "답변", "질문");
  void response;
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
pnpm --filter @haetteum/api test -- chat-access.service.spec.ts
```
Expected: FAIL — 현재 `settle()`은 2개 인자만 전달.

- [ ] **Step 3: `settle()` 시그니처 확장**

```ts
  settle(
    reservation: ChatReservation,
    status: "COMPLETED" | "REFUNDED" | "CANCELLED",
    reply?: string,
    userMessage?: string,
  ): Promise<void> {
    return this.quota.settle(reservation, status, reply, userMessage);
  }
```
(`ChatReservation` import는 이미 존재한다.)

- [ ] **Step 4: 테스트 재실행하여 통과 확인**

```bash
pnpm --filter @haetteum/api test -- chat-access.service.spec.ts
```
Expected: PASS(전체 5개 테스트)

- [ ] **Step 5: 커밋**

```bash
git add apps/api/src/chat/chat-access.service.ts apps/api/src/chat/chat-access.service.spec.ts
git commit -m "feat(api): forward the user message through ChatAccessService.settle"
```

---

## Task 6: `ChatController` — meta 이벤트, conversationId 응답, 히스토리 GET 엔드포인트

**Files:**
- Modify: `apps/api/src/chat/chat.controller.ts`
- Test: `apps/api/src/chat/chat.controller.spec.ts`

**Interfaces:**
- Consumes: Task 3의 `ChatConversationService.listForUser`/`getMessages`, Task 2의 `ListChatConversationsQuerySchema`/`ChatConversationListResponseSchema`/`ChatConversationIdParamsSchema`/`ChatConversationMessagesResponseSchema`, `SessionAuthGuard`(`../auth/session-auth.guard.js`), `CurrentUser`(`../auth/current-user.decorator.js`), `AuthUser`(`@haetteum/contracts`).
- Produces: `GET /api/v1/chat/conversations`, `GET /api/v1/chat/conversations/:conversationId/messages`. 스트림/비스트림 응답에 `conversationId` 포함.

- [ ] **Step 1: 실패하는 테스트 작성 — 컨트롤러 생성자와 응답 형태 변경**

`apps/api/src/chat/chat.controller.spec.ts` 전체를 아래로 교체한다:

```ts
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants.js";
import { jest } from "@jest/globals";

import type { ChatRequest, ChatResponse } from "@haetteum/contracts";

import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { ChatController } from "./chat.controller.js";

const CONVERSATION_ID = "22222222-2222-4222-8222-222222222222";

describe("ChatController.sendMessage", () => {
  it("returns the service reply with the reservation's conversation id and settles with it", async () => {
    const chat = {
      sendMessage: jest
        .fn<(request: ChatRequest) => Promise<{ status: "ready"; reply: string }>>()
        .mockResolvedValue({ status: "ready", reply: "안녕하세요" }),
    };
    const settle = jest.fn<(...args: unknown[]) => Promise<void>>().mockResolvedValue(undefined);
    const controller = new ChatController(
      chat as never,
      {
        prepare: () =>
          Promise.resolve({
            subjectKey: "user:1",
            requestId: "id",
            attemptId: "attempt",
            conversationId: CONVERSATION_ID,
          }),
        settle,
      } as never,
      {} as never,
    );
    const request: ChatRequest = { messages: [{ role: "user", content: "안녕" }] };

    const response: ChatResponse = await controller.sendMessage(request, {} as never, {} as never);

    expect(response).toEqual({ status: "ready", reply: "안녕하세요", conversationId: CONVERSATION_ID });
    expect(settle).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: CONVERSATION_ID }),
      "COMPLETED",
      "안녕하세요",
      "안녕",
    );
  });

  it("returns the cached reply's conversation id without calling the service", async () => {
    const chat = { sendMessage: jest.fn() };
    const controller = new ChatController(
      chat as never,
      {
        prepare: () =>
          Promise.resolve({
            subjectKey: "user:1",
            requestId: "id",
            attemptId: "attempt",
            conversationId: CONVERSATION_ID,
            reply: "캐시된 답변",
          }),
        settle: jest.fn(),
      } as never,
      {} as never,
    );
    const request: ChatRequest = { messages: [{ role: "user", content: "안녕" }] };

    const response = await controller.sendMessage(request, {} as never, {} as never);

    expect(response).toEqual({ status: "ready", reply: "캐시된 답변", conversationId: CONVERSATION_ID });
    expect(chat.sendMessage).not.toHaveBeenCalled();
  });

  it("registers the shared chat request schema in a body validation pipe", () => {
    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      ChatController,
      "sendMessage",
    ) as Record<string, { pipes: unknown[] }>;
    const parameter = Object.values(args).find((arg) => arg.pipes.length > 0);
    const pipe = parameter?.pipes[0];

    expect(pipe).toBeInstanceOf(ZodValidationPipe);
  });
});

describe("ChatController conversations", () => {
  it("lists the current user's conversations through the conversation service", async () => {
    const conversations = {
      listForUser: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({
        items: [
          {
            id: CONVERSATION_ID,
            title: "서울 여행",
            updatedAt: new Date("2026-09-14T00:00:00.000Z"),
            preview: "안녕",
          },
        ],
        nextCursor: null,
      }),
      getMessages: jest.fn(),
    };
    const controller = new ChatController({} as never, {} as never, conversations as never);

    const result = await controller.listConversations({ id: "user-1" } as never, { limit: 12 });

    expect(result).toEqual({
      items: [{ id: CONVERSATION_ID, title: "서울 여행", updatedAt: "2026-09-14T00:00:00.000Z", preview: "안녕" }],
      nextCursor: null,
    });
    expect(conversations.listForUser).toHaveBeenCalledWith("user-1", { limit: 12 });
  });

  it("returns a conversation's messages for its owner", async () => {
    const conversations = {
      listForUser: jest.fn(),
      getMessages: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue([{ role: "user", content: "안녕" }]),
    };
    const controller = new ChatController({} as never, {} as never, conversations as never);

    const result = await controller.getConversationMessages(
      { id: "user-1" } as never,
      { conversationId: CONVERSATION_ID },
    );

    expect(result).toEqual({ conversationId: CONVERSATION_ID, messages: [{ role: "user", content: "안녕" }] });
    expect(conversations.getMessages).toHaveBeenCalledWith("user-1", CONVERSATION_ID);
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
pnpm --filter @haetteum/api test -- chat.controller.spec.ts
```
Expected: FAIL — 생성자가 2개 인자만 받고, `listConversations`/`getConversationMessages`가 존재하지 않음.

- [ ] **Step 3: 컨트롤러 구현**

`apps/api/src/chat/chat.controller.ts` 전체를 아래로 교체한다:

```ts
import type { Request, Response } from "express";

import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";

import {
  ChatConversationIdParamsSchema,
  ChatConversationListResponseSchema,
  ChatConversationMessagesResponseSchema,
  ListChatConversationsQuerySchema,
  type AuthUser,
  type ChatConversationIdParams,
  type ChatConversationListResponse,
  type ChatConversationMessagesResponse,
  type ChatRequest,
  type ChatResponse,
  type ListChatConversationsQuery,
} from "@haetteum/contracts";

import { ChatRequestPipe } from "./chat-request.pipe.js";
import { chatHttpError } from "./chat-errors.js";
import { ChatConversationService } from "./chat-conversation.service.js";
import { ChatService } from "./chat.service.js";
import { ChatAccessService } from "./chat-access.service.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { SameOriginGuard } from "../auth/same-origin.guard.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";

@Controller({ path: "chat", version: "1" })
@UseGuards(SameOriginGuard)
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly access: ChatAccessService,
    private readonly conversations: ChatConversationService,
  ) {}

  @Post("messages/stream")
  async streamMessage(
    @Body(new ChatRequestPipe()) request: ChatRequest,
    @Res() response: Response,
    @Req() incomingRequest: Request,
  ): Promise<void> {
    const reservation = await this.access.prepare(
      incomingRequest,
      response,
      request,
    );
    const abort = new AbortController();
    const onClose = () => abort.abort();
    response.on("close", onClose);
    const events = this.chat.streamMessage(request, abort.signal);
    let settled = reservation.reply !== undefined;
    let reply = "";
    let failed = false;
    const write = (event: object) => {
      if (response.destroyed) return;
      if (!response.headersSent) {
        response.setHeader(
          "Content-Type",
          "application/x-ndjson; charset=utf-8",
        );
        response.setHeader("Cache-Control", "no-cache, no-transform");
        response.setHeader("X-Accel-Buffering", "no");
        response.flushHeaders();
      }
      response.write(JSON.stringify(event) + "\n");
    };
    try {
      if (response.destroyed) return;
      write({ type: "meta", conversationId: reservation.conversationId });
      if (reservation.reply !== undefined) {
        write({ type: "delta", text: reservation.reply });
        write({ type: "done" });
        return;
      }
      for await (const event of events) {
        if (event.type === "delta") reply += event.text;
        if (event.type === "done") {
          await this.access.settle(
            reservation,
            "COMPLETED",
            reply,
            request.messages.at(-1)!.content,
          );
          settled = true;
        } else if (event.type === "error") {
          await this.access.settle(reservation, "REFUNDED");
          settled = true;
          if (!response.headersSent) throw chatHttpError(event.status);
        }
        if (response.destroyed) break;
        write(event);
      }
    } catch (error) {
      failed = true;
      // A transient DB error gets one idempotent recovery attempt. Persistent
      // failures remain RESERVED for reconciliation, never user CANCELLED.
      if (!settled) {
        await this.access.settle(reservation, "REFUNDED");
        settled = true;
      }
      if (!response.headersSent)
        throw error instanceof HttpException ? error : chatHttpError(503);
      write({
        type: "error",
        status: 503,
        message: "현재 챗봇을 사용할 수 없습니다.",
      });
    } finally {
      response.off("close", onClose);
      abort.abort();
      await events.return(undefined);
      try {
        if (!settled && !failed)
          await this.access.settle(reservation, "CANCELLED");
      } finally {
        if (response.headersSent && !response.writableEnded) response.end();
      }
    }
  }

  @Post("messages")
  async sendMessage(
    @Body(new ChatRequestPipe()) request: ChatRequest,
    @Req() incomingRequest: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ChatResponse> {
    const reservation = await this.access.prepare(
      incomingRequest,
      response,
      request,
    );
    if (reservation.reply !== undefined)
      return {
        status: "ready",
        reply: reservation.reply,
        conversationId: reservation.conversationId,
      };
    try {
      const result = await this.chat.sendMessage(request);
      await this.access.settle(
        reservation,
        "COMPLETED",
        result.reply,
        request.messages.at(-1)!.content,
      );
      return { ...result, conversationId: reservation.conversationId };
    } catch (error) {
      await this.access.settle(reservation, "REFUNDED");
      throw error;
    }
  }

  @Get("conversations")
  @UseGuards(SessionAuthGuard)
  async listConversations(
    @CurrentUser() currentUser: AuthUser,
    @Query(new ZodValidationPipe(ListChatConversationsQuerySchema))
    query: ListChatConversationsQuery,
  ): Promise<ChatConversationListResponse> {
    const { items, nextCursor } = await this.conversations.listForUser(currentUser.id, query);
    return ChatConversationListResponseSchema.parse({
      items: items.map((item) => ({
        id: item.id,
        title: item.title,
        updatedAt: item.updatedAt.toISOString(),
        preview: item.preview,
      })),
      nextCursor,
    });
  }

  @Get("conversations/:conversationId/messages")
  @UseGuards(SessionAuthGuard)
  async getConversationMessages(
    @CurrentUser() currentUser: AuthUser,
    @Param(new ZodValidationPipe(ChatConversationIdParamsSchema))
    params: ChatConversationIdParams,
  ): Promise<ChatConversationMessagesResponse> {
    const messages = await this.conversations.getMessages(currentUser.id, params.conversationId);
    return ChatConversationMessagesResponseSchema.parse({
      conversationId: params.conversationId,
      messages,
    });
  }
}
```

- [ ] **Step 4: 테스트 재실행하여 통과 확인**

```bash
pnpm --filter @haetteum/api test -- chat.controller.spec.ts
```
Expected: PASS(전체 5개 테스트)

- [ ] **Step 5: 전체 api 유닛 테스트 및 빌드**

```bash
pnpm --filter @haetteum/api test
pnpm --filter @haetteum/api build
```
Expected: 모두 PASS/성공

- [ ] **Step 6: 커밋**

```bash
git add apps/api/src/chat/chat.controller.ts apps/api/src/chat/chat.controller.spec.ts
git commit -m "feat(api): emit conversation id from chat endpoints and add history GET routes"
```

---

## Task 7: 신규 e2e — 대화 저장·재개·소유권·목록 조회

**Files:**
- Create: `apps/api/test/chat-conversations.e2e-spec.ts`

**Interfaces:**
- Consumes: 전체 `ChatModule` 구성 요소(Task 1~6). `apps/api/test/chat-limits.e2e-spec.ts:1~165`의 격리 스키마 구성 방식을 그대로 재사용한다(별도 스키마 생성, 필요한 마이그레이션만 적용, `Test.createTestingModule`로 실제 HTTP 서버 기동, supertest로 호출).

- [ ] **Step 1: 파일 스캐폴딩 — 스키마 격리와 앱 부트스트랩**

`apps/api/test/chat-conversations.e2e-spec.ts` 신규. `chat-limits.e2e-spec.ts`의 44~165행(스키마 생성, 마이그레이션 적용, `PrismaClient` 연결, `Test.createTestingModule` 구성, `afterAll`)을 아래 차이만 반영해 그대로 옮긴다:
- 스키마 이름 prefix를 `chat_conv_test_`로 바꾼다.
- 적용할 마이그레이션을 `20260911093000_add_chat_daily_usage`, `20260912140000_chat_request_reservations`, 그리고 Task 1에서 만든 `<timestamp>_add_chat_conversations`로 바꾸고, 그 전에 `users` 스텁 테이블을 만든다(Task 4 Step 8과 동일).
- `providers`에 `ChatConversationService`를 포함한다.
- `SessionService` mock은 두 사용자를 구분해야 하므로 아래로 바꾼다:

```ts
const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";

// ...beforeAll 안, users 스텁 INSERT:
await client.query(
  `INSERT INTO users (id) VALUES ('${USER_A}'), ('${USER_B}')`,
);

// ...Test.createTestingModule의 SessionService mock:
{
  provide: SessionService,
  useValue: {
    resolve: (token: string) =>
      Promise.resolve(
        token === "user-a" ? { userId: USER_A, refreshedExpiresAt: null }
        : token === "user-b" ? { userId: USER_B, refreshedExpiresAt: null }
        : null,
      ),
  },
},
```

`beforeEach`에서 `chat_requests`/`chat_daily_usage`/`chatConversation`(cascade로 메시지 포함)을 정리한다. LLM mock(`CHAT_LLM_PORT`)은 `stream`이 매번 `"추천"` 한 덩어리를 yield하도록 고정한다(`chat-limits.e2e-spec.ts`의 `llm` 객체를 단순화해 재사용).

컨트롤러의 새 라우트를 쓰려면 `SessionAuthGuard`도 providers에 추가해야 한다:

```ts
import { SessionAuthGuard } from "../src/auth/session-auth.guard.js";
// ...
providers: [
  ChatService,
  ChatAccessService,
  ChatQuotaService,
  ChatConversationService,
  AuthCookieService,
  SameOriginGuard,
  SessionAuthGuard,
  // ...
],
```

헬퍼 함수:

```ts
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
    .map((line) => JSON.parse(line) as { type: string; conversationId?: string });
}
```

- [ ] **Step 2: 실패하는 테스트 작성 — 대화 생성·메시지 저장·이어가기**

```ts
it("returns a conversation id and persists the exchange after a completed stream", async () => {
  const result = await send(true, "user-a")
    .send({ messages: [{ role: "user", content: "서울 여행" }] })
    .expect(201);
  const conversationId = events(result.text)[0].conversationId!;
  const conversation = await prisma.chatConversation.findUnique({ where: { id: conversationId } });
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
    .send({ conversationId, messages: [{ role: "user", content: "맛집도 알려줘" }] })
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
  const payload = { requestId: randomUUID(), messages: [{ role: "user", content: "서울 여행" }] };
  await send(true, "user-a").send(payload).expect(201);
  await send(false, "user-a").send(payload).expect(201);
  expect(await prisma.chatMessage.count()).toBe(2);
  expect(await prisma.chatConversation.count()).toBe(1);
});
```

- [ ] **Step 3: 테스트 실행하여 실패 확인**

```bash
pnpm --filter @haetteum/api test:e2e -- chat-conversations.e2e-spec.ts
```
Expected: FAIL(파일이 아직 온전하지 않거나 마이그레이션 경로 오타 등으로 실패). 원인이 Task 1~6 구현 누락이 아니라 이 파일 자체의 설정 오류라면(예: 마이그레이션 파일 경로) 바로잡는다. Task 1~6이 올바르면 이 4개 테스트는 대부분 이미 통과해야 한다 — TDD의 "실패 확인" 단계는 여기서는 주로 설정 오류를 걸러내는 역할을 한다.

- [ ] **Step 4: 필요 시 수정 후 통과 확인**

```bash
pnpm --filter @haetteum/api test:e2e -- chat-conversations.e2e-spec.ts
```
Expected: PASS(4개 테스트)

- [ ] **Step 5: 히스토리 GET 엔드포인트 테스트 추가**

같은 파일에 추가:

```ts
it("lists conversations newest-first with a preview and pagination", async () => {
  for (const content of ["첫번째", "두번째", "세번째"]) {
    await send(true, "user-a").send({ messages: [{ role: "user", content }] }).expect(201);
  }
  const page1 = await get("/conversations?limit=2", "user-a").expect(200);
  expect(page1.body.items.map((i: { title: string }) => i.title)).toEqual(["세번째", "두번째"]);
  expect(page1.body.nextCursor).toBe(2);
  const page2 = await get(`/conversations?limit=2&cursor=${page1.body.nextCursor}`, "user-a").expect(200);
  expect(page2.body.items.map((i: { title: string }) => i.title)).toEqual(["첫번째"]);
  expect(page2.body.nextCursor).toBeNull();
});

it("returns a conversation's messages for its owner and 404 for another user", async () => {
  const first = await send(true, "user-a")
    .send({ messages: [{ role: "user", content: "서울 여행" }] })
    .expect(201);
  const conversationId = events(first.text)[0].conversationId!;
  const owned = await get(`/conversations/${conversationId}/messages`, "user-a").expect(200);
  expect(owned.body).toEqual({
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
```

- [ ] **Step 6: 테스트 실행하여 실패 확인 후 통과 확인**

```bash
pnpm --filter @haetteum/api test:e2e -- chat-conversations.e2e-spec.ts
```
Expected: PASS(전체 7개 테스트)

- [ ] **Step 7: 전체 e2e 스위트 실행 — 회귀 확인**

```bash
pnpm --filter @haetteum/api test:e2e
```
Expected: 모든 e2e 테스트(기존 `chat-limits` 포함) PASS

- [ ] **Step 8: 커밋**

```bash
git add apps/api/test/chat-conversations.e2e-spec.ts
git commit -m "test(api): cover chat conversation persistence, continuation, and history endpoints end-to-end"
```

---

## Task 8: 프론트 — `read-chat-stream.ts`에 `meta` 이벤트 처리 추가

**Files:**
- Modify: `apps/web/src/features/chat/read-chat-stream.ts`
- Test: `apps/web/src/features/chat/read-chat-stream.test.ts` (신규)

**Interfaces:**
- Produces: `readChatStream(response, onText, onMeta?)` — 3번째 인자 `onMeta?: (conversationId: string) => void`. Task 11의 `chat/page.tsx`가 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/features/chat/read-chat-stream.test.ts` 신규:

```ts
import { describe, expect, it, vi } from "vitest";
import { readChatStream } from "./read-chat-stream";

function ndjsonResponse(lines: object[]): Response {
  const body = lines.map((line) => JSON.stringify(line)).join("\n") + "\n";
  return new Response(body, { status: 201 });
}

describe("readChatStream", () => {
  it("reports the conversation id from a leading meta event without affecting the text", async () => {
    const response = ndjsonResponse([
      { type: "meta", conversationId: "11111111-1111-4111-8111-111111111111" },
      { type: "delta", text: "안녕" },
      { type: "done" },
    ]);
    const onText = vi.fn();
    const onMeta = vi.fn();

    await readChatStream(response, onText, onMeta);

    expect(onMeta).toHaveBeenCalledWith("11111111-1111-4111-8111-111111111111");
    expect(onText).toHaveBeenCalledWith("안녕");
  });

  it("still throws on an error event when a meta event preceded it", async () => {
    const response = ndjsonResponse([
      { type: "meta", conversationId: "11111111-1111-4111-8111-111111111111" },
      { type: "error", status: 503, message: "실패" },
    ]);

    await expect(readChatStream(response, vi.fn())).rejects.toMatchObject({ status: 503 });
  });

  it("does not require an onMeta callback", async () => {
    const response = ndjsonResponse([
      { type: "meta", conversationId: "11111111-1111-4111-8111-111111111111" },
      { type: "delta", text: "안녕" },
      { type: "done" },
    ]);

    await expect(readChatStream(response, vi.fn())).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
pnpm --filter @haetteum/web test -- read-chat-stream.test.ts
```
Expected: FAIL — 현재 파서는 `meta` 타입을 몰라서 `event.text`가 `undefined`가 되어 `text += undefined`로 `"안녕"` 매칭이 깨짐(또는 zod 파싱 에러).

- [ ] **Step 3: `meta` 처리 추가**

```ts
export async function readChatStream(
  response: Response,
  onText: (text: string) => void,
  onMeta?: (conversationId: string) => void,
) {
  if (!response.ok) {
    if (response.status === 429) {
      const problem = requestErrorSchema.safeParse(await response.json().catch(() => null));
      throw new ChatRequestError(429, problem.success ? problem.data.resetsAt : undefined);
    }
    throw new ChatRequestError(response.status === 500 ? 503 : response.status);
  }
  if (!response.body) throw new ChatRequestError(502);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line) continue;
        const event = ChatStreamEventSchema.parse(JSON.parse(line));
        if (event.type === "meta") {
          onMeta?.(event.conversationId);
          continue;
        }
        if (event.type === "error") throw new ChatRequestError(event.status);
        if (event.type === "done") {
          if (!text.trim()) throw new ChatRequestError(502);
          return;
        }
        text += event.text;
        onText(text);
      }
      if (chunk.done) throw new ChatRequestError(502);
    }
  } catch (error) {
    if (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError") throw error;
    throw toChatRequestError(error);
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
```

- [ ] **Step 4: 테스트 재실행하여 통과 확인**

```bash
pnpm --filter @haetteum/web test -- read-chat-stream.test.ts
```
Expected: PASS(전체 3개 테스트)

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/chat/read-chat-stream.ts apps/web/src/features/chat/read-chat-stream.test.ts
git commit -m "feat(web): handle the leading meta stream event for conversation id"
```

---

## Task 9: 프론트 — `chat-history-api.ts` (목록/상세 fetch)

**Files:**
- Create: `apps/web/src/features/chat/chat-history-api.ts`
- Test: `apps/web/src/features/chat/chat-history-api.test.ts`

**Interfaces:**
- Consumes: Task 2의 `ChatConversationListResponseSchema`/`ChatConversationMessagesResponseSchema`, `getApiBaseUrl()`(`@/lib/api-base`).
- Produces: `listChatConversations(cursor?: number): Promise<ChatConversationListResponse>`, `getChatConversationMessages(conversationId: string): Promise<ChatConversationMessagesResponse>`, `class ChatHistoryError extends Error`. Task 10의 `ChatHistoryPanel`과 Task 11의 `chat/page.tsx`가 사용한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/features/chat/chat-history-api.test.ts` 신규:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-base", () => ({ getApiBaseUrl: () => "http://api.test" }));

import { getChatConversationMessages, listChatConversations } from "./chat-history-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listChatConversations", () => {
  it("requests the conversations endpoint and parses the response", async () => {
    const payload = { items: [], nextCursor: null };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))));

    const result = await listChatConversations();

    expect(result).toEqual(payload);
    expect(fetch).toHaveBeenCalledWith("http://api.test/chat/conversations", { credentials: "include" });
  });

  it("appends the cursor query when paging", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [], nextCursor: null }))),
    );

    await listChatConversations(12);

    expect(fetch).toHaveBeenCalledWith("http://api.test/chat/conversations?cursor=12", {
      credentials: "include",
    });
  });

  it("throws a ChatHistoryError when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));

    await expect(listChatConversations()).rejects.toThrow();
  });
});

describe("getChatConversationMessages", () => {
  it("requests a single conversation's messages", async () => {
    const payload = { conversationId: "11111111-1111-4111-8111-111111111111", messages: [] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(payload))));

    const result = await getChatConversationMessages(payload.conversationId);

    expect(result).toEqual(payload);
    expect(fetch).toHaveBeenCalledWith(
      "http://api.test/chat/conversations/11111111-1111-4111-8111-111111111111/messages",
      { credentials: "include" },
    );
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
pnpm --filter @haetteum/web test -- chat-history-api.test.ts
```
Expected: FAIL — 모듈이 없어 import 오류.

- [ ] **Step 3: 구현**

`apps/web/src/features/chat/chat-history-api.ts` 신규:

```ts
import {
  ChatConversationListResponseSchema,
  ChatConversationMessagesResponseSchema,
  type ChatConversationListResponse,
  type ChatConversationMessagesResponse,
} from "@haetteum/contracts";

import { getApiBaseUrl } from "@/lib/api-base";

export class ChatHistoryError extends Error {}

async function getJson<T>(path: string, schema: { parse: (value: unknown) => T }): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new ChatHistoryError("API 서버에 연결할 수 없습니다.");
  const response = await fetch(`${baseUrl}${path}`, { credentials: "include" });
  if (!response.ok) throw new ChatHistoryError("대화 정보를 불러오지 못했습니다.");
  return schema.parse(await response.json());
}

export function listChatConversations(cursor?: number): Promise<ChatConversationListResponse> {
  const query = cursor !== undefined ? `?cursor=${cursor}` : "";
  return getJson(`/chat/conversations${query}`, ChatConversationListResponseSchema);
}

export function getChatConversationMessages(
  conversationId: string,
): Promise<ChatConversationMessagesResponse> {
  return getJson(
    `/chat/conversations/${conversationId}/messages`,
    ChatConversationMessagesResponseSchema,
  );
}
```

- [ ] **Step 4: 테스트 재실행하여 통과 확인**

```bash
pnpm --filter @haetteum/web test -- chat-history-api.test.ts
```
Expected: PASS(전체 4개 테스트)

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/chat/chat-history-api.ts apps/web/src/features/chat/chat-history-api.test.ts
git commit -m "feat(web): add chat conversation history fetchers"
```

---

## Task 10: 프론트 — `ChatHistoryPanel` (오른쪽 슬라이드 패널)

**Files:**
- Create: `apps/web/src/features/chat/chat-history-panel.tsx`
- Test: `apps/web/src/features/chat/chat-history-panel.test.tsx`

**Interfaces:**
- Consumes: Task 9의 `listChatConversations`.
- Produces: `<ChatHistoryPanel open onOpenChange onSelectConversation />`. Task 11의 `chat/page.tsx`가 마운트한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/features/chat/chat-history-panel.test.tsx` 신규:

```tsx
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChatHistoryPanel } from "./chat-history-panel";
import * as api from "./chat-history-api";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ChatHistoryPanel", () => {
  it("loads conversations when opened and reports a selection", async () => {
    vi.spyOn(api, "listChatConversations").mockResolvedValue({
      items: [
        {
          id: "conv-1",
          title: "서울 여행",
          updatedAt: "2026-09-14T00:00:00.000Z",
          preview: "안녕하세요",
        },
      ],
      nextCursor: null,
    });
    const onSelect = vi.fn();

    render(<ChatHistoryPanel open onOpenChange={vi.fn()} onSelectConversation={onSelect} />);

    await waitFor(() => screen.getByText("서울 여행"));
    await userEvent.click(screen.getByText("서울 여행"));

    expect(onSelect).toHaveBeenCalledWith("conv-1");
  });

  it("shows an error state when the list fails to load", async () => {
    vi.spyOn(api, "listChatConversations").mockRejectedValue(new Error("network"));

    render(<ChatHistoryPanel open onOpenChange={vi.fn()} onSelectConversation={vi.fn()} />);

    await waitFor(() => screen.getByRole("alert"));
  });

  it("does not fetch while closed", () => {
    const spy = vi.spyOn(api, "listChatConversations");

    render(<ChatHistoryPanel open={false} onOpenChange={vi.fn()} onSelectConversation={vi.fn()} />);

    expect(spy).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 테스트 실행하여 실패 확인**

```bash
pnpm --filter @haetteum/web test -- chat-history-panel.test.tsx
```
Expected: FAIL — 모듈이 없어 import 오류.

- [ ] **Step 3: 구현**

`apps/web/src/features/chat/chat-history-panel.tsx` 신규:

```tsx
"use client";

import { Dialog } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { ChatConversationSummary } from "@haetteum/contracts";

import { listChatConversations } from "@/features/chat/chat-history-api";

type ChatHistoryPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectConversation: (conversationId: string) => void;
};

type LoadState = "idle" | "loading" | "ready" | "error";

function formatUpdatedAt(iso: string): string {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date(iso));
}

function ChatHistoryPanel({ open, onOpenChange, onSelectConversation }: ChatHistoryPanelProps) {
  const [items, setItems] = useState<ChatConversationSummary[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [state, setState] = useState<LoadState>("idle");

  useEffect(() => {
    if (!open) return;
    setState("loading");
    listChatConversations()
      .then((response) => {
        setItems(response.items);
        setNextCursor(response.nextCursor);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [open]);

  function loadMore() {
    if (nextCursor === null) return;
    setState("loading");
    listChatConversations(nextCursor)
      .then((response) => {
        setItems((current) => [...current, ...response.items]);
        setNextCursor(response.nextCursor);
        setState("ready");
      })
      .catch(() => setState("error"));
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-[2px] transition-opacity duration-180 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex items-stretch justify-end">
          <Dialog.Popup className="relative flex h-dvh w-[85%] max-w-sm flex-col overflow-hidden border-l border-white/70 bg-card text-foreground shadow-floating outline-none transition-[transform,opacity] duration-180 data-ending-style:translate-x-2 data-ending-style:opacity-0 data-starting-style:translate-x-2 data-starting-style:opacity-0">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 pt-[calc(1.25rem+var(--safe-area-top))] pb-4">
              <Dialog.Title className="type-title-md text-foreground">대화 목록</Dialog.Title>
              <Dialog.Close
                aria-label="닫기"
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/25"
              >
                <XIcon aria-hidden="true" className="size-5" />
              </Dialog.Close>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4" aria-live="polite">
              {state === "error" ? (
                <div className="rounded-2xl border border-dashed border-border bg-background px-5 py-10 text-center">
                  <p role="alert" className="type-caption text-destructive">
                    대화 목록을 불러오지 못했어요.
                  </p>
                </div>
              ) : items.length === 0 && state !== "loading" ? (
                <p className="type-caption text-muted-foreground">아직 나눈 대화가 없어요.</p>
              ) : (
                <ul aria-label="과거 대화 목록" className="grid gap-2">
                  {items.map((item) => (
                    <li key={item.id}>
                      <Dialog.Close
                        render={
                          <button type="button">
                            <span className="min-w-0 flex-1 text-left">
                              <span className="type-label block truncate text-foreground">{item.title}</span>
                              <span className="type-caption mt-0.5 block truncate text-muted-foreground">
                                {item.preview}
                              </span>
                            </span>
                            <span className="type-caption shrink-0 text-muted-foreground">
                              {formatUpdatedAt(item.updatedAt)}
                            </span>
                          </button>
                        }
                        className="flex w-full items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 text-left outline-none transition-colors hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/25"
                        onClick={() => onSelectConversation(item.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
              {state === "loading" ? (
                <p className="type-caption mt-3 text-muted-foreground">불러오는 중...</p>
              ) : null}
              {nextCursor !== null && state !== "loading" ? (
                <button
                  type="button"
                  onClick={loadMore}
                  className="mt-3 min-h-11 w-full rounded-xl border border-border py-2 text-sm font-semibold text-primary outline-none hover:bg-primary-subtle focus-visible:ring-2 focus-visible:ring-ring"
                >
                  더 보기
                </button>
              ) : null}
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { ChatHistoryPanel, type ChatHistoryPanelProps };
```

- [ ] **Step 4: 테스트 재실행하여 통과 확인**

```bash
pnpm --filter @haetteum/web test -- chat-history-panel.test.tsx
```
Expected: PASS(전체 3개 테스트)

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/features/chat/chat-history-panel.tsx apps/web/src/features/chat/chat-history-panel.test.tsx
git commit -m "feat(web): add the right-sliding chat history panel"
```

---

## Task 11: 프론트 — `chat/page.tsx` 통합 (헤더 아이콘, conversationId 연동)

**Files:**
- Modify: `apps/web/src/app/chat/page.tsx`

**Interfaces:**
- Consumes: Task 8의 `readChatStream(response, onText, onMeta?)`, Task 9의 `getChatConversationMessages`, Task 10의 `ChatHistoryPanel`.

- [ ] **Step 1: import 추가**

```tsx
import { ArrowLeftIcon, ArrowUpIcon, HistoryIcon, LoaderCircleIcon, RefreshCwIcon } from "lucide-react";
```
(기존 `ArrowLeftIcon, ArrowUpIcon, LoaderCircleIcon, RefreshCwIcon`에 `HistoryIcon` 추가)

```tsx
import { ChatHistoryPanel } from "@/features/chat/chat-history-panel";
import { getChatConversationMessages } from "@/features/chat/chat-history-api";
```

- [ ] **Step 2: state와 ref 추가**

`pending`/`conversation`/`followBottom`/`requestAbort`/`retryMessages`/`retryRequestId` 선언부 다음에 추가:

```tsx
const [historyOpen, setHistoryOpen] = useState(false);
const activeConversationId = useRef<string | undefined>(undefined);
```

- [ ] **Step 3: `send()`가 conversationId를 보내고 meta로 갱신하도록 수정**

```tsx
  async function send(nextMessages: ChatMessage[], requestId = crypto.randomUUID()) {
    if (pending.current) return;
    pending.current = true;
    setSending(true);
    setError(null);
    retryMessages.current = nextMessages;
    retryRequestId.current = requestId;
    setMessages(nextMessages);
    const abort = new AbortController();
    requestAbort.current = abort;
    followBottom.current = true;
    const smooth = createSmoothChatText((text) => {
      if (!abort.signal.aborted) setMessages([...nextMessages, { role: "assistant", content: text }]);
    });
    abort.signal.addEventListener("abort", smooth.cancel, { once: true });
    const timeout = AbortSignal.timeout(60_000);
    try {
      const baseUrl = getApiBaseUrl();
      if (!baseUrl) throw new ChatRequestError(503);
      const response = await fetch(`${baseUrl}/chat/messages/stream`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId,
          conversationId: activeConversationId.current,
          messages: selectChatContext(nextMessages),
        }),
        signal: AbortSignal.any([abort.signal, timeout]),
      });
      await readChatStream(response, smooth.push, (conversationId) => {
        activeConversationId.current = conversationId;
      });
      await smooth.finish();
    } catch (cause) {
      const failure = cause instanceof ChatRequestError ? cause : timeout.aborted ? new ChatRequestError(504) : toChatRequestError(cause);
      await smooth.finish();
      if (!abort.signal.aborted) {
        setError(failure);
        if (failure.status === 400) {
          setDraft(nextMessages.at(-1)?.content ?? "");
          setMessages(nextMessages.slice(0, -1));
        }
      }
    } finally {
      smooth.cancel();
      abort.signal.removeEventListener("abort", smooth.cancel);
      pending.current = false;
      setSending(false);
    }
  }
```

- [ ] **Step 4: 과거 대화를 불러오는 핸들러 추가**

`submit()` 함수 다음에 추가:

```tsx
  async function openConversation(conversationId: string) {
    setHistoryOpen(false);
    if (pending.current) return;
    setError(null);
    const result = await getChatConversationMessages(conversationId).catch(() => null);
    if (!result) return;
    activeConversationId.current = result.conversationId;
    followBottom.current = true;
    setMessages(result.messages);
  }
```

- [ ] **Step 5: 헤더에 아이콘 추가 및 패널 마운트**

```tsx
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Link href="/" aria-label="홈으로 돌아가기" className="flex size-11 items-center justify-center rounded-full outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeftIcon className="size-5" aria-hidden="true" />
        </Link>
        <Image src="/images/haetteum-chatbot-icon.svg" alt="" width={40} height={40} className="rounded-full" unoptimized />
        <div className="flex-1">
          <h1 className="text-base font-bold">해뜸 여행 도우미</h1>
          <p className="text-xs text-muted-foreground">함께 계획하는 나만의 여행</p>
        </div>
        <button
          type="button"
          aria-label="대화 기록 보기"
          onClick={() => setHistoryOpen(true)}
          className="flex size-11 items-center justify-center rounded-full outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <HistoryIcon className="size-5" aria-hidden="true" />
        </button>
      </header>

      <ChatHistoryPanel
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onSelectConversation={(conversationId) => void openConversation(conversationId)}
      />
```
(`<div>`였던 제목 블록에 `flex-1`을 추가해 아이콘 버튼이 오른쪽 끝에 붙도록 한다.)

- [ ] **Step 6: 웹 유닛 테스트와 빌드**

```bash
pnpm --filter @haetteum/web test
pnpm --filter @haetteum/web build
```
Expected: 모두 PASS/성공

- [ ] **Step 7: 브라우저로 골든 패스 수동 검증**

```bash
pnpm dev
```
1. `/chat`에서 메시지 전송 → 응답 완료까지 대기
2. 헤더 우측 시계 아이콘 클릭 → 패널이 오른쪽에서 왼쪽으로 슬라이드되며 방금 대화가 목록 최상단에 표시되는지 확인
3. 목록 항목 클릭 → 메시지가 복원되고 패널이 닫히는지 확인
4. 이어서 메시지 전송 → 새 대화가 아니라 같은 대화가 이어지는지 DB로 확인:
   ```bash
   pnpm --filter @haetteum/api exec prisma studio
   ```
   `chat_conversations`/`chat_messages` 테이블에서 방금 대화 1건에 메시지 4건(질문 2 + 답변 2)이 쌓였는지 확인
5. 390px, 480px 두 폭에서 레이아웃이 깨지지 않는지, 브라우저 콘솔에 오류가 없는지 확인

- [ ] **Step 8: 커밋**

```bash
git add apps/web/src/app/chat/page.tsx
git commit -m "feat(web): wire the chat history panel into the chat screen"
```

---

## 최종 점검

- [ ] `pnpm --filter @haetteum/contracts test && pnpm --filter @haetteum/api test && pnpm --filter @haetteum/api test:e2e && pnpm --filter @haetteum/web test` 전체 통과
- [ ] `pnpm build` 전체 통과
- [ ] `pnpm lint` 통과
- [ ] 스펙 문서([2026-09-14-chat-history-design.md](../specs/2026-09-14-chat-history-design.md))의 "구현 완료 조건" 12개 항목이 모두 충족되었는지 재확인
