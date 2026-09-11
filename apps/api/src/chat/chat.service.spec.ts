import { jest } from "@jest/globals";

import type { ChatMessage } from "@haetteum/contracts";

import type { ChatLlmPort } from "./chat.constants.js";
import { ChatService } from "./chat.service.js";

const userMessage: ChatMessage = { role: "user", content: "안녕" };

describe("ChatService", () => {
  it("returns provider_not_configured without calling the LLM when unconfigured", async () => {
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
    ).resolves.toEqual({
      status: "unavailable",
      reason: "provider_not_configured",
    });
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

  it("returns provider_unavailable when the LLM call fails", async () => {
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
    ).resolves.toEqual({
      status: "unavailable",
      reason: "provider_unavailable",
    });
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
