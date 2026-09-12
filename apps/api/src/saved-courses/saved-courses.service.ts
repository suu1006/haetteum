import { Injectable, NotFoundException } from "@nestjs/common";

import type {
  MySavedCoursesResponse,
  SaveCourseRequest,
  SavedCourseItem,
  UpdateSavedCourseRequest,
} from "@haetteum/contracts";

import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

export const SAVED_COURSE_SELECT = {
  id: true,
  title: true,
  createdAt: true,
  stops: {
    orderBy: { sequence: "asc" },
    select: {
      role: true,
      sequence: true,
      placeId: true,
      title: true,
      categoryLabel: true,
      address: true,
      longitude: true,
      latitude: true,
      distanceMeters: true,
      placeUrl: true,
    },
  },
} satisfies Prisma.SavedCourseSelect;

type SavedCourseRow = Prisma.SavedCourseGetPayload<{
  select: typeof SAVED_COURSE_SELECT;
}>;

@Injectable()
export class SavedCoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async listMine(userId: string): Promise<MySavedCoursesResponse> {
    const rows = await this.prisma.savedCourse.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: SAVED_COURSE_SELECT,
    });

    return { items: rows.map(mapSavedCourseRow) };
  }

  async create(
    userId: string,
    input: SaveCourseRequest,
  ): Promise<SavedCourseItem> {
    const row = await this.prisma.savedCourse.create({
      data: {
        userId,
        title: input.title,
        stops: {
          create: input.stops.map((stop) => ({
            role: stop.role,
            sequence: stop.sequence,
            placeId: stop.placeId,
            title: stop.title,
            categoryLabel: stop.categoryLabel,
            address: stop.address,
            longitude: stop.longitude,
            latitude: stop.latitude,
            distanceMeters: stop.distanceMeters,
            placeUrl: stop.placeUrl,
          })),
        },
      },
      select: SAVED_COURSE_SELECT,
    });

    return mapSavedCourseRow(row);
  }

  async findOne(userId: string, id: string): Promise<SavedCourseItem | null> {
    const row = await this.prisma.savedCourse.findFirst({
      where: { id, userId },
      select: SAVED_COURSE_SELECT,
    });

    return row ? mapSavedCourseRow(row) : null;
  }

  async update(
    userId: string,
    id: string,
    input: UpdateSavedCourseRequest,
  ): Promise<SavedCourseItem> {
    const existing = await this.prisma.savedCourse.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (existing === null) {
      throw new NotFoundException({
        code: "SAVED_COURSE_NOT_FOUND",
        detail: "저장된 코스를 찾을 수 없습니다.",
      });
    }

    const row = await this.prisma.savedCourse.update({
      where: { id },
      data: {
        title: input.title,
        stops: {
          deleteMany: {},
          create: input.stops.map((stop) => ({
            role: stop.role,
            sequence: stop.sequence,
            placeId: stop.placeId,
            title: stop.title,
            categoryLabel: stop.categoryLabel,
            address: stop.address,
            longitude: stop.longitude,
            latitude: stop.latitude,
            distanceMeters: stop.distanceMeters,
            placeUrl: stop.placeUrl,
          })),
        },
      },
      select: SAVED_COURSE_SELECT,
    });

    return mapSavedCourseRow(row);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.prisma.savedCourse.deleteMany({ where: { id, userId } });
  }
}

function mapSavedCourseRow(row: SavedCourseRow): SavedCourseItem {
  return {
    id: row.id,
    title: row.title,
    savedAt: row.createdAt.toISOString(),
    stops: row.stops.map((stop) => ({
      role: stop.role as SavedCourseItem["stops"][number]["role"],
      sequence: stop.sequence,
      placeId: stop.placeId,
      title: stop.title,
      categoryLabel: stop.categoryLabel,
      address: stop.address,
      longitude: Number(stop.longitude),
      latitude: Number(stop.latitude),
      distanceMeters: stop.distanceMeters,
      placeUrl: stop.placeUrl,
    })),
  };
}
