import { z } from "zod";

export const ChatMessageRoleSchema = z.enum(["user", "assistant"]);

export const ChatMessageSchema = z.object({
  role: ChatMessageRoleSchema,
  content: z.string().min(1),
});

export const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema).min(1),
});

/// unavailable은 provider 미설정(로컬 개발) 또는 Bedrock 호출 실패를 모두 가린다 —
/// 기존 GeneratedCourseResponse와 같은 이유로 원인을 사용자에게 노출하지 않는다.
export const ChatResponseSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("ready"),
    reply: z.string(),
  }),
  z.object({
    status: z.literal("unavailable"),
    reason: z.enum(["provider_not_configured", "provider_unavailable"]),
  }),
]);

export type ChatMessageRole = z.infer<typeof ChatMessageRoleSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
