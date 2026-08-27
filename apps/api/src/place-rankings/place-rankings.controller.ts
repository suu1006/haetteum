import { Controller, Get, Query } from "@nestjs/common";

import {
  ListPlaceRankingsQuerySchema,
  PlaceRankingResponseSchema,
  type ListPlaceRankingsQuery,
  type PlaceRankingResponse,
} from "@haetteum/contracts";

import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { PlaceRankingsService } from "./place-rankings.service.js";

@Controller({ path: "place-rankings", version: "1" })
export class PlaceRankingsController {
  constructor(private readonly rankings: PlaceRankingsService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(ListPlaceRankingsQuerySchema))
    query: ListPlaceRankingsQuery,
  ): Promise<PlaceRankingResponse> {
    return PlaceRankingResponseSchema.parse(await this.rankings.list(query));
  }
}
