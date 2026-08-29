/* eslint-disable @typescript-eslint/require-await -- deterministic fake Prisma methods preserve async interfaces */
import { Prisma } from "../generated/prisma/client.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import { FestivalRepository } from "./festival.repository.js";
import type { NormalizedFestival } from "./tour-api.mapper.js";

const syncedAt = new Date("2026-08-25T00:00:00.000Z");

function festival(externalId: string): NormalizedFestival {
  return {
    source: "TOUR_API",
    externalId,
    contentTypeId: 15,
    title: `축제 ${externalId}`,
    eventStartDate: new Date("2026-08-01T00:00:00.000Z"),
    eventEndDate: new Date("2026-08-31T00:00:00.000Z"),
    providerRegionCode: "11",
    providerDistrictCode: "110",
    address1: null,
    address2: null,
    zipcode: null,
    longitude: new Prisma.Decimal("126.1"),
    latitude: new Prisma.Decimal("37.1"),
    mapLevel: null,
    category1: "EV",
    category2: "EV01",
    category3: "EV010100",
    telephone: null,
    primaryImageUrl: null,
    primaryThumbnailUrl: null,
    imageCopyrightType: null,
    providerCreatedAt: null,
    providerModifiedAt: new Date("2026-08-24T00:00:00.000Z"),
    isVisible: true,
    lastSyncedAt: syncedAt,
  };
}

class FakePrisma {
  readonly festivals = new Map<string, NormalizedFestival>();
  readonly upserts: Array<Record<string, unknown>> = [];
  readonly runs = new Map<string, Record<string, unknown>>();
  private runSequence = 0;

  readonly festival = {
    findMany: async (args: {
      where: { source: string; externalId: { in: string[] } };
    }) =>
      [...this.festivals.values()]
        .filter(
          (item) =>
            item.source === args.where.source &&
            args.where.externalId.in.includes(item.externalId),
        )
        .map((item) => ({ externalId: item.externalId })),
    upsert: async (args: Record<string, any>) => {
      this.upserts.push(args);
      const data = args.create as NormalizedFestival;
      this.festivals.set(data.externalId, data);
      return data;
    },
    updateMany: async (args: {
      where: {
        source: string;
        isVisible: boolean;
        eventStartDate: { gte: Date };
        eventEndDate: { lte: Date };
        externalId?: { notIn: string[] };
      };
      data: { isVisible: boolean; lastSyncedAt: Date };
    }) => {
      const matched = [...this.festivals.values()].filter(
        (item) =>
          item.source === args.where.source &&
          item.isVisible === args.where.isVisible &&
          item.eventStartDate >= args.where.eventStartDate.gte &&
          item.eventEndDate <= args.where.eventEndDate.lte &&
          !(args.where.externalId?.notIn ?? []).includes(item.externalId),
      );
      for (const item of matched) {
        this.festivals.set(item.externalId, { ...item, ...args.data });
      }
      return { count: matched.length };
    },
  };

  readonly tourismSyncRun = {
    create: async (args: { data: Record<string, unknown> }) => {
      const row = { id: `run-${++this.runSequence}`, ...args.data };
      this.runs.set(row.id, row);
      return row;
    },
    update: async (args: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const row = this.runs.get(args.where.id);
      if (!row) throw new Error("Run not found");
      Object.assign(row, args.data);
      return row;
    },
  };

  async $transaction<T>(callback: (client: FakePrisma) => Promise<T>) {
    return callback(this);
  }
}

function setup() {
  const prisma = new FakePrisma();
  const repository = new FestivalRepository(prisma as unknown as PrismaService);
  return { prisma, repository };
}

