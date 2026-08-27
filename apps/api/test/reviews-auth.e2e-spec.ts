import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Server } from "node:http";

import { ProblemDetailsSchema, ReviewItemSchema } from "@haetteum/contracts";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import request from "supertest";

import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/configure-app.js";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

const WEB_ORIGIN = "http://localhost:3000";
const MIGRATIONS = [
  "../prisma/migrations/20260821000000_add_tourism_place_foundation/migration.sql",
  "../prisma/migrations/20260822000000_add_tourism_database_comments/migration.sql",
  "../prisma/migrations/20260824135934_scope_tourism_district_provider_code/migration.sql",
  "../prisma/migrations/20260825000000_add_festivals/migration.sql",
  "../prisma/migrations/20260825170000_add_place_rankings/migration.sql",
  "../prisma/migrations/20260826130000_add_users_and_reviews/migration.sql",
  "../prisma/migrations/20260826150000_add_place_details/migration.sql",
  "../prisma/migrations/20260826190000_add_kakao_auth_sessions/migration.sql",
] as const;

type AuthenticatedTestUser = {
  id: string;
  sessionToken: string;
};

function getHttpServer(application: INestApplication): Server {
  return application.getHttpServer() as Server;
}

describe("Reviews API session ownership (e2e)", () => {
  let app: INestApplication | undefined;
  let prisma: PrismaClient | undefined;
  let adminPool: Pool | undefined;
  let schemaName: string | undefined;
  let placeId: string | undefined;

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required for E2E tests");

    schemaName = `reviews_auth_e2e_${randomUUID().replaceAll("-", "")}`;
    adminPool = new Pool({ connectionString: databaseUrl });
    const client = await adminPool.connect();
    try {
      await client.query(`CREATE SCHEMA "${schemaName}"`);
      await client.query(`SET search_path TO "${schemaName}"`);
      for (const migrationPath of MIGRATIONS) {
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

    const region = await prisma.tourismRegion.create({
      data: {
        slug: "reviews-auth-e2e",
        name: "인증 후기 테스트 지역",
        providerCode: "98",
        displayOrder: 98,
        isActive: true,
      },
    });
    const district = await prisma.tourismDistrict.create({
      data: {
        regionId: region.id,
        providerCode: "998",
        name: "인증 후기 테스트 시군구",
        isActive: true,
      },
    });
    const place = await prisma.place.create({
      data: {
        source: "REVIEWS_AUTH_E2E",
        externalId: `reviews-auth-e2e-${randomUUID()}`,
        contentTypeId: 12,
        regionId: region.id,
        districtId: district.id,
        title: "인증 후기 테스트 장소",
        primaryImageUrl: "https://example.test/reviews-auth-e2e.jpg",
        providerModifiedAt: new Date(),
        lastSyncedAt: new Date(),
        isVisible: true,
      },
      select: { id: true },
    });
    placeId = place.id;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  beforeEach(async () => {
    const database = requirePrisma(prisma);
    await database.review.deleteMany();
    await database.session.deleteMany();
    await database.user.deleteMany({ where: { provider: "KAKAO" } });
  });

  afterAll(async () => {
    const appToClose = app;
    const prismaToDisconnect = prisma;
    const poolToClose = adminPool;
    const schemaToDrop = schemaName;

    app = undefined;
    prisma = undefined;
    adminPool = undefined;
    schemaName = undefined;
    placeId = undefined;

    try {
      await appToClose?.close();
    } finally {
      try {
        await prismaToDisconnect?.$disconnect();
      } finally {
        try {
          if (poolToClose && schemaToDrop) {
            await poolToClose.query(`DROP SCHEMA "${schemaToDrop}" CASCADE`);
          }
        } finally {
          await poolToClose?.end();
        }
      }
    }
  });

  it("requires a session for safe reads and the exact web Origin for review mutations", async () => {
    const application = requireApp(app);
    const database = requirePrisma(prisma);
    const owner = await createAuthenticatedKakaoUser("작성자");
    const reviewPlaceId = requirePlaceId(placeId);

    const unauthenticated = await request(getHttpServer(application))
      .get("/api/v1/reviews/mine")
      .expect(401)
      .expect("content-type", /application\/problem\+json/);
    expect(
      ProblemDetailsSchema.parse(unauthenticated.body as unknown).code,
    ).toBe("UNAUTHENTICATED");

    const unauthenticatedMutation = await request(getHttpServer(application))
      .post("/api/v1/reviews")
      .set("Origin", WEB_ORIGIN)
      .send({
        placeId: reviewPlaceId,
        rating: 5,
        content: "세션 없이 작성한 후기",
      })
      .expect(401)
      .expect("content-type", /application\/problem\+json/);
    expect(
      ProblemDetailsSchema.parse(unauthenticatedMutation.body as unknown).code,
    ).toBe("UNAUTHENTICATED");
    expect(await database.review.count()).toBe(0);

    for (const origin of [undefined, "https://untrusted.example"]) {
      const mutation = request(getHttpServer(application))
        .post("/api/v1/reviews")
        .set("Cookie", sessionCookie(owner));
      if (origin) mutation.set("Origin", origin);

      const response = await mutation
        .send({
          placeId: reviewPlaceId,
          rating: 5,
          content: "출처 검증을 위한 후기",
        })
        .expect(403)
        .expect("content-type", /application\/problem\+json/);
      expect(ProblemDetailsSchema.parse(response.body as unknown).code).toBe(
        "FORBIDDEN_ORIGIN",
      );
    }

    await request(getHttpServer(application))
      .post("/api/v1/reviews")
      .set("Cookie", sessionCookie(owner))
      .set("Origin", WEB_ORIGIN)
      .send({
        placeId: reviewPlaceId,
        rating: 5,
        content: "신뢰된 출처의 후기",
      })
      .expect(201);
  });

  it("hides another session user's review behind the same 404 and preserves it", async () => {
    const application = requireApp(app);
    const database = requirePrisma(prisma);
    const owner = await createAuthenticatedKakaoUser("작성자");
    const otherUser = await createAuthenticatedKakaoUser("다른 사용자");
    const reviewPlaceId = requirePlaceId(placeId);
    const created = await request(getHttpServer(application))
      .post("/api/v1/reviews")
      .set("Cookie", sessionCookie(owner))
      .set("Origin", WEB_ORIGIN)
      .send({
        placeId: reviewPlaceId,
        rating: 5,
        content: "작성자만 볼 수 있는 후기",
      })
      .expect(201);
    const review = ReviewItemSchema.parse(created.body as unknown);

    const foreignRead = await request(getHttpServer(application))
      .get(`/api/v1/reviews/${review.id}`)
      .set("Cookie", sessionCookie(otherUser))
      .expect(404)
      .expect("content-type", /application\/problem\+json/);
    const missingRead = await request(getHttpServer(application))
      .get(`/api/v1/reviews/${randomUUID()}`)
      .set("Cookie", sessionCookie(otherUser))
      .expect(404)
      .expect("content-type", /application\/problem\+json/);
    expect(ProblemDetailsSchema.parse(foreignRead.body as unknown).code).toBe(
      ProblemDetailsSchema.parse(missingRead.body as unknown).code,
    );

    const foreignUpdate = await request(getHttpServer(application))
      .patch(`/api/v1/reviews/${review.id}`)
      .set("Cookie", sessionCookie(otherUser))
      .set("Origin", WEB_ORIGIN)
      .send({ rating: 1, content: "권한 없는 수정" })
      .expect(404)
      .expect("content-type", /application\/problem\+json/);
    expect(ProblemDetailsSchema.parse(foreignUpdate.body as unknown).code).toBe(
      "REVIEW_NOT_FOUND",
    );
    await expect(
      database.review.findUniqueOrThrow({ where: { id: review.id } }),
    ).resolves.toMatchObject({
      userId: owner.id,
      rating: 5,
      content: "작성자만 볼 수 있는 후기",
    });
  });

  async function createAuthenticatedKakaoUser(
    displayName: string,
  ): Promise<AuthenticatedTestUser> {
    const database = requirePrisma(prisma);
    const user = await database.user.create({
      data: {
        provider: "KAKAO",
        providerUserId: `reviews-auth-${randomUUID()}`,
        displayName,
      },
      select: { id: true },
    });
    const sessionToken = randomUUID();
    const now = new Date();
    await database.session.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(sessionToken).digest("hex"),
        expiresAt: new Date(now.getTime() + 60 * 60 * 1_000),
        lastSeenAt: now,
      },
    });

    return { id: user.id, sessionToken };
  }
});

function sessionCookie(user: AuthenticatedTestUser): string {
  return `haetteum_session=${user.sessionToken}`;
}

function requireApp(app: INestApplication | undefined): INestApplication {
  if (!app) throw new Error("E2E application is not initialized");
  return app;
}

function requirePrisma(prisma: PrismaClient | undefined): PrismaClient {
  if (!prisma) throw new Error("E2E Prisma client is not initialized");
  return prisma;
}

function requirePlaceId(placeId: string | undefined): string {
  if (!placeId) throw new Error("E2E review place is not initialized");
  return placeId;
}
