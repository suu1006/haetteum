import { act, render, screen, waitFor } from "@testing-library/react";
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
    const ids: string[] = [];
    vi.stubGlobal("fetch", async (_url: unknown, init: RequestInit) => {
      ids.push(JSON.parse(init.body as string).requestId);
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
    expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(ids[1]).toBe(ids[0]);
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

it("sends session credentials and hides retry when the daily quota is exhausted", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
  let credentials: RequestCredentials | undefined;
  vi.stubGlobal("fetch", async (_url: unknown, init: RequestInit) => {
    credentials = init.credentials;
    return new Response(JSON.stringify({ code: "CHAT_DAILY_LIMIT", detail: "오늘 질문 횟수를 모두 사용했어요. 내일 다시 이용해 주세요.", resetsAt: "2026-09-12T15:00:00.000Z" }), { status: 429 });
  });
  const user = userEvent.setup();
  render(<ChatPage />);
  await user.click(screen.getByRole("button", { name: "서울 당일치기 코스 추천해줘" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("오늘 질문 횟수를 모두 사용했어요");
  expect(screen.queryByRole("button", { name: "다시 시도" })).not.toBeInTheDocument();
  expect(credentials).toBe("include");
  expect(screen.getByRole("textbox", { name: "여행 질문" })).toHaveAttribute("maxlength", "2000");
});

it("keeps older questions visible while only sending the last four pairs", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
  const histories: { role: string; content: string }[][] = [];
  vi.stubGlobal("fetch", async (_url: unknown, init: RequestInit) => {
    histories.push(JSON.parse(init.body as string).messages);
    return streamReply("답변");
  });
  const user = userEvent.setup();
  render(<ChatPage />);
  for (let i = 1; i <= 6; i++) {
    await user.type(screen.getByRole("textbox", { name: "여행 질문" }), `질문${i}`);
    await user.click(screen.getByRole("button", { name: "메시지 보내기" }));
    await waitFor(() => expect(screen.getAllByText("답변")).toHaveLength(i));
    await waitFor(() => expect(screen.queryByText("답변을 작성하고 있어요…")).not.toBeInTheDocument());
  }
  expect(histories[5]).toHaveLength(9);
  expect(histories[5][0]).toEqual({ role: "user", content: "질문2" });
  expect(histories[5][8]).toEqual({ role: "user", content: "질문6" });
  expect(screen.getByText("질문1")).toBeVisible();
});

it("offers login without retrying when the session has expired", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
  vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ code: "UNAUTHENTICATED" }), { status: 401 }));
  const user = userEvent.setup();
  render(<ChatPage />);
  await user.click(screen.getByRole("button", { name: "서울 당일치기 코스 추천해줘" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("로그인 후");
  expect(screen.getByRole("link", { name: "로그인하기" })).toHaveAttribute("href", "/login?returnTo=%2Fchat");
  expect(screen.queryByRole("button", { name: "다시 시도" })).not.toBeInTheDocument();
});

it.each([
  [502, "AI 답변 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요."],
  [503, "현재 챗봇을 사용할 수 없습니다."],
  [504, "답변 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요."],
] as const)("shows the %i message and permits retry", async (status, message) => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
  vi.stubGlobal("fetch", async () => new Response(null, { status }));
  const user = userEvent.setup();
  render(<ChatPage />);
  await user.click(screen.getByRole("button", { name: "서울 당일치기 코스 추천해줘" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(message);
  expect(screen.getByRole("button", { name: "다시 시도" })).toBeEnabled();
});
it("maps browser timeouts to the timeout message", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
  vi.stubGlobal("fetch", async () => { throw new DOMException("timeout", "TimeoutError"); });
  const user = userEvent.setup();
  render(<ChatPage />);
  await user.click(screen.getByRole("button", { name: "서울 당일치기 코스 추천해줘" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("답변 시간이 오래 걸리고 있습니다.");
});
it("restores a rejected question for editing instead of retrying the same invalid input", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
  let attempts = 0;
  const histories: unknown[] = [];
  vi.stubGlobal("fetch", async (_url: unknown, init: RequestInit) => {
    histories.push(JSON.parse(init.body as string));
    return ++attempts === 1 ? new Response(null, { status: 400 }) : streamReply("추천 답변");
  });
  const user = userEvent.setup();
  render(<ChatPage />);
  await user.type(screen.getByRole("textbox", { name: "여행 질문" }), "수정할 질문");
  await user.click(screen.getByRole("button", { name: "메시지 보내기" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("질문이 너무 깁니다.");
  expect(screen.getByRole("textbox", { name: "여행 질문" })).toHaveValue("수정할 질문");
  expect(screen.queryByRole("button", { name: "다시 시도" })).not.toBeInTheDocument();
  await user.clear(screen.getByRole("textbox", { name: "여행 질문" }));
  await user.type(screen.getByRole("textbox", { name: "여행 질문" }), "서울");
  await user.click(screen.getByRole("button", { name: "메시지 보내기" }));
  expect(await screen.findByText("추천 답변")).toBeVisible();
  expect(histories[1]).toEqual({ requestId: expect.any(String), messages: [{ role: "user", content: "서울" }] });
});

it("preserves a received provider error when timeout fires during text animation", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
  const timeout = new AbortController();
  const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeout.signal);
  let paint: FrameRequestCallback | undefined;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { paint = callback; return 1; });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  vi.stubGlobal("fetch", async () => new Response('{"type":"delta","text":"부분"}\n{"type":"error","status":502,"message":"provider failed"}\n'));
  try {
    const user = userEvent.setup();
    render(<ChatPage />);
    await user.click(screen.getByRole("button", { name: "서울 당일치기 코스 추천해줘" }));
    await waitFor(() => expect(paint).toBeTypeOf("function"));
    timeout.abort(new DOMException("timeout", "TimeoutError"));
    await act(async () => { for (let i = 0; i < 5; i++) paint?.(i * 32); });
    expect(await screen.findByRole("alert")).toHaveTextContent("AI 답변 생성 중 문제가 발생했습니다.");
  } finally { timeoutSpy.mockRestore(); }
});

it("maps a timed-out response body AbortError to 504", async () => {
  vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://localhost:4000/api/v1");
  const timeout = new AbortController();
  const timeoutSpy = vi.spyOn(AbortSignal, "timeout").mockReturnValue(timeout.signal);
  vi.stubGlobal("fetch", async () => new Response(new ReadableStream({ start(controller) {
    timeout.signal.addEventListener("abort", () => controller.error(new DOMException("aborted", "AbortError")), { once: true });
  } })));
  try {
    const user = userEvent.setup();
    render(<ChatPage />);
    await user.click(screen.getByRole("button", { name: "서울 당일치기 코스 추천해줘" }));
    timeout.abort(new DOMException("timeout", "TimeoutError"));
    expect(await screen.findByRole("alert")).toHaveTextContent("답변 시간이 오래 걸리고 있습니다.");
  } finally { timeoutSpy.mockRestore(); }
});
