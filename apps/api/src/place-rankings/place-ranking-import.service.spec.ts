/* eslint-disable @typescript-eslint/require-await -- fake Prisma methods preserve the async database interface */
import { jest } from "@jest/globals";

import type {
  ParsedPlaceRankingRow,
  ParsedPlaceRankingSnapshot,
} from "./place-ranking-csv.js";

const parsePlaceRankingDirectory =
  jest.fn<(directory: string) => Promise<ParsedPlaceRankingSnapshot>>();

jest.unstable_mockModule("./place-ranking-csv.js", () => ({
  parsePlaceRankingDirectory,
}));

const { PlaceRankingImportService, normalizePlaceTitle } =
  await import("./place-ranking-import.service.js");

type PlaceCandidate = {
  id: string;
  title: string;
  isVisible: boolean;
  primaryImageUrl?: string | null;
  imageCopyrightType?: string | null;
};
type PlaceRankingRow = Record<string, unknown>;
type FakeTransaction = <T>(
  callback: (transaction: FakePrisma) => Promise<T>,
) => Promise<T>;
const audiences = [
  "ALL",
  "TWENTIES",
  "THIRTIES",
  "FORTIES",
  "FIFTIES",
  "SIXTIES_PLUS",
] as const;

type BackfillRow = {
  id: string;
  sourcePlaceId: string;
  sourcePlaceName: string;
};

class FakePrisma {
  places: PlaceCandidate[] = [];
  committedRows: PlaceRankingRow[] = [{ id: "existing-ranking" }];
  createdRows: PlaceRankingRow[] = [];
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

