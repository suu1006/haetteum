import { NotFoundException } from "@nestjs/common";
import { jest } from "@jest/globals";

import { PlaceCoursesService } from "./place-courses.service.js";

const placeId = "22222222-2222-4222-8222-222222222222";

const courseRow = {
  id: "33333333-3333-4333-8333-333333333333",
  title: "선사유적지와 분단의 현장에 발을 딛다.",
  overview: "경기도 최북단 연천을 걷는 하루 코스.",
  takeTime: "1일",
  distance: "65.93km",
  schedule: "기타",
  theme: "지자체",
  primaryImageUrl:
    "https://tong.visitkorea.or.kr/cms/resource/13/1049613_image2_1.jpg",
  stops: [
    {
      sequence: 1,
      placeId: "44444444-4444-4444-8444-444444444444",
      title: "재인폭포",
      overview: "한탄강 서쪽에 자리한 폭포.",
      imageUrl:
        "https://tong.visitkorea.or.kr/cms/resource/13/1049613_image2_1.jpg",
    },
    {
      sequence: 2,
      placeId: null,
      title: "전곡선사박물관",
      overview: null,
      imageUrl: null,
    },
  ],
};

describe("PlaceCoursesService", () => {
  it("throws when the place does not exist", async () => {
    const service = new PlaceCoursesService({
      place: {
        findUnique: jest.fn<() => Promise<null>>().mockResolvedValue(null),
      },
    } as never);

    await expect(service.listForPlace(placeId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("returns the courses whose stops include the place", async () => {
    const findMany = jest
      .fn<() => Promise<unknown[]>>()
      .mockResolvedValue([courseRow]);
    const service = new PlaceCoursesService({
      place: {
        findUnique: jest
          .fn<() => Promise<unknown>>()
          .mockResolvedValue({ id: placeId }),
      },
      tourCourse: { findMany },
    } as never);

    await expect(service.listForPlace(placeId)).resolves.toEqual({
      placeId,
      source: "TOUR_API",
      items: [
        {
          id: courseRow.id,
          title: courseRow.title,
          overview: courseRow.overview,
          takeTime: "1일",
          distance: "65.93km",
          schedule: "기타",
          theme: "지자체",
          imageUrl: courseRow.primaryImageUrl,
          stops: courseRow.stops,
        },
      ],
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stops: { some: { placeId } } },
        take: 5,
      }),
    );
  });

  it("returns an empty list when no course passes through the place", async () => {
    const service = new PlaceCoursesService({
      place: {
        findUnique: jest
          .fn<() => Promise<unknown>>()
          .mockResolvedValue({ id: placeId }),
      },
      tourCourse: {
        findMany: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
      },
    } as never);

    await expect(service.listForPlace(placeId)).resolves.toEqual({
      placeId,
      source: "TOUR_API",
      items: [],
    });
  });
});
