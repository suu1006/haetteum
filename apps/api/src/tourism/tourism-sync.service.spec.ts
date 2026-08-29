/* eslint-disable @typescript-eslint/require-await */
import type { PrismaService } from "../prisma/prisma.service.js";
import type {
  TourApiChangedPlace,
  TourApiDistrict,
  TourApiFestivalIntro,
  TourApiPage,
  TourApiPlace,
  TourApiPlaceDetail,
  TourApiPlaceImage,
  TourApiPlaceInfo,
  TourApiPlaceIntro,
  TourApiPort,
} from "./tour-api.types.js";
import { TOURISM_REGION_CODES } from "./tourism.constants.js";
import { TourismSyncService } from "./tourism-sync.service.js";

type RegionRow = {
  id: string;
  providerCode: string;
  isActive: boolean;
  displayOrder: number;
};

type DistrictRow = {
  id: string;
  regionId: string;
  providerCode: string;
  name: string;
  isActive: boolean;
};

type PlaceRow = {
  id: string;
  source: string;
  externalId: string;
  regionId: string;
  districtId: string | null;
  title: string;
  isVisible: boolean;
  homepage?: string | null;
  overview?: string | null;
  [key: string]: unknown;
};

type SyncRunRow = {
  id: string;
  provider: string;
  jobType: string;
  status: string;
  requestedFrom: Date | null;
  startedAt: Date;
  finishedAt: Date | null;
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  deactivatedCount: number;
  failedCount: number;
  errorSummary: string | null;
};

type PageResult<T> = TourApiPage<T> | Error;

const DAY_MS = 24 * 60 * 60 * 1_000;

function page<T>(
  items: readonly T[],
  pageNo = 1,
  numOfRows = 100,
  totalCount = items.length,
): TourApiPage<T> {
  return { items, pageNo, numOfRows, totalCount };
}

function districtFixture(
  regionCode: string,
  providerCode = `${regionCode}0`,
): TourApiDistrict {
  return {
    lDongRegnCd: regionCode,
    lDongRegnNm: `지역 ${regionCode}`,
    lDongSignguCd: providerCode,
    lDongSignguNm: `시군구 ${providerCode}`,
  };
}