  placeRanking = {
    deleteMany: jest.fn(async (args: { where: unknown }) => {
      this.deletedSnapshot = args.where;
      this.committedRows = [];
      return { count: 1 };
    }),
    createMany: jest.fn(async (args: { data: PlaceRankingRow[] }) => {
      if (this.failCreateMany) {
        throw new Error("create failed");
      }

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
  overrides: Partial<ParsedPlaceRankingRow> = {},
): ParsedPlaceRankingRow {
  const rank = overrides.rank ?? 1;

  return {
    audience: "ALL",
    rank,
    sourcePlaceId: `source-${rank}`,
    sourcePlaceName: `관광지 ${rank}`,
    sourceCategory: "문화시설",
    sharePercent: "9.00",
    sourceFileName: "세대별 인기관광지(전체).csv",
    ...overrides,
  };
}

function rankingRows(count: number): ParsedPlaceRankingRow[] {
  return Array.from({ length: count }, (_, index) =>
    rankingRow({
      audience: audiences[Math.floor(index / 30) % audiences.length],
      rank: (index % 30) + 1,
      sourcePlaceId: `source-${index + 1}`,
      sourcePlaceName: index === 0 ? "  에버랜드  " : `관광지 ${index + 1}`,
      sharePercent: (9 - index / 100).toFixed(2),
    }),
  );
}

function snapshot(rows: ParsedPlaceRankingRow[]): ParsedPlaceRankingSnapshot {
  return {
    source: "KTO_DATALAB",
    scope: "NATIONAL",
    periodStart: new Date("2025-08-01T00:00:00.000Z"),
    periodEnd: new Date("2026-07-31T00:00:00.000Z"),
    rows,
  };
}

describe("PlaceRankingImportService", () => {
  beforeEach(() => {
    parsePlaceRankingDirectory.mockReset();
  });

  it("replaces the snapshot in one transaction with exact normalized title matches", async () => {
    const directory = "/tmp/rankings";
    const prisma = new FakePrisma();
    prisma.places = [{ id: "place-1", title: "에버랜드", isVisible: true }];
    parsePlaceRankingDirectory.mockResolvedValue(snapshot(rankingRows(180)));

    const service = new PlaceRankingImportService(prisma);

    await expect(service.importDirectory(directory)).resolves.toEqual({
      source: "KTO_DATALAB",
      scope: "NATIONAL",
      periodStart: "2025-08-01",
      periodEnd: "2026-07-31",
      audienceCount: 6,
      importedCount: 180,
      matchedCount: 1,
      unmatchedCount: 179,
    });

    expect(parsePlaceRankingDirectory).toHaveBeenCalledWith(directory);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.deletedSnapshot).toMatchObject({
      source: "KTO_DATALAB",
      scope: "NATIONAL",
    });
    expect(prisma.createdRows).toHaveLength(180);
    expect(prisma.createdRows[0]).toMatchObject({
      source: "KTO_DATALAB",
      scope: "NATIONAL",
      sourcePlaceName: "  에버랜드  ",
      placeId: "place-1",
    });
  });

  it("leaves placeId null for zero, duplicate, and hidden normalized title matches", async () => {
    const prisma = new FakePrisma();
    prisma.places = [
      { id: "visible-1", title: "국립  중앙 박물관", isVisible: true },
      { id: "visible-2", title: "중복명", isVisible: true },
      { id: "visible-3", title: "중복명", isVisible: true },
      { id: "hidden-1", title: "숨은 관광지", isVisible: false },
    ];
    parsePlaceRankingDirectory.mockResolvedValue(
      snapshot([
        rankingRow({ rank: 1, sourcePlaceName: "국립 중앙 박물관" }),
        rankingRow({ rank: 2, sourcePlaceName: "없는 관광지" }),
        rankingRow({ rank: 3, sourcePlaceName: "중복명" }),
        rankingRow({ rank: 4, sourcePlaceName: "숨은 관광지" }),
      ]),
    );

    const service = new PlaceRankingImportService(prisma);

    await expect(
      service.importDirectory("/tmp/rankings"),
    ).resolves.toMatchObject({
      importedCount: 4,
      matchedCount: 1,
      unmatchedCount: 3,
    });
    expect(prisma.createdRows.map((row) => row.placeId)).toEqual([
      "visible-1",
      null,
      null,
      null,
    ]);
  });

  it("does not replace the committed snapshot when create fails", async () => {
    const prisma = new FakePrisma();
    const originalRows = prisma.committedRows;
    prisma.failCreateMany = true;
    parsePlaceRankingDirectory.mockResolvedValue(snapshot([rankingRow()]));

    const service = new PlaceRankingImportService(prisma);

    await expect(service.importDirectory("/tmp/rankings")).rejects.toThrow(
      "create failed",
    );
    expect(prisma.committedRows).toBe(originalRows);
    expect(prisma.createdRows).toHaveLength(0);
    expect(prisma.deletedSnapshot).toBeUndefined();
  });

  it("copies only images and copyright stored on matched places", async () => {
    const prisma = new FakePrisma();
    prisma.places = [
      {
        id: "place-1",
        title: "에버랜드",
        isVisible: true,
        primaryImageUrl: "https://cdn.test/everland.jpg",
        imageCopyrightType: "Type1",
      },
    ];
    parsePlaceRankingDirectory.mockResolvedValue(
      snapshot([
        rankingRow({
          rank: 1,
          sourcePlaceId: "s-1",
          sourcePlaceName: "에버랜드",
        }),
        rankingRow({
          rank: 2,
          sourcePlaceId: "s-2",
          sourcePlaceName: "남이섬",
        }),
      ]),
    );
    const service = new PlaceRankingImportService(prisma);

    await service.importDirectory("/tmp/rankings");

    expect(prisma.createdRows[0]).toMatchObject({
      primaryImageUrl: "https://cdn.test/everland.jpg",
      imageCopyrightType: "Type1",
    });
    expect(prisma.createdRows[1]).toMatchObject({
      primaryImageUrl: null,
      imageCopyrightType: null,
    });
  });
});

describe("PlaceRankingImportService.backfillDisplayImages", () => {
  it("fills only unique exact matches from stored place images", async () => {
    const prisma = new FakePrisma();
    prisma.places = [
      {
        id: "place-1",
        title: "에버랜드",
        isVisible: true,
        primaryImageUrl: "https://cdn.test/everland.jpg",
        imageCopyrightType: "Type1",
      },
    ];
    prisma.imagelessRows = [
      { id: "row-a", sourcePlaceId: "s-1", sourcePlaceName: "에버랜드" },
      { id: "row-b", sourcePlaceId: "s-2", sourcePlaceName: "남이섬" },
      { id: "row-c", sourcePlaceId: "s-2", sourcePlaceName: "남이섬" },
    ];
    prisma.places.push(
      {
        id: "place-2",
        title: "중복명",
        isVisible: true,
        primaryImageUrl: "https://cdn.test/duplicate-a.jpg",
      },
      {
        id: "place-3",
        title: "중복명",
        isVisible: true,
        primaryImageUrl: "https://cdn.test/duplicate-b.jpg",
      },
    );
    prisma.imagelessRows[1] = {
      id: "row-b",
      sourcePlaceId: "s-2",
      sourcePlaceName: "중복명",
    };
    prisma.imagelessRows[2] = {
      id: "row-c",
      sourcePlaceId: "s-3",
      sourcePlaceName: "남이섬",
    };

    const service = new PlaceRankingImportService(prisma);

    await expect(service.backfillDisplayImages()).resolves.toEqual({
      scanned: 3,
      updated: 1,
    });
    expect(prisma.updates).toEqual([
      {
        id: "row-a",
        data: {
          primaryImageUrl: "https://cdn.test/everland.jpg",
          imageCopyrightType: "Type1",
        },
      },
    ]);
  });

  it("links unmatched rows once per source place and skips unresolved names", async () => {
    const prisma = new FakePrisma();
    prisma.unlinkedRows = [
      { id: "row-a", sourcePlaceId: "s-1", sourcePlaceName: "코엑스" },
      { id: "row-b", sourcePlaceId: "s-1", sourcePlaceName: "코엑스" },
      { id: "row-c", sourcePlaceId: "s-2", sourcePlaceName: "이름없는곳" },
    ];
    const resolvePlaceId = jest.fn(async (input: { placeName: string }) =>
      input.placeName === "코엑스" ? "place-coex" : null,
    );

    const service = new PlaceRankingImportService(prisma, {
      resolvePlaceId,
    });

    await expect(service.backfillPlaceLinks()).resolves.toEqual({
      scanned: 3,
      linked: 2,
    });
    expect(resolvePlaceId).toHaveBeenCalledTimes(2);
    expect(prisma.updates).toEqual([
      { id: "row-a", data: { placeId: "place-coex" } },
      { id: "row-b", data: { placeId: "place-coex" } },
    ]);
  });

  it("reports the scan without linking when the link service is unavailable", async () => {
    const prisma = new FakePrisma();
    prisma.unlinkedRows = [
      { id: "row-a", sourcePlaceId: "s-1", sourcePlaceName: "코엑스" },
    ];

    const service = new PlaceRankingImportService(prisma);

    await expect(service.backfillPlaceLinks()).resolves.toEqual({
      scanned: 1,
      linked: 0,
    });
    expect(prisma.updates).toEqual([]);
  });
});

describe("normalizePlaceTitle", () => {
  it("normalizes unicode and whitespace without punctuation changes", () => {
    expect(normalizePlaceTitle(" Cafe\u0301   (본점) ")).toBe("Café (본점)");
  });
});
