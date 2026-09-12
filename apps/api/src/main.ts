import { mkdirSync } from "node:fs";

import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";

import { AppModule } from "./app.module.js";
import type { ApiEnvironment } from "./config/environment.js";
import { configureApp } from "./configure-app.js";
import { PROFILE_PHOTO_UPLOADS_DIR } from "./profile/profile-photo.constants.js";
import { REVIEW_UPLOADS_DIR } from "./reviews/review-images.constants.js";

import { weeklyThumbnailDirectory } from "./weekly-recommendations/weekly-thumbnail.constants.js";

async function bootstrap(): Promise<void> {
  mkdirSync(REVIEW_UPLOADS_DIR, { recursive: true });
  mkdirSync(PROFILE_PHOTO_UPLOADS_DIR, { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(REVIEW_UPLOADS_DIR, { prefix: "/uploads/reviews" });
  app.useStaticAssets(PROFILE_PHOTO_UPLOADS_DIR, {
    prefix: "/uploads/profile-photos",
  });
  mkdirSync(weeklyThumbnailDirectory(), { recursive: true });
  app.useStaticAssets(weeklyThumbnailDirectory(), {
    prefix: "/uploads/weekly",
    immutable: true,
    maxAge: "1y",
    dotfiles: "deny",
  });
  configureApp(app);

  const config = app.get(ConfigService<ApiEnvironment, true>);
  const port = config.get("API_PORT", { infer: true });

  await app.listen(port, "0.0.0.0");
}

void bootstrap();
