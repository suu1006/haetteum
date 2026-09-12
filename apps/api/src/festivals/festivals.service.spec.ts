import { jest } from "@jest/globals";

import type { FestivalDiscoveryQuery } from "@haetteum/contracts";

import { FestivalsService } from "./festivals.service.js";

type FestivalRow = {
  id: string;
  externalId: string;
  title: string;
  eventStartDate: Date;
  eventEndDate: Date;
  address1: string | null;
  address2: string | null;
  category3: string | null;
  primaryImageUrl: string | null;
  detailSnapshot: unknown;
};

type FindManyArguments = {
  where: Record<string, unknown>;
  orderBy: Array<Record<string, "asc" | "desc">>;
  skip?: number;
  take?: number;
};

const now = new Date("2026-08-24T15:01:00.000Z");

function row(
  externalId: string,
  overrides: Partial<FestivalRow> = {},
): FestivalRow {
  return {
    id: `00000000-0000-4000-8000-${externalId.padStart(12, "0")}`,
    externalId,
    title: `축제 ${externalId}`,
    eventStartDate: new Date("2026-08-20T00:00:00.000Z"),
    eventEndDate: new Date("2026-08-30T00:00:00.000Z"),
    address1: " 서울특별시 종로구 ",
    address2: " 테스트로 1 ",
    category3: "EV010300",
    primaryImageUrl: "https://tong.visitkorea.or.kr/test.jpg",
    detailSnapshot: null,
    ...overrides,
  };
}

function setup(ongoing: FestivalRow[] = [], upcoming: FestivalRow[] = []) {
  const findMany = jest
    .fn<(args: FindManyArguments) => Promise<FestivalRow[]>>()
    .mockImplementation((args) => {
      const dateFilter = args.where.eventStartDate as Record<string, Date>;
      const rows = dateFilter.lte ? ongoing : upcoming;
      const skip = args.skip ?? 0;
      const take = args.take ?? rows.length;
      return Promise.resolve(rows.slice(skip, skip + take));
    });
  const count = jest
    .fn<(args: { where: Record<string, unknown> }) => Promise<number>>()
    .mockResolvedValueOnce(ongoing.length)
    .mockResolvedValueOnce(upcoming.length);
  const prisma = { festival: { findMany, count } };
  const transaction = jest.fn(
    async <T>(operation: (client: typeof prisma) => Promise<T>) =>
      operation(prisma),
  );
  const service = new FestivalsService({
    ...prisma,
    $transaction: transaction,
  } as never);
  return { count, findMany, service, transaction };
}

type DetailRow = FestivalRow & {
  telephone: string | null;
  longitude: { toNumber(): number } | null;
  latitude: { toNumber(): number } | null;
};

function setupDetail(festival: DetailRow | null) {
  const findFirst = jest
    .fn<
      (args: {
        where: { id: string; isVisible: boolean };
      }) => Promise<DetailRow | null>
    >()
    .mockResolvedValue(festival);
  const service = new FestivalsService({ festival: { findFirst } } as never);
  return { findFirst, service };
}

function detailRow(overrides: Partial<DetailRow> = {}): DetailRow {
  return {
    ...row("3351268"),
    telephone: " 02-3291-5506 ",
    longitude: { toNumber: () => 127.0753 },
    latitude: { toNumber: () => 37.5666 },
    ...overrides,
  };
}

