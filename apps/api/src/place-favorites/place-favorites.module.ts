import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { PlaceFavoritesController } from "./place-favorites.controller.js";
import { PlaceFavoritesService } from "./place-favorites.service.js";

@Module({
  imports: [AuthModule],
  controllers: [PlaceFavoritesController],
  providers: [PlaceFavoritesService],
})
export class PlaceFavoritesModule {}
