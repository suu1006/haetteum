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
