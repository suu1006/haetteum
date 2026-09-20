import { Module } from "@nestjs/common";

import { ExternalPlaceSearchService } from "./external-place-search.service.js";
import { PlaceCourseBuilderService } from "./place-course-builder.service.js";
import { PlacesController } from "./places.controller.js";
import { PlacesService } from "./places.service.js";
import {
  KAKAO_LOCAL_FETCH,
  KAKAO_LOCAL_PORT,
  KakaoLocalClient,
} from "./kakao-local.client.js";

@Module({
  controllers: [PlacesController],
  providers: [
    PlacesService,
    ExternalPlaceSearchService,
    PlaceCourseBuilderService,
    KakaoLocalClient,
    { provide: KAKAO_LOCAL_PORT, useExisting: KakaoLocalClient },
    { provide: KAKAO_LOCAL_FETCH, useValue: globalThis.fetch.bind(globalThis) },
  ],
})
export class PlacesModule {}
