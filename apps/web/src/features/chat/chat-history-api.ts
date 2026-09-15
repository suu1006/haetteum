import {
  ChatConversationListResponseSchema,
  ChatConversationMessagesResponseSchema,
  type ChatConversationListResponse,
  type ChatConversationMessagesResponse,
} from "@haetteum/contracts";

import { getApiBaseUrl } from "@/lib/api-base";

export class ChatHistoryError extends Error {}

async function getJson<T>(path: string, schema: { parse: (value: unknown) => T }): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new ChatHistoryError("API 서버에 연결할 수 없습니다.");
  const response = await fetch(`${baseUrl}${path}`, { credentials: "include" });
  if (!response.ok) throw new ChatHistoryError("대화 정보를 불러오지 못했습니다.");
  return schema.parse(await response.json());
}

export function listChatConversations(cursor?: number): Promise<ChatConversationListResponse> {
  const query = cursor !== undefined ? `?cursor=${cursor}` : "";
  return getJson(`/chat/conversations${query}`, ChatConversationListResponseSchema);
}

export function getChatConversationMessages(
  conversationId: string,
): Promise<ChatConversationMessagesResponse> {
  return getJson(
    `/chat/conversations/${conversationId}/messages`,
    ChatConversationMessagesResponseSchema,
  );
}
