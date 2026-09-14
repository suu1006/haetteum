import { ImagesModule } from "../images/images.module.js";
import {
  ReviewModerationController,
  UserBlocksController,
} from "./review-moderation.controller.js";
import { ReviewModerationService } from "./review-moderation.service.js";
import { OptionalSessionGuard } from "./optional-session.guard.js";
import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { PlaceReviewsController } from "./place-reviews.controller.js";
import { ReviewImagesController } from "./review-images.controller.js";
import { ReviewsController } from "./reviews.controller.js";
import { ReviewsService } from "./reviews.service.js";

@Module({
  imports: [AuthModule, ImagesModule],
  controllers: [
    ReviewModerationController,
    UserBlocksController,
    PlaceReviewsController,
    ReviewImagesController,
    ReviewsController,
  ],
  providers: [ReviewsService, ReviewModerationService, OptionalSessionGuard],
})
export class ReviewsModule {}