describe("FestivalRepository", () => {
  it("creates a RUNNING FESTIVAL_FULL sync run for the requested range", async () => {
    const { prisma, repository } = setup();
    const rangeStart = new Date("2026-01-01T00:00:00.000Z");

    const run = await repository.createSyncRun(rangeStart);

    expect(run.id).toBe("run-1");
    expect(prisma.runs.get(run.id)).toMatchObject({
      provider: "TOUR_API",
      jobType: "FESTIVAL_FULL",
      status: "RUNNING",
      requestedFrom: rangeStart,
    });
  });

  it("upserts one page transactionally and separates inserted from updated rows", async () => {
    const { prisma, repository } = setup();
    prisma.festivals.set("existing", festival("existing"));

    const delta = await repository.upsertPage([
      festival("existing"),
      festival("new"),
    ]);

    expect(delta).toEqual({ insertedCount: 1, updatedCount: 1 });
    expect(prisma.festivals.size).toBe(2);
    expect(prisma.upserts).toHaveLength(2);
    expect(prisma.upserts[0]).toMatchObject({
      where: {
        source_externalId: { source: "TOUR_API", externalId: "existing" },
      },
    });
  });

  it("rejects duplicate provider identities within one page", async () => {
    const { prisma, repository } = setup();

    await expect(
      repository.upsertPage([festival("duplicate"), festival("duplicate")]),
    ).rejects.toThrow("Invalid TourAPI duplicate festival content ID");
    expect(prisma.upserts).toHaveLength(0);
    expect(prisma.festivals.size).toBe(0);
  });

  it("hides only in-range festivals that the sync run did not see", async () => {
    const { prisma, repository } = setup();
    prisma.festivals.set("kept", festival("kept"));
    prisma.festivals.set("withdrawn", festival("withdrawn"));
    prisma.festivals.set("out-of-range", {
      ...festival("out-of-range"),
      eventStartDate: new Date("2025-08-01T00:00:00.000Z"),
      eventEndDate: new Date("2025-08-31T00:00:00.000Z"),
    });
    const lastSyncedAt = new Date("2026-08-29T00:00:00.000Z");

    const count = await repository.deactivateMissing({
      rangeStart: new Date("2026-01-01T00:00:00.000Z"),
      rangeEnd: new Date("2027-12-31T00:00:00.000Z"),
      seenExternalIds: new Set(["kept"]),
      lastSyncedAt,
    });

    expect(count).toBe(1);
    expect(prisma.festivals.get("kept")?.isVisible).toBe(true);
    expect(prisma.festivals.get("out-of-range")?.isVisible).toBe(true);
    expect(prisma.festivals.get("withdrawn")).toMatchObject({
      isVisible: false,
      lastSyncedAt,
    });
  });

  it("records successful and failed terminal run states with exact counters", async () => {
    const { prisma, repository } = setup();
    const run = await repository.createSyncRun(
      new Date("2026-01-01T00:00:00.000Z"),
    );

    const success = await repository.completeSyncRun(run.id, {
      fetchedCount: 2,
      insertedCount: 1,
      updatedCount: 1,
      deactivatedCount: 3,
    });

    expect(success).toMatchObject({
      runId: run.id,
      status: "SUCCEEDED",
      fetchedCount: 2,
      insertedCount: 1,
      updatedCount: 1,
      deactivatedCount: 3,
      failedCount: 0,
    });
    expect(prisma.runs.get(run.id)).toMatchObject({
      status: "SUCCEEDED",
      fetchedCount: 2,
      insertedCount: 1,
      updatedCount: 1,
      deactivatedCount: 3,
      failedCount: 0,
      errorSummary: null,
    });

    const failedRun = await repository.createSyncRun(
      new Date("2026-01-01T00:00:00.000Z"),
    );
    await repository.failSyncRun(
      failedRun.id,
      {
        fetchedCount: 1,
        insertedCount: 1,
        updatedCount: 0,
        deactivatedCount: 0,
      },
      "Festival synchronization failed (22)",
    );
    expect(prisma.runs.get(failedRun.id)).toMatchObject({
      status: "FAILED",
      fetchedCount: 1,
      insertedCount: 1,
      updatedCount: 0,
      deactivatedCount: 0,
      failedCount: 1,
      errorSummary: "Festival synchronization failed (22)",
    });
  });
});
