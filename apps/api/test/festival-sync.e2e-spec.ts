/* eslint-disable @typescript-eslint/require-await -- deterministic fake provider preserves the async interface */
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { AppModule } from "../src/app.module.js";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { FestivalSyncService } from "../src/tourism/festival-sync.service.js";
import type {
  FestivalApiPort,
  TourApiFestival,
  TourApiPage,
} from "../src/tourism/tour-api.types.js";
import { FESTIVAL_API_PORT } from "../src/tourism/tourism.constants.js";

const RANGE = {
  eventStartDate: "20260101",
  eventEndDate: "20271231",
} as const;

function festival(externalId: string, title: string): TourApiFestival {
  return {
    contentid: externalId,
    contenttypeid: "15",
    title,
    eventstartdate: "20260801",
    eventenddate: "20260831",
    addr1: "서울특별시 테스트로 1",
    mapx: "126.1234567",
    mapy: "37.1234567",
    modifiedtime: "20260824000000",
    lDongRegnCd: "11",
    lDongSignguCd: "110",
    lclsSystm1: "EV",
    lclsSystm2: "EV01",
    lclsSystm3: "EV010100",
  };
}

function page(
  items: readonly TourApiFestival[],
  pageNo: number,
  totalCount: number,
): TourApiPage<TourApiFestival> {
  return { items, pageNo, numOfRows: 1, totalCount };
}

class DatabaseFestivalApi implements FestivalApiPort {
  error: Error | undefined;
  duplicatePage = false;

  async getFestivalPage(input: {
    eventStartDate: string;
    eventEndDate: string;
    pageNo: number;
  }): Promise<TourApiPage<TourApiFestival>> {
    if (this.error) throw this.error;
    expect(input).toMatchObject(RANGE);
    if (this.duplicatePage) {
      return page(
        [
          festival("duplicate", "첫 번째 중복 축제"),
          festival("duplicate", "두 번째 중복 축제"),
        ],
        1,
        2,
      );
    }
    if (input.pageNo === 1) {
      return page([festival("festival-1", "첫 번째 축제")], 1, 2);
    }
    return page([festival("festival-2", "두 번째 축제")], 2, 2);
  }
}

describe("FestivalSyncService PostgreSQL integration (e2e)", () => {
  let app: INestApplication | undefined;
  let prisma: PrismaClient | undefined;
  let adminPool: Pool | undefined;
  let provider: DatabaseFestivalApi;
  let service: FestivalSyncService;
  let schemaName: string;

  beforeEach(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required for E2E tests");

    schemaName = `festival_e2e_${randomUUID().replaceAll("-", "")}`;
    adminPool = new Pool({ connectionString: databaseUrl });
    const client = await adminPool.connect();
    try {
      await client.query(`CREATE SCHEMA "${schemaName}"`);
      await client.query(`SET search_path TO "${schemaName}"`);
      for (const migrationPath of [
        "../prisma/migrations/20260821000000_add_tourism_place_foundation/migration.sql",
        "../prisma/migrations/20260822000000_add_tourism_database_comments/migration.sql",
        "../prisma/migrations/20260824135934_scope_tourism_district_provider_code/migration.sql",
        "../prisma/migrations/20260825000000_add_festivals/migration.sql",
      ]) {
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
    provider = new DatabaseFestivalApi();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(FESTIVAL_API_PORT)
      .useValue(provider)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    service = app.get(FestivalSyncService);
  });

  afterEach(async () => {
    try {
      await app?.close();
    } finally {
      try {
        await prisma?.$disconnect();
      } finally {
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

  it("upserts two pages idempotently and records success without touching places", async () => {
    if (!prisma) throw new Error("Prisma test client is missing");

    const first = await service.fullSync(RANGE);
    const firstRows = await prisma.festival.findMany({
      orderBy: { externalId: "asc" },
    });
    const firstIds = firstRows.map((item) => item.id);

    expect(first).toMatchObject({
      status: "SUCCEEDED",
      fetchedCount: 2,
      insertedCount: 2,
      updatedCount: 0,
      failedCount: 0,
    });
    expect(firstRows).toHaveLength(2);
    expect(await prisma.place.count()).toBe(0);

    const second = await service.fullSync(RANGE);
    const secondRows = await prisma.festival.findMany({
      orderBy: { externalId: "asc" },
    });

    expect(second).toMatchObject({
      status: "SUCCEEDED",
      fetchedCount: 2,
      insertedCount: 0,
      updatedCount: 2,
      failedCount: 0,
    });
    expect(secondRows.map((item) => item.id)).toEqual(firstIds);
    expect(await prisma.festival.count()).toBe(2);
    expect(
      await prisma.tourismSyncRun.count({
        where: { jobType: "FESTIVAL_FULL", status: "SUCCEEDED" },
      }),
    ).toBe(2);
    expect(await prisma.place.count()).toBe(0);
  });

  it("records a sanitized FAILED run when persistence cannot start", async () => {
    if (!prisma) throw new Error("Prisma test client is missing");
    const secret = "SERVICE_KEY=do-not-leak";
    provider.error = new Error(secret);

    await expect(service.fullSync(RANGE)).rejects.toThrow(
      "Festival synchronization failed",
    );

    const failed = await prisma.tourismSyncRun.findFirstOrThrow({
      where: { jobType: "FESTIVAL_FULL", status: "FAILED" },
      orderBy: { startedAt: "desc" },
    });
    expect(failed).toMatchObject({
      fetchedCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      failedCount: 1,
      errorSummary: "Festival synchronization failed",
    });
    expect(JSON.stringify(failed)).not.toContain(secret);
  });

  it("rejects duplicate provider identities without persisting or over-counting", async () => {
    if (!prisma) throw new Error("Prisma test client is missing");
    provider.duplicatePage = true;

    await expect(service.fullSync(RANGE)).rejects.toThrow(
      "Festival synchronization failed: Invalid TourAPI duplicate festival content ID",
    );

    expect(await prisma.festival.count()).toBe(0);
    const failed = await prisma.tourismSyncRun.findFirstOrThrow({
      where: { jobType: "FESTIVAL_FULL", status: "FAILED" },
      orderBy: { startedAt: "desc" },
    });
    expect(failed).toMatchObject({
      fetchedCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      failedCount: 1,
      errorSummary:
        "Festival synchronization failed: Invalid TourAPI duplicate festival content ID",
    });
  });
});
