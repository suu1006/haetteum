import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants.js";
import { jest } from "@jest/globals";

import type { ChatRequest, ChatResponse } from "@haetteum/contracts";

import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { ChatController } from "./chat.controller.js";

describe("ChatController", () => {
  it("passes the validated request to the service and returns its response", async () => {
    const response: ChatResponse = { status: "ready", reply: "안녕하세요" };
    const chat = {
      sendMessage: jest
        .fn<(request: ChatRequest) => Promise<ChatResponse>>()
        .mockResolvedValue(response),
    };
    const controller = new ChatController(
      chat as never,
      {
        prepare: () =>
          Promise.resolve({
            subjectKey: "user:1",
            requestId: "id",
            attemptId: "attempt",
          }),
        settle: () => Promise.resolve(),
      } as never,
    );
    const request: ChatRequest = {
      messages: [{ role: "user", content: "안녕" }],
    };

    await expect(
      controller.sendMessage(request, {} as never, {} as never),
    ).resolves.toBe(response);
    expect(chat.sendMessage).toHaveBeenCalledWith(request);
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
