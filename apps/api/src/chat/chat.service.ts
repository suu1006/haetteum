import { Inject, Injectable, Logger } from "@nestjs/common";

import type { ChatRequest, ChatResponse } from "@haetteum/contracts";

import { CHAT_LLM_PORT, type ChatLlmPort } from "./chat.constants.js";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(@Inject(CHAT_LLM_PORT) private readonly llm: ChatLlmPort) {}

  async *streamMessage(request: ChatRequest, signal: AbortSignal) {
    if (!this.llm.isConfigured()) {
      yield { type: "error", message: "챗봇을 사용할 수 없습니다." };
      return;
    }
    try {
      let hasText = false;
      for await (const text of this.llm.stream(request.messages, signal)) {
        if (signal.aborted) return;
        hasText ||= text.trim().length > 0;
        yield { type: "delta", text };
      }
      if (!hasText) throw new Error("Empty response");
      yield { type: "done" };
    } catch (error) {
      if (signal.aborted) return;
      this.logger.error("Chat stream failed", error);
      yield {
        type: "error",
        message: "답변이 중단되었습니다. 다시 시도해 주세요.",
      };
    }
  }

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
