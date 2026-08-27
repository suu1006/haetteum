import { Controller, Get, Param, Query } from "@nestjs/common";
import { z } from "zod";

import {
  ListPlacesQuerySchema,
  NearbyPlacesQuerySchema,
  type ListPlacesQuery,
  type NearbyPlacesQuery,
  type NearbyPlacesResponse,
  type PlaceDetailResponse,
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

  @Get(":placeId/nearby")
  nearby(
    @Param("placeId", new ZodValidationPipe(z.string().uuid())) placeId: string,
    @Query(new ZodValidationPipe(NearbyPlacesQuerySchema))
    query: NearbyPlacesQuery,
  ): Promise<NearbyPlacesResponse> {
    return this.places.nearby(placeId, query);
  }

  @Get(":placeId")
  detail(
    @Param("placeId", new ZodValidationPipe(z.string().uuid())) placeId: string,
  ): Promise<PlaceDetailResponse> {
    return this.places.detail(placeId);
  }
}
