import type { AuthenticatedRequest } from "../auth/session-auth.guard.js";
import { OptionalSessionGuard } from "./optional-session.guard.js";
import { Controller, Get, Param, Req, Header, UseGuards } from "@nestjs/common";
import { z } from "zod";

import {
  PlaceReviewsResponseSchema,
  type PlaceReviewsResponse,
} from "@haetteum/contracts";

import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { ReviewsService } from "./reviews.service.js";

/**
 * 관광지 상세 후기 탭이 쓰는 공개 조회 전용 컨트롤러다.
 * 작성·수정은 세션이 필요하지만(`ReviewsController`) 열람은 비로그인도 가능해야 해서
 * 선택적 세션으로 로그인 사용자의 차단 필터를 적용한다.
 */
@Controller({ path: "place-reviews", version: "1" })
export class PlaceReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get(":placeId")
  @UseGuards(OptionalSessionGuard)
  @Header("Cache-Control", "private, no-store")
  @Header("Vary", "Cookie")
  async forPlace(
    @Param("placeId", new ZodValidationPipe(z.string().uuid()))
    placeId: string,
    @Req() request?: AuthenticatedRequest,
  ): Promise<PlaceReviewsResponse> {
    return PlaceReviewsResponseSchema.parse(
      await this.reviews.listForPlace(placeId, request?.auth?.user.id),
    );
  }
}
