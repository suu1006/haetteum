import { MODULE_METADATA } from "@nestjs/common/constants.js";

import { AppModule } from "../app.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { PlaceFavoritesController } from "./place-favorites.controller.js";
import { PlaceFavoritesModule } from "./place-favorites.module.js";
import { PlaceFavoritesService } from "./place-favorites.service.js";

describe("PlaceFavoritesModule", () => {
  it("registers the favorites controller and service through the shared auth module", () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, PlaceFavoritesModule),
    ).toEqual([PlaceFavoritesController]);
    expect(
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, PlaceFavoritesModule),
    ).toEqual([PlaceFavoritesService]);
    expect(
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, PlaceFavoritesModule),
    ).toEqual([AuthModule]);
  });

  it("is imported by the application module", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule)).toContain(
      PlaceFavoritesModule,
    );
  });
});
