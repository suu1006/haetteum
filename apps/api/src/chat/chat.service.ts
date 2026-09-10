import { Inject, Injectable, Logger } from "@nestjs/common";

import type { ChatRequest, ChatResponse } from "@haetteum/contracts";

import { CHAT_LLM_PORT, type ChatLlmPort } from "./chat.constants.js";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(@Inject(CHAT_LLM_PORT) private readonly llm: ChatLlmPort) {}

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    if (!this.llm.isConfigured()) {
      return { status: "unavailable", reason: "provider_not_configured" };
    }

    try {
      const reply = await this.llm.complete(request.messages);
      return { status: "ready", reply };
    } catch (error) {
      this.logger.error("Chat completion failed", error);
      return { status: "unavailable", reason: "provider_unavailable" };
    }
  }
}
