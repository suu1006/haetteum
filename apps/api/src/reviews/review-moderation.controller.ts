import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { z } from "zod";
import {
  BlockedUsersResponseSchema,
  ReviewReportRequestSchema,
  type ReviewReportRequest,
  type AuthUser,
} from "@haetteum/contracts";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { SameOriginGuard } from "../auth/same-origin.guard.js";
import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { ReviewModerationService } from "./review-moderation.service.js";

@Controller({ path: "reviews", version: "1" })
@UseGuards(SessionAuthGuard, SameOriginGuard)
export class ReviewModerationController {
  constructor(private readonly moderation: ReviewModerationService) {}
  @Post(":reviewId/reports")
  async report(
    @CurrentUser() user: AuthUser,
    @Param("reviewId", new ZodValidationPipe(z.string().uuid()))
    reviewId: string,
    @Body(new ZodValidationPipe(ReviewReportRequestSchema))
    input: ReviewReportRequest,
  ): Promise<void> {
    await this.moderation.report(user.id, reviewId, input);
  }
  @Post(":reviewId/block-author")
  @HttpCode(204)
  async block(
    @CurrentUser() user: AuthUser,
    @Param("reviewId", new ZodValidationPipe(z.string().uuid()))
    reviewId: string,
  ): Promise<void> {
    await this.moderation.blockAuthor(user.id, reviewId);
  }
}

@Controller({ path: "user-blocks", version: "1" })
@UseGuards(SessionAuthGuard, SameOriginGuard)
export class UserBlocksController {
  constructor(private readonly moderation: ReviewModerationService) {}
  @Get()
  @Header("Cache-Control", "private, no-store")
  async list(@CurrentUser() user: AuthUser) {
    return BlockedUsersResponseSchema.parse(
      await this.moderation.listBlocks(user.id),
    );
  }
  @Delete(":userId")
  @HttpCode(204)
  async unblock(
    @CurrentUser() user: AuthUser,
    @Param("userId", new ZodValidationPipe(z.string().uuid())) userId: string,
  ): Promise<void> {
    await this.moderation.unblock(user.id, userId);
  }
}
