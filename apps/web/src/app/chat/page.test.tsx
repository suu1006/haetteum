import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element -- 테스트에서는 next/image를 단순 태그로 대체한다.
    <img src={src} alt={alt} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

import ChatPage from "./page";

const CONVERSATION_ID = "11111111-1111-4111-8111-111111111111";

function ndjsonResponse(lines: object[]): Response {
  return new Response(lines.map((line) => JSON.stringify(line)).join("\n") + "\n", { status: 201 });
}

function requestBody(mock: ReturnType<typeof vi.fn>, callIndex: number): Record<string, unknown> {
  const [, init] = mock.mock.calls[callIndex] as [string, RequestInit];
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

async function send(question: string) {
  await userEvent.type(screen.getByLabelText("여행 질문"), question);
  // The send button stays disabled until the previous stream has settled.
  await waitFor(() => expect(screen.getByLabelText("메시지 보내기")).not.toBeDisabled());
  await userEvent.click(screen.getByLabelText("메시지 보내기"));
}

describe("ChatPage conversation id handling", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("omits the conversation id on the first send", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(ndjsonResponse([{ type: "delta", text: "안녕" }, { type: "done" }]));
    vi.stubGlobal("fetch", fetchMock);

    render(<ChatPage />);
    await send("서울 여행 추천해줘");

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.test/chat/messages/stream");
    const body = requestBody(fetchMock, 0);
    expect(body).not.toHaveProperty("conversationId");
    expect(body.messages).toEqual([{ role: "user", content: "서울 여행 추천해줘" }]);
  });

  it("sends the conversation id revealed by the meta event on the next message", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        ndjsonResponse([
          { type: "meta", conversationId: CONVERSATION_ID },
          { type: "delta", text: "안녕" },
          { type: "done" },
        ]),
      )
      .mockResolvedValueOnce(ndjsonResponse([{ type: "delta", text: "네" }, { type: "done" }]));
    vi.stubGlobal("fetch", fetchMock);

    render(<ChatPage />);
    await send("서울 여행 추천해줘");

    await screen.findByText("안녕");
    await send("다음 코스도 알려줘");

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(requestBody(fetchMock, 1).conversationId).toBe(CONVERSATION_ID);
  });
});
