import { NotFoundException } from "@nestjs/common";
import { jest } from "@jest/globals";
import type { SaveCourseRequest } from "@haetteum/contracts";

import {
  SAVED_COURSE_SELECT,
  SavedCoursesService,
} from "./saved-courses.service.js";

const COURSE_ID = "40000000-0000-4000-8000-000000000001";
const PLACE_ID = "20000000-0000-4000-8000-000000000001";
const USER_ID = "30000000-0000-4000-8000-000000000001";

function savedCourseRow() {
  return {
    id: COURSE_ID,
    title: "예술의전당 근처 코스",
    createdAt: new Date("2026-09-01T03:00:00.000Z"),
    stops: [
      {
        role: "anchor",
        sequence: 1,
        placeId: PLACE_ID,
        title: "예술의전당",
        categoryLabel: null,
        address: "서울 서초구 서초동",
        longitude: { toString: () => "127.0100000" } as unknown as number,
        latitude: { toString: () => "37.4800000" } as unknown as number,
        distanceMeters: null,
        placeUrl: null,
      },
    ],
  };
}

const saveRequest: SaveCourseRequest = {
  title: "예술의전당 근처 코스",
  stops: [
    {
      role: "anchor",
      sequence: 1,
      placeId: PLACE_ID,
      title: "예술의전당",
      categoryLabel: null,
      address: "서울 서초구 서초동",
      longitude: 127.01,
      latitude: 37.48,
      distanceMeters: null,
      placeUrl: null,
    },
  ],
};

describe("SavedCoursesService", () => {
  it("lists the passed user's saved courses in deterministic recency order", async () => {
    const row = savedCourseRow();
    const findMany = jest
      .fn<() => Promise<(typeof row)[]>>()
      .mockResolvedValue([row]);
    const service = new SavedCoursesService({
      savedCourse: { findMany },
    } as never);

    await expect(service.listMine(USER_ID)).resolves.toEqual({
      items: [
        {
          id: COURSE_ID,
          title: "예술의전당 근처 코스",
          savedAt: "2026-09-01T03:00:00.000Z",
          stops: [
            {
              role: "anchor",
              sequence: 1,
              placeId: PLACE_ID,
              title: "예술의전당",
              categoryLabel: null,
              address: "서울 서초구 서초동",
              longitude: 127.01,
              latitude: 37.48,
              distanceMeters: null,
              placeUrl: null,
            },
          ],
        },
      ],
    });
    expect(findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: SAVED_COURSE_SELECT,
    });
  });

  it("creates a saved course with its stops for the passed user", async () => {
    const row = savedCourseRow();
    const create = jest.fn<() => Promise<typeof row>>().mockResolvedValue(row);
    const service = new SavedCoursesService({
      savedCourse: { create },
    } as never);

    await expect(service.create(USER_ID, saveRequest)).resolves.toEqual({
      id: COURSE_ID,
      title: "예술의전당 근처 코스",
      savedAt: "2026-09-01T03:00:00.000Z",
      stops: saveRequest.stops,
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID,
        title: saveRequest.title,
        stops: { create: saveRequest.stops },
      },
      select: SAVED_COURSE_SELECT,
    });
  });

  it("finds a single saved course scoped to the passed user", async () => {
    const row = savedCourseRow();
    const findFirst = jest
      .fn<() => Promise<typeof row | null>>()
      .mockResolvedValue(row);
    const service = new SavedCoursesService({
      savedCourse: { findFirst },
    } as never);

    await expect(service.findOne(USER_ID, COURSE_ID)).resolves.toEqual({
      id: COURSE_ID,
      title: "예술의전당 근처 코스",
      savedAt: "2026-09-01T03:00:00.000Z",
      stops: saveRequest.stops,
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: COURSE_ID, userId: USER_ID },
      select: SAVED_COURSE_SELECT,
    });
  });

  it("returns null when the saved course does not belong to the passed user", async () => {
    const findFirst = jest.fn<() => Promise<null>>().mockResolvedValue(null);
    const service = new SavedCoursesService({
      savedCourse: { findFirst },
    } as never);

    await expect(service.findOne(USER_ID, COURSE_ID)).resolves.toBeNull();
  });

  it("updates a saved course's title and replaces its stops for the passed user", async () => {
    const row = savedCourseRow();
    const findFirst = jest
      .fn<() => Promise<{ id: string } | null>>()
      .mockResolvedValue({ id: COURSE_ID });
    const update = jest.fn<() => Promise<typeof row>>().mockResolvedValue(row);
    const service = new SavedCoursesService({
      savedCourse: { findFirst, update },
    } as never);

    await expect(
      service.update(USER_ID, COURSE_ID, saveRequest),
    ).resolves.toEqual({
      id: COURSE_ID,
      title: "예술의전당 근처 코스",
      savedAt: "2026-09-01T03:00:00.000Z",
      stops: saveRequest.stops,
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: COURSE_ID, userId: USER_ID },
      select: { id: true },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: COURSE_ID },
      data: {
        title: saveRequest.title,
        stops: { deleteMany: {}, create: saveRequest.stops },
      },
      select: SAVED_COURSE_SELECT,
    });
  });

  it("hides a missing or foreign saved course before attempting an update", async () => {
    const findFirst = jest.fn<() => Promise<null>>().mockResolvedValue(null);
    const update = jest.fn();
    const service = new SavedCoursesService({
      savedCourse: { findFirst, update },
    } as never);

    await expect(
      service.update(USER_ID, COURSE_ID, saveRequest),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });

  it("removes a saved course scoped to the passed user", async () => {
    const deleteMany = jest
      .fn<() => Promise<{ count: number }>>()
      .mockResolvedValue({ count: 1 });
    const service = new SavedCoursesService({
      savedCourse: { deleteMany },
    } as never);

    await expect(service.remove(USER_ID, COURSE_ID)).resolves.toBeUndefined();
    expect(deleteMany).toHaveBeenCalledWith({
      where: { id: COURSE_ID, userId: USER_ID },
    });
  });

  it("does not throw when removing a saved course that no longer exists", async () => {
    const deleteMany = jest
      .fn<() => Promise<{ count: number }>>()
      .mockResolvedValue({ count: 0 });
    const service = new SavedCoursesService({
      savedCourse: { deleteMany },
    } as never);

    await expect(service.remove(USER_ID, COURSE_ID)).resolves.toBeUndefined();
  });
});
