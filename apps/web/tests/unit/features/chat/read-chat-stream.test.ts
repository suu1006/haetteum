import { describe, expect, it } from "vitest";
import { ChatRequestError, readChatStream } from "@/features/chat/read-chat-stream";

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
    await expect(readChatStream(new Response('{"type":"delta","text":"일부 답변"}\n'), text => { output = text; })).rejects.toMatchObject({ status: 502 });
    expect(output).toBe("일부 답변");
  });
});

it.each([
  [400, "질문이 너무 깁니다."],
  [429, "오늘 질문 횟수를 모두 사용했어요. 내일 다시 이용해 주세요."],
  [503, "현재 챗봇을 사용할 수 없습니다."],
  [504, "답변 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요."],
  [502, "AI 답변 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."],
] as const)("maps HTTP %i to its safe message even for an HTML proxy response", async (status, message) => {
  await expect(readChatStream(new Response("<html>upstream credentials</html>", { status }), () => {})).rejects.toMatchObject({ status, message });
});
it.each([502, 503, 504])("preserves stream error status %i after partial text", async (status) => {
  let output = "";
  const response = new Response(JSON.stringify({ type: "delta", text: "부분 답변" }) + "\n" + JSON.stringify({ type: "error", status, message: "AWS private error" }) + "\n");
  await expect(readChatStream(response, text => { output = text; })).rejects.toMatchObject({ status });
  expect(output).toBe("부분 답변");
});
it("permits retry only for temporary errors", () => {
  for (const status of [502, 503, 504]) expect(new ChatRequestError(status).retryable).toBe(true);
  for (const status of [400, 401, 429]) expect(new ChatRequestError(status).retryable).toBe(false);
});
