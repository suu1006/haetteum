import type { Request, Response } from "express";

import { Body, Controller, Post, Req, Res, UseGuards } from "@nestjs/common";

import { type ChatRequest, type ChatResponse } from "@haetteum/contracts";

import { ChatRequestPipe } from "./chat-request.pipe.js";
import { chatHttpError } from "./chat-errors.js";
import { ChatService } from "./chat.service.js";
import { ChatAccessService } from "./chat-access.service.js";
import { SameOriginGuard } from "../auth/same-origin.guard.js";

@Controller({ path: "chat", version: "1" })
@UseGuards(SameOriginGuard)
export class ChatController {
  constructor(
    private readonly chat: ChatService,
    private readonly access: ChatAccessService,
  ) {}

  @Post("messages/stream")
  async streamMessage(
    @Body(new ChatRequestPipe()) request: ChatRequest,
    @Res() response: Response,
    @Req() incomingRequest: Request,
  ): Promise<void> {
    await this.access.prepare(incomingRequest, response);
    if (response.destroyed) return;
    const abort = new AbortController();
    const onClose = () => abort.abort();
    response.on("close", onClose);
    const events = this.chat.streamMessage(request, abort.signal);
    try {
      // HTTP status can only change before headers are sent.
      const first = await events.next();
      if (response.destroyed) return;
      if (first.done) throw chatHttpError(502);
      if (first.value.type === "error") throw chatHttpError(first.value.status);
      response.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
      response.setHeader("Cache-Control", "no-cache, no-transform");
      response.setHeader("X-Accel-Buffering", "no");
      response.flushHeaders();
      response.write(JSON.stringify(first.value) + "\n");
      for await (const event of events) {
        if (response.destroyed) break;
        response.write(JSON.stringify(event) + "\n");
      }
    } finally {
      response.off("close", onClose);
      abort.abort();
      await events.return(undefined);
      if (response.headersSent && !response.writableEnded) response.end();
    }
  }

  @Post("messages")
  async sendMessage(
    @Body(new ChatRequestPipe()) request: ChatRequest,
    @Req() incomingRequest: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ChatResponse> {
    await this.access.prepare(incomingRequest, response);
    return this.chat.sendMessage(request);
  }
}