describe("FestivalsService", () => {
  it("uses the Seoul calendar date and returns ongoing before upcoming with stable ranks", async () => {
    const ongoing = [
      row("2", { eventEndDate: new Date("2026-08-27T00:00:00.000Z") }),
      row("1", { eventEndDate: new Date("2026-08-27T00:00:00.000Z") }),
    ];
    const upcoming = [
      row("3", {
        eventStartDate: new Date("2026-09-01T00:00:00.000Z"),
        eventEndDate: new Date("2026-09-03T00:00:00.000Z"),
        address1: null,
        address2: null,
        category3: null,
        primaryImageUrl: null,
      }),
    ];
    const { findMany, service } = setup(ongoing, upcoming);

    await expect(
      service.list({ region: "all", page: 1, pageSize: 20 }, now),
    ).resolves.toEqual({
      asOfDate: "2026-08-25",
      region: "all",
      ranking: [
        expect.objectContaining({ externalId: "2", rank: 1 }),
        expect.objectContaining({ externalId: "1", rank: 2 }),
        expect.objectContaining({
          externalId: "3",
          rank: 3,
          status: "UPCOMING",
          address: null,
          categoryLabel: "축제",
          primaryImageUrl: null,
        }),
      ],
      items: [
        expect.objectContaining({
          externalId: "2",
          status: "ONGOING",
          address: "서울특별시 종로구 테스트로 1",
          categoryLabel: "지역특산물축제",
        }),
        expect.objectContaining({ externalId: "1", status: "ONGOING" }),
        expect.objectContaining({ externalId: "3", status: "UPCOMING" }),
      ],
      page: 1,
      pageSize: 20,
      totalCount: 3,
    });

    const asOfDate = new Date("2026-08-25T00:00:00.000Z");
    expect(findMany).toHaveBeenNthCalledWith(1, {
      where: {
        isVisible: true,
        eventStartDate: { lte: asOfDate },
        eventEndDate: { gte: asOfDate },
      },
      orderBy: [{ eventEndDate: "asc" }, { externalId: "asc" }],
      take: 5,
    });
    expect(findMany).toHaveBeenNthCalledWith(2, {
      where: { isVisible: true, eventStartDate: { gt: asOfDate } },
      orderBy: [{ eventStartDate: "asc" }, { externalId: "asc" }],
      take: 5,
    });
    for (const [query] of findMany.mock.calls) {
      expect(query.take).toBeLessThanOrEqual(20);
    }
  });

  it("applies the browse region only to the list page and leaves the ranking global", async () => {
    const asOfDate = new Date("2026-08-25T00:00:00.000Z");
    const cases: Array<
      [FestivalDiscoveryQuery["region"], Record<string, unknown>]
    > = [
      ["all", {}],
      ["jeju", { providerRegionCode: "50" }],
      ["seoul", { providerRegionCode: "11" }],
      ["busan", { providerRegionCode: "26" }],
      ["gangwon", { providerRegionCode: "51" }],
      ["gyeongju", { providerRegionCode: "47", providerDistrictCode: "130" }],
      [
        "jeonju",
        {
          providerRegionCode: "52",
          providerDistrictCode: { in: ["111", "113"] },
        },
      ],
    ];

    for (const [region, expectedRegionWhere] of cases) {
      const { findMany, service } = setup();
      await service.list({ region, page: 1, pageSize: 20 }, now);
      // 순위 쿼리(첫 두 번의 findMany)는 지역 조건 없이 전체 축제를 조회한다.
      // TourAPI가 회수한 축제(isVisible=false)는 모든 조회에서 제외한다.
      expect(findMany.mock.calls[0]?.[0].where).toEqual({
        isVisible: true,
        eventStartDate: { lte: asOfDate },
        eventEndDate: { gte: asOfDate },
      });
      expect(findMany.mock.calls[1]?.[0].where).toEqual({
        isVisible: true,
        eventStartDate: { gt: asOfDate },
      });
      // 지역 조건은 목록 페이지 쿼리(마지막 findMany)에만 적용된다.
      expect(findMany.mock.calls.at(-1)?.[0].where).toEqual({
        ...expectedRegionWhere,
        isVisible: true,
        eventStartDate: { gt: asOfDate },
      });
    }
  });

  it("keeps the ranking at the top five regardless of the requested list page", async () => {
    const ongoing = [
      row("1"),
      row("2"),
      row("3"),
      row("4"),
      row("5"),
      row("6"),
    ];
    const { findMany, service } = setup(ongoing, []);

    const result = await service.list(
      { region: "seoul", page: 2, pageSize: 2 },
      now,
    );

    expect(result.ranking.map((item) => item.externalId)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    expect(result.items.map((item) => item.externalId)).toEqual(["3", "4"]);
    expect(result.totalCount).toBe(6);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 2, take: 2 }),
    );
  });
});

