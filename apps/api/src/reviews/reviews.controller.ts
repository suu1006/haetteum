import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";

import {
  CreateReviewRequestSchema,
  MyReviewsResponseSchema,
  ReviewIdParamsSchema,
  ReviewItemSchema,
  UpdateReviewRequestSchema,
  type CreateReviewRequest,
  type MyReviewsResponse,
  type ReviewIdParams,
  type ReviewItem,
  type UpdateReviewRequest,
  type AuthUser,
} from "@haetteum/contracts";

import { CurrentUser } from "../auth/current-user.decorator.js";
import { SameOriginGuard } from "../auth/same-origin.guard.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { ReviewsService } from "./reviews.service.js";

@Controller({ path: "reviews", version: "1" })
@UseGuards(SessionAuthGuard, SameOriginGuard)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get("mine")
  async listMine(
    @CurrentUser() currentUser: AuthUser,
  ): Promise<MyReviewsResponse> {
    return MyReviewsResponseSchema.parse(
      await this.reviews.listMine(currentUser.id),
    );
  }

  @Get(":reviewId")
  async findMine(
    @CurrentUser() currentUser: AuthUser,
    @Param(new ZodValidationPipe(ReviewIdParamsSchema)) params: ReviewIdParams,
  ): Promise<ReviewItem> {
    return ReviewItemSchema.parse(
      await this.reviews.findMine(currentUser.id, params.reviewId),
    );
  }

  @Post()
  async create(
    @CurrentUser() currentUser: AuthUser,
    @Body(new ZodValidationPipe(CreateReviewRequestSchema))
    input: CreateReviewRequest,
  ): Promise<ReviewItem> {
    return ReviewItemSchema.parse(
      await this.reviews.create(currentUser.id, input),
    );
  }

  @Patch(":reviewId")
  async update(
    @CurrentUser() currentUser: AuthUser,
    @Param(new ZodValidationPipe(ReviewIdParamsSchema)) params: ReviewIdParams,
    @Body(new ZodValidationPipe(UpdateReviewRequestSchema))
    input: UpdateReviewRequest,
  ): Promise<ReviewItem> {
    return ReviewItemSchema.parse(
      await this.reviews.update(currentUser.id, params.reviewId, input),
    );
  }
}
