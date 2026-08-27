import { Controller, Get, Query } from "@nestjs/common";

import {
  FestivalDiscoveryQuerySchema,
  FestivalDiscoveryResponseSchema,
  type FestivalDiscoveryQuery,
  type FestivalDiscoveryResponse,
} from "@haetteum/contracts";

import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { FestivalsService } from "./festivals.service.js";

@Controller({ path: "festivals", version: "1" })
export class FestivalsController {
  constructor(private readonly festivals: FestivalsService) {}

  @Get("discovery")
  async discovery(
    @Query(new ZodValidationPipe(FestivalDiscoveryQuerySchema))
    query: FestivalDiscoveryQuery,
  ): Promise<FestivalDiscoveryResponse> {
    return FestivalDiscoveryResponseSchema.parse(
      await this.festivals.list(query),
    );
  }
}
