/* eslint-disable @typescript-eslint/require-await -- deterministic fake provider preserves the async interface */
import { randomUUID } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { AppModule } from "../src/app.module.js";
import { FestivalsService } from "../src/festivals/festivals.service.js";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { FestivalSyncService } from "../src/tourism/festival-sync.service.js";
import type {
  FestivalApiPort,
  TourApiFestival,
  TourApiPage,
} from "../src/tourism/tour-api.types.js";
import { FESTIVAL_API_PORT } from "../src/tourism/tourism.constants.js";

import { applyMigrations } from "./apply-migrations.js";

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
  /** TourAPI가 콘텐츠를 회수해 더 이상 내려주지 않는 상황을 재현한다. */
  readonly withdrawnIds = new Set<string>();

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
    const published = [
      festival("festival-1", "첫 번째 축제"),
      festival("festival-2", "두 번째 축제"),
    ].filter((item) => !this.withdrawnIds.has(item.contentid));
    const item = published[input.pageNo - 1];
    return page(item ? [item] : [], input.pageNo, published.length);
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

  it("hides festivals TourAPI withdrew and keeps them out of discovery", async () => {
    if (!prisma) throw new Error("Prisma test client is missing");

    await service.fullSync(RANGE);
    provider.withdrawnIds.add("festival-2");

    const summary = await service.fullSync(RANGE);

    expect(summary).toMatchObject({
      status: "SUCCEEDED",
      fetchedCount: 1,
      insertedCount: 0,
      updatedCount: 1,
      deactivatedCount: 1,
    });
    // 회수된 축제는 삭제하지 않고 비표출로 남겨 재등록 시 되살릴 수 있게 한다.
    expect(await prisma.festival.count()).toBe(2);
    expect(
      await prisma.festival.findFirstOrThrow({
        where: { externalId: "festival-2" },
      }),
    ).toMatchObject({ isVisible: false });

    const festivals = app?.get(FestivalsService);
    if (!festivals) throw new Error("FestivalsService is missing");
    const withdrawn = await prisma.festival.findFirstOrThrow({
      where: { externalId: "festival-2" },
    });
    const discovery = await festivals.list({
      region: "all",
      page: 1,
      pageSize: 20,
    });

    expect(discovery.items.map((item) => item.externalId)).toEqual([
      "festival-1",
    ]);
    await expect(festivals.detail(withdrawn.id)).rejects.toThrow(
      "축제를 찾을 수 없습니다.",
    );

    // TourAPI가 콘텐츠를 되살리면 다음 동기화에서 다시 노출된다.
    provider.withdrawnIds.delete("festival-2");
    await service.fullSync(RANGE);
    expect(
      await prisma.festival.findFirstOrThrow({
        where: { externalId: "festival-2" },
      }),
    ).toMatchObject({ isVisible: true });
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