describe("FestivalsService#detail", () => {
  const detailNow = new Date("2026-08-24T15:01:00.000Z");

  it("looks up only festivals TourAPI still publishes", async () => {
    const { findFirst, service } = setupDetail(detailRow());

    await service.detail("11111111-1111-4111-8111-111111111111");

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        id: "11111111-1111-4111-8111-111111111111",
        isVisible: true,
      },
    });
  });

  it("throws NotFound when the festival does not exist", async () => {
    const { service } = setupDetail(null);
    await expect(
      service.detail("00000000-0000-4000-8000-000000000000", detailNow),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("returns the persisted overview and https provider images without a request-time API dependency", async () => {
    const festival = detailRow({
      detailSnapshot: {
        common: {
          contentid: "3351268",
          contenttypeid: "15",
          overview: "  도심형 여름 축제  ",
          homepage: '<a href="https://www.ddmac.or.kr/" target="_blank">홈</a>',
        },
        intro: {
          contentid: "3351268",
          contenttypeid: "15",
          eventplace: " 장안1수변공원 ",
          playtime: "17:00~22:00",
          usetimefestival: "입장료 무료 (주류, 식음료 유료)",
          program:
            "1. 메인프로그램: 메인 스테이지\n2. 부대프로그램: 비어 테라스",
          sponsor1: "동대문구",
          sponsor1tel: "02-3291-5506",
          sponsor2: "동대문문화재단",
          sponsor2tel: "",
        },
        images: [
          {
            contentid: "3351268",
            serialnum: "1",
            originimgurl: "https://tong.visitkorea.or.kr/a.jpg",
            imgname: "정문",
          },
          {
            contentid: "3351268",
            serialnum: "2",
            originimgurl: "https://tong.visitkorea.or.kr/b.jpg",
          },
          {
            contentid: "3351268",
            serialnum: "3",
            originimgurl: "https://example.com/evil.jpg",
            imgname: "차단",
          },
        ],
      },
    });
    const { service } = setupDetail(festival);

    const result = await service.detail(festival.id, detailNow);

    expect(result).toMatchObject({
      status: "ONGOING",
      telephone: "02-3291-5506",
      longitude: 127.0753,
      homepage: "https://www.ddmac.or.kr/",
      overview: "도심형 여름 축제",
      eventPlace: "장안1수변공원",
      eventTime: "17:00~22:00",
      feeInfo: "입장료 무료 (주류, 식음료 유료)",
      program: "1. 메인프로그램: 메인 스테이지\n2. 부대프로그램: 비어 테라스",
      organizer: "동대문구",
      organizerTel: "02-3291-5506",
      hostAgency: "동대문문화재단",
      hostAgencyTel: null,
      images: [
        { url: "https://tong.visitkorea.or.kr/a.jpg", alt: "정문" },
        {
          url: "https://tong.visitkorea.or.kr/b.jpg",
          alt: "축제 3351268 사진",
        },
      ],
    });
  });

  it.each([null, { common: {}, intro: {}, images: "invalid" }])(
    "still returns the festival when the persisted detail snapshot is %p",
    async (detailSnapshot) => {
      const { service } = setupDetail(detailRow({ detailSnapshot }));
      const result = await service.detail(detailRow().id, detailNow);
      expect(result).toMatchObject({
        overview: null,
        homepage: null,
        eventPlace: null,
        eventTime: null,
        feeInfo: null,
        program: null,
        organizer: null,
        organizerTel: null,
        hostAgency: null,
        hostAgencyTel: null,
        images: [],
      });
    },
  );

  it("marks a past festival as ENDED", async () => {
    const { service } = setupDetail(
      detailRow({
        eventStartDate: new Date("2026-07-01T00:00:00.000Z"),
        eventEndDate: new Date("2026-07-10T00:00:00.000Z"),
      }),
    );
    const result = await service.detail(detailRow().id, detailNow);
    expect(result.status).toBe("ENDED");
  });
});
