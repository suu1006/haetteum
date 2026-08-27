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

type PlaceCandidate = { id: string; title: string; isVisible: boolean };
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

class FakePrisma {
  places: PlaceCandidate[] = [];
  committedRows: PlaceRankingRow[] = [{ id: "existing-ranking" }];
  createdRows: PlaceRankingRow[] = [];
  deletedSnapshot: unknown;
  failCreateMany = false;

  place = {
    findMany: jest.fn(async (args: unknown) => {
      expect(args).toEqual({
        where: { isVisible: true },
        select: { id: true, title: true },
      });

      return this.places
        .filter((place) => place.isVisible)
        .map(({ id, title }) => ({ id, title }));
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
});

describe("normalizePlaceTitle", () => {
  it("normalizes unicode and whitespace without punctuation changes", () => {
    expect(normalizePlaceTitle(" Cafe\u0301   (본점) ")).toBe("Café (본점)");
  });
});
