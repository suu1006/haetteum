import { Controller, Get, Header } from "@nestjs/common";
import type { WeeklyRecommendationsResponse } from "@haetteum/contracts";
import { WeeklyRecommendationsService } from "./weekly-recommendations.service.js";

@Controller({ path: "places/recommendations", version: "1" })
export class WeeklyRecommendationsController {
  constructor(private readonly recommendations: WeeklyRecommendationsService) {}
  @Get("weekly")
  @Header("Cache-Control", "no-store")
  current(): Promise<WeeklyRecommendationsResponse> {
    return this.recommendations.current();
  }
}
