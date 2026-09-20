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
    const recoveryRepository = new TourApiRecoveryRepository(prisma);
    const recovery = new TourApiRecovery(recoveryRepository, policy);
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
    return { policy, recovery, recoveryRepository, client, calls: () => calls };
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
    const recoveryRepository = new TourApiRecoveryRepository(prisma);
    const recovery = new TourApiRecovery(recoveryRepository, policy);
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
  async function seedDestination(
    job: "tourism" | "festival",
    id: string,
    version = modified,
    complete = false,
  ) {
    const common = {
      source: "TOUR_API",
      externalId: id,
      title: "Recovery identity",
      providerModifiedAt: version,
      lastSyncedAt: version,
      ...(complete ? { detailSourceModifiedAt: version } : {}),
    };
    if (job === "tourism") {
      const region = await prisma.tourismRegion.findFirstOrThrow();
      return prisma.place.create({
        data: { ...common, contentTypeId: 12, regionId: region.id },
      });
    }
    return prisma.festival.create({
      data: {
        ...common,
        contentTypeId: 15,
        eventStartDate: version,
        eventEndDate: version,
      },
    });
  }
  async function seedFailure(
    job: "tourism" | "festival",
    id: string,
    version = modified,
    state = "FAILED",
  ) {
    const identity = {
      job,
      contentId: id,
      sourceVersion: version.toISOString(),
    };
    await new TourApiRecoveryRepository(prisma).saveFailure({
      ...identity,
      stage: "PERSISTENCE",
      code: "PROCESSING_FAILED",
      attemptCount: state === "QUARANTINED" ? 3 : 1,
      nextAttemptAt: new Date(0),
      state,
      updatedAt: new Date(0),
    });
    return identity;
  }
  describe.each(["tourism", "festival"] as const)(
    "%s version-preserving recovery",
    (job) => {
      it("cannot use a historical failure to select the quarantined current version", async () => {
        const current = new Date("2026-09-02T00:00:00Z");
        await seedDestination(job, ids[0], current);
        await seedFailure(job, ids[0]);
        await seedFailure(job, ids[0], current, "QUARANTINED");
        expect(await runtime(job).recovery.failedItems(job, ids, 1)).toEqual(
          [],
        );
      });
      it("does not spend replay slots on historical failures when current destination is complete", async () => {
        await seedDestination(
          job,
          ids[0],
          new Date("2026-09-02T00:00:00Z"),
          true,
        );
        await seedFailure(job, ids[0]);
        expect(await runtime(job).recovery.failedItems(job, ids, 1)).toEqual(
          [],
        );
      });
      it("selects current actionable identities after obsolete failures without spending the limit", async () => {
        await seedDestination(job, ids[0], new Date("2026-09-02T00:00:00Z"));
        await seedFailure(job, ids[0]);
        await seedDestination(job, ids[1]);
        const active = await seedFailure(job, ids[1]);
        expect(await runtime(job).recovery.failedItems(job, ids, 1)).toEqual([
          active,
        ]);
      });

      it("reconciles completed current failures without spending an actionable slot", async () => {
        await seedDestination(job, ids[0], modified, true);
        const completed = await seedFailure(job, ids[0]);
        await seedDestination(job, ids[1]);
        const active = await seedFailure(job, ids[1]);
        const r = runtime(job);
        expect(await r.recovery.failedItems(job, ids, 1)).toEqual([active]);
        expect((await r.recoveryRepository.failure(completed))?.state).toBe(
          "COMPLETE",
        );
      });
      it("requeues only the selected current identity within the execution limit", async () => {
        await seedDestination(job, ids[0]);
        await seedDestination(job, ids[1]);
        const first = await seedFailure(job, ids[0], modified, "QUARANTINED");
        const second = await seedFailure(job, ids[1], modified, "QUARANTINED");
        const r = runtime(job);
        expect(await r.recovery.failedItems(job, ids, 1, true)).toEqual([
          first,
        ]);
        expect((await r.recoveryRepository.failure(first))?.state).toBe(
          "FAILED",
        );
        expect((await r.recoveryRepository.failure(second))?.state).toBe(
          "QUARANTINED",
        );
      });
      it.each(["version", "quarantine"] as const)(
        "revalidates selected %s before allowing HTTP",
        async (change) => {
          const destination = await seedDestination(job, ids[0]);
          const identity = await seedFailure(job, ids[0]);
          const r = runtime(job);
          expect(await r.recovery.failedItems(job, ids, 1)).toEqual([identity]);
          if (change === "quarantine")
            await seedFailure(job, ids[0], modified, "QUARANTINED");
          else if (job === "tourism")
            await prisma.place.update({
              where: { id: destination.id },
              data: { providerModifiedAt: new Date("2026-09-02T00:00:00Z") },
            });
          else
            await prisma.festival.update({
              where: { id: destination.id },
              data: { providerModifiedAt: new Date("2026-09-02T00:00:00Z") },
            });
          const work =
            job === "tourism"
              ? new TourismSyncService(
                  r.client,
                  prisma,
                  r.policy,
                  r.recovery,
                ).enrichPlaceDetails(identity.contentId, identity.sourceVersion)
              : new FestivalSyncService(
                  r.client,
                  r.client,
                  new FestivalRepository(prisma),
                  r.policy,
                  r.recovery,
                ).enrichContentId(identity.contentId, identity.sourceVersion);
          await expect(work).rejects.toThrow(
            "TOUR_API_RECOVERY_SELECTION_CHANGED",
          );
          expect(r.calls()).toBe(0);
        },
      );
      it.each(["complete", "resolve"] as const)(
        "reconciles committed destination after %s storage failure with zero HTTP",
        async (faultPoint) => {
          const destination = await seedDestination(job, ids[0]);
          const identity = await seedFailure(job, ids[0]);
          const first = runtime(job);
          const fault = jest
            .spyOn(first.recoveryRepository, faultPoint)
            .mockRejectedValueOnce(new Error("completion storage unavailable"));
          const execute = (r: ReturnType<typeof runtime>) =>
            job === "tourism"
              ? new TourismSyncService(
                  r.client,
                  prisma,
                  r.policy,
                  r.recovery,
                ).enrichPlaceDetails(ids[0])
              : new FestivalSyncService(
                  r.client,
                  r.client,
                  new FestivalRepository(prisma),
                  r.policy,
                  r.recovery,
                ).enrichContentId(ids[0]);
          await expect(execute(first)).rejects.toThrow(
            "TOUR_API_RECOVERY_STORAGE_FAILED",
          );
          fault.mockRestore();
          const second = runtime(job);
          await execute(second);
          expect(second.calls()).toBe(0);
          const saved =
            job === "tourism"
              ? await prisma.place.findUniqueOrThrow({
                  where: { id: destination.id },
                })
              : await prisma.festival.findUniqueOrThrow({
                  where: { id: destination.id },
                });
          expect(saved).toMatchObject({
            id: destination.id,
            detailSourceModifiedAt: modified,
          });
          expect(
            (await second.recoveryRepository.failure(identity))?.state,
          ).toBe("COMPLETE");
          expect(
            await prisma.tourApiCapture.count({
              where: { job, contentId: ids[0], state: { not: "COMPLETE" } },
            }),
          ).toBe(0);
          const before = await prisma.tourApiCapture.count({
            where: { job, contentId: ids[0] },
          });
          expect(before).toBe(job === "tourism" ? 4 : 3);
          await second.recoveryRepository.cleanup(
            new Date(Date.now() + 1000),
            1000,
          );
          expect(
            await prisma.tourApiCapture.count({
              where: { job, contentId: ids[0] },
            }),
          ).toBe(0);
        },
      );
    },
  );
});
