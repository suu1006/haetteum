import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import { FestivalRepository } from "./festival.repository.js";
import { FestivalSyncService } from "./festival-sync.service.js";
import { FestivalSyncScheduler } from "./festival-sync.scheduler.js";
import { RankingPlaceLinkService } from "./ranking-place-link.service.js";
import { TourApiClient } from "./tour-api.client.js";
import {
  COURSE_API_PORT,
  FESTIVAL_API_PORT,
  TOUR_API_FETCH,
  TOUR_API_PORT,
  TOUR_API_SLEEP,
} from "./tourism.constants.js";
import { TourismSyncService } from "./tourism-sync.service.js";
import { TourismSyncScheduler } from "./tourism-sync.scheduler.js";

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    TourismSyncService,
    FestivalSyncService,
    FestivalRepository,
    TourismSyncScheduler,
    FestivalSyncScheduler,
    RankingPlaceLinkService,
    TourApiClient,
    { provide: TOUR_API_PORT, useExisting: TourApiClient },
    { provide: FESTIVAL_API_PORT, useExisting: TourApiClient },
    { provide: COURSE_API_PORT, useExisting: TourApiClient },
    { provide: TOUR_API_FETCH, useValue: globalThis.fetch.bind(globalThis) },
    {
      provide: TOUR_API_SLEEP,
      useValue: (milliseconds: number) =>
        new Promise<void>((resolve) => setTimeout(resolve, milliseconds)),
    },
  ],
  exports: [
    FestivalSyncService,
    TourismSyncService,
    RankingPlaceLinkService,
    TOUR_API_PORT,
    COURSE_API_PORT,
    TOUR_API_SLEEP,
  ],
})
export class TourismModule {}
