import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { AppModule } from "../src/app.module.js";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PlaceRankingImportService } from "../src/place-rankings/place-ranking-import.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

const CSV_HEADER = "순위,관광지ID,관심지점명,구분,연령대,비율";
const DOWNLOAD_TIMESTAMP = "20260825074520";
const MIGRATIONS = [
  "../prisma/migrations/20260821000000_add_tourism_place_foundation/migration.sql",
  "../prisma/migrations/20260822000000_add_tourism_database_comments/migration.sql",
  "../prisma/migrations/20260824135934_scope_tourism_district_provider_code/migration.sql",
  "../prisma/migrations/20260825000000_add_festivals/migration.sql",
  "../prisma/migrations/20260825170000_add_place_rankings/migration.sql",
  "../prisma/migrations/20260826130000_add_users_and_reviews/migration.sql",
  "../prisma/migrations/20260826190000_add_kakao_auth_sessions/migration.sql",
] as const;

const audienceFileLabels = {
  ALL: "전체",
  TWENTIES: "20대",
  THIRTIES: "30대",
  FORTIES: "40대",
  FIFTIES: "50대",
  SIXTIES_PLUS: "60대이상",
} as const;

const audienceCsvValues = {
  ALL: "전체",
  TWENTIES: "20",
  THIRTIES: "30",
  FORTIES: "40",
  FIFTIES: "50",
  SIXTIES_PLUS: "60",
} as const satisfies Record<Audience, string>;

type Audience = keyof typeof audienceFileLabels;

const audiences = Object.keys(audienceFileLabels) as Audience[];
const snapshotWhere = {
  source: "KTO_DATALAB",
  scope: "NATIONAL",
  periodStart: new Date("2025-08-01T00:00:00.000Z"),
  periodEnd: new Date("2026-07-31T00:00:00.000Z"),
};

function sourcePlaceId(audienceIndex: number, rank: number) {
  return `${audienceIndex.toString(16).padStart(2, "0")}${rank
    .toString(16)
    .padStart(2, "0")}${"b".repeat(28)}`;
}

function rankingRows(audience: Audience, audienceIndex: number) {
  const csvValue = audienceCsvValues[audience];

  return Array.from({ length: 30 }, (_, index) => {
    const rank = index + 1;
    const sharePercent = (9.1 - rank * 0.1).toFixed(1);

    return [
      rank.toString(),
      sourcePlaceId(audienceIndex, rank),
      rank === 1 ? "에버랜드" : `테스트 관광지 ${audience}-${rank}`,
      rank === 1 ? "레저/스포츠" : "문화시설",
      csvValue,
      sharePercent,
    ].join(",");
  });
}

function csvForAudience(audience: Audience, audienceIndex: number) {
  return [CSV_HEADER, ...rankingRows(audience, audienceIndex), ""].join("\n");
}

function fileNameForAudience(audience: Audience) {
  return `${DOWNLOAD_TIMESTAMP}_세대별 인기관광지(${audienceFileLabels[audience]}).csv`;
}

