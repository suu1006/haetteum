import { Controller, Get, Param, Query } from "@nestjs/common";
import { z } from "zod";

import {
  ListPopularReelsQuerySchema,
  PlaceReelListResponseSchema,
  PopularReelsResponseSchema,
  type ListPopularReelsQuery,
  type PlaceReelListResponse,
  type PopularReelsResponse,
} from "@haetteum/contracts";

import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { PlaceReelsService } from "./place-reels.service.js";

@Controller({ path: "place-reels", version: "1" })
export class PlaceReelsController {
  constructor(private readonly reels: PlaceReelsService) {}

  @Get()
  async popular(
    @Query(new ZodValidationPipe(ListPopularReelsQuerySchema))
    query: ListPopularReelsQuery,
  ): Promise<PopularReelsResponse> {
    return PopularReelsResponseSchema.parse(
      await this.reels.listPopular(query),
    );
  }

  @Get(":placeId")
  async forPlace(
    @Param("placeId", new ZodValidationPipe(z.string().uuid()))
    placeId: string,
  ): Promise<PlaceReelListResponse> {
    return PlaceReelListResponseSchema.parse(
      await this.reels.listForPlace(placeId),
    );
  }
}
