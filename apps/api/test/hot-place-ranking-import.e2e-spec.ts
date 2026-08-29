import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { AppModule } from "../src/app.module.js";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { HotPlaceRankingImportService } from "../src/hot-place-rankings/hot-place-ranking-import.service.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

import { applyMigrations } from "./apply-migrations.js";

const CSV_HEADER =
  "순위,기준년월,시도명,시군구명,관광지ID,관심지점명,구분,연령대,성장율";
const DOWNLOAD_TIMESTAMP = "20260828074520";
const BASE_YEAR_MONTH = "202607";
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
  periodStart: new Date("2026-07-01T00:00:00.000Z"),
  periodEnd: new Date("2026-07-31T00:00:00.000Z"),
};

function sourcePlaceId(audienceIndex: number, rank: number) {
  return `${audienceIndex.toString(16).padStart(2, "0")}${rank
    .toString(16)
    .padStart(2, "0")}${"c".repeat(28)}`;
}

function rankingRows(audience: Audience, audienceIndex: number) {
  const csvValue = audienceCsvValues[audience];

  return Array.from({ length: 10 }, (_, index) => {
    const rank = index + 1;
    const growthPercent = (500 - rank * 20).toFixed(1);

    return [
      rank.toString(),
      BASE_YEAR_MONTH,
      "강원특별자치도",
      "영월군",
      sourcePlaceId(audienceIndex, rank),
      rank === 1 ? "장릉" : `테스트 핫플레이스 ${audience}-${rank}`,
      rank === 1 ? "관광명소" : "레저/스포츠",
      csvValue,
      growthPercent,
    ].join(",");
  });
}

function csvForAudience(audience: Audience, audienceIndex: number) {
  return [CSV_HEADER, ...rankingRows(audience, audienceIndex), ""].join("\n");
}

function fileNameForAudience(audience: Audience) {
  return `${DOWNLOAD_TIMESTAMP}_세대별 핫플레이스(${audienceFileLabels[audience]}).csv`;
}

async function writeRankingDirectory(
  mutate?: (files: Record<Audience, string>) => Record<Audience, string>,
) {
  const root = await mkdtemp(join(tmpdir(), "haetteum-hot-place-import-e2e-"));
  const directory = join(
    root,
    `${DOWNLOAD_TIMESTAMP}_전국_202607-202607_데이터랩_다운로드`,
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

describe("HotPlaceRankingImportService PostgreSQL integration (e2e)", () => {
  let app: INestApplication | undefined;
  let prisma: PrismaClient | undefined;
  let adminPool: Pool | undefined;
  let service: HotPlaceRankingImportService;
  let schemaName: string;
  let tempRoots: string[] = [];

  beforeEach(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required for E2E tests");

    schemaName = `hot_place_ranking_e2e_${randomUUID().replaceAll("-", "")}`;
    adminPool = new Pool({ connectionString: databaseUrl });
    const client = await adminPool.connect();
    try {
      await client.query(`CREATE SCHEMA "${schemaName}"`);
      await client.query(`SET search_path TO "${schemaName}"`);
      await applyMigrations(client);
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
    service = app.get(HotPlaceRankingImportService);
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

  it("replaces the strict six-audience hot-place snapshot idempotently", async () => {
    if (!prisma) throw new Error("Prisma test client is missing");
    const { directory, root } = await writeRankingDirectory();
    tempRoots.push(root);

    await expect(service.importDirectory(directory)).resolves.toMatchObject({
      source: "KTO_DATALAB",
      scope: "NATIONAL",
      baseYearMonth: "202607",
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
      audienceCount: 6,
      importedCount: 60,
    });
    await expect(service.importDirectory(directory)).resolves.toMatchObject({
      audienceCount: 6,
      importedCount: 60,
    });

    expect(await prisma.hotPlaceRanking.count({ where: snapshotWhere })).toBe(
      60,
    );
    expect(
      await prisma.hotPlaceRanking.groupBy({
        by: ["audience"],
        where: snapshotWhere,
        _count: { _all: true },
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ audience: "ALL", _count: { _all: 10 } }),
        expect.objectContaining({
          audience: "SIXTIES_PLUS",
          _count: { _all: 10 },
        }),
      ]),
    );
    const first = await prisma.hotPlaceRanking.findFirstOrThrow({
      where: { ...snapshotWhere, audience: "ALL", rank: 1 },
    });
    expect(Number(first.growthPercent)).toBe(480);
    expect(first.provinceName).toBe("강원특별자치도");
  });

  it("keeps the existing snapshot when parsing fails before the transaction", async () => {
    if (!prisma) throw new Error("Prisma test client is missing");
    await prisma.hotPlaceRanking.create({
      data: {
        ...snapshotWhere,
        baseYearMonth: "202607",
        provinceName: "서울특별시",
        districtName: "중구",
        audience: "ALL",
        rank: 1,
        sourcePlaceId: "sentinel-source-place-id",
        sourcePlaceName: "기존 스냅샷",
        sourceCategory: "관광명소",
        growthPercent: "1.0",
        placeId: null,
        sourceFileName: "sentinel.csv",
        importedAt: new Date("2026-08-28T07:45:20.000Z"),
      },
    });
    const { directory, root } = await writeRankingDirectory((files) => ({
      ...files,
      ALL: replaceLine(files.ALL, 1, (columns) => {
        columns[4] = "not-a-valid-source-id";
        return columns;
      }),
    }));
    tempRoots.push(root);

    await expect(service.importDirectory(directory)).rejects.toThrow(
      /invalid source place id/i,
    );

    await expect(
      prisma.hotPlaceRanking.findFirstOrThrow({
        where: { ...snapshotWhere, sourcePlaceId: "sentinel-source-place-id" },
      }),
    ).resolves.toMatchObject({
      sourcePlaceName: "기존 스냅샷",
      rank: 1,
    });
    expect(await prisma.hotPlaceRanking.count({ where: snapshotWhere })).toBe(
      1,
    );
  });
});
