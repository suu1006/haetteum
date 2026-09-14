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
