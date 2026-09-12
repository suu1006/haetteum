/* eslint-disable @typescript-eslint/require-await -- fake Prisma methods preserve the async database interface */
import { jest } from "@jest/globals";

import type {
  ParsedHotPlaceRankingRow,
  ParsedHotPlaceRankingSnapshot,
} from "./hot-place-ranking-csv.js";

const parseHotPlaceRankingDirectory =
  jest.fn<(directory: string) => Promise<ParsedHotPlaceRankingSnapshot>>();

jest.unstable_mockModule("./hot-place-ranking-csv.js", () => ({
  parseHotPlaceRankingDirectory,
}));

const { HotPlaceRankingImportService, normalizePlaceTitle } =
  await import("./hot-place-ranking-import.service.js");

type PlaceCandidate = {
  id: string;
  title: string;
  isVisible: boolean;
  primaryImageUrl?: string | null;
  imageCopyrightType?: string | null;
};
type HotPlaceRankingRow = Record<string, unknown>;
type FakeTransaction = <T>(
  callback: (transaction: FakePrisma) => Promise<T>,
) => Promise<T>;

type BackfillRow = {
  id: string;
  sourcePlaceId: string;
  sourcePlaceName: string;
  provinceName: string;
};

class FakePrisma {
  places: PlaceCandidate[] = [];
  committedRows: HotPlaceRankingRow[] = [{ id: "existing-ranking" }];
  createdRows: HotPlaceRankingRow[] = [];
  deletedSnapshot: unknown;
  failCreateMany = false;
  imagelessRows: BackfillRow[] = [];
  unlinkedRows: BackfillRow[] = [];
  updates: Array<{ id: string; data: Record<string, unknown> }> = [];

  place = {
    findMany: jest.fn(async (args: unknown) => {
      expect(args).toEqual({
        where: { isVisible: true },
        select: {
          id: true,
          title: true,
          primaryImageUrl: true,
          imageCopyrightType: true,
        },
      });
      return this.places
        .filter((place) => place.isVisible)
        .map(({ id, title, primaryImageUrl, imageCopyrightType }) => ({
          id,
          title,
          primaryImageUrl: primaryImageUrl ?? null,
          imageCopyrightType: imageCopyrightType ?? null,
        }));
    }),
  };

  hotPlaceRanking = {
    deleteMany: jest.fn(async (args: { where: unknown }) => {
      this.deletedSnapshot = args.where;
      this.committedRows = [];
      return { count: 1 };
    }),
    createMany: jest.fn(async (args: { data: HotPlaceRankingRow[] }) => {
      if (this.failCreateMany) throw new Error("create failed");
      this.createdRows = args.data;
      this.committedRows = args.data;
      return { count: args.data.length };
    }),
    findMany: jest.fn(async (args: { where: Record<string, unknown> }) => {
      if ("placeId" in args.where) {
        expect(args).toMatchObject({ where: { placeId: null } });
        return this.unlinkedRows;
      }

      expect(args).toMatchObject({ where: { primaryImageUrl: null } });
      return this.imagelessRows;
    }),
    update: jest.fn(
      async (args: {
        where: { id: string };
        data: Record<string, unknown>;
      }) => {
        this.updates.push({ id: args.where.id, data: args.data });
        return { id: args.where.id };
      },
    ),
  };

  $transaction: jest.MockedFunction<FakeTransaction> = jest.fn(
    async <T>(callback: (transaction: FakePrisma) => Promise<T>) => {
      const previousRows = this.committedRows;
      const previousCreatedRows = this.createdRows;
      const previousDeletedSnapshot = this.deletedSnapshot;
      try {
        return await callback(this);
      } catch (error) {
        this.committedRows = previousRows;
        this.createdRows = previousCreatedRows;
        this.deletedSnapshot = previousDeletedSnapshot;
        throw error;
      }
    },
  ) as jest.MockedFunction<FakeTransaction>;
}

