import { WeeklyRecommendationsModule } from "./weekly-recommendations/weekly-recommendations.module.js";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./auth/auth.module.js";
import { ChatModule } from "./chat/chat.module.js";
import { validateEnvironment } from "./config/environment.js";
import { FestivalsModule } from "./festivals/festivals.module.js";
import { HealthModule } from "./health/health.module.js";
import { HotPlaceRankingsModule } from "./hot-place-rankings/hot-place-rankings.module.js";
import { PlaceRankingsModule } from "./place-rankings/place-rankings.module.js";
import { PlaceCoursesModule } from "./place-courses/place-courses.module.js";
import { PlaceFavoritesModule } from "./place-favorites/place-favorites.module.js";
import { PlaceReelsModule } from "./place-reels/place-reels.module.js";
import { PlacesModule } from "./places/places.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { ProfileModule } from "./profile/profile.module.js";
import { ReviewsModule } from "./reviews/reviews.module.js";
import { SavedCoursesModule } from "./saved-courses/saved-courses.module.js";
import { TourismModule } from "./tourism/tourism.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      ignoreEnvFile: process.env.NODE_ENV === "test",
      envFilePath:
        process.env.NODE_ENV === "production" ? ".env.production" : ".env",
      validate: validateEnvironment,
    }),
    PrismaModule,
    AuthModule,
    ChatModule,
    HealthModule,
    FestivalsModule,
    HotPlaceRankingsModule,
    PlaceRankingsModule,
    PlaceCoursesModule,
    PlaceFavoritesModule,
    PlaceReelsModule,
    WeeklyRecommendationsModule,
    PlacesModule,
    ProfileModule,
    ReviewsModule,
    SavedCoursesModule,
    TourismModule,
  ],
})
export class AppModule {}
