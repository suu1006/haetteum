/* Async fakes implement the production Promise-based I/O contract. */
/* eslint-disable @typescript-eslint/require-await */
import { ConfigService } from "@nestjs/config";
import { jest } from "@jest/globals";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { TourApiRecoveryRepository } from "../src/tourism/tour-api-recovery.repository.js";
import { TourApiRecovery } from "../src/tourism/tour-api-recovery.js";
import { TourApiClient } from "../src/tourism/tour-api.client.js";
import { TourismSyncService } from "../src/tourism/tourism-sync.service.js";
import { FestivalSyncService } from "../src/tourism/festival-sync.service.js";
import { FestivalRepository } from "../src/tourism/festival.repository.js";
import { TourApiBudgetDeferredError } from "../src/tourism/tour-api-policy.js";
import { recoveryPolicy } from "./tour-api-recovery-fixture.js";

const modified = new Date("2026-09-01T00:00:00Z");
const ids = ["989001", "989002"];
function envelope(items: unknown[]) {
  return JSON.stringify({
    response: {
      header: { resultCode: "0000", resultMsg: "OK" },
      body: {
        items: { item: items },
        pageNo: 1,
        numOfRows: 100,
        totalCount: items.length,
      },
    },
  });
}
describe("PostgreSQL durable capture and recovery", () => {
  const prisma = new PrismaService(
    new ConfigService({ DATABASE_URL: process.env.DATABASE_URL }) as never,
  );
  beforeAll(async () => {
    await prisma.$connect();
  });
  afterAll(async () => {
    await prisma.tourApiCapture.deleteMany({
      where: { contentId: { in: ids } },
    });
    await prisma.tourApiItemRecovery.deleteMany({
      where: { contentId: { in: ids } },
    });
    await prisma.place.deleteMany({ where: { externalId: { in: ids } } });
    await prisma.festival.deleteMany({ where: { externalId: { in: ids } } });
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await prisma.tourApiCapture.deleteMany({
      where: { contentId: { in: ids } },
    });
    await prisma.tourApiItemRecovery.deleteMany({
      where: { contentId: { in: ids } },
    });
    await prisma.place.deleteMany({ where: { externalId: { in: ids } } });
    await prisma.festival.deleteMany({ where: { externalId: { in: ids } } });
  });
  function runtime(job: "tourism" | "festival") {
    const policy = recoveryPolicy();
    policy.currentJob = () => job;
    const recovery = new TourApiRecovery(
      new TourApiRecoveryRepository(prisma),
      policy,
    );
    let calls = 0;
    const client = new TourApiClient(
      new ConfigService({
        TOUR_API_ENDPOINT: "https://example.test",
        TOUR_API_SERVICE_KEY: "test-secret",
      }) as never,
      async (url) => {
        calls++;
        const u = new URL(url);
        const id = u.searchParams.get("contentId");
        const type = job === "tourism" ? "12" : "15";
        const operation = u.pathname.split("/").pop();
        return new Response(
          envelope(
            operation === "detailCommon2"
              ? [
                  {
                    contentid: id,
                    contenttypeid: type,
                    title: "Preserved identity",
                    overview: "Recovered",
                  },
                ]
              : operation === "detailIntro2"
                ? [{ contentid: id, contenttypeid: type }]
                : [],
          ),
          { status: 200 },
        );
      },
      async () => {},
      policy,
      recovery,
    );
    return { policy, recovery, client, calls: () => calls };
  }
  it("tourism destination failure survives repository restart, replays without HTTP, preserves ID and relations", async () => {
    const region = await prisma.tourismRegion.findFirstOrThrow();
    const place = await prisma.place.create({
      data: {
        source: "TOUR_API",
        externalId: ids[0],
        contentTypeId: 12,
        title: "Existing",
        overview: "Good",
        regionId: region.id,
        providerModifiedAt: modified,
        lastSyncedAt: modified,
      },
    });
    const first = runtime("tourism");
    const service = new TourismSyncService(
      first.client,
      prisma,
      first.policy,
      first.recovery,
    );
    const failure = jest
      .spyOn(prisma, "$transaction")
      .mockRejectedValueOnce(new Error("destination failure"));
    await expect(service.enrichPlaceDetails(ids[0])).rejects.toThrow();
    failure.mockRestore();
    expect(first.calls()).toBe(4);
    expect(
      (await prisma.place.findUniqueOrThrow({ where: { id: place.id } }))
        .overview,
    ).toBe("Good");
    const second = runtime("tourism");
    second.policy.ensureCapacity = async () => {
      throw new Error("HTTP budget exhausted");
    };
    await new TourismSyncService(
      second.client,
      prisma,
      second.policy,
      second.recovery,
    ).enrichPlaceDetails(ids[0]);
    expect(second.calls()).toBe(0);
    expect(
      await prisma.place.findUniqueOrThrow({ where: { id: place.id } }),
    ).toMatchObject({
      id: place.id,
      overview: "Recovered",
      detailSourceModifiedAt: modified,
    });
    expect(
      await prisma.tourApiItemRecovery.findMany({
        where: { contentId: ids[0] },
      }),
    ).toHaveLength(1);
    expect(
      (
        await prisma.tourApiItemRecovery.findFirstOrThrow({
          where: { contentId: ids[0] },
        })
      ).state,
    ).toBe("COMPLETE");
  });
  it("festival destination failure replays three operations into the same festival after restart", async () => {
    const festival = await prisma.festival.create({
      data: {
        source: "TOUR_API",
        externalId: ids[1],
        contentTypeId: 15,
        title: "Existing festival",
        eventStartDate: modified,
        eventEndDate: modified,
        providerModifiedAt: modified,
        lastSyncedAt: modified,
      },
    });
    const repository = new FestivalRepository(prisma);
    const first = runtime("festival");
    const failure = jest
      .spyOn(repository, "saveDetailSnapshot")
      .mockRejectedValueOnce(new Error("mapping destination failure"));
    await expect(
      new FestivalSyncService(
        first.client,
        first.client,
        repository,
        first.policy,
        first.recovery,
      ).enrichDetail(festival),
    ).rejects.toThrow();
    failure.mockRestore();
    expect(first.calls()).toBe(3);
    const second = runtime("festival");
    second.policy.ensureCapacity = async () => {
      throw new Error("HTTP budget exhausted");
    };
    await new FestivalSyncService(
      second.client,
      second.client,
      new FestivalRepository(prisma),
      second.policy,
      second.recovery,
    ).enrichDetail(festival);
    expect(second.calls()).toBe(0);
    expect(
      await prisma.festival.findUniqueOrThrow({ where: { id: festival.id } }),
    ).toMatchObject({ id: festival.id, detailSourceModifiedAt: modified });
  });
  it("guards a changed tourism source version and retains good destination data", async () => {
    const region = await prisma.tourismRegion.findFirstOrThrow();
    const place = await prisma.place.create({
      data: {
        source: "TOUR_API",
        externalId: ids[0],
        contentTypeId: 12,
        title: "Existing",
        overview: "Good",
        regionId: region.id,
        providerModifiedAt: modified,
        lastSyncedAt: modified,
      },
    });
    const first = runtime("tourism");
    const original = first.client.getPlaceImages.bind(first.client);
    first.client.getPlaceImages = async (id) => {
      const images = await original(id);
      await prisma.place.update({
        where: { id: place.id },
        data: { providerModifiedAt: new Date("2026-09-02T00:00:00Z") },
      });
      return images;
    };
    await expect(
      new TourismSyncService(
        first.client,
        prisma,
        first.policy,
        first.recovery,
      ).enrichPlaceDetails(ids[0]),
    ).rejects.toThrow();
    expect(
      await prisma.place.findUniqueOrThrow({ where: { id: place.id } }),
    ).toMatchObject({ overview: "Good", detailSourceModifiedAt: null });
    const second = runtime("tourism");
    await new TourismSyncService(
      second.client,
      prisma,
      second.policy,
      second.recovery,
    ).enrichPlaceDetails(ids[0]);
    expect(second.calls()).toBe(4);
  });
  it("persists failure scheduling uniquely and does not delete unresolved evidence in bounded cleanup", async () => {
    const identity = {
      job: "tourism" as const,
      contentId: ids[0],
      sourceVersion: modified.toISOString(),
    };
    const first = runtime("tourism");
    await expect(
      first.recovery.item(identity, [], async () => {
        await first.client.getPlaceCommonDetail(ids[0]);
        throw new Error("mapping");
      }),
    ).rejects.toThrow();
    const second = runtime("tourism");
    await expect(
      second.recovery.item(identity, [], async () => {
        throw new Error("mapping");
      }),
    ).rejects.toThrow();
    const rows = await prisma.tourApiItemRecovery.findMany({ where: identity });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.attemptCount).toBe(2);
    await new TourApiRecoveryRepository(prisma).cleanup(
      new Date(Date.now() + 1000),
      1,
    );
    expect(
      await prisma.tourApiCapture.count({ where: { contentId: ids[0] } }),
    ).toBe(1);
  });
  it("replays a failed list page but preserves checkpoint until an entirely fresh list commits", async () => {
    const now = new Date();
    const baseline = await prisma.tourismSyncRun.create({
      data: {
        provider: "TOUR_API",
        jobType: "FULL",
        status: "SUCCEEDED",
        startedAt: now,
        finishedAt: now,
        checkpointAt: now,
      },
    });
    const policy = recoveryPolicy();
    const recovery = new TourApiRecovery(
      new TourApiRecoveryRepository(prisma),
      policy,
    );
    let calls = 0;
    const client = new TourApiClient(
      new ConfigService({
        TOUR_API_ENDPOINT: "https://example.test",
        TOUR_API_SERVICE_KEY: "test-secret",
      }) as never,
      async () => {
        calls++;
        return new Response(envelope([]));
      },
      async () => {},
      policy,
      recovery,
    );
    const service = new TourismSyncService(client, prisma, policy, recovery);
    const fault = jest
      .spyOn(prisma, "$transaction")
      .mockRejectedValueOnce(new Error("upsert failed"));
    await expect(service.incrementalSync(now)).rejects.toThrow();
    fault.mockRestore();
    expect(calls).toBe(1);
    policy.request = async (work) => {
      if (calls >= 34)
        throw new TourApiBudgetDeferredError("TOUR_API_DAILY_LIMIT");
      return work();
    };
    await expect(service.incrementalSync(now)).rejects.toThrow(
      TourApiBudgetDeferredError,
    );
    expect(calls).toBe(34);
    const latest = await prisma.tourismSyncRun.findFirstOrThrow({
      where: {
        provider: "TOUR_API",
        jobType: { in: ["FULL", "INCREMENTAL"] },
        status: "SUCCEEDED",
      },
      orderBy: { finishedAt: "desc" },
    });
    expect(latest.id).toBe(baseline.id);
    expect(latest.checkpointAt).toEqual(now);
    policy.request = async (work) => work();
    await service.incrementalSync(now);
    expect(calls).toBe(68);
    await prisma.tourismSyncRun.deleteMany({
      where: {
        startedAt: { gte: now },
        provider: "TOUR_API",
        jobType: { in: ["FULL", "INCREMENTAL"] },
      },
    });
  });
});
