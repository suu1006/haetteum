import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import AnthropicBedrock from "@anthropic-ai/bedrock-sdk";

import type { ChatMessage } from "@haetteum/contracts";

import type { ApiEnvironment } from "../config/environment.js";
import {
  CHAT_MAX_OUTPUT_TOKENS,
  ChatLlmError,
  DEFAULT_BEDROCK_MODEL_ID,
  type ChatLlmPort,
} from "./chat.constants.js";

@Injectable()
export class BedrockChatClient implements ChatLlmPort {
  private readonly enabled: boolean;
  private readonly region: string | undefined;
  private readonly modelId: string;
  private client: AnthropicBedrock | null = null;

  constructor(config: ConfigService<ApiEnvironment, true>) {
    this.enabled = config.get("CHAT_ENABLED", { infer: true });
    this.region = config.get("CHAT_AWS_REGION", { infer: true });
    this.modelId =
      config.get("CHAT_BEDROCK_MODEL_ID", { infer: true }) ??
      DEFAULT_BEDROCK_MODEL_ID;
  }

  isConfigured(): boolean {
    return this.enabled && this.region != null;
  }

  async complete(messages: readonly ChatMessage[]): Promise<string> {
    try {
      const response = await this.bedrockClient().messages.create({
        model: this.modelId,
        max_tokens: CHAT_MAX_OUTPUT_TOKENS,
        messages: messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      });

      const textBlock = response.content.find((block) => block.type === "text");

      return textBlock?.text ?? "";
    } catch (error) {
      throw new ChatLlmError(error);
    }
  }

  /// 자격증명이 없는 로컬 개발 환경에서 모듈 초기화가 실패하지 않도록
  /// 클라이언트를 첫 호출 시점까지 지연 생성한다.
  private bedrockClient(): AnthropicBedrock {
    this.client ??= new AnthropicBedrock({ awsRegion: this.region });
    return this.client;
  }
}
