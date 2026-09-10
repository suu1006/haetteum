import type { ChatMessage } from "@haetteum/contracts";

export const CHAT_LLM_PORT = Symbol("CHAT_LLM_PORT");

/// Anthropic Bedrock 계정에 아직 별도 모델을 요청하지 않았다면 이 기본값을 쓴다.
/// Haiku 4.5는 Bedrock 온디맨드 처리량을 지원하지 않아 리전 접두어(cross-region
/// inference profile)가 반드시 붙어야 한다. 서울(ap-northeast-2)은 apac 전용
/// inference profile이 아직 없어 global 접두어로 호출한다.
export const DEFAULT_BEDROCK_MODEL_ID =
  "global.anthropic.claude-haiku-4-5-20251001-v1:0";

export const CHAT_MAX_OUTPUT_TOKENS = 1024;

export interface ChatLlmPort {
  isConfigured(): boolean;
  complete(messages: readonly ChatMessage[]): Promise<string>;
}

export class ChatLlmError extends Error {
  constructor(cause: unknown) {
    super("Bedrock chat completion failed", { cause });
  }
}