function placeFixture(
  regionCode: string,
  externalId = `${regionCode}-place-1`,
  districtCode = `${regionCode}0`,
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

function changedFixture(
  regionCode: string,
  externalId: string,
  showflag: "0" | "1",
  oldContentid?: string,
): TourApiChangedPlace {
  return {
    ...placeFixture(regionCode, externalId),
    showflag,
    oldContentid,
  };
}

class FakeTourApi implements TourApiPort {
  readonly districtCalls: Array<{ regionCode: string; pageNo: number }> = [];
  readonly placeCalls: Array<{ regionCode: string; pageNo: number }> = [];
  readonly changedCalls: Array<{
    regionCode: string;
    modifiedDate: string;
    showflag: "0" | "1";
    pageNo: number;
  }> = [];
  readonly detailCalls: string[] = [];

  readonly districtPages = new Map<string, PageResult<TourApiDistrict>>();
  readonly placePages = new Map<string, PageResult<TourApiPlace>>();
  readonly changedPages = new Map<string, PageResult<TourApiChangedPlace>>();
  detail: TourApiPlaceDetail = {
    contentid: "unused",
    overview: "상세 설명",
    homepage: "https://example.test",
  };
  intro: TourApiPlaceIntro = { contentid: "unused" };
  information: TourApiPlaceInfo[] = [];
  images: TourApiPlaceImage[] = [];

  constructor() {
    for (const regionCode of TOURISM_REGION_CODES) {
      this.districtPages.set(
        `${regionCode}:1`,
        page([districtFixture(regionCode)]),
      );
      this.placePages.set(`${regionCode}:1`, page([placeFixture(regionCode)]));
    }
  }

  async getDistrictPage(input: {
    regionCode: string;
    pageNo: number;
  }): Promise<TourApiPage<TourApiDistrict>> {
    this.districtCalls.push(input);
    return this.resolve(
      this.districtPages.get(`${input.regionCode}:${input.pageNo}`) ??
        page([], input.pageNo),
    );
  }

  async getPlacePage(input: {
    regionCode: string;
    pageNo: number;
  }): Promise<TourApiPage<TourApiPlace>> {
    this.placeCalls.push(input);
    return this.resolve(
      this.placePages.get(`${input.regionCode}:${input.pageNo}`) ??
        page([], input.pageNo),
    );
  }

  async getChangedPlacePage(input: {
    regionCode: string;
    modifiedDate: string;
    showflag: "0" | "1";
    pageNo: number;
  }): Promise<TourApiPage<TourApiChangedPlace>> {
    this.changedCalls.push(input);
    const key = `${input.modifiedDate}:${input.regionCode}:${input.showflag}:${input.pageNo}`;
    return this.resolve(this.changedPages.get(key) ?? page([], input.pageNo));
  }

  async getChangedPlaceProbePage(): Promise<TourApiPage<TourApiChangedPlace>> {
    return page([]);
  }

  async getPlaceCommonDetail(contentId: string): Promise<TourApiPlaceDetail> {
    this.detailCalls.push(contentId);
    return this.detail;
  }

  async getPlaceIntro(contentId: string): Promise<TourApiPlaceIntro> {
    this.detailCalls.push(`intro:${contentId}`);
    return this.intro;
  }

  async getFestivalIntro(contentId: string): Promise<TourApiFestivalIntro> {
    this.detailCalls.push(`festivalIntro:${contentId}`);
    return { contentid: contentId };
  }

  async getPlaceRepeatInfo(
    contentId: string,
  ): Promise<readonly TourApiPlaceInfo[]> {
    this.detailCalls.push(`info:${contentId}`);
    return this.information;
  }

  async getPlaceImages(
    contentId: string,
  ): Promise<readonly TourApiPlaceImage[]> {
    this.detailCalls.push(`images:${contentId}`);
    return this.images;
  }

  async searchPlaceByKeyword(): Promise<TourApiPlace | null> {
    return null;
  }

  async searchPlaceCandidates(): Promise<readonly TourApiPlace[]> {
    return [];
  }

  private async resolve<T>(result: PageResult<T>): Promise<TourApiPage<T>> {
    if (result instanceof Error) throw result;
    return result;
  }
}

// This in-memory boundary intentionally accepts only the Prisma query shapes
// emitted by TourismSyncService instead of reimplementing Prisma's type system.
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
class FakePrisma {
  readonly regions: RegionRow[] = TOURISM_REGION_CODES.map(
    (providerCode, index) => ({
      id: `region-${providerCode}`,
      providerCode,
      isActive: true,
      displayOrder: index + 1,
    }),
  );
  readonly districts: DistrictRow[] = [];
  readonly places: PlaceRow[] = [];
  readonly syncRuns: SyncRunRow[] = [];
  readonly runCreateData: Array<Record<string, unknown>> = [];
  readonly placeUpdateData: Array<Record<string, unknown>> = [];
  readonly placeImages: Array<Record<string, unknown>> = [];
  readonly placeDetailInfos: Array<Record<string, unknown>> = [];
  readonly rankedPlaceIds: string[] = [];

  private districtSequence = 0;
  private placeSequence = 0;
  private runSequence = 0;

  readonly tourismRegion = {
    findMany: async (args: any): Promise<RegionRow[]> =>
      this.regions
        .filter(
          (region) =>
            region.isActive === args.where.isActive &&
            args.where.providerCode.in.includes(region.providerCode),
        )
        .sort((left, right) => left.displayOrder - right.displayOrder),
  };

  readonly tourismDistrict = {
    findMany: async (args: any): Promise<DistrictRow[]> =>
      this.districts.filter((district) => {
        if (args.where.regionId && district.regionId !== args.where.regionId) {
          return false;
        }
        const codes = args.where.providerCode?.in;
        return codes == null || codes.includes(district.providerCode);
      }),
    upsert: async (args: any): Promise<DistrictRow> => {
      const identity = args.where.regionId_providerCode;
      const existing = this.districts.find(
        (district) =>
          district.regionId === identity.regionId &&
          district.providerCode === identity.providerCode,
      );
      if (existing) {
        Object.assign(existing, args.update);
        return existing;
      }
      const created: DistrictRow = {
        id: `district-${++this.districtSequence}`,
        isActive: true,
        ...args.create,
      };
      this.districts.push(created);
      return created;
    },
    updateMany: async (args: any): Promise<{ count: number }> => {
      const matches = this.districts.filter(
        (district) =>
          district.regionId === args.where.regionId &&
          district.isActive === args.where.isActive &&
          !args.where.providerCode?.notIn?.includes(district.providerCode),
      );
      for (const district of matches) Object.assign(district, args.data);
      return { count: matches.length };
    },
  };

  readonly place = {
    findMany: async (args: any): Promise<PlaceRow[]> =>
      this.places.filter((placeRow) => {
        if (args.where.source && placeRow.source !== args.where.source) {
          return false;
        }
        if (args.where.regionId && placeRow.regionId !== args.where.regionId) {
          return false;
        }
        const ids = args.where.externalId?.in;
        return ids == null || ids.includes(placeRow.externalId);
      }),
    upsert: async (args: any): Promise<PlaceRow> => {
      const identity = args.where.source_externalId;
      const existing = this.places.find(
        (placeRow) =>
          placeRow.source === identity.source &&
          placeRow.externalId === identity.externalId,
      );
      if (existing) {
        Object.assign(existing, args.update);
        return existing;
      }
      return this.createPlace(args.create);
    },
    create: async (args: any): Promise<PlaceRow> => this.createPlace(args.data),
    update: async (args: any): Promise<PlaceRow> => {
      const existing =
        this.places.find((placeRow) => placeRow.id === args.where.id) ??
        this.places.find(
          (placeRow) =>
            placeRow.source === args.where.source_externalId?.source &&
            placeRow.externalId === args.where.source_externalId?.externalId,
        );
      if (!existing) throw new Error("Place not found");
      this.placeUpdateData.push({ ...args.data });
      Object.assign(existing, args.data);
      return existing;
    },
    updateMany: async (args: any): Promise<{ count: number }> => {
      const matches = this.places.filter(
        (placeRow) =>
          placeRow.regionId === args.where.regionId &&
          placeRow.source === args.where.source &&
          placeRow.isVisible === args.where.isVisible &&
          !args.where.externalId?.notIn?.includes(placeRow.externalId),
      );
      for (const placeRow of matches) Object.assign(placeRow, args.data);
      return { count: matches.length };
    },
    findUniqueOrThrow: async (args: any): Promise<PlaceRow> => {
      const identity = args.where.source_externalId;
      const found = this.places.find(
        (placeRow) =>
          placeRow.source === identity.source &&
          placeRow.externalId === identity.externalId,
      );
      if (!found) throw new Error("Place not found");
      return found;
    },
  };

  readonly tourismSyncRun = {
    create: async (args: any): Promise<SyncRunRow> => {
      this.runCreateData.push({ ...args.data });
      const created: SyncRunRow = {
        id: `run-${++this.runSequence}`,
        provider: args.data.provider,
        jobType: args.data.jobType,
        status: args.data.status,
        requestedFrom: args.data.requestedFrom ?? null,
        startedAt: args.data.startedAt ?? new Date(),
        finishedAt: args.data.finishedAt ?? null,
        fetchedCount: args.data.fetchedCount ?? 0,
        insertedCount: args.data.insertedCount ?? 0,
        updatedCount: args.data.updatedCount ?? 0,
        deactivatedCount: args.data.deactivatedCount ?? 0,
        failedCount: args.data.failedCount ?? 0,
        errorSummary: args.data.errorSummary ?? null,
      };
      this.syncRuns.push(created);
      return created;
    },
    update: async (args: any): Promise<SyncRunRow> => {
      const run = this.syncRuns.find((item) => item.id === args.where.id);
      if (!run) throw new Error("Run not found");
      Object.assign(run, args.data);
      return run;
    },
    findFirst: async (): Promise<SyncRunRow | null> =>
      this.syncRuns
        .filter(
          (run) =>
            run.provider === "TOUR_API" &&
            run.status === "SUCCEEDED" &&
            (run.jobType === "FULL" || run.jobType === "INCREMENTAL") &&
            run.finishedAt != null,
        )
        .sort(
          (left, right) =>
            (right.finishedAt?.getTime() ?? 0) -
            (left.finishedAt?.getTime() ?? 0),
        )[0] ?? null,
  };

  readonly placeImage = {
    deleteMany: async (args: any): Promise<{ count: number }> => {
      const before = this.placeImages.length;
      const kept = this.placeImages.filter(
        (item) =>
          item.placeId !== args.where.placeId ||
          item.source !== args.where.source,
      );
      this.placeImages.splice(0, this.placeImages.length, ...kept);
      return { count: before - kept.length };
    },
    createMany: async (args: any): Promise<{ count: number }> => {
      this.placeImages.push(...args.data);
      return { count: args.data.length };
    },
  };

  readonly placeDetailInfo = {
    deleteMany: async (args: any): Promise<{ count: number }> => {
      const before = this.placeDetailInfos.length;
      const kept = this.placeDetailInfos.filter(
        (item) =>
          item.placeId !== args.where.placeId ||
          item.source !== args.where.source,
      );
      this.placeDetailInfos.splice(0, this.placeDetailInfos.length, ...kept);
      return { count: before - kept.length };
    },
    createMany: async (args: any): Promise<{ count: number }> => {
      this.placeDetailInfos.push(...args.data);
      return { count: args.data.length };
    },
  };

  readonly placeRanking = {
    findMany: async (): Promise<
      Array<{ place: { id: string; externalId: string } | null }>
    > =>
      [...new Set(this.rankedPlaceIds)].sort().map((placeId) => ({
        place: this.places.find((place) => place.id === placeId)
          ? {
              id: placeId,
              externalId:
                this.places.find((place) => place.id === placeId)?.externalId ??
                "",
            }
          : null,
      })),
  };

  async $transaction<T>(
    callback: (transaction: FakePrisma) => Promise<T>,
  ): Promise<T> {
    return callback(this);
  }

  seedDistricts(): void {
    for (const region of this.regions) {
      this.districts.push({
        id: `district-${++this.districtSequence}`,
        regionId: region.id,
        providerCode: `${region.providerCode}0`,
        name: `시군구 ${region.providerCode}0`,
        isActive: true,
      });
    }
  }

  seedPlace(
    regionCode: string,
    externalId: string,
    overrides: Partial<PlaceRow> = {},
  ): PlaceRow {
    const region = this.regions.find(
      (item) => item.providerCode === regionCode,
    );
    const district = this.districts.find(
      (item) =>
        item.regionId === region?.id && item.providerCode === `${regionCode}0`,
    );
    if (!region) throw new Error("Region not found");
    return this.createPlace({
      source: "TOUR_API",
      externalId,
      regionId: region.id,
      districtId: district?.id ?? null,
      title: `관광지 ${externalId}`,
      isVisible: true,
      ...overrides,
    });
  }

  seedSuccessfulRun(finishedAt: Date, jobType = "FULL"): SyncRunRow {
    const run: SyncRunRow = {
      id: `run-${++this.runSequence}`,
      provider: "TOUR_API",
      jobType,
      status: "SUCCEEDED",
      requestedFrom: null,
      startedAt: new Date(finishedAt.getTime() - 1_000),
      finishedAt,
      fetchedCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      deactivatedCount: 0,
      failedCount: 0,
      errorSummary: null,
    };
    this.syncRuns.push(run);
    return run;
  }

  private createPlace(data: Record<string, unknown>): PlaceRow {
    const created = {
      id: `place-${++this.placeSequence}`,
      source: "TOUR_API",
      externalId: "",
      regionId: "",
      districtId: null,
      title: "",
      isVisible: true,
      ...data,
    } as PlaceRow;
    this.places.push(created);
    return created;
  }
}
/* eslint-enable @typescript-eslint/no-unsafe-argument */
/* eslint-enable @typescript-eslint/no-unsafe-assignment */
/* eslint-enable @typescript-eslint/no-unsafe-call */
/* eslint-enable @typescript-eslint/no-unsafe-member-access */

function setup() {
  const provider = new FakeTourApi();
  const prisma = new FakePrisma();
  const service = new TourismSyncService(
    provider,
    prisma as unknown as PrismaService,
  );
  return { provider, prisma, service };
}

describe("TourismSyncService", () => {
  it("creates a RUNNING full run and completes it with exact counters", async () => {
    const { prisma, service } = setup();

    const result = await service.fullSync();

    expect(prisma.runCreateData[0]).toMatchObject({
      provider: "TOUR_API",
      jobType: "FULL",
      status: "RUNNING",
    });
    expect(result).toEqual({
      runId: "run-1",
      status: "SUCCEEDED",
      fetchedCount: 10,
      insertedCount: 10,
      updatedCount: 0,
      deactivatedCount: 0,
      failedCount: 0,
    });
    expect(prisma.syncRuns[0]).toMatchObject({
      id: result.runId,
      status: result.status,
      fetchedCount: result.fetchedCount,
      insertedCount: result.insertedCount,
      updatedCount: result.updatedCount,
      deactivatedCount: result.deactivatedCount,
      failedCount: result.failedCount,
    });
    expect(prisma.syncRuns[0]?.finishedAt).toBeInstanceOf(Date);
  });

  it("paginates districts and places for all five configured regions", async () => {
    const { prisma, provider, service } = setup();
    for (const regionCode of TOURISM_REGION_CODES) {
      provider.districtPages.set(
        `${regionCode}:1`,
        page([districtFixture(regionCode)], 1, 1, 2),
      );
      provider.districtPages.set(
        `${regionCode}:2`,
        page([districtFixture(regionCode, `${regionCode}1`)], 2, 1, 2),
      );
      provider.placePages.set(
        `${regionCode}:1`,
        page([placeFixture(regionCode)], 1, 1, 2),
      );
      provider.placePages.set(
        `${regionCode}:2`,
        page(
          [placeFixture(regionCode, `${regionCode}-place-2`, `${regionCode}1`)],
          2,
          1,
          2,
        ),
      );
    }

    const result = await service.fullSync();

    expect(provider.districtCalls).toHaveLength(10);
    expect(provider.placeCalls).toHaveLength(10);
    expect(
      new Set(provider.districtCalls.map((call) => call.regionCode)),
    ).toEqual(new Set(TOURISM_REGION_CODES));
    expect(new Set(provider.placeCalls.map((call) => call.regionCode))).toEqual(
      new Set(TOURISM_REGION_CODES),
    );
    expect(prisma.districts).toHaveLength(10);
    expect(prisma.places).toHaveLength(10);
    expect(result.fetchedCount).toBe(20);
  });

  it("stops after the cumulative item count reaches totalCount when the last page reports a smaller numOfRows", async () => {
    const { provider, service } = setup();
    provider.placePages.set(
      "11:1",
      page(
        [placeFixture("11", "11-place-1"), placeFixture("11", "11-place-2")],
        1,
        2,
        3,
      ),
    );
    provider.placePages.set(
      "11:2",
      page([placeFixture("11", "11-place-3")], 2, 1, 3),
    );
    provider.placePages.set("11:3", page([], 3, 0, 3));

    const result = await service.fullSync();

    expect(
      provider.placeCalls.filter((call) => call.regionCode === "11"),
    ).toEqual([
      { regionCode: "11", pageNo: 1 },
      { regionCode: "11", pageNo: 2 },
    ]);
    expect(result.fetchedCount).toBe(12);
  });

  it("fails when an empty page arrives before the cumulative item count reaches totalCount", async () => {
    const { prisma, provider, service } = setup();
    provider.placePages.set(
      "11:1",
      page([placeFixture("11", "11-place-1")], 1, 1, 2),
    );
    provider.placePages.set("11:2", page([], 2, 1, 2));

    await expect(service.fullSync()).rejects.toThrow(
      "Tourism full synchronization failed",
    );

    expect(
      provider.placeCalls.filter((call) => call.regionCode === "11"),
    ).toEqual([
      { regionCode: "11", pageNo: 1 },
      { regionCode: "11", pageNo: 2 },
    ]);
    expect(prisma.syncRuns.at(-1)).toMatchObject({
      status: "FAILED",
      fetchedCount: 2,
      insertedCount: 2,
      failedCount: 1,
    });
  });

  it("fails when totalCount changes between pages", async () => {
    const { prisma, provider, service } = setup();
    provider.placePages.set(
      "11:1",
      page([placeFixture("11", "11-place-1")], 1, 1, 2),
    );
    provider.placePages.set(
      "11:2",
      page([placeFixture("11", "11-place-2")], 2, 1, 3),
    );

    await expect(service.fullSync()).rejects.toThrow(
      "Tourism full synchronization failed",
    );

    expect(
      provider.placeCalls.filter((call) => call.regionCode === "11"),
    ).toEqual([
      { regionCode: "11", pageNo: 1 },
      { regionCode: "11", pageNo: 2 },
    ]);
    expect(prisma.syncRuns.at(-1)).toMatchObject({
      status: "FAILED",
      fetchedCount: 2,
      insertedCount: 2,
      failedCount: 1,
    });
  });

  it("fails without committing or requesting another page when numOfRows is zero before totalCount", async () => {
    const { prisma, provider, service } = setup();
    provider.placePages.set(
      "11:1",
      page([placeFixture("11", "zero-row-metadata-item")], 1, 0, 1),
    );

    await expect(service.fullSync()).rejects.toThrow(
      "Tourism full synchronization failed",
    );

    expect(
      provider.placeCalls.filter((call) => call.regionCode === "11"),
    ).toEqual([{ regionCode: "11", pageNo: 1 }]);
    expect(
      prisma.places.some(
        (placeRow) => placeRow.externalId === "zero-row-metadata-item",
      ),
    ).toBe(false);
    expect(prisma.syncRuns.at(-1)).toMatchObject({
      status: "FAILED",
      fetchedCount: 1,
      insertedCount: 1,
      failedCount: 1,
      errorSummary:
        "Tourism full synchronization failed: TourAPI returned invalid pagination metadata",
    });
  });

  it("fails without committing an overflowing page or requesting another page", async () => {
    const { prisma, provider, service } = setup();
    provider.placePages.set(
      "11:1",
      page([placeFixture("11", "committed-before-overflow")], 1, 1, 2),
    );
    provider.placePages.set(
      "11:2",
      page(
        [
          placeFixture("11", "overflow-item-1"),
          placeFixture("11", "overflow-item-2"),
        ],
        2,
        2,
        2,
      ),
    );

    await expect(service.fullSync()).rejects.toThrow(
      "Tourism full synchronization failed",
    );

    expect(
      provider.placeCalls.filter((call) => call.regionCode === "11"),
    ).toEqual([
      { regionCode: "11", pageNo: 1 },
      { regionCode: "11", pageNo: 2 },
    ]);
    expect(prisma.places.map((placeRow) => placeRow.externalId)).toContain(
      "committed-before-overflow",
    );
    expect(
      prisma.places.some((placeRow) =>
        placeRow.externalId.startsWith("overflow-item-"),
      ),
    ).toBe(false);
    expect(prisma.syncRuns.at(-1)).toMatchObject({
      status: "FAILED",
      fetchedCount: 2,
      insertedCount: 2,
      failedCount: 1,
      errorSummary:
        "Tourism full synchronization failed: TourAPI returned invalid pagination metadata",
    });
  });

  it("upserts by provider codes and source_externalId without duplicating rows", async () => {
    const { prisma, service } = setup();

    await service.fullSync();
    const result = await service.fullSync();

    expect(prisma.districts).toHaveLength(5);
    expect(prisma.places).toHaveLength(5);
    expect(result).toMatchObject({
      fetchedCount: 10,
      insertedCount: 0,
      updatedCount: 10,
      deactivatedCount: 0,
    });
  });

  it("keeps the same district provider code scoped to each region and links places within their region", async () => {
    const { prisma, provider, service } = setup();
    const sharedDistrictCode = "110";
    provider.districtPages.set(
      "41:1",
      page([districtFixture("41", sharedDistrictCode)]),
    );
    provider.placePages.set(
      "41:1",
      page([
        placeFixture("41", "41-shared-district-place", sharedDistrictCode),
      ]),
    );

    await service.fullSync();

    const sharedDistricts = prisma.districts.filter(
      (district) => district.providerCode === sharedDistrictCode,
    );
    expect(sharedDistricts).toHaveLength(2);
    for (const regionCode of ["11", "41"]) {
      const region = prisma.regions.find(
        (candidate) => candidate.providerCode === regionCode,
      );
      const place = prisma.places.find(
        (candidate) =>
          candidate.externalId === `${regionCode}-place-1` ||
          candidate.externalId === `${regionCode}-shared-district-place`,
      );
      const district = prisma.districts.find(
        (candidate) => candidate.id === place?.districtId,
      );
      expect(place?.regionId).toBe(region?.id);
      expect(district?.regionId).toBe(region?.id);
      expect(district?.providerCode).toBe(sharedDistrictCode);
    }
  });

  it("repairs a cross-region district link without replacing the place or deleting unrelated rows", async () => {
    const { prisma, provider, service } = setup();
    const seoul = prisma.regions.find((region) => region.providerCode === "11");
    const gyeonggi = prisma.regions.find(
      (region) => region.providerCode === "41",
    );
    if (!seoul || !gyeonggi) throw new Error("Test regions are missing");

    const sharedDistrictCode = "110";
    const seoulDistrict: DistrictRow = {
      id: "district-seoul-shared",
      regionId: seoul.id,
      providerCode: sharedDistrictCode,
      name: "서울 공유 시군구",
      isActive: true,
    };
    const gyeonggiDistrict: DistrictRow = {
      id: "district-gyeonggi-shared",
      regionId: gyeonggi.id,
      providerCode: sharedDistrictCode,
      name: "경기 공유 시군구",
      isActive: true,
    };
    prisma.districts.push(seoulDistrict, gyeonggiDistrict);

    const externalId = "cross-region-district-place";
    const contaminated = prisma.seedPlace("11", externalId, {
      districtId: gyeonggiDistrict.id,
    });
    const unrelated = prisma.seedPlace("11", "unrelated-manual-place", {
      source: "MANUAL",
      districtId: null,
    });
    const failedRun = await prisma.tourismSyncRun.create({
      data: {
        provider: "TOUR_API",
        jobType: "FULL",
        status: "FAILED",
        finishedAt: new Date("2026-08-24T00:00:00.000Z"),
        failedCount: 1,
      },
    });

    for (const regionCode of ["11", "41"]) {
      provider.districtPages.set(
        `${regionCode}:1`,
        page([districtFixture(regionCode, sharedDistrictCode)]),
      );
    }
    provider.placePages.set(
      "11:1",
      page([placeFixture("11", externalId, sharedDistrictCode)]),
    );
    provider.placePages.set(
      "41:1",
      page([
        placeFixture("41", "41-shared-district-place", sharedDistrictCode),
      ]),
    );

    expect(contaminated).toMatchObject({
      source: "TOUR_API",
      externalId,
      regionId: seoul.id,
      districtId: gyeonggiDistrict.id,
    });

    await service.fullSync();

    const repaired = prisma.places.find(
      (place) => place.source === "TOUR_API" && place.externalId === externalId,
    );
    const repairedDistrict = prisma.districts.find(
      (district) => district.id === repaired?.districtId,
    );
    expect(repaired).toMatchObject({
      id: contaminated.id,
      regionId: seoul.id,
      districtId: seoulDistrict.id,
    });
    expect(repairedDistrict?.regionId).toBe(seoul.id);
    expect(
      prisma.districts.filter(
        (district) => district.providerCode === sharedDistrictCode,
      ),
    ).toHaveLength(2);
    expect(prisma.places).toContainEqual(unrelated);
    expect(prisma.syncRuns).toContainEqual(failedRun);
  });

  it("deactivates missing districts and places only after a successful full region sync", async () => {
    const { prisma, provider, service } = setup();
    await service.fullSync();
    const oldDistrict = prisma.districts.find(
      (district) => district.providerCode === "110",
    );
    const oldPlace = prisma.places.find(
      (placeRow) => placeRow.externalId === "11-place-1",
    );

    provider.districtPages.set("11:1", page([districtFixture("11", "111")]));
    provider.placePages.set(
      "11:1",
      page([placeFixture("11", "11-place-2", "111")], 1, 1, 2),
    );
    provider.placePages.set("11:2", new Error("second page failed"));
    await expect(service.fullSync()).rejects.toThrow(
      "Tourism full synchronization failed",
    );
    expect(oldDistrict?.isActive).toBe(true);
    expect(oldPlace?.isVisible).toBe(true);

    provider.placePages.set(
      "11:1",
      page([placeFixture("11", "11-place-2", "111")]),
    );
    provider.placePages.delete("11:2");
    const result = await service.fullSync();

    expect(oldDistrict?.isActive).toBe(false);
    expect(oldPlace?.isVisible).toBe(false);
    expect(result.deactivatedCount).toBe(2);
  });

  it("processes every date since the last success with both show flags", async () => {
    const { prisma, provider, service } = setup();
    const lastSuccess = new Date("2026-08-20T14:59:00.000Z");
    prisma.seedSuccessfulRun(lastSuccess);
    prisma.seedDistricts();

    const result = await service.incrementalSync(
      new Date("2026-08-23T00:00:00.000Z"),
    );

    const expectedCalls = ["20260821", "20260822", "20260823"].flatMap(
      (modifiedDate) =>
        TOURISM_REGION_CODES.flatMap((regionCode) => [
          { regionCode, modifiedDate, showflag: "1", pageNo: 1 },
          { regionCode, modifiedDate, showflag: "0", pageNo: 1 },
        ]),
    );
    expect(provider.changedCalls).toEqual(expectedCalls);
    expect(result).toMatchObject({
      fetchedCount: 0,
      insertedCount: 0,
      updatedCount: 0,
      deactivatedCount: 0,
    });
    expect(prisma.syncRuns.at(-1)?.requestedFrom).toEqual(lastSuccess);
  });

  it("requires full sync when no success exists or the gap exceeds 30 days", async () => {
    const missing = setup();

    await expect(
      missing.service.incrementalSync(new Date("2026-08-24T00:00:00.000Z")),
    ).rejects.toThrow("--mode=full");
    expect(missing.provider.changedCalls).toHaveLength(0);
    expect(missing.prisma.syncRuns).toHaveLength(0);

    const stale = setup();
    stale.prisma.seedSuccessfulRun(new Date("2026-07-31T15:00:00.000Z"));
    await expect(
      stale.service.incrementalSync(new Date("2026-09-01T00:00:00.000Z")),
    ).rejects.toThrow("--mode=full");
    expect(stale.provider.changedCalls).toHaveLength(0);
    expect(stale.prisma.syncRuns).toHaveLength(1);
  });

  it("moves oldContentid to the new externalId and preserves the internal UUID", async () => {
    const { prisma, provider, service } = setup();
    prisma.seedDistricts();
    const oldPlace = prisma.seedPlace("11", "old-content-id");
    prisma.seedSuccessfulRun(new Date("2026-08-22T15:00:00.000Z"));
    provider.changedPages.set(
      "20260824:11:1:1",
      page([changedFixture("11", "new-content-id", "1", "old-content-id")]),
    );

    const result = await service.incrementalSync(
      new Date("2026-08-24T00:00:00.000Z"),
    );

    const moved = prisma.places.find(
      (placeRow) => placeRow.externalId === "new-content-id",
    );
    expect(moved?.id).toBe(oldPlace.id);
    expect(prisma.places).toHaveLength(1);
    expect(result).toMatchObject({ insertedCount: 0, updatedCount: 1 });
  });

  it("marks the run FAILED, keeps completed page writes, and does not advance the watermark", async () => {
    const { prisma, provider, service } = setup();
    prisma.seedDistricts();
    const watermark = new Date("2026-08-22T15:00:00.000Z");
    const previousSuccess = prisma.seedSuccessfulRun(watermark);
    provider.changedPages.set(
      "20260824:11:1:1",
      page([changedFixture("11", "committed-page-item", "1")], 1, 1, 2),
    );
    provider.changedPages.set(
      "20260824:11:1:2",
      new Error("provider failed SERVICE_KEY=do-not-leak"),
    );

    await expect(
      service.incrementalSync(new Date("2026-08-24T00:00:00.000Z")),
    ).rejects.toThrow("Tourism incremental synchronization failed");

    expect(
      prisma.places.some(
        (placeRow) => placeRow.externalId === "committed-page-item",
      ),
    ).toBe(true);
    expect(prisma.syncRuns.at(-1)).toMatchObject({
      status: "FAILED",
      fetchedCount: 1,
      insertedCount: 1,
      failedCount: 1,
    });
    expect(prisma.syncRuns.at(-1)?.errorSummary).not.toContain("do-not-leak");
    expect(
      prisma.syncRuns.filter((run) => run.status === "SUCCEEDED").at(-1),
    ).toBe(previousSuccess);

    provider.changedCalls.length = 0;
    provider.changedPages.set(
      "20260824:11:1:1",
      page([changedFixture("11", "committed-page-item", "1")]),
    );
    provider.changedPages.delete("20260824:11:1:2");
    await service.incrementalSync(new Date("2026-08-24T00:00:00.000Z"));
    expect(provider.changedCalls[0]?.modifiedDate).toBe("20260824");
  });

  it("atomically enriches common, intro, repeat and image detail for one content ID", async () => {
    const { prisma, provider, service } = setup();
    prisma.seedDistricts();
    const original = prisma.seedPlace("50", "detail-content-id", {
      title: "원래 제목",
      overview: "이전 설명",
      homepage: "https://old.example.test",
      providerModifiedAt: new Date(Date.now() - DAY_MS),
    });
    provider.detail = {
      contentid: "detail-content-id",
      contenttypeid: "12",
      title: "외부 상세 응답 제목",
      overview: "새 설명",
      homepage: "https://new.example.test",
    };
    provider.intro = {
      contentid: "detail-content-id",
      usetime: "09:00~18:00",
      parking: "주차 가능",
    };
    provider.information = [
      {
        contentid: "detail-content-id",
        infoname: "이용안내",
        infotext: "방문 전 확인",
        serialnum: "1",
      },
    ];
    provider.images = [
      {
        contentid: "detail-content-id",
        originimgurl: "https://tong.visitkorea.or.kr/image.jpg",
        serialnum: "1",
      },
    ];

    await service.enrichPlaceDetails("detail-content-id");

    expect(provider.detailCalls).toEqual([
      "detail-content-id",
      "intro:detail-content-id",
      "info:detail-content-id",
      "images:detail-content-id",
    ]);
    expect(original).toMatchObject({
      title: "원래 제목",
      overview: "새 설명",
      homepage: "https://new.example.test",
      useTime: "09:00~18:00",
      parking: "주차 가능",
    });
    expect(prisma.placeImages).toHaveLength(1);
    expect(prisma.placeDetailInfos).toHaveLength(1);
  });

  it("enriches each unique ranked place and records a safe batch summary", async () => {
    const { prisma, provider, service } = setup();
    prisma.seedDistricts();
    const place = prisma.seedPlace("50", "ranked-detail-id");
    prisma.rankedPlaceIds.push(place.id, place.id);
    provider.detail = { contentid: "ranked-detail-id", overview: "소개" };
    provider.intro = { contentid: "ranked-detail-id" };

    await expect(service.enrichRankedPlaceDetails()).resolves.toEqual({
      requestedCount: 1,
      succeededCount: 1,
      failedCount: 0,
    });
    expect(prisma.syncRuns.at(-1)).toMatchObject({
      jobType: "DETAIL_RANKED",
      status: "SUCCEEDED",
      fetchedCount: 1,
      updatedCount: 1,
      failedCount: 0,
    });
  });
});
