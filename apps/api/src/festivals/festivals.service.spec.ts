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
        eventStartDate: { lte: asOfDate },
        eventEndDate: { gte: asOfDate },
      },
      orderBy: [{ eventEndDate: "asc" }, { externalId: "asc" }],
      take: 3,
    });
    expect(findMany).toHaveBeenNthCalledWith(2, {
      where: { eventStartDate: { gt: asOfDate } },
      orderBy: [{ eventStartDate: "asc" }, { externalId: "asc" }],
      take: 3,
    });
    for (const [query] of findMany.mock.calls) {
      expect(query.take).toBeLessThanOrEqual(20);
    }
  });

  it("maps every browse region to exact provider codes without address matching", async () => {
    const cases: Array<
      [FestivalDiscoveryQuery["region"], Record<string, unknown> | undefined]
    > = [
      ["all", undefined],
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
      const firstWhere = findMany.mock.calls[0]?.[0].where;
      expect(firstWhere).toEqual({
        ...(expectedRegionWhere ?? {}),
        eventStartDate: { lte: new Date("2026-08-25T00:00:00.000Z") },
        eventEndDate: { gte: new Date("2026-08-25T00:00:00.000Z") },
      });
    }
  });

  it("keeps ranking global to the selected region while slicing the requested list page", async () => {
    const ongoing = [row("1"), row("2"), row("3"), row("4")];
    const { findMany, service } = setup(ongoing, []);

    const result = await service.list(
      { region: "seoul", page: 2, pageSize: 2 },
      now,
    );

    expect(result.ranking.map((item) => item.externalId)).toEqual([
      "1",
      "2",
      "3",
    ]);
    expect(result.items.map((item) => item.externalId)).toEqual(["3", "4"]);
    expect(result.totalCount).toBe(4);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 2, take: 2 }),
    );
  });
});
