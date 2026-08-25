import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import { FestivalRepository } from "./festival.repository.js";
import { FestivalSyncService } from "./festival-sync.service.js";
import { TourApiClient } from "./tour-api.client.js";
import {
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
    TourApiClient,
    { provide: TOUR_API_PORT, useExisting: TourApiClient },
    { provide: FESTIVAL_API_PORT, useExisting: TourApiClient },
    { provide: TOUR_API_FETCH, useValue: globalThis.fetch.bind(globalThis) },
    {
      provide: TOUR_API_SLEEP,
      useValue: (milliseconds: number) =>
        new Promise<void>((resolve) => setTimeout(resolve, milliseconds)),
    },
  ],
  exports: [FestivalSyncService, TourismSyncService, TOUR_API_PORT],
})
export class TourismModule {}
