import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiEnvironment } from "../config/environment.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { mapCourseBundle } from "../tourism/tour-api.mapper.js";
import type { NormalizedCourse } from "../tourism/tour-api.mapper.js";
import type {
  CourseApiPort,
  TourApiPlace,
  TourApiSleep,
} from "../tourism/tour-api.types.js";
import {
  COURSE_API_PORT,
  TOUR_API_SLEEP,
} from "../tourism/tourism.constants.js";
import {
  COURSE_DETAIL_THROTTLE_MS,
  COURSE_PAGE_SIZE,
  MAX_COURSE_PAGES,
  TOUR_API_SOURCE,
} from "./place-courses.constants.js";

export type CourseSyncOptions = {
  /// 지정하면 목록에서 앞쪽 N건만 동기화한다(스모크 확인용)
  limit?: number;
};

export type CourseSyncSummary = {
  enabled: boolean;
  listedCourses: number;
  syncedCourses: number;
  syncedStops: number;
  linkedStops: number;
  emptyCourses: number;
  failedCourses: number;
};

@Injectable()
export class CourseSyncService {
  private readonly logger = new Logger(CourseSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<ApiEnvironment, true>,
    @Inject(COURSE_API_PORT) private readonly courses: CourseApiPort,
    @Inject(TOUR_API_SLEEP) private readonly sleep: TourApiSleep,
  ) {}

  async syncCourses(
    options: CourseSyncOptions = {},
  ): Promise<CourseSyncSummary> {
    const summary: CourseSyncSummary = {
      enabled: this.config.get("TOURISM_SYNC_ENABLED", { infer: true }),
      listedCourses: 0,
      syncedCourses: 0,
      syncedStops: 0,
      linkedStops: 0,
      emptyCourses: 0,
      failedCourses: 0,
    };

    if (!summary.enabled) return summary;

    const listed = await this.listCourses(options.limit);
    summary.listedCourses = listed.length;

    for (const [index, item] of listed.entries()) {
      if (index > 0) await this.sleep(COURSE_DETAIL_THROTTLE_MS);

      try {
        const course = await this.loadCourse(item);
        const linked = await this.persistCourse(course);
        summary.syncedCourses += 1;
        summary.syncedStops += course.stops.length;
        summary.linkedStops += linked;
        if (course.stops.length === 0) summary.emptyCourses += 1;
      } catch (error) {
        summary.failedCourses += 1;
        this.logger.warn(
          `여행코스 동기화 실패 (contentId=${item.contentid}): ${errorReason(error)}`,
        );
      }
    }

    return summary;
  }

  /**
   * 여행코스는 지역 코드가 비어 있어 지역별로 나눠 받을 수 없다.
   * 전국 목록을 페이지 끝까지 훑고, 중복 contentid는 첫 건만 남긴다.
   */
  private async listCourses(limit?: number): Promise<TourApiPlace[]> {
    const seen = new Set<string>();
    const items: TourApiPlace[] = [];

    for (let pageNo = 1; pageNo <= MAX_COURSE_PAGES; pageNo += 1) {
      const page = await this.courses.getCoursePage({ pageNo });

      for (const item of page.items) {
        if (seen.has(item.contentid)) continue;
        seen.add(item.contentid);
        items.push(item);
        if (limit !== undefined && items.length >= limit) return items;
      }

      if (page.items.length === 0) break;
      if (pageNo * COURSE_PAGE_SIZE >= page.totalCount) break;
    }

    return items;
  }

  private async loadCourse(item: TourApiPlace): Promise<NormalizedCourse> {
    const [common, intro, stops] = await Promise.all([
      this.courses.getCourseCommonDetail(item.contentid),
      this.courses.getCourseIntro(item.contentid),
      this.courses.getCourseStops(item.contentid),
    ]);

    return mapCourseBundle({
      item,
      common,
      intro,
      stops,
      lastSyncedAt: new Date(),
    });
  }

  /**
   * 코스와 경유지를 한 트랜잭션으로 갈아끼우고, 연결된 내부 관광지 수를 돌려준다.
   * 경유지는 순번이 바뀔 수 있어 부분 갱신 대신 통째로 교체한다.
   */
  private async persistCourse(course: NormalizedCourse): Promise<number> {
    const places =
      course.stops.length === 0
        ? []
        : await this.prisma.place.findMany({
            where: {
              source: TOUR_API_SOURCE,
              externalId: {
                in: course.stops.map((stop) => stop.externalPlaceId),
              },
            },
            select: { id: true, externalId: true },
          });
    const placeIdByExternalId = new Map(
      places.map((place) => [place.externalId, place.id]),
    );

    const { stops, ...record } = course;

    await this.prisma.$transaction(async (tx) => {
      const saved = await tx.tourCourse.upsert({
        where: {
          source_externalId: {
            source: record.source,
            externalId: record.externalId,
          },
        },
        create: record,
        update: record,
        select: { id: true },
      });

      await tx.tourCourseStop.deleteMany({ where: { courseId: saved.id } });

      if (stops.length > 0) {
        await tx.tourCourseStop.createMany({
          data: stops.map((stop) => ({
            courseId: saved.id,
            sequence: stop.sequence,
            externalPlaceId: stop.externalPlaceId,
            placeId: placeIdByExternalId.get(stop.externalPlaceId) ?? null,
            title: stop.title,
            overview: stop.overview,
            imageUrl: stop.imageUrl,
          })),
        });
      }
    });

    return course.stops.filter((stop) =>
      placeIdByExternalId.has(stop.externalPlaceId),
    ).length;
  }
}

function errorReason(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return "unknown error";
}
