import { Inject, Injectable } from "@nestjs/common";

import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { TourApiError } from "./tour-api.client.js";
import {
  mapChangedPlace,
  mapDistrict,
  mapPlace,
  mapPlaceDetailBundle,
  type NormalizedChangedPlace,
  type NormalizedDistrict,
  type NormalizedPlace,
} from "./tour-api.mapper.js";
import type {
  TourApiChangedPlace,
  TourApiDistrict,
  TourApiPage,
  TourApiPlace,
  TourApiPort,
} from "./tour-api.types.js";
import {
  TOUR_API_PORT,
  TOUR_API_SOURCE,
  TOURISM_REGION_CODES,
} from "./tourism.constants.js";

export type SyncSummary = {
  runId: string;
  status: "SUCCEEDED";
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  deactivatedCount: number;
  failedCount: 0;
};

export type RankedPlaceDetailEnrichmentSummary = {
  requestedCount: number;
  succeededCount: number;
  failedCount: number;
};

type SyncCounters = {
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  deactivatedCount: number;
};

type ActiveRegion = {
  id: string;
  providerCode: string;
};

type PlacePageItem = {
  place: NormalizedPlace;
  districtCode: string | null;
};

type ChangedPlacePageItem = {
  changed: NormalizedChangedPlace;
  districtCode: string | null;
};

type PageDelta = Pick<
  SyncCounters,
  "insertedCount" | "updatedCount" | "deactivatedCount"
>;

const EMPTY_PAGE_DELTA: PageDelta = {
  insertedCount: 0,
  updatedCount: 0,
  deactivatedCount: 0,
};
const KST_OFFSET_MS = 9 * 60 * 60 * 1_000;
const DAY_MS = 24 * 60 * 60 * 1_000;
const MAX_INCREMENTAL_DATES = 30;

class SafeSyncError extends Error {}

async function forEachPage<T>(
  load: (pageNo: number) => Promise<TourApiPage<T>>,
  consume: (items: readonly T[]) => Promise<void>,
): Promise<number> {
  let pageNo = 1;
  let fetched = 0;
  let expectedTotalCount: number | undefined;

  for (;;) {
    const page = await load(pageNo);
    expectedTotalCount ??= page.totalCount;

    if (
      page.totalCount !== expectedTotalCount ||
      (page.numOfRows === 0 && page.totalCount > 0) ||
      (page.items.length === 0 && fetched < expectedTotalCount) ||
      fetched + page.items.length > expectedTotalCount
    ) {
      throw new SafeSyncError("TourAPI returned invalid pagination metadata");
    }

    await consume(page.items);
    fetched += page.items.length;

    if (fetched === expectedTotalCount) return fetched;
    pageNo += 1;
  }
}

@Injectable()
export class TourismSyncService {
  constructor(
    @Inject(TOUR_API_PORT) private readonly provider: TourApiPort,
    private readonly prisma: PrismaService,
  ) {}

  async fullSync(): Promise<SyncSummary> {
    const counters = emptyCounters();
    const run = await this.prisma.tourismSyncRun.create({
      data: {
        provider: TOUR_API_SOURCE,
        jobType: "FULL",
        status: "RUNNING",
      },
    });

    try {
      const regions = await this.activeRegions();

      for (const region of regions) {
        await this.fullSyncRegion(region, counters);
      }

      return await this.completeRun(run.id, counters);
    } catch (error) {
      throw await this.failRun(run.id, "full", counters, error);
    }
  }

  async incrementalSync(now = new Date()): Promise<SyncSummary> {
    assertValidDate(now, "current timestamp");
    const lastSuccess = await this.prisma.tourismSyncRun.findFirst({
      where: {
        provider: TOUR_API_SOURCE,
        status: "SUCCEEDED",
        jobType: { in: ["FULL", "INCREMENTAL"] },
        finishedAt: { not: null },
      },
      orderBy: { finishedAt: "desc" },
    });
    const lastFinishedAt = lastSuccess?.finishedAt;

    if (lastFinishedAt == null) {
      throw fullSyncRequired(
        "no successful full or incremental synchronization exists",
      );
    }

    const dates = incrementalDates(lastFinishedAt, now);
    if (dates.length > MAX_INCREMENTAL_DATES) {
      throw fullSyncRequired(
        "the incremental synchronization gap exceeds 30 days",
      );
    }

    const counters = emptyCounters();
    const run = await this.prisma.tourismSyncRun.create({
      data: {
        provider: TOUR_API_SOURCE,
        jobType: "INCREMENTAL",
        status: "RUNNING",
        requestedFrom: lastFinishedAt,
      },
    });

    try {
      const regions = await this.activeRegions();

      for (const modifiedDate of dates) {
        for (const region of regions) {
          await this.incrementalSyncRegion(region, modifiedDate, "1", counters);
          await this.incrementalSyncRegion(region, modifiedDate, "0", counters);
        }
      }

      return await this.completeRun(run.id, counters);
    } catch (error) {
      throw await this.failRun(run.id, "incremental", counters, error);
    }
  }

