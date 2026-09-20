import { TourApiRecovery } from "./tour-api-recovery.js";
import { TourApiRecoveryRepository } from "./tour-api-recovery.repository.js";
import { CourseSyncService } from "../place-courses/course-sync.service.js";
import { Pool } from "pg";
import { ConfigService } from "@nestjs/config";
import { TourApiPolicy, TOUR_API_POLICY_POOL } from "./tour-api-policy.js";
import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";

import type { ApiEnvironment } from "../config/environment.js";
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
import { NotionBatchRecorder } from "./notion-batch-recorder.js";

@Module({
  imports: [
    ScheduleModule.forRoot({
      cronJobs: process.env.SCHEDULERS_ENABLED !== "false",
      intervals: process.env.SCHEDULERS_ENABLED !== "false",
      timeouts: process.env.SCHEDULERS_ENABLED !== "false",
    }),
  ],
  providers: [
    CourseSyncService,
    TourismSyncService,
    FestivalSyncService,
    FestivalRepository,
    TourismSyncScheduler,
    NotionBatchRecorder,
    FestivalSyncScheduler,
    RankingPlaceLinkService,
    TourApiClient,
    TourApiRecovery,
    TourApiRecoveryRepository,
    TourApiPolicy,
    {
      provide: TOUR_API_POLICY_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService<ApiEnvironment, true>) =>
        new Pool({
          connectionString: config.get("DATABASE_URL", { infer: true }),
          max: config.get("TOUR_API_POLICY_POOL_MAX", { infer: true }),
          connectionTimeoutMillis: 5000,
        }),
    },
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
    TourApiPolicy,
    FestivalSyncService,
    TourismSyncService,
    RankingPlaceLinkService,
    CourseSyncService,
    TOUR_API_SLEEP,
  ],
})
export class TourismModule {}
