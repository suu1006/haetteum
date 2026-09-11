import { describe, expect, it } from "vitest";
import { ChatRequestSchema, selectChatContext, type ChatMessage } from "./chat.js";

const pair = (n: number): ChatMessage[] => [
  { role: "user", content: `질문${n}` },
  { role: "assistant", content: `답변${n}` },
];

describe("chat input budget", () => {
  it("keeps four complete pairs and the current question", () => {
    const messages = [...Array.from({ length: 6 }, (_, n) => pair(n)).flat(), { role: "user" as const, content: "현재 질문" }];
    expect(selectChatContext(messages)).toEqual([...pair(2), ...pair(3), ...pair(4), ...pair(5), messages[12]]);
  });
  it("drops oldest pairs until the character budget fits", () => {
    const messages: ChatMessage[] = [...Array.from({ length: 4 }, () => [
      { role: "user" as const, content: "가".repeat(2000) },
      { role: "assistant" as const, content: "나".repeat(2000) },
    ]).flat(), { role: "user", content: "현재" }];
    expect(selectChatContext(messages)).toEqual(messages.slice(4));
  });
  it("accepts a bounded request and rejects oversized or invalid conversations", () => {
    expect(ChatRequestSchema.safeParse({ messages: [{ role: "user", content: "가".repeat(2000) }] }).success).toBe(true);
    for (const messages of [
      [{ role: "user", content: "가".repeat(2001) }],
      [{ role: "user", content: " " }],
      [{ role: "assistant", content: "답변" }],
      [{ role: "user", content: "질문" }, { role: "user", content: "질문" }],
    ]) expect(ChatRequestSchema.safeParse({ messages }).success).toBe(false);
  });
});
