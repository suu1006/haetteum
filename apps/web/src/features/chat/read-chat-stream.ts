import { z } from "zod";

import { CHAT_ERRORS, ChatErrorStatusSchema, ChatStreamEventSchema, type ChatErrorStatus } from "@haetteum/contracts";

const requestErrorSchema = z.object({
  code: z.string(),
  resetsAt: z.iso.datetime().optional(),
});

export class ChatRequestError extends Error {
  readonly status: ChatErrorStatus;
  constructor(status: number, readonly resetsAt?: string) {
    const safeStatus = ChatErrorStatusSchema.safeParse(status === 413 ? 400 : status);
    const normalized = safeStatus.success ? safeStatus.data : 502;
    super(CHAT_ERRORS[normalized].message);
    this.status = normalized;
  }
  get retryable(): boolean { return this.status === 502 || this.status === 503 || this.status === 504; }
}

export function toChatRequestError(error: unknown): ChatRequestError {
  if (error instanceof ChatRequestError) return error;
  if (typeof error === "object" && error !== null && "name" in error && error.name === "TimeoutError") return new ChatRequestError(504);
  if (error instanceof TypeError) return new ChatRequestError(503);
  return new ChatRequestError(502);
}

export async function readChatStream(response: Response, onText: (text: string) => void) {
  if (!response.ok) {
    if (response.status === 429) {
      const problem = requestErrorSchema.safeParse(await response.json().catch(() => null));
      throw new ChatRequestError(429, problem.success ? problem.data.resetsAt : undefined);
    }
    throw new ChatRequestError(response.status === 500 ? 503 : response.status);
  }
  if (!response.body) throw new ChatRequestError(502);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      let newline: number;
      while ((newline = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (!line) continue;
        const event = ChatStreamEventSchema.parse(JSON.parse(line));
        if (event.type === "error") throw new ChatRequestError(event.status);
        if (event.type === "done") {
          if (!text.trim()) throw new ChatRequestError(502);
          return;
        }
        text += event.text;
        onText(text);
      }
      if (chunk.done) throw new ChatRequestError(502);
    }
  } catch (error) {
    // The caller knows whether AbortError was a timeout or intentional navigation.
    if (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError") throw error;
    throw toChatRequestError(error);
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
