import { Module } from "@nestjs/common";

import { BedrockChatClient } from "./bedrock-chat.client.js";
import { CHAT_LLM_PORT } from "./chat.constants.js";
import { ChatController } from "./chat.controller.js";
import { ChatService } from "./chat.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { ChatAccessService } from "./chat-access.service.js";
import { CHAT_QUOTA_CLOCK, ChatQuotaService } from "./chat-quota.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ChatController],
  providers: [
    ChatAccessService,
    ChatQuotaService,
    { provide: CHAT_QUOTA_CLOCK, useValue: Date.now },
    ChatService,
    BedrockChatClient,
    { provide: CHAT_LLM_PORT, useExisting: BedrockChatClient },
  ],
})
export class ChatModule {}