async function writeRankingDirectory(
  mutate?: (files: Record<Audience, string>) => Record<Audience, string>,
) {
  const root = await mkdtemp(join(tmpdir(), "haetteum-ranking-import-e2e-"));
  const directory = join(
    root,
    `${DOWNLOAD_TIMESTAMP}_전국_202508-202607_데이터랩_다운로드`,
  );
  const files = Object.fromEntries(
    audiences.map((audience, index) => [
      audience,
      csvForAudience(audience, index),
    ]),
  ) as Record<Audience, string>;

  try {
    await mkdir(directory);
    const finalFiles = mutate?.(files) ?? files;
    await Promise.all(
      Object.entries(finalFiles).map(([audience, contents]) =>
        writeFile(
          join(directory, fileNameForAudience(audience as Audience)),
          contents,
          "utf8",
        ),
      ),
    );

    return { directory, root };
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

function replaceLine(
  csv: string,
  lineIndex: number,
  update: (columns: string[]) => string[],
) {
  const lines = csv.trimEnd().split("\n");
  lines[lineIndex] = update(lines[lineIndex]?.split(",") ?? []).join(",");
  return `${lines.join("\n")}\n`;
}

describe("PlaceRankingImportService PostgreSQL integration (e2e)", () => {
  let app: INestApplication | undefined;
  let prisma: PrismaClient | undefined;
  let adminPool: Pool | undefined;
  let service: PlaceRankingImportService;
  let schemaName: string;
  let tempRoots: string[] = [];

  beforeEach(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required for E2E tests");

    schemaName = `place_ranking_e2e_${randomUUID().replaceAll("-", "")}`;
    adminPool = new Pool({ connectionString: databaseUrl });
    const client = await adminPool.connect();
    try {
      await client.query(`CREATE SCHEMA "${schemaName}"`);
      await client.query(`SET search_path TO "${schemaName}"`);
      for (const migrationPath of MIGRATIONS) {
        await client.query(
          await readFile(new URL(migrationPath, import.meta.url), "utf8"),
        );
      }
    } finally {
      client.release();
    }

    prisma = new PrismaClient({
      adapter: new PrismaPg(
        { connectionString: databaseUrl },
        { schema: schemaName },
      ),
    });
    await prisma.$connect();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    service = app.get(PlaceRankingImportService);
  });

  afterEach(async () => {
    try {
      await app?.close();
    } finally {
      try {
        await prisma?.$disconnect();
      } finally {
        await Promise.all(
          tempRoots.map((root) => rm(root, { recursive: true, force: true })),
        );
        tempRoots = [];
        if (adminPool) {
          await adminPool.query(`DROP SCHEMA "${schemaName}" CASCADE`);
          await adminPool.end();
        }
        app = undefined;
        prisma = undefined;
        adminPool = undefined;
      }
    }
  });

  it("replaces the strict six-audience snapshot idempotently", async () => {
    if (!prisma) throw new Error("Prisma test client is missing");
    const { directory, root } = await writeRankingDirectory();
    tempRoots.push(root);

    await expect(service.importDirectory(directory)).resolves.toMatchObject({
      source: "KTO_DATALAB",
      scope: "NATIONAL",
      periodStart: "2025-08-01",
      periodEnd: "2026-07-31",
      audienceCount: 6,
      importedCount: 180,
    });
    await expect(service.importDirectory(directory)).resolves.toMatchObject({
      audienceCount: 6,
      importedCount: 180,
    });

    expect(await prisma.placeRanking.count({ where: snapshotWhere })).toBe(180);
    expect(
      await prisma.placeRanking.groupBy({
        by: ["audience"],
        where: snapshotWhere,
        _count: { _all: true },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ audience: "ALL", _count: { _all: 30 } }),
        expect.objectContaining({
          audience: "TWENTIES",
          _count: { _all: 30 },
        }),
        expect.objectContaining({
          audience: "THIRTIES",
          _count: { _all: 30 },
        }),
        expect.objectContaining({
          audience: "FORTIES",
          _count: { _all: 30 },
        }),
        expect.objectContaining({
          audience: "FIFTIES",
          _count: { _all: 30 },
        }),
        expect.objectContaining({
          audience: "SIXTIES_PLUS",
          _count: { _all: 30 },
        }),
      ]),
    );
  });

  it("keeps the existing snapshot when parsing fails before the transaction", async () => {
    if (!prisma) throw new Error("Prisma test client is missing");
    await prisma.placeRanking.create({
      data: {
        ...snapshotWhere,
        audience: "ALL",
        rank: 1,
        sourcePlaceId: "sentinel-source-place-id",
        sourcePlaceName: "기존 스냅샷",
        sourceCategory: "문화시설",
        sharePercent: "1.0",
        placeId: null,
        sourceFileName: "sentinel.csv",
        importedAt: new Date("2026-08-25T07:45:20.000Z"),
      },
    });
    const { directory, root } = await writeRankingDirectory((files) => ({
      ...files,
      ALL: replaceLine(files.ALL, 1, (columns) => {
        columns[1] = "not-a-valid-source-id";
        return columns;
      }),
    }));
    tempRoots.push(root);

    await expect(service.importDirectory(directory)).rejects.toThrow(
      /invalid source place id/i,
    );

    await expect(
      prisma.placeRanking.findFirstOrThrow({
        where: { ...snapshotWhere, sourcePlaceId: "sentinel-source-place-id" },
      }),
    ).resolves.toMatchObject({
      sourcePlaceName: "기존 스냅샷",
      rank: 1,
    });
    expect(await prisma.placeRanking.count({ where: snapshotWhere })).toBe(1);
  });
});
