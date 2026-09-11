import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ChatPage from "@/app/chat/page";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("travel chat", () => {
  it("sends a suggested question and renders the reply", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
    vi.stubGlobal("fetch", async (_url: unknown, init: RequestInit) => {
      const { messages } = JSON.parse(init.body as string);
      return streamReply(`추천: ${messages[0].content}`);
    });
    const user = userEvent.setup();
    render(<ChatPage />);
    expect(screen.getByRole("link", { name: "홈으로 돌아가기" })).toHaveAttribute("href", "/");
    await user.click(screen.getByRole("button", { name: "서울 당일치기 코스 추천해줘" }));
    expect(await screen.findByText("추천: 서울 당일치기 코스 추천해줘")).toBeVisible();
  });

  it("retries the same conversation without duplicating the failed question", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
    let attempts = 0;
    vi.stubGlobal("fetch", async (_url: unknown, init: RequestInit) => {
      if (++attempts === 1) throw new Error("offline");
      const { messages } = JSON.parse(init.body as string);
      return streamReply(`질문 ${messages.length}개에 대한 답변`);
    });
    const user = userEvent.setup();
    render(<ChatPage />);
    await user.type(screen.getByRole("textbox", { name: "여행 질문" }), "제주 여행");
    await user.click(screen.getByRole("button", { name: "메시지 보내기" }));
    await user.click(await screen.findByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("질문 1개에 대한 답변")).toBeVisible();
    expect(screen.getAllByText("제주 여행")).toHaveLength(1);
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });
});

it("shows text before the stream completes", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
  let stream!: ReadableStreamDefaultController<Uint8Array>;
  const encoder = new TextEncoder();
  vi.stubGlobal("fetch", async () => new Response(new ReadableStream({ start(controller) { stream = controller; } })));
  const user = userEvent.setup();
  render(<ChatPage />);
  await user.click(screen.getByRole("button", { name: "서울 당일치기 코스 추천해줘" }));
  stream.enqueue(encoder.encode('{"type":"delta","text":"경복궁"}\n'));
  expect(await screen.findByText("경복궁")).toBeVisible();
  expect(screen.getByRole("button", { name: "메시지 보내기" })).toBeDisabled();
  stream.enqueue(encoder.encode('{"type":"delta","text":"을 추천해요."}\n{"type":"done"}\n'));
  stream.close();
  expect(await screen.findByText("경복궁을 추천해요.")).toBeVisible();
});

function streamReply(text: string) { return new Response(JSON.stringify({type: "delta", text}) + "\n" + JSON.stringify({type:"done"}) + "\n"); }