  async enrichPlaceDetails(contentId: string): Promise<void> {
    const normalizedContentId = contentId.trim();
    if (!normalizedContentId) {
      throw new SafeSyncError(
        "Tourism detail enrichment requires a content ID",
      );
    }

    try {
      const place = await this.prisma.place.findUniqueOrThrow({
        where: {
          source_externalId: {
            source: TOUR_API_SOURCE,
            externalId: normalizedContentId,
          },
        },
        select: { id: true },
      });
      const common =
        await this.provider.getPlaceCommonDetail(normalizedContentId);
      const intro = await this.provider.getPlaceIntro(normalizedContentId);
      const information =
        await this.provider.getPlaceRepeatInfo(normalizedContentId);
      const images = await this.provider.getPlaceImages(normalizedContentId);
      const detail = mapPlaceDetailBundle({
        contentId: normalizedContentId,
        common,
        intro,
        information,
        images,
        syncedAt: new Date(),
      });

      await this.prisma.$transaction(async (transaction) => {
        await transaction.place.update({
          where: { id: place.id },
          data: detail.place,
        });
        await transaction.placeImage.deleteMany({
          where: { placeId: place.id, source: TOUR_API_SOURCE },
        });
        await transaction.placeDetailInfo.deleteMany({
          where: { placeId: place.id, source: TOUR_API_SOURCE },
        });
        if (detail.images.length > 0) {
          await transaction.placeImage.createMany({
            data: detail.images.map((image) => ({
              ...image,
              placeId: place.id,
            })),
          });
        }
        if (detail.information.length > 0) {
          await transaction.placeDetailInfo.createMany({
            data: detail.information.map((item) => ({
              ...item,
              placeId: place.id,
            })),
          });
        }
      });
    } catch (error) {
      throw sanitizedSyncError("detail", error);
    }
  }

  async enrichPlace(contentId: string): Promise<void> {
    await this.enrichPlaceDetails(contentId);
  }

  async enrichRankedPlaceDetails(): Promise<RankedPlaceDetailEnrichmentSummary> {
    const run = await this.prisma.tourismSyncRun.create({
      data: {
        provider: TOUR_API_SOURCE,
        jobType: "DETAIL_RANKED",
        status: "RUNNING",
      },
    });
    const rows = await this.prisma.placeRanking.findMany({
      where: {
        placeId: { not: null },
        place: { is: { source: TOUR_API_SOURCE, isVisible: true } },
      },
      select: { place: { select: { id: true, externalId: true } } },
      distinct: ["placeId"],
      orderBy: { placeId: "asc" },
    });
    let succeededCount = 0;
    let failedCount = 0;
    for (const row of rows) {
      if (row.place == null) continue;
      try {
        await this.enrichPlaceDetails(row.place.externalId);
        succeededCount += 1;
      } catch {
        failedCount += 1;
      }
    }
    await this.prisma.tourismSyncRun.update({
      where: { id: run.id },
      data: {
        status: failedCount === 0 ? "SUCCEEDED" : "FAILED",
        finishedAt: new Date(),
        fetchedCount: rows.length,
        updatedCount: succeededCount,
        failedCount,
        errorSummary:
          failedCount === 0
            ? null
            : `Tourism ranked detail synchronization failed for ${failedCount} place(s).`,
      },
    });
    return { requestedCount: rows.length, succeededCount, failedCount };
  }

