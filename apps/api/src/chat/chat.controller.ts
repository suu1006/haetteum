import { Body, Controller, Post } from "@nestjs/common";

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

  @Post("messages")
  sendMessage(
    @Body(new ZodValidationPipe(ChatRequestSchema)) request: ChatRequest,
  ): Promise<ChatResponse> {
    return this.chat.sendMessage(request);
  }
}
