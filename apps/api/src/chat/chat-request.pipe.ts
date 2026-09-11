import {
  BadRequestException,
  Injectable,
  type ArgumentMetadata,
} from "@nestjs/common";
import {
  CHAT_ERRORS,
  ChatRequestSchema,
  type ChatRequest,
} from "@haetteum/contracts";
import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";

@Injectable()
export class ChatRequestPipe extends ZodValidationPipe<ChatRequest> {
  constructor() {
    super(ChatRequestSchema);
  }

  override transform(value: unknown, metadata: ArgumentMetadata): ChatRequest {
    try {
      return super.transform(value, metadata);
    } catch (error) {
      if (!(error instanceof BadRequestException)) throw error;
      throw new BadRequestException({
        ...(error.getResponse() as object),
        code: CHAT_ERRORS[400].code,
        detail: CHAT_ERRORS[400].message,
      });
    }
  }
}