  private async fullSyncRegion(
    region: ActiveRegion,
    counters: SyncCounters,
  ): Promise<void> {
    const seenDistrictCodes = new Set<string>();

    await forEachPage(
      (pageNo) =>
        this.provider.getDistrictPage({
          regionCode: region.providerCode,
          pageNo,
        }),
      async (items) => {
        const districts = mapDistrictPage(items, region.providerCode);
        const delta = await this.prisma.$transaction((transaction) =>
          this.upsertDistrictPage(transaction, region.id, districts),
        );
        for (const district of districts) {
          seenDistrictCodes.add(district.providerCode);
        }
        counters.fetchedCount += items.length;
        mergeDelta(counters, delta);
      },
    );

    const seenPlaceIds = new Set<string>();
    const fetchedPlaces = await forEachPage(
      (pageNo) =>
        this.provider.getPlacePage({
          regionCode: region.providerCode,
          pageNo,
        }),
      async (items) => {
        const places = mapPlacePage(items, region.providerCode, new Date());
        const delta = await this.prisma.$transaction((transaction) =>
          this.upsertPlacePage(transaction, region.id, places),
        );
        for (const item of places) seenPlaceIds.add(item.place.externalId);
        counters.fetchedCount += items.length;
        mergeDelta(counters, delta);
      },
    );

    if (fetchedPlaces === 0) {
      throw new SafeSyncError(
        `TourAPI returned zero places for region ${region.providerCode}`,
      );
    }

    const deactivatedDistricts = await this.prisma.$transaction((transaction) =>
      transaction.tourismDistrict.updateMany({
        where: {
          regionId: region.id,
          isActive: true,
          ...(seenDistrictCodes.size > 0
            ? { providerCode: { notIn: [...seenDistrictCodes] } }
            : {}),
        },
        data: { isActive: false },
      }),
    );
    counters.deactivatedCount += deactivatedDistricts.count;

    const deactivatedPlaces = await this.prisma.$transaction((transaction) =>
      transaction.place.updateMany({
        where: {
          regionId: region.id,
          source: TOUR_API_SOURCE,
          isVisible: true,
          ...(seenPlaceIds.size > 0
            ? { externalId: { notIn: [...seenPlaceIds] } }
            : {}),
        },
        data: { isVisible: false, lastSyncedAt: new Date() },
      }),
    );
    counters.deactivatedCount += deactivatedPlaces.count;
  }

  private async incrementalSyncRegion(
    region: ActiveRegion,
    modifiedDate: string,
    showflag: "0" | "1",
    counters: SyncCounters,
  ): Promise<void> {
    await forEachPage(
      (pageNo) =>
        this.provider.getChangedPlacePage({
          regionCode: region.providerCode,
          modifiedDate,
          showflag,
          pageNo,
        }),
      async (items) => {
        const places = mapChangedPlacePage(
          items,
          region.providerCode,
          new Date(),
        );
        const delta = await this.prisma.$transaction((transaction) =>
          this.upsertChangedPlacePage(transaction, region.id, places),
        );
        counters.fetchedCount += items.length;
        mergeDelta(counters, delta);
      },
    );
  }

  private async activeRegions(): Promise<ActiveRegion[]> {
    const regions = await this.prisma.tourismRegion.findMany({
      where: {
        providerCode: { in: [...TOURISM_REGION_CODES] },
        isActive: true,
      },
      orderBy: { displayOrder: "asc" },
      select: { id: true, providerCode: true },
    });
    const regionCodes = new Set(regions.map((region) => region.providerCode));
    if (
      regions.length !== TOURISM_REGION_CODES.length ||
      TOURISM_REGION_CODES.some((code) => !regionCodes.has(code))
    ) {
      throw new SafeSyncError(
        "Tourism synchronization requires all five configured regions",
      );
    }

    return regions;
  }

  private async upsertDistrictPage(
    transaction: Prisma.TransactionClient,
    regionId: string,
    districts: readonly NormalizedDistrict[],
  ): Promise<PageDelta> {
    const providerCodes = districts.map((district) => district.providerCode);
    const existing = await transaction.tourismDistrict.findMany({
      where: { regionId, providerCode: { in: providerCodes } },
      select: { providerCode: true },
    });
    const existingCodes = new Set(
      existing.map((district) => district.providerCode),
    );
    const delta = { ...EMPTY_PAGE_DELTA };

    for (const district of districts) {
      const alreadyExists = existingCodes.has(district.providerCode);
      await transaction.tourismDistrict.upsert({
        where: {
          regionId_providerCode: {
            regionId,
            providerCode: district.providerCode,
          },
        },
        create: { ...district, regionId, isActive: true },
        update: { ...district, isActive: true },
      });
      if (alreadyExists) {
        delta.updatedCount += 1;
      } else {
        delta.insertedCount += 1;
        existingCodes.add(district.providerCode);
      }
    }

    return delta;
  }

