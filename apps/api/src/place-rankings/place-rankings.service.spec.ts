import { NotFoundException } from "@nestjs/common";
import { jest } from "@jest/globals";

import { Prisma } from "../generated/prisma/client.js";
import { PlaceRankingsService } from "./place-rankings.service.js";

type SnapshotRow = {
  source: string;
  scope: string;
  periodStart: Date;
  periodEnd: Date;
};

type RankingRow = SnapshotRow & {
  rank: number;
  sourcePlaceId: string;
  sourcePlaceName: string;
  sourceCategory: string;
  sharePercent: Prisma.Decimal;
  place: {
    id: string;
    primaryImageUrl: string | null;
    imageCopyrightType: string | null;
  } | null;
};
type SnapshotFindFirstCall = [{ where: { audience: string } }];

describe("PlaceRankingsService", () => {
  it("loads the latest snapshot for the selected audience and maps rows to the public response", async () => {
    const snapshot: SnapshotRow = {
      source: "KTO_DATALAB",
      scope: "NATIONAL",
      periodStart: new Date("2025-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T00:00:00.000Z"),
    };
    const rows: RankingRow[] = [
      {
        ...snapshot,
        rank: 1,
        sourcePlaceId: "0123456789abcdef0123456789abcdef",
        sourcePlaceName: "여의도한강공원",
        sourceCategory: "자연관광",
        sharePercent: new Prisma.Decimal("12.34"),
        place: {
          id: "6c9bc5a5-836e-420c-bce4-ef68ff421233",
          primaryImageUrl: "https://example.test/yeouido.jpg",
          imageCopyrightType: "Type1",
        },
      },
      {
        ...snapshot,
        rank: 2,
        sourcePlaceId: "abcdef0123456789abcdef0123456789",
        sourcePlaceName: "경복궁",
        sourceCategory: "역사관광",
        sharePercent: new Prisma.Decimal("10.50"),
        place: null,
      },
    ];
    const findFirst = jest
      .fn<() => Promise<SnapshotRow | null>>()
      .mockResolvedValue(snapshot);
    const findMany = jest
      .fn<() => Promise<RankingRow[]>>()
      .mockResolvedValue(rows);
    const service = new PlaceRankingsService({
      placeRanking: { findFirst, findMany },
    } as never);

    await expect(service.list({ audience: "20s", limit: 10 })).resolves.toEqual(
      {
        source: "KTO_DATALAB",
        scope: "national",
        periodStart: "2025-08-01",
        periodEnd: "2026-07-31",
        audience: "20s",
        items: [
          {
            rank: 1,
            sourcePlaceId: "0123456789abcdef0123456789abcdef",
            title: "여의도한강공원",
            category: "자연관광",
            sharePercent: 12.34,
            placeId: "6c9bc5a5-836e-420c-bce4-ef68ff421233",
            primaryImageUrl: "https://example.test/yeouido.jpg",
            imageCopyrightType: "Type1",
          },
          {
            rank: 2,
            sourcePlaceId: "abcdef0123456789abcdef0123456789",
            title: "경복궁",
            category: "역사관광",
            sharePercent: 10.5,
            placeId: null,
            primaryImageUrl: null,
            imageCopyrightType: null,
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
        periodStart: true,
        periodEnd: true,
      },
    });
    expect(findMany).toHaveBeenCalledWith({
      where: {
        source: "KTO_DATALAB",
        scope: "NATIONAL",
        audience: "TWENTIES",
        periodStart: snapshot.periodStart,
        periodEnd: snapshot.periodEnd,
      },
      orderBy: { rank: "asc" },
      take: 10,
      select: {
        rank: true,
        sourcePlaceId: true,
        sourcePlaceName: true,
        sourceCategory: true,
        sharePercent: true,
        place: {
          select: {
            id: true,
            primaryImageUrl: true,
            imageCopyrightType: true,
          },
        },
      },
    });
  });

  it("maps every public audience value to the stored database audience", async () => {
    const snapshot: SnapshotRow = {
      source: "KTO_DATALAB",
      scope: "NATIONAL",
      periodStart: new Date("2025-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-07-31T00:00:00.000Z"),
    };
    const findFirst = jest
      .fn<() => Promise<SnapshotRow | null>>()
      .mockResolvedValue(snapshot);
    const findMany = jest
      .fn<() => Promise<RankingRow[]>>()
      .mockResolvedValue([]);
    const service = new PlaceRankingsService({
      placeRanking: { findFirst, findMany },
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
    const service = new PlaceRankingsService({
      placeRanking: { findFirst, findMany },
    } as never);

    await expect(service.list({ audience: "all", limit: 10 })).rejects.toEqual(
      new NotFoundException({
        code: "PLACE_RANKING_SNAPSHOT_NOT_FOUND",
        detail: "세대별 인기관광지 순위 데이터를 찾을 수 없습니다.",
      }),
    );
    expect(findMany).not.toHaveBeenCalled();
  });
});
