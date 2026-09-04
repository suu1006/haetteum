import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";

import {
  FavoritePlaceItemSchema,
  FavoritePlaceParamsSchema,
  MyFavoritesResponseSchema,
  type AuthUser,
  type FavoritePlaceItem,
  type FavoritePlaceParams,
  type MyFavoritesResponse,
} from "@haetteum/contracts";

import { CurrentUser } from "../auth/current-user.decorator.js";
import { SameOriginGuard } from "../auth/same-origin.guard.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { ZodValidationPipe } from "../common/http/zod-validation.pipe.js";
import { PlaceFavoritesService } from "./place-favorites.service.js";

@Controller({ path: "favorites", version: "1" })
@UseGuards(SessionAuthGuard, SameOriginGuard)
export class PlaceFavoritesController {
  constructor(private readonly favorites: PlaceFavoritesService) {}

  @Get("mine")
  async listMine(
    @CurrentUser() currentUser: AuthUser,
  ): Promise<MyFavoritesResponse> {
    return MyFavoritesResponseSchema.parse(
      await this.favorites.listMine(currentUser.id),
    );
  }

  @Post()
  async add(
    @CurrentUser() currentUser: AuthUser,
    @Body(new ZodValidationPipe(FavoritePlaceParamsSchema))
    input: FavoritePlaceParams,
  ): Promise<FavoritePlaceItem> {
    return FavoritePlaceItemSchema.parse(
      await this.favorites.add(currentUser.id, input.placeId),
    );
  }

  @Delete(":placeId")
  @HttpCode(204)
  async remove(
    @CurrentUser() currentUser: AuthUser,
    @Param(new ZodValidationPipe(FavoritePlaceParamsSchema))
    params: FavoritePlaceParams,
  ): Promise<void> {
    await this.favorites.remove(currentUser.id, params.placeId);
  }
}
