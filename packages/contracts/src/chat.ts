import { z } from "zod";

export const CHAT_MAX_QUESTION_CHARS = 2000;
export const CHAT_MAX_CONTEXT_CHARS = 12000;
export const CHAT_MAX_CONTEXT_MESSAGES = 9;

export const ChatMessageRoleSchema = z.enum(["user", "assistant"]);

export const ChatMessageSchema = z.object({
  role: ChatMessageRoleSchema,
  content: z.string().trim().min(1).max(CHAT_MAX_CONTEXT_CHARS),
}).refine((message) => message.role !== "user" || message.content.length <= CHAT_MAX_QUESTION_CHARS, {
  message: "질문은 2,000자 이내로 입력해 주세요.",
  path: ["content"],
});

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1).max(101).refine(
    (messages) => messages.length % 2 === 1 && messages.every((message, index) => message.role === (index % 2 === 0 ? "user" : "assistant")),
    "대화는 사용자 질문과 답변이 번갈아 나오고 사용자 질문으로 끝나야 합니다.",
  ),
});

export const ChatResponseSchema = z.object({
  status: z.literal("ready"),
  reply: z.string(),
});

export type ChatMessageRole = z.infer<typeof ChatMessageRoleSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

/** Validated, alternating conversation; retain whole pairs and the latest question. */
export function selectChatContext(messages: readonly ChatMessage[]): ChatMessage[] {
  const context = messages.slice(-CHAT_MAX_CONTEXT_MESSAGES);
  let chars = context.reduce((total, message) => total + message.content.length, 0);
  while (context.length > 1 && chars > CHAT_MAX_CONTEXT_CHARS) {
    chars -= context[0].content.length + context[1].content.length;
    context.splice(0, 2);
  }
  return context;
}
