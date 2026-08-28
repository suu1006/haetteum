import { Module } from "@nestjs/common";

import { PlaceReelsRefreshService } from "./place-reels-refresh.service.js";
import { PlaceReelsController } from "./place-reels.controller.js";
import { PlaceReelsService } from "./place-reels.service.js";
import {
  YOUTUBE_API_FETCH,
  YOUTUBE_API_PORT,
  YOUTUBE_API_SLEEP,
} from "./place-reels.constants.js";
import { YouTubeApiClient } from "./youtube-api.client.js";

@Module({
  controllers: [PlaceReelsController],
  providers: [
    PlaceReelsService,
    PlaceReelsRefreshService,
    YouTubeApiClient,
    { provide: YOUTUBE_API_PORT, useExisting: YouTubeApiClient },
    { provide: YOUTUBE_API_FETCH, useValue: globalThis.fetch.bind(globalThis) },
    {
      provide: YOUTUBE_API_SLEEP,
      useValue: (milliseconds: number) =>
        new Promise<void>((resolve) => setTimeout(resolve, milliseconds)),
    },
  ],
  exports: [PlaceReelsRefreshService],
})
export class PlaceReelsModule {}