  private async upsertPlacePage(
    transaction: Prisma.TransactionClient,
    regionId: string,
    items: readonly PlacePageItem[],
  ): Promise<PageDelta> {
    const externalIds = items.map((item) => item.place.externalId);
    const existing = await transaction.place.findMany({
      where: {
        source: TOUR_API_SOURCE,
        externalId: { in: externalIds },
      },
      select: { externalId: true },
    });
    const existingIds = new Set(existing.map((place) => place.externalId));
    const districtIds = await resolveDistrictIds(
      transaction,
      regionId,
      items.map((item) => item.districtCode),
    );
    const delta = { ...EMPTY_PAGE_DELTA };

    for (const item of items) {
      const alreadyExists = existingIds.has(item.place.externalId);
      const data = {
        ...item.place,
        regionId,
        districtId: districtIdFor(item.districtCode, districtIds),
      };
      await transaction.place.upsert({
        where: {
          source_externalId: {
            source: TOUR_API_SOURCE,
            externalId: item.place.externalId,
          },
        },
        create: data,
        update: data,
      });
      if (alreadyExists) {
        delta.updatedCount += 1;
      } else {
        delta.insertedCount += 1;
        existingIds.add(item.place.externalId);
      }
    }

    return delta;
  }

  private async upsertChangedPlacePage(
    transaction: Prisma.TransactionClient,
    regionId: string,
    items: readonly ChangedPlacePageItem[],
  ): Promise<PageDelta> {
    const externalIds = new Set<string>();
    for (const item of items) {
      externalIds.add(item.changed.place.externalId);
      if (item.changed.oldContentId) {
        externalIds.add(item.changed.oldContentId);
      }
    }
    const existing = await transaction.place.findMany({
      where: {
        source: TOUR_API_SOURCE,
        externalId: { in: [...externalIds] },
      },
      select: { id: true, externalId: true, isVisible: true },
    });
    const existingByExternalId = new Map(
      existing.map((place) => [place.externalId, place]),
    );
    const districtIds = await resolveDistrictIds(
      transaction,
      regionId,
      items.map((item) => item.districtCode),
    );
    const delta = { ...EMPTY_PAGE_DELTA };

    for (const item of items) {
      const newExternalId = item.changed.place.externalId;
      const oldExternalId = item.changed.oldContentId;
      const currentAtNewId = existingByExternalId.get(newExternalId);
      const currentAtOldId = oldExternalId
        ? existingByExternalId.get(oldExternalId)
        : undefined;

      if (
        currentAtNewId &&
        currentAtOldId &&
        currentAtNewId.id !== currentAtOldId.id
      ) {
        throw new SafeSyncError(
          "TourAPI content ID move conflicts with an existing place",
        );
      }

      const current = currentAtNewId ?? currentAtOldId;
      const data = {
        ...item.changed.place,
        externalId: newExternalId,
        regionId,
        districtId: districtIdFor(item.districtCode, districtIds),
      };

      if (current) {
        await transaction.place.update({
          where: { id: current.id },
          data,
        });
        if (!item.changed.place.isVisible && current.isVisible) {
          delta.deactivatedCount += 1;
        } else {
          delta.updatedCount += 1;
        }
        existingByExternalId.delete(current.externalId);
        existingByExternalId.set(newExternalId, {
          ...current,
          externalId: newExternalId,
          isVisible: item.changed.place.isVisible,
        });
      } else {
        const created = await transaction.place.create({
          data,
          select: { id: true, externalId: true, isVisible: true },
        });
        delta.insertedCount += 1;
        existingByExternalId.set(newExternalId, created);
      }
    }

    return delta;
  }

  private async completeRun(
    runId: string,
    counters: SyncCounters,
  ): Promise<SyncSummary> {
    await this.prisma.tourismSyncRun.update({
      where: { id: runId },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        ...counters,
        failedCount: 0,
        errorSummary: null,
      },
    });

    return {
      runId,
      status: "SUCCEEDED",
      ...counters,
      failedCount: 0,
    };
  }

  private async failRun(
    runId: string,
    mode: "full" | "incremental",
    counters: SyncCounters,
    error: unknown,
  ): Promise<Error> {
    const sanitized = sanitizedSyncError(mode, error);
    await this.prisma.tourismSyncRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        ...counters,
        failedCount: 1,
        errorSummary: sanitized.message,
      },
    });
    return sanitized;
  }
}

function emptyCounters(): SyncCounters {
  return {
    fetchedCount: 0,
    insertedCount: 0,
    updatedCount: 0,
    deactivatedCount: 0,
  };
}

