import { z } from "zod";

import { ChatMessageSchema } from "./chat.js";

export const CHAT_CONVERSATIONS_DEFAULT_LIMIT = 12;
export const CHAT_CONVERSATIONS_MAX_LIMIT = 30;

export const ListChatConversationsQuerySchema = z.object({
  cursor: z.coerce.number().int().nonnegative().optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(CHAT_CONVERSATIONS_MAX_LIMIT)
    .default(CHAT_CONVERSATIONS_DEFAULT_LIMIT),
});

export const ChatConversationSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
  updatedAt: z.iso.datetime(),
  preview: z.string(),
});

export const ChatConversationListResponseSchema = z.object({
  items: z.array(ChatConversationSummarySchema),
  nextCursor: z.number().int().nonnegative().nullable(),
});

export const ChatConversationIdParamsSchema = z.object({
  conversationId: z.uuid(),
});

export const ChatConversationMessagesResponseSchema = z.object({
  conversationId: z.uuid(),
  messages: z.array(ChatMessageSchema),
});

export type ListChatConversationsQuery = z.infer<typeof ListChatConversationsQuerySchema>;
export type ChatConversationSummary = z.infer<typeof ChatConversationSummarySchema>;
export type ChatConversationListResponse = z.infer<typeof ChatConversationListResponseSchema>;
export type ChatConversationIdParams = z.infer<typeof ChatConversationIdParamsSchema>;
export type ChatConversationMessagesResponse = z.infer<typeof ChatConversationMessagesResponseSchema>;
