import { Controller, Get, Query } from "@nestjs/common";

import {
  ListPlacesQuerySchema,
  type ListPlacesQuery,
  type PlacesPage,
} from "@haetteum/contracts";

import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { PlacesService } from "./places.service.js";

@Controller({ path: "places", version: "1" })
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(ListPlacesQuerySchema))
    query: ListPlacesQuery,
  ): Promise<PlacesPage> {
    return this.places.list(query);
  }
}
