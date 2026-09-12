import { MODULE_METADATA } from "@nestjs/common/constants.js";

import { AppModule } from "../app.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { PlaceReviewsController } from "./place-reviews.controller.js";
import { ReviewImagesController } from "./review-images.controller.js";
import { ReviewsController } from "./reviews.controller.js";
import { ReviewsModule } from "./reviews.module.js";
import { ReviewsService } from "./reviews.service.js";

describe("ReviewsModule", () => {
  it("registers the public and authenticated review controllers and the CRUD service through the shared auth module", () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, ReviewsModule),
    ).toEqual([
      PlaceReviewsController,
      ReviewImagesController,
      ReviewsController,
    ]);
    expect(
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ReviewsModule),
    ).toEqual([ReviewsService]);
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, ReviewsModule)).toEqual(
      [AuthModule],
    );
  });

  it("is imported by the application module", () => {
    expect(Reflect.getMetadata(MODULE_METADATA.IMPORTS, AppModule)).toContain(
      ReviewsModule,
    );
  });
});