function mergeDelta(counters: SyncCounters, delta: PageDelta): void {
  counters.insertedCount += delta.insertedCount;
  counters.updatedCount += delta.updatedCount;
  counters.deactivatedCount += delta.deactivatedCount;
}

function mapDistrictPage(
  items: readonly TourApiDistrict[],
  regionCode: string,
): NormalizedDistrict[] {
  return items.map((item) => {
    assertProviderRegion(item.lDongRegnCd, regionCode);
    return mapDistrict(item);
  });
}

function mapPlacePage(
  items: readonly TourApiPlace[],
  regionCode: string,
  lastSyncedAt: Date,
): PlacePageItem[] {
  return items.map((item) => {
    assertProviderRegion(item.lDongRegnCd, regionCode);
    return {
      place: mapPlace(item, lastSyncedAt),
      districtCode: optionalProviderCode(item.lDongSignguCd),
    };
  });
}

function mapChangedPlacePage(
  items: readonly TourApiChangedPlace[],
  regionCode: string,
  lastSyncedAt: Date,
): ChangedPlacePageItem[] {
  return items.map((item) => {
    assertProviderRegion(item.lDongRegnCd, regionCode);
    return {
      changed: mapChangedPlace(item, lastSyncedAt),
      districtCode: optionalProviderCode(item.lDongSignguCd),
    };
  });
}

function assertProviderRegion(actual: string, expected: string): void {
  if (actual.trim() !== expected) {
    throw new SafeSyncError("TourAPI returned an unexpected region code");
  }
}

function optionalProviderCode(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function resolveDistrictIds(
  transaction: Prisma.TransactionClient,
  regionId: string,
  codes: readonly (string | null)[],
): Promise<Map<string, string>> {
  const uniqueCodes = [...new Set(codes.filter((code) => code != null))];
  if (uniqueCodes.length === 0) return new Map();

  const districts = await transaction.tourismDistrict.findMany({
    where: { regionId, providerCode: { in: uniqueCodes } },
    select: { id: true, providerCode: true },
  });
  const ids = new Map(
    districts.map((district) => [district.providerCode, district.id]),
  );
  if (ids.size !== uniqueCodes.length) {
    throw new SafeSyncError("TourAPI returned an unknown district code");
  }
  return ids;
}

function districtIdFor(
  districtCode: string | null,
  districtIds: ReadonlyMap<string, string>,
): string | null {
  if (districtCode == null) return null;
  const districtId = districtIds.get(districtCode);
  if (!districtId) {
    throw new SafeSyncError("TourAPI returned an unknown district code");
  }
  return districtId;
}

function incrementalDates(lastSuccess: Date, now: Date): string[] {
  assertValidDate(lastSuccess, "last successful timestamp");
  const firstDay = kstDayNumber(lastSuccess) + 1;
  const finalDay = kstDayNumber(now);
  if (firstDay > finalDay) return [];

  const dates: string[] = [];
  for (let day = firstDay; day <= finalDay; day += 1) {
    const date = new Date(day * DAY_MS);
    dates.push(
      [
        date.getUTCFullYear().toString().padStart(4, "0"),
        (date.getUTCMonth() + 1).toString().padStart(2, "0"),
        date.getUTCDate().toString().padStart(2, "0"),
      ].join(""),
    );
  }
  return dates;
}

function kstDayNumber(date: Date): number {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  return Math.floor(
    Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) /
      DAY_MS,
  );
}

function assertValidDate(date: Date, label: string): void {
  if (Number.isNaN(date.getTime())) {
    throw new SafeSyncError(`Invalid tourism synchronization ${label}`);
  }
}

function fullSyncRequired(reason: string): Error {
  return new SafeSyncError(
    `Tourism incremental synchronization requires --mode=full: ${reason}`,
  );
}

function sanitizedSyncError(
  mode: "full" | "incremental" | "detail",
  error: unknown,
): Error {
  const operation =
    mode === "detail" ? "detail enrichment" : `${mode} synchronization`;

  if (error instanceof TourApiError) {
    return new SafeSyncError(
      `Tourism ${operation} failed (${error.providerCode})`,
    );
  }
  if (error instanceof SafeSyncError) {
    return new SafeSyncError(`Tourism ${operation} failed: ${error.message}`);
  }
  if (error instanceof Error && error.message.startsWith("Invalid TourAPI")) {
    return new SafeSyncError(`Tourism ${operation} failed: ${error.message}`);
  }
  return new SafeSyncError(`Tourism ${operation} failed`);
}
