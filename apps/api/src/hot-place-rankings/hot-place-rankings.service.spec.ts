import { NotFoundException } from "@nestjs/common";
import { jest } from "@jest/globals";

import { Prisma } from "../generated/prisma/client.js";
import { HotPlaceRankingsService } from "./hot-place-rankings.service.js";

type SnapshotRow = {
  source: string;
  scope: string;
  baseYearMonth: string;
  periodStart: Date;
  periodEnd: Date;
};

type RankingRow = {
  rank: number;
  sourcePlaceId: string;
  sourcePlaceName: string;
  sourceCategory: string;
  provinceName: string;
  districtName: string;
  growthPercent: Prisma.Decimal;
  placeId: string | null;
  primaryImageUrl: string | null;
  imageCopyrightType: string | null;
  imageAttribution: string | null;
  imageAttributionUrl: string | null;
};

type SnapshotFindFirstCall = [{ where: { audience: string } }];

describe("HotPlaceRankingsService", () => {
  it("loads the latest snapshot for the selected audience and maps rows", async () => {
    const snapshot: SnapshotRow = {
      source: "KTO_DATALAB",
      scope: "NATIONAL",
      baseYearMonth: "202607",
      periodStart: new Date("2026-07-01T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T00:00:00.000Z"),
    };
    const rows: RankingRow[] = [
      {
        rank: 1,
        sourcePlaceId: "0123456789abcdef0123456789abcdef",
        sourcePlaceName: "장릉",
        sourceCategory: "관광명소",
        provinceName: "강원특별자치도",
        districtName: "영월군",
        growthPercent: new Prisma.Decimal("398.90"),
        placeId: "6c9bc5a5-836e-420c-bce4-ef68ff421233",
        primaryImageUrl: "https://example.test/jangneung.jpg",
        imageCopyrightType: "Type1",
        imageAttribution: null,
        imageAttributionUrl: null,
      },
      {
        rank: 2,
        sourcePlaceId: "abcdef0123456789abcdef0123456789",
        sourcePlaceName: "청령포",
        sourceCategory: "관광명소",
        provinceName: "강원특별자치도",
        districtName: "영월군",
        growthPercent: new Prisma.Decimal("295.90"),
        placeId: null,
        primaryImageUrl:
          "http://upload.wikimedia.org/wikipedia/commons/example.jpg",
        imageCopyrightType: null,
        imageAttribution: "Shinfull, CC BY-SA 3.0, Wikimedia Commons",
        imageAttributionUrl:
          "https://commons.wikimedia.org/wiki/File:example.jpg",
      },
    ];
    const findFirst = jest
      .fn<() => Promise<SnapshotRow | null>>()
      .mockResolvedValue(snapshot);
    const findMany = jest
      .fn<() => Promise<RankingRow[]>>()
      .mockResolvedValue(rows);
    const service = new HotPlaceRankingsService({
      hotPlaceRanking: { findFirst, findMany },
    } as never);

    await expect(service.list({ audience: "20s", limit: 10 })).resolves.toEqual(
      {
        source: "KTO_DATALAB",
        scope: "national",
        baseYearMonth: "202607",
        periodStart: "2026-07-01",
        periodEnd: "2026-07-31",
        audience: "20s",
        items: [
          {
            rank: 1,
            sourcePlaceId: "0123456789abcdef0123456789abcdef",
            title: "장릉",
            category: "관광명소",
            provinceName: "강원특별자치도",
            districtName: "영월군",
            growthPercent: 398.9,
            placeId: "6c9bc5a5-836e-420c-bce4-ef68ff421233",
            primaryImageUrl: "https://example.test/jangneung.jpg",
            imageCopyrightType: "Type1",
            imageAttribution: null,
            imageAttributionUrl: null,
          },
          {
            rank: 2,
            sourcePlaceId: "abcdef0123456789abcdef0123456789",
            title: "청령포",
            category: "관광명소",
            provinceName: "강원특별자치도",
            districtName: "영월군",
            growthPercent: 295.9,
            placeId: null,
            primaryImageUrl:
              "https://upload.wikimedia.org/wikipedia/commons/example.jpg",
            imageCopyrightType: null,
            imageAttribution: "Shinfull, CC BY-SA 3.0, Wikimedia Commons",
            imageAttributionUrl:
              "https://commons.wikimedia.org/wiki/File:example.jpg",
          },
        ],
      },
    );

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        source: "KTO_DATALAB",
        scope: "NATIONAL",
        audience: "TWENTIES",
      },
      orderBy: [{ periodEnd: "desc" }, { periodStart: "desc" }],
      select: {
        source: true,
        scope: true,
        baseYearMonth: true,
        periodStart: true,
        periodEnd: true,
      },
    });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          source: "KTO_DATALAB",
          scope: "NATIONAL",
          audience: "TWENTIES",
          periodStart: snapshot.periodStart,
          periodEnd: snapshot.periodEnd,
        },
        orderBy: { rank: "asc" },
        take: 10,
      }),
    );
  });

  it("maps every public audience value to the stored database audience", async () => {
    const snapshot: SnapshotRow = {
      source: "KTO_DATALAB",
      scope: "NATIONAL",
      baseYearMonth: "202607",
      periodStart: new Date("2026-07-01T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T00:00:00.000Z"),
    };
    const findFirst = jest
      .fn<() => Promise<SnapshotRow | null>>()
      .mockResolvedValue(snapshot);
    const findMany = jest
      .fn<() => Promise<RankingRow[]>>()
      .mockResolvedValue([]);
    const service = new HotPlaceRankingsService({
      hotPlaceRanking: { findFirst, findMany },
    } as never);

    for (const [audience, storedAudience] of [
      ["all", "ALL"],
      ["20s", "TWENTIES"],
      ["30s", "THIRTIES"],
      ["40s", "FORTIES"],
      ["50s", "FIFTIES"],
      ["60s-plus", "SIXTIES_PLUS"],
    ] as const) {
      await service.list({ audience, limit: 1 });
      const lastCall = findFirst.mock.calls.at(-1) as
        SnapshotFindFirstCall | undefined;
      expect(lastCall?.[0].where.audience).toBe(storedAudience);
    }
  });

  it("throws a safe 404 response when the requested snapshot is missing", async () => {
    const findFirst = jest
      .fn<() => Promise<SnapshotRow | null>>()
      .mockResolvedValue(null);
    const findMany = jest.fn<() => Promise<RankingRow[]>>();
    const service = new HotPlaceRankingsService({
      hotPlaceRanking: { findFirst, findMany },
    } as never);

    await expect(service.list({ audience: "all", limit: 10 })).rejects.toEqual(
      new NotFoundException({
        code: "HOT_PLACE_RANKING_SNAPSHOT_NOT_FOUND",
        detail: "세대별 핫플레이스 순위 데이터를 찾을 수 없습니다.",
      }),
    );
    expect(findMany).not.toHaveBeenCalled();
  });
});
