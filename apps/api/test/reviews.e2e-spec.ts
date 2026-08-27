import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Server } from "node:http";

import {
  MyReviewsResponseSchema,
  ProblemDetailsSchema,
  ReviewItemSchema,
} from "@haetteum/contracts";
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

describe("Reviews API PostgreSQL integration (e2e)", () => {
  let app: INestApplication | undefined;
  let prisma: PrismaClient | undefined;
  let adminPool: Pool | undefined;
  let schemaName: string | undefined;
  let placeId: string | undefined;
  let currentUser: AuthenticatedTestUser | undefined;

  beforeEach(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required for E2E tests");

    schemaName = `reviews_e2e_${randomUUID().replaceAll("-", "")}`;
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

    const now = new Date();
    const region = await prisma.tourismRegion.create({
      data: {
        slug: "reviews-e2e",
        name: "리뷰 테스트 지역",
        providerCode: "99",
        displayOrder: 99,
        isActive: true,
      },
    });
    const district = await prisma.tourismDistrict.create({
      data: {
        regionId: region.id,
        providerCode: "999",
        name: "리뷰 테스트 시군구",
        isActive: true,
      },
    });
    const place = await prisma.place.create({
      data: {
        source: "REVIEWS_E2E",
        externalId: `reviews-e2e-${randomUUID()}`,
        contentTypeId: 12,
        regionId: region.id,
        districtId: district.id,
        title: "리뷰 테스트 장소",
        primaryImageUrl: "https://example.test/reviews-e2e.jpg",
        providerModifiedAt: now,
        lastSyncedAt: now,
        isVisible: true,
      },
      select: { id: true },
    });
    placeId = place.id;

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    currentUser = await createAuthenticatedKakaoUser(prisma, "리뷰 E2E 작성자");
  });

  afterEach(async () => {
    const appToClose = app;
    const prismaToDisconnect = prisma;
    const poolToClose = adminPool;
    const schemaToDrop = schemaName;

    app = undefined;
    prisma = undefined;
    adminPool = undefined;
    schemaName = undefined;
    placeId = undefined;
    currentUser = undefined;

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

  it("uses a per-test KAKAO user with a valid server session", async () => {
    const database = requirePrisma(prisma);
    const user = requireCurrentUser(currentUser);

    await expect(
      database.session.findFirst({
        where: {
          userId: user.id,
          tokenHash: createHash("sha256")
            .update(user.sessionToken)
            .digest("hex"),
        },
      }),
    ).resolves.toMatchObject({ userId: user.id });
  });

  it("persists a created review, returns it from mine, and persists its update", async () => {
    const application = requireApp(app);
    const database = requirePrisma(prisma);
    const reviewPlaceId = requirePlaceId(placeId);

    const createdResponse = await request(getHttpServer(application))
      .post("/api/v1/reviews")
      .set("Cookie", sessionCookie(currentUser))
      .set("Origin", WEB_ORIGIN)
      .send({
        placeId: reviewPlaceId,
        rating: 5,
        content: "처음 작성한 후기",
      })
      .expect(201);
    const created = ReviewItemSchema.parse(createdResponse.body as unknown);
    expect(created).toMatchObject({
      placeId: reviewPlaceId,
      placeTitle: "리뷰 테스트 장소",
      location: "리뷰 테스트 지역 리뷰 테스트 시군구",
      rating: 5,
      content: "처음 작성한 후기",
      primaryImageUrl: "https://example.test/reviews-e2e.jpg",
    });

    const mineAfterCreate = await request(getHttpServer(application))
      .get("/api/v1/reviews/mine")
      .set("Cookie", sessionCookie(currentUser))
      .expect(200);
    const createdMine = MyReviewsResponseSchema.parse(
      mineAfterCreate.body as unknown,
    );
    expect(createdMine.items[0]?.content).toBe("처음 작성한 후기");
    expect(createdMine).toEqual({
      items: [expect.objectContaining({ id: created.id })],
    });

    const updatedResponse = await request(getHttpServer(application))
      .patch(`/api/v1/reviews/${created.id}`)
      .set("Cookie", sessionCookie(currentUser))
      .set("Origin", WEB_ORIGIN)
      .send({ rating: 4, content: "수정한 후기" })
      .expect(200);
    const updated = ReviewItemSchema.parse(updatedResponse.body as unknown);
    expect(updated).toMatchObject({
      id: created.id,
      placeId: reviewPlaceId,
      rating: 4,
      content: "수정한 후기",
    });

    const mineAfterUpdate = await request(getHttpServer(application))
      .get("/api/v1/reviews/mine")
      .set("Cookie", sessionCookie(currentUser))
      .expect(200);
    const updatedMine = MyReviewsResponseSchema.parse(
      mineAfterUpdate.body as unknown,
    );
    expect(updatedMine.items[0]?.content).toBe("수정한 후기");
    expect(updatedMine).toEqual({
      items: [expect.objectContaining({ id: created.id, rating: 4 })],
    });

    const persisted = await database.review.findUniqueOrThrow({
      where: { id: created.id },
    });
    expect(persisted).toMatchObject({
      id: created.id,
      userId: requireCurrentUser(currentUser).id,
      placeId: reviewPlaceId,
      rating: 4,
      content: "수정한 후기",
    });
    expect(updated.updatedAt).toBe(persisted.updatedAt.toISOString());
  });

  it("rejects a second review for the same place and leaves one database row", async () => {
    const application = requireApp(app);
    const database = requirePrisma(prisma);
    const reviewPlaceId = requirePlaceId(placeId);
    const input = {
      placeId: reviewPlaceId,
      rating: 5,
      content: "중복 검증을 위한 후기",
    };

    await request(getHttpServer(application))
      .post("/api/v1/reviews")
      .set("Cookie", sessionCookie(currentUser))
      .set("Origin", WEB_ORIGIN)
      .send(input)
      .expect(201);

    const duplicate = await request(getHttpServer(application))
      .post("/api/v1/reviews")
      .set("Cookie", sessionCookie(currentUser))
      .set("Origin", WEB_ORIGIN)
      .send(input)
      .expect(409)
      .expect("content-type", /application\/problem\+json/);
    expect(ProblemDetailsSchema.parse(duplicate.body as unknown).code).toBe(
      "REVIEW_ALREADY_EXISTS",
    );
    expect(
      await database.review.count({
        where: {
          userId: requireCurrentUser(currentUser).id,
          placeId: reviewPlaceId,
        },
      }),
    ).toBe(1);
  });

  it("reports a missing place without creating a review", async () => {
    const application = requireApp(app);
    const database = requirePrisma(prisma);

    const missing = await request(getHttpServer(application))
      .post("/api/v1/reviews")
      .set("Cookie", sessionCookie(currentUser))
      .set("Origin", WEB_ORIGIN)
      .send({
        placeId: randomUUID(),
        rating: 5,
        content: "없는 장소의 후기",
      })
      .expect(404)
      .expect("content-type", /application\/problem\+json/);
    expect(ProblemDetailsSchema.parse(missing.body as unknown).code).toBe(
      "PLACE_NOT_FOUND",
    );
    expect(await database.review.count()).toBe(0);
  });

  it("does not expose or update another user's review", async () => {
    const application = requireApp(app);
    const database = requirePrisma(prisma);
    const reviewPlaceId = requirePlaceId(placeId);
    const foreignUser = await database.user.create({
      data: {
        id: randomUUID(),
        provider: "E2E",
        providerUserId: `foreign-${randomUUID()}`,
        displayName: "다른 여행자",
      },
      select: { id: true },
    });
    const foreignReview = await database.review.create({
      data: {
        userId: foreignUser.id,
        placeId: reviewPlaceId,
        rating: 3,
        content: "다른 사용자의 후기",
      },
    });

    const getResponse = await request(getHttpServer(application))
      .get(`/api/v1/reviews/${foreignReview.id}`)
      .set("Cookie", sessionCookie(currentUser))
      .expect(404)
      .expect("content-type", /application\/problem\+json/);
    expect(ProblemDetailsSchema.parse(getResponse.body as unknown).code).toBe(
      "REVIEW_NOT_FOUND",
    );

    const patchResponse = await request(getHttpServer(application))
      .patch(`/api/v1/reviews/${foreignReview.id}`)
      .set("Cookie", sessionCookie(currentUser))
      .set("Origin", WEB_ORIGIN)
      .send({ rating: 1, content: "권한 없는 수정" })
      .expect(404)
      .expect("content-type", /application\/problem\+json/);
    expect(ProblemDetailsSchema.parse(patchResponse.body as unknown).code).toBe(
      "REVIEW_NOT_FOUND",
    );
    await expect(
      database.review.findUniqueOrThrow({ where: { id: foreignReview.id } }),
    ).resolves.toMatchObject({ rating: 3, content: "다른 사용자의 후기" });
  });

  it("returns Problem Details for forbidden patch fields and non-integer ratings", async () => {
    const application = requireApp(app);
    const reviewPlaceId = requirePlaceId(placeId);
    const created = await request(getHttpServer(application))
      .post("/api/v1/reviews")
      .set("Cookie", sessionCookie(currentUser))
      .set("Origin", WEB_ORIGIN)
      .send({
        placeId: reviewPlaceId,
        rating: 5,
        content: "수정 유효성 검증용 후기",
      })
      .expect(201);
    const review = ReviewItemSchema.parse(created.body as unknown);

    const responses = await Promise.all([
      request(getHttpServer(application))
        .patch(`/api/v1/reviews/${review.id}`)
        .set("Cookie", sessionCookie(currentUser))
        .set("Origin", WEB_ORIGIN)
        .send({
          placeId: randomUUID(),
          rating: 4,
          content: "장소 변경은 허용되지 않습니다.",
        })
        .expect(400)
        .expect("content-type", /application\/problem\+json/),
      request(getHttpServer(application))
        .patch(`/api/v1/reviews/${review.id}`)
        .set("Cookie", sessionCookie(currentUser))
        .set("Origin", WEB_ORIGIN)
        .send({ rating: 4.5, content: "정수가 아닌 별점" })
        .expect(400)
        .expect("content-type", /application\/problem\+json/),
    ]);

    for (const response of responses) {
      const problem = ProblemDetailsSchema.parse(response.body as unknown);
      expect(problem).toMatchObject({
        status: 400,
        code: "VALIDATION_ERROR",
      });
      expect(problem.errors).toEqual(expect.any(Array));
    }
  });
});

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

async function createAuthenticatedKakaoUser(
  prisma: PrismaClient,
  displayName: string,
): Promise<AuthenticatedTestUser> {
  const user = await prisma.user.create({
    data: {
      provider: "KAKAO",
      providerUserId: `reviews-e2e-${randomUUID()}`,
      displayName,
    },
    select: { id: true },
  });
  const sessionToken = randomUUID();
  const now = new Date();
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: createHash("sha256").update(sessionToken).digest("hex"),
      expiresAt: new Date(now.getTime() + 60 * 60 * 1_000),
      lastSeenAt: now,
    },
  });

  return { id: user.id, sessionToken };
}

function requireCurrentUser(
  user: AuthenticatedTestUser | undefined,
): AuthenticatedTestUser {
  if (!user) throw new Error("E2E review user is not initialized");
  return user;
}

function sessionCookie(user: AuthenticatedTestUser | undefined): string {
  return `haetteum_session=${requireCurrentUser(user).sessionToken}`;
}
