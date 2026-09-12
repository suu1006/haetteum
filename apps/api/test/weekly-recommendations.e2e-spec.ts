import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals";
import { ConfigService } from "@nestjs/config";
import type { ApiEnvironment } from "../src/config/environment.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { WeeklyRecommendationsService } from "../src/weekly-recommendations/weekly-recommendations.service.js";
import { WeeklyThumbnailService } from "../src/weekly-recommendations/weekly-thumbnail.service.js";

// This suite must never use the developer's ordinary DATABASE_URL.
const databaseUrl = process.env.DATABASE_URL;
const describeIsolated =
  databaseUrl &&
  (new URL(databaseUrl).pathname === "/weekly_test" ||
    new URL(databaseUrl).pathname.startsWith("/haetteum_tourapi_test_"))
    ? describe
    : describe.skip;
const week = new Date("2099-01-05T00:00:00Z");
const previousWeek = new Date("2098-12-29T00:00:00Z");
const now = new Date("2099-01-05T01:00:00Z");

describeIsolated("Weekly publication with PostgreSQL", () => {
  const config = new ConfigService<ApiEnvironment, true>({
    DATABASE_URL: databaseUrl,
  });
  const prisma = new PrismaService(config);
  const otherPrisma = new PrismaService(config);
  const service = (client: PrismaService) =>
    new WeeklyRecommendationsService(client, new WeeklyThumbnailService(), () =>
      Promise.resolve(),
    );
  let editionId: string;
  let previousEditionId: string;
  let placeIds: string[] = [];
  let regionIds: string[] = [];
  let triggerName: string | undefined;
  const heldToken = randomUUID();

  beforeAll(async () => {
    await prisma.$connect();
    await otherPrisma.$connect();
  });
  afterAll(async () => {
    await prisma.$disconnect();
    await otherPrisma.$disconnect();
  });
  beforeEach(async () => {
    placeIds = [];
    regionIds = [];
    const suffix = randomUUID()
      .replace(/[^a-f]/g, "")
      .slice(0, 12);
    for (let i = 0; i < 5; i++) {
      const region = await prisma.tourismRegion.create({
        data: {
          slug: `test-${suffix}-${String.fromCharCode(97 + i)}`,
          name: `테스트 지역 ${i}`,
          providerCode: randomUUID().slice(0, 8),
          displayOrder: 100 + i,
        },
      });
      regionIds.push(region.id);
    }
    const edition = await prisma.weeklyRecommendationEdition.create({
      data: { week, status: "VERIFIED", verifiedAt: now },
    });
    editionId = edition.id;
    const previous = await prisma.weeklyRecommendationEdition.create({
      data: {
        week: previousWeek,
        status: "PUBLISHED",
        publishedAt: previousWeek,
      },
    });
    previousEditionId = previous.id;
    // Five candidates per region/type keep this lease test independent of hash ordering.
    for (let i = 0; i < 50; i++) {
      const region = await prisma.tourismRegion.findUniqueOrThrow({
        where: { id: regionIds[i % 5] },
      });
      const place = await prisma.place.create({
        data: {
          source: "TOUR_API",
          externalId: randomUUID(),
          contentTypeId: 12,
          regionId: region.id,
          title: `검증 장소 ${i}`,
          address1: "서울 테스트 주소",
          latitude: 37 + i / 1000,
          longitude: 127 + i / 1000,
          category1: i % 2 ? "A01" : "A02",
          lastSyncedAt: now,
          providerModifiedAt: now,
        },
      });
      placeIds.push(place.id);
      const snapshot = {
        id: place.id,
        title: place.title,
        region: region.slug,
        district: null,
        address: place.address1,
        latitude: 37 + i / 1000,
        longitude: 127 + i / 1000,
        primaryImageUrl: `https://cdn.example.com/uploads/weekly/${i.toString().padStart(64, "0")}.webp`,
        imageCopyrightType: "Type1",
      };
      for (const id of [editionId, previousEditionId]) {
        await prisma.weeklyRecommendationCandidate.create({
          data: {
            editionId: id,
            placeId: place.id,
            status: "PASSED",
            kind: i % 2 ? "nature" : "culture",
            snapshot,
            checkedAt: now,
            position: id === previousEditionId && i < 20 ? i : null,
          },
        });
      }
    }
  });
  afterEach(async () => {
    try {
      if (triggerName) {
        await prisma.$executeRawUnsafe(
          `DROP TRIGGER IF EXISTS ${triggerName} ON weekly_recommendation_editions`,
        );
        await prisma.$executeRawUnsafe(
          `DROP FUNCTION IF EXISTS ${triggerName}()`,
        );
        await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS ${triggerName}`);
        triggerName = undefined;
      }
      await prisma.weeklyRecommendationLease.deleteMany({
        where: { name: "weekly-recommendations", token: heldToken },
      });
      await prisma.weeklyRecommendationEdition.deleteMany({
        where: { id: { in: [editionId, previousEditionId].filter(Boolean) } },
      });
      await prisma.place.deleteMany({ where: { id: { in: placeIds } } });
      await prisma.tourismRegion.deleteMany({
        where: { id: { in: regionIds } },
      });
    } finally {
      triggerName = undefined;
    }
  });

  // A narrowly scoped trigger records actual committed publications, or injects a
  // PostgreSQL failure after positions are written to prove transaction rollback.
  async function observePublication(fail: boolean) {
    triggerName = `weekly_test_${randomUUID().replaceAll("-", "")}`;
    await prisma.$executeRawUnsafe(
      `CREATE TABLE ${triggerName} (edition_id uuid NOT NULL)`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION ${triggerName}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id = '${editionId}'::uuid AND NEW.status = 'PUBLISHED' THEN ${fail ? "RAISE EXCEPTION 'TEST_PUBLICATION_FAILURE';" : `INSERT INTO ${triggerName}(edition_id) VALUES (NEW.id); PERFORM pg_sleep(0.1);`} END IF; RETURN NEW; END $$`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER ${triggerName} BEFORE UPDATE ON weekly_recommendation_editions FOR EACH ROW EXECUTE FUNCTION ${triggerName}()`,
    );
  }

  it("keeps the previous published edition when new coverage fails", async () => {
    await prisma.weeklyRecommendationCandidate.updateMany({
      where: { editionId },
      data: { kind: "nature" },
    });
    const before = await service(prisma).current(now);
    await expect(service(prisma).publish(now)).rejects.toThrow(
      "PUBLICATION_COVERAGE_FAILED",
    );
    expect(await service(prisma).current(now)).toEqual(before);
    expect(before.week).toBe("2098-12-29");
    expect(before.items).toHaveLength(20);
    expect(
      await prisma.weeklyRecommendationCandidate.count({
        where: { editionId, position: { not: null } },
      }),
    ).toBe(0);
  });

  it("rolls back all positions when PostgreSQL rejects publication", async () => {
    await observePublication(true);
    await expect(service(prisma).publish(now)).rejects.toThrow();
    expect(
      await prisma.weeklyRecommendationCandidate.count({
        where: { editionId, position: { not: null } },
      }),
    ).toBe(0);
    expect(
      await prisma.weeklyRecommendationEdition.findUniqueOrThrow({
        where: { id: editionId },
      }),
    ).toMatchObject({ status: "VERIFIED", publishedAt: null });
    expect((await service(prisma).current(now)).week).toBe("2098-12-29");
  });

  it("publishes once across concurrent database clients and remains idempotent", async () => {
    await observePublication(false);
    await Promise.all([
      service(prisma).publish(now),
      service(otherPrisma).publish(now),
    ]);
    const positions = await prisma.weeklyRecommendationCandidate.findMany({
      where: { editionId, position: { not: null } },
      orderBy: { position: "asc" },
      select: { placeId: true, position: true },
    });
    expect(positions.map((p) => p.position)).toEqual(
      Array.from({ length: 20 }, (_, i) => i),
    );
    expect((await service(prisma).current(now)).week).toBe("2099-01-05");
    expect((await service(prisma).current(now)).items).toHaveLength(20);
    await service(otherPrisma).publish(new Date(now.getTime() + 60_000));
    expect(
      await prisma.weeklyRecommendationCandidate.findMany({
        where: { editionId, position: { not: null } },
        orderBy: { position: "asc" },
        select: { placeId: true, position: true },
      }),
    ).toEqual(positions);
    const commits = await prisma.$queryRawUnsafe<{ edition_id: string }[]>(
      `SELECT edition_id FROM ${triggerName!}`,
    );
    expect(commits).toEqual([{ edition_id: editionId }]);
    expect(
      (
        await prisma.weeklyRecommendationEdition.findUniqueOrThrow({
          where: { id: editionId },
        })
      ).publishedAt,
    ).toEqual(now);
  });

  it("respects another worker's live lease and recovers its expired lease", async () => {
    await prisma.weeklyRecommendationLease.create({
      data: {
        name: "weekly-recommendations",
        token: heldToken,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    await Promise.all([
      service(prisma).publish(now),
      service(otherPrisma).publish(now),
    ]);
    expect(
      (
        await prisma.weeklyRecommendationEdition.findUniqueOrThrow({
          where: { id: editionId },
        })
      ).status,
    ).toBe("VERIFIED");
    expect(
      (
        await prisma.weeklyRecommendationLease.findUniqueOrThrow({
          where: { name: "weekly-recommendations" },
        })
      ).token,
    ).toBe(heldToken);
    await prisma.weeklyRecommendationLease.update({
      where: { name: "weekly-recommendations" },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    await service(otherPrisma).publish(now);
    expect(
      (
        await prisma.weeklyRecommendationEdition.findUniqueOrThrow({
          where: { id: editionId },
        })
      ).status,
    ).toBe("PUBLISHED");
    expect(
      await prisma.weeklyRecommendationLease.findUnique({
        where: { name: "weekly-recommendations" },
      }),
    ).toBeNull();
  });
});
