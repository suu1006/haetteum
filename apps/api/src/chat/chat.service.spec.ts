import { jest } from "@jest/globals";

import type { ChatMessage } from "@haetteum/contracts";

import { ChatLlmError, type ChatLlmPort } from "./chat.constants.js";
import { ChatService } from "./chat.service.js";

const userMessage: ChatMessage = { role: "user", content: "안녕" };

describe("ChatService", () => {
  it("rejects with 503 without calling the LLM when unconfigured", async () => {
    const complete = jest.fn<ChatLlmPort["complete"]>();
    const llm: ChatLlmPort = {
      stream: async function* () {
        yield await Promise.resolve("안녕");
      },
      isConfigured: () => false,
      complete,
    };
    const service = new ChatService(llm);

    await expect(
      service.sendMessage({ messages: [userMessage] }),
    ).rejects.toMatchObject({ status: 503 });
    expect(complete).not.toHaveBeenCalled();
  });

  it("returns the LLM reply when configured", async () => {
    const llm: ChatLlmPort = {
      stream: async function* () {
        yield await Promise.resolve("안녕");
      },
      isConfigured: () => true,
      complete: jest
        .fn<ChatLlmPort["complete"]>()
        .mockResolvedValue("안녕하세요"),
    };
    const service = new ChatService(llm);

    await expect(
      service.sendMessage({ messages: [userMessage] }),
    ).resolves.toEqual({ status: "ready", reply: "안녕하세요" });
  });

  it("rejects with 502 when the LLM call fails", async () => {
    const llm: ChatLlmPort = {
      stream: async function* () {
        yield await Promise.resolve("안녕");
      },
      isConfigured: () => true,
      complete: jest
        .fn<ChatLlmPort["complete"]>()
        .mockRejectedValue(new Error("boom")),
    };
    const service = new ChatService(llm);

    await expect(
      service.sendMessage({ messages: [userMessage] }),
    ).rejects.toMatchObject({ status: 502 });
  });
});

it("forwards incremental text and marks completion", async () => {
  const service = new ChatService({
    isConfigured: () => true,
    complete: () => Promise.resolve("unused"),
    stream: async function* () {
      yield await Promise.resolve("서울");
      yield " 여행";
    },
  });
  const stream = service.streamMessage(
    { messages: [userMessage] },
    new AbortController().signal,
  );
  expect((await stream.next()).value).toEqual({ type: "delta", text: "서울" });
  expect((await stream.next()).value).toEqual({ type: "delta", text: " 여행" });
  expect((await stream.next()).value).toEqual({ type: "done" });
});

it("reports an interrupted provider stream without marking it complete", async () => {
  const service = new ChatService({
    isConfigured: () => true,
    complete: () => Promise.resolve("unused"),
    stream: async function* () {
      yield await Promise.resolve("서울");
      throw new Error("connection lost");
    },
  });
  const events = [];
  for await (const event of service.streamMessage(
    { messages: [userMessage] },
    new AbortController().signal,
  ))
    events.push(event);
  expect(events.map((event) => event.type)).toEqual(["delta", "error"]);
});

it("bounds history for both provider call paths", async () => {
  const histories: (readonly ChatMessage[])[] = [];
  const service = new ChatService({
    isConfigured: () => true,
    complete: (messages) => {
      histories.push(messages);
      return Promise.resolve("답변");
    },
    stream: async function* (messages) {
      histories.push(messages);
      yield await Promise.resolve("답변");
    },
  });
  const messages: ChatMessage[] = [
    ...Array.from({ length: 6 }, () => [
      { role: "user" as const, content: "질문" },
      { role: "assistant" as const, content: "답변" },
    ]).flat(),
    { role: "user", content: "현재" },
  ];
  await service.sendMessage({ messages });
  for await (const event of service.streamMessage(
    { messages },
    new AbortController().signal,
  ))
    void event;
  expect(histories).toEqual([messages.slice(4), messages.slice(4)]);
});

it.each(["TimeoutError", "APIConnectionTimeoutError", "ModelTimeoutException"])(
  "maps nested %s provider errors to 504",
  async (name) => {
    const cause = new Error("private provider details");
    cause.name = name;
    const service = new ChatService({
      isConfigured: () => true,
      complete: () => Promise.reject(new ChatLlmError(cause)),
      stream: async function* () {
        yield await Promise.reject(new ChatLlmError(cause));
      },
    });
    await expect(
      service.sendMessage({ messages: [userMessage] }),
    ).rejects.toMatchObject({ status: 504 });
    const stream = service.streamMessage(
      { messages: [userMessage] },
      new AbortController().signal,
    );
    expect((await stream.next()).value).toMatchObject({
      type: "error",
      status: 504,
    });
    await stream.return();
  },
);

it("times out a completion even when the provider ignores cancellation", async () => {
  jest.useFakeTimers();
  let providerSignal: AbortSignal | undefined;
  const service = new ChatService({
    isConfigured: () => true,
    complete: (_messages, signal) => {
      providerSignal = signal;
      return new Promise(() => {});
    },
    stream: async function* () {
      yield await Promise.resolve("unused");
    },
  });
  try {
    const result = expect(
      service.sendMessage({ messages: [userMessage] }),
    ).rejects.toMatchObject({ status: 504 });
    await jest.advanceTimersByTimeAsync(55_000);
    await result;
    expect(providerSignal?.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  } finally {
    jest.useRealTimers();
  }
});

it("reports 504 after partial text if a stream stalls", async () => {
  jest.useFakeTimers();
  const service = new ChatService({
    isConfigured: () => true,
    complete: () => Promise.resolve("unused"),
    stream: async function* () {
      yield "부분 답변";
      await new Promise(() => {});
    },
  });
  const stream = service.streamMessage(
    { messages: [userMessage] },
    new AbortController().signal,
  );
  try {
    expect((await stream.next()).value).toMatchObject({
      type: "delta",
      text: "부분 답변",
    });
    const next = stream.next();
    await jest.advanceTimersByTimeAsync(55_000);
    expect((await next).value).toMatchObject({ type: "error", status: 504 });
    await stream.return();
    expect(jest.getTimerCount()).toBe(0);
  } finally {
    jest.useRealTimers();
  }
});

it("does not emit a timeout or provider error when the caller disconnects", async () => {
  const abort = new AbortController();
  const service = new ChatService({
    isConfigured: () => true,
    complete: () => Promise.resolve("unused"),
    stream: async function* () {
      yield "부분";
      await new Promise(() => {});
    },
  });
  const stream = service.streamMessage(
    { messages: [userMessage] },
    abort.signal,
  );
  await stream.next();
  const next = stream.next();
  abort.abort();
  expect(await next).toEqual({ done: true, value: undefined });
});
