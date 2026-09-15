import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants.js";
import { jest } from "@jest/globals";

import type { ChatRequest, ChatResponse } from "@haetteum/contracts";

import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { ChatController } from "./chat.controller.js";

const CONVERSATION_ID = "22222222-2222-4222-8222-222222222222";

describe("ChatController.sendMessage", () => {
  it("returns the service reply with the reservation's conversation id and settles with it", async () => {
    const chat = {
      sendMessage: jest
        .fn<
          (request: ChatRequest) => Promise<{ status: "ready"; reply: string }>
        >()
        .mockResolvedValue({ status: "ready", reply: "안녕하세요" }),
    };
    const settle = jest
      .fn<(...args: unknown[]) => Promise<void>>()
      .mockResolvedValue(undefined);
    const controller = new ChatController(
      chat as never,
      {
        prepare: () =>
          Promise.resolve({
            subjectKey: "user:1",
            requestId: "id",
            attemptId: "attempt",
            conversationId: CONVERSATION_ID,
          }),
        settle,
      } as never,
      {} as never,
    );
    const request: ChatRequest = {
      messages: [{ role: "user", content: "안녕" }],
    };

    const response: ChatResponse = await controller.sendMessage(
      request,
      {} as never,
      {} as never,
    );

    expect(response).toEqual({
      status: "ready",
      reply: "안녕하세요",
      conversationId: CONVERSATION_ID,
    });
    expect(settle).toHaveBeenCalledWith(
      expect.objectContaining({ conversationId: CONVERSATION_ID }),
      "COMPLETED",
      "안녕하세요",
      "안녕",
    );
  });

  it("returns the cached reply's conversation id without calling the service", async () => {
    const chat = { sendMessage: jest.fn() };
    const controller = new ChatController(
      chat as never,
      {
        prepare: () =>
          Promise.resolve({
            subjectKey: "user:1",
            requestId: "id",
            attemptId: "attempt",
            conversationId: CONVERSATION_ID,
            reply: "캐시된 답변",
          }),
        settle: jest.fn(),
      } as never,
      {} as never,
    );
    const request: ChatRequest = {
      messages: [{ role: "user", content: "안녕" }],
    };

    const response = await controller.sendMessage(
      request,
      {} as never,
      {} as never,
    );

    expect(response).toEqual({
      status: "ready",
      reply: "캐시된 답변",
      conversationId: CONVERSATION_ID,
    });
    expect(chat.sendMessage).not.toHaveBeenCalled();
  });

  it("registers the shared chat request schema in a body validation pipe", () => {
    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      ChatController,
      "sendMessage",
    ) as Record<string, { pipes: unknown[] }>;
    const parameter = Object.values(args).find((arg) => arg.pipes.length > 0);
    const pipe = parameter?.pipes[0];

    expect(pipe).toBeInstanceOf(ZodValidationPipe);
  });
});

describe("ChatController conversations", () => {
  it("lists the current user's conversations through the conversation service", async () => {
    const conversations = {
      listForUser: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({
          items: [
            {
              id: CONVERSATION_ID,
              title: "서울 여행",
              updatedAt: new Date("2026-09-14T00:00:00.000Z"),
              preview: "안녕",
            },
          ],
          nextCursor: null,
        }),
      getMessages: jest.fn(),
    };
    const controller = new ChatController(
      {} as never,
      {} as never,
      conversations as never,
    );

    const result = await controller.listConversations(
      { id: "user-1" } as never,
      { limit: 12 },
    );

    expect(result).toEqual({
      items: [
        {
          id: CONVERSATION_ID,
          title: "서울 여행",
          updatedAt: "2026-09-14T00:00:00.000Z",
          preview: "안녕",
        },
      ],
      nextCursor: null,
    });
    expect(conversations.listForUser).toHaveBeenCalledWith("user-1", {
      limit: 12,
    });
  });

  it("returns a conversation's messages for its owner", async () => {
    const conversations = {
      listForUser: jest.fn(),
      getMessages: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue([{ role: "user", content: "안녕" }]),
    };
    const controller = new ChatController(
      {} as never,
      {} as never,
      conversations as never,
    );

    const result = await controller.getConversationMessages(
      { id: "user-1" } as never,
      { conversationId: CONVERSATION_ID },
    );

    expect(result).toEqual({
      conversationId: CONVERSATION_ID,
      messages: [{ role: "user", content: "안녕" }],
    });
    expect(conversations.getMessages).toHaveBeenCalledWith(
      "user-1",
      CONVERSATION_ID,
    );
  });
});
