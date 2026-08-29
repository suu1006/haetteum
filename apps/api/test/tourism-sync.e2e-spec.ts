/* eslint-disable @typescript-eslint/require-await -- deterministic fake port methods preserve the async provider interface */
import { randomUUID } from "node:crypto";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { AppModule } from "../src/app.module.js";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import type {
  TourApiChangedPlace,
  TourApiDistrict,
  TourApiPage,
  TourApiPlace,
  TourApiPlaceDetail,
  TourApiPort,
} from "../src/tourism/tour-api.types.js";
import {
  TOUR_API_PORT,
  TOURISM_REGION_CODES,
} from "../src/tourism/tourism.constants.js";
import { TourismModule } from "../src/tourism/tourism.module.js";
import { TourismSyncService } from "../src/tourism/tourism-sync.service.js";

import { applyMigrations } from "./apply-migrations.js";

type PageResult<T> = TourApiPage<T> | Error;

function page<T>(
  items: readonly T[],
  pageNo = 1,
  numOfRows = 100,
  totalCount = items.length,
): TourApiPage<T> {
  return { items, pageNo, numOfRows, totalCount };
}

class DatabaseTourApiFixture implements TourApiPort {
  readonly districtCodes = new Map<string, string[]>();
  readonly places = new Map<string, TourApiPlace[]>();
  readonly fullPlacePages = new Map<string, PageResult<TourApiPlace>>();
  readonly changedPages = new Map<string, PageResult<TourApiChangedPlace>>();

  constructor(
    readonly scope: string,
    readonly targetRegion = "50",
  ) {
    TOURISM_REGION_CODES.forEach((regionCode, index) => {
      const firstDistrict = `d${index}${scope.slice(0, 7)}`;
      this.districtCodes.set(regionCode, [firstDistrict]);
      this.places.set(regionCode, [
        this.place(
          regionCode,
          `${scope}-${regionCode}-baseline`,
          firstDistrict,
        ),
      ]);
    });

    const targetIndex = TOURISM_REGION_CODES.findIndex(
      (regionCode) => regionCode === targetRegion,
    );
    if (targetIndex < 0) throw new Error("Target region fixture is invalid");
    const targetFirst = this.districtCodes.get(targetRegion)?.[0];
    const targetSecond = `e${targetIndex}${scope.slice(0, 7)}`;
    if (!targetFirst) throw new Error("Target district fixture is missing");
    this.districtCodes.set(targetRegion, [targetFirst, targetSecond]);
    this.places.set(targetRegion, [
      this.place(targetRegion, `${scope}-target-1`, targetFirst),
      this.place(targetRegion, `${scope}-target-2`, targetSecond),
    ]);
  }

  async getDistrictPage(input: {
    regionCode: string;
    pageNo: number;
  }): Promise<TourApiPage<TourApiDistrict>> {
    const codes = this.districtCodes.get(input.regionCode) ?? [];
    return page(
      codes.map((code) => ({
        lDongRegnCd: input.regionCode,
        lDongRegnNm: `지역 ${input.regionCode}`,
        lDongSignguCd: code,
        lDongSignguNm: `시군구 ${code}`,
      })),
      input.pageNo,
    );
  }

  async getPlacePage(input: {
    regionCode: string;
    pageNo: number;
  }): Promise<TourApiPage<TourApiPlace>> {
    const key = `${input.regionCode}:${input.pageNo}`;
    return this.resolve(
      this.fullPlacePages.get(key) ??
        page(this.places.get(input.regionCode) ?? [], input.pageNo),
    );
  }

  async getChangedPlacePage(input: {
    regionCode: string;
    modifiedDate: string;
    showflag: "0" | "1";
    pageNo: number;
  }): Promise<TourApiPage<TourApiChangedPlace>> {
    const key = `${input.regionCode}:${input.showflag}:${input.pageNo}`;
    return this.resolve(this.changedPages.get(key) ?? page([], input.pageNo));
  }

