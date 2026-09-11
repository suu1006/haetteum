import type { Response } from "express";

import { Body, Controller, Post, Res } from "@nestjs/common";

import {
  ChatRequestSchema,
  type ChatRequest,
  type ChatResponse,
} from "@haetteum/contracts";

import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { ChatService } from "./chat.service.js";

@Controller({ path: "chat", version: "1" })
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Post("messages/stream")
  async streamMessage(
    @Body(new ZodValidationPipe(ChatRequestSchema)) request: ChatRequest,
    @Res() response: Response,
  ): Promise<void> {
    const abort = new AbortController();
    const onClose = () => abort.abort();
    response.on("close", onClose);
    response.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders();
    try {
      for await (const event of this.chat.streamMessage(
        request,
        abort.signal,
      )) {
        if (response.destroyed) break;
        response.write(JSON.stringify(event) + "\n");
      }
    } finally {
      response.off("close", onClose);
      abort.abort();
      response.end();
    }
  }

  @Post("messages")
  sendMessage(
    @Body(new ZodValidationPipe(ChatRequestSchema)) request: ChatRequest,
  ): Promise<ChatResponse> {
    return this.chat.sendMessage(request);
  }
}
