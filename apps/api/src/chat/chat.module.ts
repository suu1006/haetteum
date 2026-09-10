import { Module } from "@nestjs/common";

import { BedrockChatClient } from "./bedrock-chat.client.js";
import { CHAT_LLM_PORT } from "./chat.constants.js";
import { ChatController } from "./chat.controller.js";
import { ChatService } from "./chat.service.js";

@Module({
  controllers: [ChatController],
  providers: [
    ChatService,
    BedrockChatClient,
    { provide: CHAT_LLM_PORT, useExisting: BedrockChatClient },
  ],
})
export class ChatModule {}
