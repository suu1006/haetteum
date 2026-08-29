import { Injectable, NotFoundException } from "@nestjs/common";

import type {
  PlaceCourseItem,
  PlaceCoursesResponse,
} from "@haetteum/contracts";

import { PrismaService } from "../prisma/prisma.service.js";
import { MAX_COURSES_PER_PLACE } from "./place-courses.constants.js";

const COURSE_SELECT = {
  id: true,
  title: true,
  overview: true,
  takeTime: true,
  distance: true,
  schedule: true,
  theme: true,
  primaryImageUrl: true,
  stops: {
    orderBy: { sequence: "asc" },
    select: {
      sequence: true,
      placeId: true,
      title: true,
      overview: true,
      imageUrl: true,
    },
  },
} as const;

type CourseRow = {
  id: string;
  title: string;
  overview: string | null;
  takeTime: string | null;
  distance: string | null;
  schedule: string | null;
  theme: string | null;
  primaryImageUrl: string | null;
  stops: readonly {
    sequence: number;
    placeId: string | null;
    title: string;
    overview: string | null;
    imageUrl: string | null;
  }[];
};

@Injectable()
export class PlaceCoursesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 이 관광지를 경유지로 포함한 여행코스를 돌려준다.
   * TourAPI 여행코스에는 지역 코드가 없어 경유지 연결만이 유일한 접점이다 —
   * 코스가 없는 관광지가 많으므로 빈 목록은 정상 응답이다.
   */
  async listForPlace(placeId: string): Promise<PlaceCoursesResponse> {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
      select: { id: true },
    });

    if (place === null) {
      throw new NotFoundException({
        code: "PLACE_NOT_FOUND",
        detail: "관광지를 찾을 수 없습니다.",
      });
    }

    const rows = await this.prisma.tourCourse.findMany({
      where: { stops: { some: { placeId } } },
      orderBy: [{ providerModifiedAt: "desc" }, { id: "asc" }],
      take: MAX_COURSES_PER_PLACE,
      select: COURSE_SELECT,
    });

    return {
      placeId,
      source: "TOUR_API",
      items: rows.map(mapCourseRow),
    };
  }
}

function mapCourseRow(row: CourseRow): PlaceCourseItem {
  return {
    id: row.id,
    title: row.title,
    overview: row.overview,
    takeTime: row.takeTime,
    distance: row.distance,
    schedule: row.schedule,
    theme: row.theme,
    imageUrl: row.primaryImageUrl,
    stops: row.stops.map((stop) => ({
      sequence: stop.sequence,
      placeId: stop.placeId,
      title: stop.title,
      overview: stop.overview,
      imageUrl: stop.imageUrl,
    })),
  };
}