function rankingRow(
  overrides: Partial<ParsedHotPlaceRankingRow> = {},
): ParsedHotPlaceRankingRow {
  const rank = overrides.rank ?? 1;
  return {
    audience: "ALL",
    rank,
    baseYearMonth: "202607",
    provinceName: "강원특별자치도",
    districtName: "영월군",
    sourcePlaceId: `source-${rank}`,
    sourcePlaceName: `핫플레이스 ${rank}`,
    sourceCategory: "관광명소",
    growthPercent: "300.00",
    sourceFileName: "세대별 핫플레이스(전체).csv",
    ...overrides,
  };
}

function snapshot(
  rows: ParsedHotPlaceRankingRow[],
): ParsedHotPlaceRankingSnapshot {
  return {
    source: "KTO_DATALAB",
    scope: "NATIONAL",
    baseYearMonth: "202607",
    periodStart: new Date("2026-07-01T00:00:00.000Z"),
    periodEnd: new Date("2026-07-31T00:00:00.000Z"),
    rows,
  };
}

describe("HotPlaceRankingImportService", () => {
  beforeEach(() => {
    parseHotPlaceRankingDirectory.mockReset();
  });

  it("replaces the snapshot in one transaction with exact normalized title matches", async () => {
    const prisma = new FakePrisma();
    prisma.places = [
      {
        id: "place-1",
        title: "장릉",
        isVisible: true,
        primaryImageUrl: "https://cdn.test/jangneung.jpg",
        imageCopyrightType: "Type1",
      },
    ];
    parseHotPlaceRankingDirectory.mockResolvedValue(
      snapshot([
        rankingRow({ rank: 1, sourcePlaceName: "  장릉  " }),
        rankingRow({ rank: 2, sourcePlaceName: "청령포" }),
      ]),
    );

    const service = new HotPlaceRankingImportService(prisma);

    await expect(service.importDirectory("/tmp/hot")).resolves.toEqual({
      source: "KTO_DATALAB",
      scope: "NATIONAL",
      baseYearMonth: "202607",
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      audienceCount: 1,
      importedCount: 2,
      matchedCount: 1,
      unmatchedCount: 1,
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.deletedSnapshot).toMatchObject({
      source: "KTO_DATALAB",
      scope: "NATIONAL",
    });
    expect(prisma.createdRows[0]).toMatchObject({
      source: "KTO_DATALAB",
      scope: "NATIONAL",
      baseYearMonth: "202607",
      provinceName: "강원특별자치도",
      districtName: "영월군",
      sourcePlaceName: "  장릉  ",
      placeId: "place-1",
      primaryImageUrl: "https://cdn.test/jangneung.jpg",
      imageCopyrightType: "Type1",
    });
    expect(prisma.createdRows[1]).toMatchObject({
      placeId: null,
      primaryImageUrl: null,
      imageCopyrightType: null,
    });
  });

  it("does not replace the committed snapshot when create fails", async () => {
    const prisma = new FakePrisma();
    const originalRows = prisma.committedRows;
    prisma.failCreateMany = true;
    parseHotPlaceRankingDirectory.mockResolvedValue(snapshot([rankingRow()]));

    const service = new HotPlaceRankingImportService(prisma);

    await expect(service.importDirectory("/tmp/hot")).rejects.toThrow(
      "create failed",
    );
    expect(prisma.committedRows).toBe(originalRows);
    expect(prisma.createdRows).toHaveLength(0);
    expect(prisma.deletedSnapshot).toBeUndefined();
  });

  it("keeps images null when there is no exact stored place match", async () => {
    const prisma = new FakePrisma();
    parseHotPlaceRankingDirectory.mockResolvedValue(
      snapshot([
        rankingRow({
          rank: 1,
          sourcePlaceName: "청령포",
        }),
      ]),
    );

    const service = new HotPlaceRankingImportService(prisma);

    await service.importDirectory("/tmp/hot");

    expect(prisma.createdRows[0]).toMatchObject({
      sourcePlaceName: "청령포",
      primaryImageUrl: null,
      imageCopyrightType: null,
    });
  });
});

describe("HotPlaceRankingImportService.backfillDisplayImages", () => {
  it("fills only unique exact matches from stored place images", async () => {
    const prisma = new FakePrisma();
    prisma.places = [
      {
        id: "place-cheongnyeongpo",
        title: "청령포",
        isVisible: true,
        primaryImageUrl: "http://tong.visitkorea.or.kr/c.jpg",
        imageCopyrightType: "Type1",
      },
      {
        id: "place-duplicate-a",
        title: "중복명",
        isVisible: true,
        primaryImageUrl: "https://cdn.test/duplicate-a.jpg",
      },
      {
        id: "place-duplicate-b",
        title: "중복명",
        isVisible: true,
        primaryImageUrl: "https://cdn.test/duplicate-b.jpg",
      },
    ];
    prisma.imagelessRows = [
      {
        id: "row-a",
        sourcePlaceId: "p-1",
        sourcePlaceName: "청령포",
        provinceName: "강원특별자치도",
      },
      {
        id: "row-b",
        sourcePlaceId: "p-1",
        sourcePlaceName: "청령포",
        provinceName: "강원특별자치도",
      },
      {
        id: "row-c",
        sourcePlaceId: "p-2",
        sourcePlaceName: "중복명",
        provinceName: "강원특별자치도",
      },
    ];

    const service = new HotPlaceRankingImportService(prisma);

    await expect(service.backfillDisplayImages()).resolves.toEqual({
      scanned: 3,
      updated: 2,
    });
    expect(prisma.updates).toEqual([
      {
        id: "row-a",
        data: {
          primaryImageUrl: "https://tong.visitkorea.or.kr/c.jpg",
          imageCopyrightType: "Type1",
        },
      },
      {
        id: "row-b",
        data: {
          primaryImageUrl: "https://tong.visitkorea.or.kr/c.jpg",
          imageCopyrightType: "Type1",
        },
      },
    ]);
  });

  it("does nothing when every snapshot row already has an image", async () => {
    const prisma = new FakePrisma();
    const service = new HotPlaceRankingImportService(prisma);

    await expect(service.backfillDisplayImages()).resolves.toEqual({
      scanned: 0,
      updated: 0,
    });
    expect(prisma.updates).toHaveLength(0);
  });

  it("links unmatched rows with the datalab province narrowing the search", async () => {
    const prisma = new FakePrisma();
    prisma.unlinkedRows = [
      {
        id: "row-a",
        sourcePlaceId: "s-1",
        sourcePlaceName: "킨텍스제2전시장",
        provinceName: "경기도",
      },
      {
        id: "row-b",
        sourcePlaceId: "s-1",
        sourcePlaceName: "킨텍스제2전시장",
        provinceName: "경기도",
      },
      {
        id: "row-c",
        sourcePlaceId: "s-2",
        sourcePlaceName: "이름없는곳",
        provinceName: "제주특별자치도",
      },
    ];
    const resolvePlaceId = jest.fn(
      async (input: { placeName: string; areaCode?: string }) =>
        input.placeName === "킨텍스제2전시장" ? "place-kintex" : null,
    );

    const service = new HotPlaceRankingImportService(prisma, {
      resolvePlaceId,
    });

    await expect(service.backfillPlaceLinks()).resolves.toEqual({
      scanned: 3,
      linked: 2,
    });
    expect(resolvePlaceId).toHaveBeenNthCalledWith(1, {
      placeName: "킨텍스제2전시장",
      areaCode: "31",
    });
    expect(resolvePlaceId).toHaveBeenNthCalledWith(2, {
      placeName: "이름없는곳",
      areaCode: "39",
    });
    expect(prisma.updates).toEqual([
      { id: "row-a", data: { placeId: "place-kintex" } },
      { id: "row-b", data: { placeId: "place-kintex" } },
    ]);
  });
});

describe("normalizePlaceTitle", () => {
  it("normalizes unicode and whitespace without punctuation changes", () => {
    expect(normalizePlaceTitle(" Café   (본점) ")).toBe("Café (본점)");
  });
});
