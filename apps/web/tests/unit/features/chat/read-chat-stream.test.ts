import { describe, expect, it } from "vitest";
import { readChatStream } from "@/features/chat/read-chat-stream";

describe("readChatStream", () => {
  it("decodes Korean text across arbitrary byte boundaries", async () => {
    const bytes = new TextEncoder().encode('{"type":"delta","text":"서울 여행"}\n{"type":"done"}\n');
    const response = new Response(new ReadableStream({ start(controller) {
      for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    } }));
    let output = "";
    await readChatStream(response, (text) => { output = text; });
    expect(output).toBe("서울 여행");
  });

  it("rejects a stream that ends without a completion event", async () => {
    let output = "";
    await expect(readChatStream(new Response('{"type":"delta","text":"일부 답변"}\n'), text => { output = text; })).rejects.toThrow("before completion");
    expect(output).toBe("일부 답변");
  });
});
