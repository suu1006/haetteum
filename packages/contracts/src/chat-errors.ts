import { z } from "zod";

export const CHAT_ERRORS = {
  400: { code: "CHAT_INVALID_INPUT", message: "질문이 너무 깁니다." },
  401: { code: "UNAUTHENTICATED", message: "챗봇은 로그인 후 이용할 수 있어요. 다시 로그인해 주세요." },
  409: { code: "CHAT_REQUEST_CONFLICT", message: "이미 처리 중이거나 다시 실행할 수 없는 요청입니다." },
  429: { code: "CHAT_DAILY_LIMIT", message: "오늘 질문 횟수를 모두 사용했어요. 내일 다시 이용해 주세요." },
  502: { code: "CHAT_PROVIDER_ERROR", message: "AI 답변 생성 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요." },
  503: { code: "CHAT_UNAVAILABLE", message: "현재 챗봇을 사용할 수 없습니다." },
  504: { code: "CHAT_TIMEOUT", message: "답변 시간이 오래 걸리고 있습니다. 잠시 후 다시 시도해 주세요." },
} as const;

export const ChatErrorStatusSchema = z.union([
  z.literal(400), z.literal(401), z.literal(409), z.literal(429), z.literal(502), z.literal(503), z.literal(504),
]);
export type ChatErrorStatus = z.infer<typeof ChatErrorStatusSchema>;

export const ChatStreamEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("delta"), text: z.string() }),
  z.object({ type: z.literal("done") }),
  z.object({ type: z.literal("error"), status: ChatErrorStatusSchema, message: z.string() }),
]);
export type ChatStreamEvent = z.infer<typeof ChatStreamEventSchema>;
