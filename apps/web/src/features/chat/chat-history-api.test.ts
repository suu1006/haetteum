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
