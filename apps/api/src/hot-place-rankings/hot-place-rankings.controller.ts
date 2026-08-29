import { Controller, Get, Query } from "@nestjs/common";

import {
  ListHotPlaceRankingsQuerySchema,
  HotPlaceRankingResponseSchema,
  type ListHotPlaceRankingsQuery,
  type HotPlaceRankingResponse,
} from "@haetteum/contracts";

import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { HotPlaceRankingsService } from "./hot-place-rankings.service.js";

@Controller({ path: "hot-place-rankings", version: "1" })
export class HotPlaceRankingsController {
  constructor(private readonly rankings: HotPlaceRankingsService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(ListHotPlaceRankingsQuerySchema))
    query: ListHotPlaceRankingsQuery,
  ): Promise<HotPlaceRankingResponse> {
    return HotPlaceRankingResponseSchema.parse(await this.rankings.list(query));
  }
}