  async getChangedPlaceProbePage(): Promise<TourApiPage<TourApiChangedPlace>> {
    return page([]);
  }

  async getPlaceCommonDetail(contentId: string): Promise<TourApiPlaceDetail> {
    return { contentid: contentId };
  }

  async getPlaceIntro(contentId: string) {
    return { contentid: contentId };
  }

  async getFestivalIntro(contentId: string) {
    return { contentid: contentId };
  }

  async getPlaceRepeatInfo() {
    return [];
  }

  async getPlaceImages() {
    return [];
  }

  async searchPlaceByKeyword() {
    return null;
  }

  async searchPlaceCandidates() {
    return [];
  }

  place(
    regionCode: string,
    externalId: string,
    districtCode: string,
  ): TourApiPlace {
    return {
      contentid: externalId,
      contenttypeid: "12",
      title: `관광지 ${externalId}`,
      addr1: `주소 ${externalId}`,
      addr2: "",
      zipcode: "12345",
      mapx: "126.1234567",
      mapy: "37.1234567",
      mlevel: "6",
      tel: "02-000-0000",
      firstimage: "https://example.test/original.jpg",
      firstimage2: "https://example.test/thumb.jpg",
      cpyrhtDivCd: "Type1",
      createdtime: "20260801000000",
      modifiedtime: "20260824000000",
      lDongRegnCd: regionCode,
      lDongSignguCd: districtCode,
      lclsSystm1: "VE",
      lclsSystm2: "VE01",
      lclsSystm3: "VE010100",
    };
  }

  changed(
    regionCode: string,
    externalId: string,
    districtCode: string,
    showflag: "0" | "1",
  ): TourApiChangedPlace {
    return { ...this.place(regionCode, externalId, districtCode), showflag };
  }

  private async resolve<T>(result: PageResult<T>): Promise<TourApiPage<T>> {
    if (result instanceof Error) throw result;
    return result;
  }
}

