import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  CHAT_ERRORS,
  selectChatContext,
  type ChatRequest,
  type ChatResponse,
  type ChatStreamEvent,
} from "@haetteum/contracts";
import { CHAT_LLM_PORT, type ChatLlmPort } from "./chat.constants.js";
import { ChatDeadline } from "./chat-deadline.js";
import { chatHttpError, providerErrorStatus } from "./chat-errors.js";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(@Inject(CHAT_LLM_PORT) private readonly llm: ChatLlmPort) {}

  async *streamMessage(
    request: ChatRequest,
    signal: AbortSignal,
  ): AsyncGenerator<ChatStreamEvent, void> {
    if (signal.aborted) return;
    if (!this.llm.isConfigured()) {
      yield { type: "error", status: 503, message: CHAT_ERRORS[503].message };
      return;
    }
    const deadline = new ChatDeadline(signal);
    let iterator: AsyncIterator<string> | undefined;
    try {
      iterator = this.llm
        .stream(selectChatContext(request.messages), deadline.signal)
        [Symbol.asyncIterator]();
      const source = iterator;
      let hasText = false;
      while (true) {
        const chunk = await deadline.run(() => source.next());
        if (chunk.done) break;
        hasText ||= chunk.value.trim().length > 0;
        yield { type: "delta", text: chunk.value };
      }
      if (!hasText) throw new Error("Empty response");
      yield { type: "done" };
    } catch (error) {
      if (signal.aborted) return;
      const status = providerErrorStatus(error);
      this.logger.warn(`Chat stream failed status=${status}`);
      yield { type: "error", status, message: CHAT_ERRORS[status].message };
    } finally {
      deadline.dispose();
      // Do not wait forever for an upstream iterator that ignores cancellation.
      if (iterator?.return) void iterator.return().catch(() => undefined);
    }
  }

  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    if (!this.llm.isConfigured()) throw chatHttpError(503);
    const deadline = new ChatDeadline();
    try {
      const reply = await deadline.run(() =>
        this.llm.complete(selectChatContext(request.messages), deadline.signal),
      );
      if (!reply.trim()) throw new Error("Empty response");
      return { status: "ready", reply };
    } catch (error) {
      const status = providerErrorStatus(error);
      this.logger.warn(`Chat completion failed status=${status}`);
      throw chatHttpError(status);
    } finally {
      deadline.dispose();
    }
  }
}
