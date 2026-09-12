import type { Request, Response } from "express";

import {
  Body,
  Controller,
  HttpException,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";

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
    const reservation = await this.access.prepare(
      incomingRequest,
      response,
      request,
    );
    const abort = new AbortController();
    const onClose = () => abort.abort();
    response.on("close", onClose);
    const events = this.chat.streamMessage(request, abort.signal);
    let settled = reservation.reply !== undefined;
    let reply = "";
    let failed = false;
    const write = (event: object) => {
      if (response.destroyed) return;
      if (!response.headersSent) {
        response.setHeader(
          "Content-Type",
          "application/x-ndjson; charset=utf-8",
        );
        response.setHeader("Cache-Control", "no-cache, no-transform");
        response.setHeader("X-Accel-Buffering", "no");
        response.flushHeaders();
      }
      response.write(JSON.stringify(event) + "\n");
    };
    try {
      if (response.destroyed) return;
      if (reservation.reply !== undefined) {
        write({ type: "delta", text: reservation.reply });
        write({ type: "done" });
        return;
      }
      for await (const event of events) {
        if (event.type === "delta") reply += event.text;
        if (event.type === "done") {
          await this.access.settle(reservation, "COMPLETED", reply);
          settled = true;
        } else if (event.type === "error") {
          await this.access.settle(reservation, "REFUNDED");
          settled = true;
          if (!response.headersSent) throw chatHttpError(event.status);
        }
        if (response.destroyed) break;
        write(event);
      }
    } catch (error) {
      failed = true;
      // A transient DB error gets one idempotent recovery attempt. Persistent
      // failures remain RESERVED for reconciliation, never user CANCELLED.
      if (!settled) {
        await this.access.settle(reservation, "REFUNDED");
        settled = true;
      }
      if (!response.headersSent)
        throw error instanceof HttpException ? error : chatHttpError(503);
      write({
        type: "error",
        status: 503,
        message: "현재 챗봇을 사용할 수 없습니다.",
      });
    } finally {
      response.off("close", onClose);
      abort.abort();
      await events.return(undefined);
      try {
        if (!settled && !failed)
          await this.access.settle(reservation, "CANCELLED");
      } finally {
        if (response.headersSent && !response.writableEnded) response.end();
      }
    }
  }

  @Post("messages")
  async sendMessage(
    @Body(new ChatRequestPipe()) request: ChatRequest,
    @Req() incomingRequest: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ChatResponse> {
    const reservation = await this.access.prepare(
      incomingRequest,
      response,
      request,
    );
    if (reservation.reply !== undefined)
      return { status: "ready", reply: reservation.reply };
    try {
      const result = await this.chat.sendMessage(request);
      await this.access.settle(reservation, "COMPLETED", result.reply);
      return result;
    } catch (error) {
      await this.access.settle(reservation, "REFUNDED");
      throw error;
    }
  }
}
