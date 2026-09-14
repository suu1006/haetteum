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
