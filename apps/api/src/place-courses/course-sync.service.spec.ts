import { jest } from "@jest/globals";

import { CourseSyncService } from "./course-sync.service.js";
import type {
  TourApiCourseIntro,
  TourApiCourseStop,
  TourApiPage,
  TourApiPlace,
  TourApiPlaceDetail,
} from "../tourism/tour-api.types.js";

const listItem: TourApiPlace = {
  contentid: "2372032",
  contenttypeid: "25",
  title: "이국적인 분위기와 달콤한 도시 송도",
  mapx: "126.6368401215",
  mapy: "37.3967115076",
  modifiedtime: "20260827090244",
  lDongRegnCd: "",
};

const common: TourApiPlaceDetail = {
  contentid: "2372032",
  contenttypeid: "25",
  title: "이국적인 분위기와 달콤한 도시 송도",
  overview: "국제도시 송도의 맛코스.",
};

const intro: TourApiCourseIntro = {
  contentid: "2372032",
  contenttypeid: "25",
  distance: "5.19km",
  taketime: "5시간",
  schedule: "기타",
  theme: "지자체",
};

const stops: TourApiCourseStop[] = [
  {
    contentid: "2372032",
    subnum: "0",
    subcontentid: "2350389",
    subname: "버거룸181",
    subdetailimg:
      "https://tong.visitkorea.or.kr/cms/resource/29/2050729_image2_1.jpg",
  },
  {
    contentid: "2372032",
    subnum: "1",
    subcontentid: "1851364",
    subname: "인천 컴팩 스마트시티",
  },
];

function page(items: readonly TourApiPlace[]): TourApiPage<TourApiPlace> {
  return { items, pageNo: 1, numOfRows: 100, totalCount: items.length };
}

function buildCourseApi(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    getCoursePage: jest
      .fn<() => Promise<TourApiPage<TourApiPlace>>>()
      .mockResolvedValue(page([listItem])),
    getCourseCommonDetail: jest
      .fn<() => Promise<TourApiPlaceDetail>>()
      .mockResolvedValue(common),
    getCourseIntro: jest
      .fn<() => Promise<TourApiCourseIntro>>()
      .mockResolvedValue(intro),
    getCourseStops: jest
      .fn<() => Promise<readonly TourApiCourseStop[]>>()
      .mockResolvedValue(stops),
    ...overrides,
  };
}

function buildPrisma(matchedPlaces: { id: string; externalId: string }[]) {
  const upsert = jest
    .fn<() => Promise<{ id: string }>>()
    .mockResolvedValue({ id: "course-1" });
  const deleteMany = jest.fn<() => Promise<unknown>>().mockResolvedValue({});
  const createMany = jest.fn<() => Promise<unknown>>().mockResolvedValue({});
  const tx = {
    tourCourse: { upsert },
    tourCourseStop: { deleteMany, createMany },
  };

  return {
    prisma: {
      place: {
        findMany: jest
          .fn<() => Promise<typeof matchedPlaces>>()
          .mockResolvedValue(matchedPlaces),
      },
      $transaction: jest
        .fn<
          (run: (client: typeof tx) => Promise<unknown>) => Promise<unknown>
        >()
        .mockImplementation((run) => run(tx)),
    },
    upsert,
    deleteMany,
    createMany,
  };
}

const enabledConfig = { get: jest.fn().mockReturnValue(true) };
const sleep = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

describe("CourseSyncService", () => {
  it("skips every provider call while tourism sync is disabled", async () => {
    const courseApi = buildCourseApi();
    const service = new CourseSyncService(
      buildPrisma([]).prisma as never,
      { get: jest.fn().mockReturnValue(false) } as never,
      courseApi,
      sleep,
    );

    await expect(service.syncCourses()).resolves.toEqual({
      enabled: false,
      listedCourses: 0,
      syncedCourses: 0,
      syncedStops: 0,
      linkedStops: 0,
      emptyCourses: 0,
      failedCourses: 0,
    });
    expect(courseApi.getCoursePage).not.toHaveBeenCalled();
  });

  it("stores the course with its stops and links the ones we already carry", async () => {
    const { prisma, upsert, deleteMany, createMany } = buildPrisma([
      { id: "place-1", externalId: "1851364" },
    ]);
    const service = new CourseSyncService(
      prisma as never,
      enabledConfig as never,
      buildCourseApi(),
      sleep,
    );

    await expect(service.syncCourses()).resolves.toMatchObject({
      enabled: true,
      listedCourses: 1,
      syncedCourses: 1,
      syncedStops: 2,
      linkedStops: 1,
      failedCourses: 0,
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          source_externalId: { source: "TOUR_API", externalId: "2372032" },
        },
      }),
    );
    expect(deleteMany).toHaveBeenCalledWith({
      where: { courseId: "course-1" },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          sequence: 1,
          externalPlaceId: "2350389",
          placeId: null,
        }),
        expect.objectContaining({
          sequence: 2,
          externalPlaceId: "1851364",
          placeId: "place-1",
        }),
      ],
    });
  });

  it("counts a failing course without aborting the run", async () => {
    const { prisma } = buildPrisma([]);
    const service = new CourseSyncService(
      prisma as never,
      enabledConfig as never,
      buildCourseApi({
        getCourseStops: jest
          .fn<() => Promise<never>>()
          .mockRejectedValue(new Error("provider down")),
      }),
      sleep,
    );

    await expect(service.syncCourses()).resolves.toMatchObject({
      listedCourses: 1,
      syncedCourses: 0,
      failedCourses: 1,
    });
  });

  it("stops listing once the requested limit is reached", async () => {
    const { prisma } = buildPrisma([]);
    const courseApi = buildCourseApi({
      getCoursePage: jest
        .fn<() => Promise<TourApiPage<TourApiPlace>>>()
        .mockResolvedValue(
          page([listItem, { ...listItem, contentid: "1967430" }]),
        ),
    });
    const service = new CourseSyncService(
      prisma as never,
      enabledConfig as never,
      courseApi,
      sleep,
    );

    await expect(service.syncCourses({ limit: 1 })).resolves.toMatchObject({
      listedCourses: 1,
      syncedCourses: 1,
    });
    expect(courseApi.getCoursePage).toHaveBeenCalledTimes(1);
  });
});