describe("TourismSyncService PostgreSQL integration (e2e)", () => {
  let app: INestApplication | undefined;
  let prisma: PrismaClient | undefined;
  let service: TourismSyncService;
  let provider: DatabaseTourApiFixture;
  let adminPool: Pool | undefined;
  let schemaName: string;
  let scope: string;

  beforeEach(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required for E2E tests");

    scope = randomUUID();
    schemaName = `tourism_e2e_${scope.replaceAll("-", "")}`;
    provider = new DatabaseTourApiFixture(scope);
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
      imports: [AppModule, TourismModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(TOUR_API_PORT)
      .useValue(provider)
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    service = app.get(TourismSyncService);
  });

  afterEach(async () => {
    try {
      if (prisma) {
        const runIds = (
          await prisma.tourismSyncRun.findMany({ select: { id: true } })
        ).map((run) => run.id);
        await prisma.place.deleteMany({
          where: { externalId: { startsWith: scope } },
        });
        await prisma.tourismDistrict.deleteMany({
          where: {
            providerCode: { contains: scope.slice(0, 7) },
          },
        });
        if (runIds.length > 0) {
          await prisma.tourismSyncRun.deleteMany({
            where: { id: { in: runIds } },
          });
        }

        expect(
          await prisma.place.count({
            where: { externalId: { startsWith: scope } },
          }),
        ).toBe(0);
        expect(
          await prisma.tourismDistrict.count({
            where: {
              providerCode: { contains: scope.slice(0, 7) },
            },
          }),
        ).toBe(0);
        expect(await prisma.tourismSyncRun.count()).toBe(0);
      }
    } finally {
      try {
        await app?.close();
      } finally {
        try {
          await prisma?.$disconnect();
        } finally {
          try {
            if (adminPool) {
              await adminPool.query(`DROP SCHEMA "${schemaName}" CASCADE`);
              await adminPool.end();
            }
          } finally {
            app = undefined;
            prisma = undefined;
            adminPool = undefined;
          }
        }
      }
    }
  });

  it("creates two scoped districts and places idempotently, then deactivates only after full success", async () => {
    if (!prisma) throw new Error("Prisma test client is missing");
    const first = await service.fullSync();
    const targetRegion = await prisma.tourismRegion.findUniqueOrThrow({
      where: { providerCode: provider.targetRegion },
    });

    expect(
      await prisma.tourismDistrict.count({
        where: {
          regionId: targetRegion.id,
          providerCode: {
            in: provider.districtCodes.get(provider.targetRegion),
          },
        },
      }),
    ).toBe(2);
    expect(
      await prisma.place.count({
        where: { regionId: targetRegion.id, externalId: { startsWith: scope } },
      }),
    ).toBe(2);

    const rerun = await service.fullSync();
    expect(rerun.insertedCount).toBe(0);
    expect(rerun.updatedCount).toBe(first.fetchedCount);
    expect(
      await prisma.place.count({
        where: { regionId: targetRegion.id, externalId: { startsWith: scope } },
      }),
    ).toBe(2);

    const retained = provider.places.get(provider.targetRegion)?.[0];
    if (!retained) throw new Error("Retained place fixture is missing");
    const [retainedDistrict, omittedDistrict] =
      provider.districtCodes.get(provider.targetRegion) ?? [];
    if (!retainedDistrict || !omittedDistrict) {
      throw new Error("Target district fixtures are missing");
    }
    provider.districtCodes.set(provider.targetRegion, [retainedDistrict]);
    provider.fullPlacePages.set(
      `${provider.targetRegion}:1`,
      page([retained], 1, 1, 2),
    );
    provider.fullPlacePages.set(
      `${provider.targetRegion}:2`,
      new Error("second page failed"),
    );
    await expect(service.fullSync()).rejects.toThrow(
      "Tourism full synchronization failed",
    );
    expect(
      await prisma.tourismDistrict.findUniqueOrThrow({
        where: {
          regionId_providerCode: {
            regionId: targetRegion.id,
            providerCode: omittedDistrict,
          },
        },
        select: { isActive: true },
      }),
    ).toEqual({ isActive: true });
    expect(
      await prisma.place.findUniqueOrThrow({
        where: {
          source_externalId: {
            source: "TOUR_API",
            externalId: `${scope}-target-2`,
          },
        },
        select: { isVisible: true },
      }),
    ).toEqual({ isVisible: true });

    provider.fullPlacePages.set(`${provider.targetRegion}:1`, page([retained]));
    provider.fullPlacePages.delete(`${provider.targetRegion}:2`);
    await service.fullSync();
    expect(
      await prisma.tourismDistrict.findUniqueOrThrow({
        where: {
          regionId_providerCode: {
            regionId: targetRegion.id,
            providerCode: omittedDistrict,
          },
        },
        select: { isActive: true },
      }),
    ).toEqual({ isActive: false });
    expect(
      await prisma.place.findUniqueOrThrow({
        where: {
          source_externalId: {
            source: "TOUR_API",
            externalId: `${scope}-target-2`,
          },
        },
        select: { isVisible: true },
      }),
    ).toEqual({ isVisible: false });
  });

  it("keeps identical district provider codes separate by region and preserves matching place FKs", async () => {
    if (!prisma) throw new Error("Prisma test client is missing");
    const regionCodes = ["11", "41"] as const;
    const sharedDistrictCode = `s${scope.slice(0, 7)}`;
    for (const regionCode of regionCodes) {
      provider.districtCodes.set(regionCode, [sharedDistrictCode]);
      provider.places.set(regionCode, [
        provider.place(
          regionCode,
          `${scope}-${regionCode}-shared-district`,
          sharedDistrictCode,
        ),
      ]);
    }

    await service.fullSync();

    const districts = await prisma.tourismDistrict.findMany({
      where: { providerCode: sharedDistrictCode },
      select: { id: true, regionId: true },
    });
    expect(districts).toHaveLength(2);
    for (const regionCode of regionCodes) {
      const region = await prisma.tourismRegion.findUniqueOrThrow({
        where: { providerCode: regionCode },
        select: { id: true },
      });
      const place = await prisma.place.findUniqueOrThrow({
        where: {
          source_externalId: {
            source: "TOUR_API",
            externalId: `${scope}-${regionCode}-shared-district`,
          },
        },
        select: { regionId: true, district: { select: { regionId: true } } },
      });
      expect(place).toEqual({
        regionId: region.id,
        district: { regionId: region.id },
      });
    }
  });

  it("repairs a persisted cross-region district FK while preserving the place UUID and unrelated rows", async () => {
    if (!prisma) throw new Error("Prisma test client is missing");
    const [seoul, gyeonggi] = await Promise.all([
      prisma.tourismRegion.findUniqueOrThrow({
        where: { providerCode: "11" },
        select: { id: true },
      }),
      prisma.tourismRegion.findUniqueOrThrow({
        where: { providerCode: "41" },
        select: { id: true },
      }),
    ]);

    const sharedDistrictCode = `r${scope.slice(0, 7)}`;
    const [seoulDistrict, gyeonggiDistrict] = await Promise.all([
      prisma.tourismDistrict.create({
        data: {
          regionId: seoul.id,
          providerCode: sharedDistrictCode,
          name: "서울 공유 시군구",
        },
      }),
      prisma.tourismDistrict.create({
        data: {
          regionId: gyeonggi.id,
          providerCode: sharedDistrictCode,
          name: "경기 공유 시군구",
        },
      }),
    ]);
    const now = new Date();
    const externalId = `${scope}-cross-region-repair`;
    const contaminated = await prisma.place.create({
      data: {
        source: "TOUR_API",
        externalId,
        contentTypeId: 12,
        regionId: seoul.id,
        districtId: gyeonggiDistrict.id,
        title: "교차 지역 FK 복구 대상",
        providerModifiedAt: now,
        lastSyncedAt: now,
      },
    });
    const unrelated = await prisma.place.create({
      data: {
        source: "MANUAL",
        externalId: `${scope}-unrelated`,
        contentTypeId: 12,
        regionId: seoul.id,
        title: "무관한 테스트 행",
        providerModifiedAt: now,
        lastSyncedAt: now,
      },
    });
    const failedRun = await prisma.tourismSyncRun.create({
      data: {
        provider: "TOUR_API",
        jobType: "FULL",
        status: "FAILED",
        finishedAt: now,
        failedCount: 1,
        errorSummary: "test-owned failed run",
      },
    });

    for (const regionCode of ["11", "41"]) {
      provider.districtCodes.set(regionCode, [sharedDistrictCode]);
    }
    provider.places.set("11", [
      provider.place("11", externalId, sharedDistrictCode),
    ]);
    provider.places.set("41", [
      provider.place("41", `${scope}-41-shared-repair`, sharedDistrictCode),
    ]);

    expect(contaminated).toMatchObject({
      source: "TOUR_API",
      externalId,
      regionId: seoul.id,
      districtId: gyeonggiDistrict.id,
    });

    await service.fullSync();

    const repaired = await prisma.place.findUniqueOrThrow({
      where: {
        source_externalId: { source: "TOUR_API", externalId },
      },
      include: { district: { select: { id: true, regionId: true } } },
    });
    expect(repaired).toMatchObject({
      id: contaminated.id,
      regionId: seoul.id,
      districtId: seoulDistrict.id,
      district: { id: seoulDistrict.id, regionId: seoul.id },
    });

    const sharedDistricts = await prisma.tourismDistrict.findMany({
      where: { providerCode: sharedDistrictCode },
      select: { id: true, regionId: true },
    });
    expect(sharedDistricts).toHaveLength(2);
    expect(sharedDistricts).toEqual(
      expect.arrayContaining([
        { id: seoulDistrict.id, regionId: seoul.id },
        { id: gyeonggiDistrict.id, regionId: gyeonggi.id },
      ]),
    );
    expect(
      await prisma.place.findUniqueOrThrow({ where: { id: unrelated.id } }),
    ).toMatchObject({ id: unrelated.id, source: "MANUAL" });
    expect(
      await prisma.tourismSyncRun.findUniqueOrThrow({
        where: { id: failedRun.id },
      }),
    ).toMatchObject({ id: failedRun.id, status: "FAILED", failedCount: 1 });
  });

  it("preserves the place UUID when an incremental hidden row is applied", async () => {
    if (!prisma) throw new Error("Prisma test client is missing");
    await service.fullSync();
    const before = await prisma.place.findUniqueOrThrow({
      where: {
        source_externalId: {
          source: "TOUR_API",
          externalId: `${scope}-target-1`,
        },
      },
    });
    const targetDistrict = provider.districtCodes.get(
      provider.targetRegion,
    )?.[0];
    if (!targetDistrict) throw new Error("Target district fixture is missing");
    provider.changedPages.set(
      `${provider.targetRegion}:0:1`,
      page([
        provider.changed(
          provider.targetRegion,
          before.externalId,
          targetDistrict,
          "0",
        ),
      ]),
    );
    const watermark = await prisma.tourismSyncRun.findFirstOrThrow({
      where: { status: "SUCCEEDED" },
      orderBy: { finishedAt: "desc" },
    });
    if (!watermark.finishedAt) throw new Error("Full watermark is missing");

    await service.incrementalSync(
      new Date(watermark.finishedAt.getTime() + 24 * 60 * 60 * 1_000),
    );

    const after = await prisma.place.findUniqueOrThrow({
      where: {
        source_externalId: {
          source: "TOUR_API",
          externalId: before.externalId,
        },
      },
    });
    expect(after.id).toBe(before.id);
    expect(after.isVisible).toBe(false);
  });

  it("keeps a committed first page and records FAILED without advancing the watermark", async () => {
    if (!prisma) throw new Error("Prisma test client is missing");
    const full = await service.fullSync();
    const watermark = await prisma.tourismSyncRun.findUniqueOrThrow({
      where: { id: full.runId },
    });
    if (!watermark.finishedAt) throw new Error("Full watermark is missing");
    const targetDistrict = provider.districtCodes.get(
      provider.targetRegion,
    )?.[0];
    if (!targetDistrict) throw new Error("Target district fixture is missing");
    const committedExternalId = `${scope}-committed-page`;
    provider.changedPages.set(
      `${provider.targetRegion}:1:1`,
      page(
        [
          provider.changed(
            provider.targetRegion,
            committedExternalId,
            targetDistrict,
            "1",
          ),
        ],
        1,
        1,
        2,
      ),
    );
    provider.changedPages.set(
      `${provider.targetRegion}:1:2`,
      new Error("second page failed"),
    );

    await expect(
      service.incrementalSync(
        new Date(watermark.finishedAt.getTime() + 24 * 60 * 60 * 1_000),
      ),
    ).rejects.toThrow("Tourism incremental synchronization failed");

    expect(
      await prisma.place.findUniqueOrThrow({
        where: {
          source_externalId: {
            source: "TOUR_API",
            externalId: committedExternalId,
          },
        },
        select: { externalId: true },
      }),
    ).toEqual({ externalId: committedExternalId });
    const failed = await prisma.tourismSyncRun.findFirstOrThrow({
      where: { status: "FAILED" },
      orderBy: { startedAt: "desc" },
    });
    expect(failed).toMatchObject({
      requestedFrom: watermark.finishedAt,
      fetchedCount: 1,
      insertedCount: 1,
      failedCount: 1,
    });
    const latestSuccess = await prisma.tourismSyncRun.findFirstOrThrow({
      where: { status: "SUCCEEDED" },
      orderBy: { finishedAt: "desc" },
    });
    expect(latestSuccess.id).toBe(watermark.id);
  });
});
