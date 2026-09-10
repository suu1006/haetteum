import { jest } from "@jest/globals";

import type { ChatMessage } from "@haetteum/contracts";

import type { ChatLlmPort } from "./chat.constants.js";
import { ChatService } from "./chat.service.js";

const userMessage: ChatMessage = { role: "user", content: "안녕" };

describe("ChatService", () => {
  it("returns provider_not_configured without calling the LLM when unconfigured", async () => {
    const complete = jest.fn<ChatLlmPort["complete"]>();
    const llm: ChatLlmPort = {
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
