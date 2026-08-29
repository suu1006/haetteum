import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.js";
import { PlaceReviewsController } from "./place-reviews.controller.js";
import { ReviewsController } from "./reviews.controller.js";
import { ReviewsService } from "./reviews.service.js";

@Module({
  imports: [AuthModule],
  controllers: [PlaceReviewsController, ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
