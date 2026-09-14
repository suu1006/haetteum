import {
  PlaceReviewsResponseSchema,
  BlockedUsersResponseSchema,
} from "@haetteum/contracts";
import { createHash, randomUUID } from "node:crypto";

import type { Server } from "node:http";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import request from "supertest";

import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/configure-app.js";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaService } from "../src/prisma/prisma.service.js";

import { applyMigrations } from "./apply-migrations.js";

const WEB_ORIGIN = "http://localhost:3000";
type AuthenticatedTestUser = {
  id: string;
  sessionToken: string;
};

function getHttpServer(application: INestApplication): Server {
  return application.getHttpServer() as Server;
}

describe("Review moderation (e2e)", () => {
  let app: INestApplication | undefined;
  let prisma: PrismaClient | undefined;
  let adminPool: Pool | undefined;
  let schemaName: string | undefined;
  let placeId: string | undefined;

  beforeAll(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required for E2E tests");

    schemaName = `review_moderation_e2e_${randomUUID().replaceAll("-", "")}`;
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

  it("accepts reports once and rejects self reports, invalid input, anonymous and foreign-origin requests", async () => {
    const db = requirePrisma(prisma);
    const author = await createAuthenticatedKakaoUser("작성자");
    const viewer = await createAuthenticatedKakaoUser("신고자");
    const review = await db.review.create({
      data: {
        userId: author.id,
        placeId: requirePlaceId(placeId),
        title: "후기",
        content: "신고 대상 후기 내용입니다",
        rating: 5,
      },
    });
    const server = getHttpServer(requireApp(app));
    const path = `/api/v1/reviews/${review.id}/reports`;
    await request(server).post(path).send({ reason: "SPAM" }).expect(401);
    await request(server)
      .post(path)
      .set("Cookie", sessionCookie(viewer))
      .set("Origin", "https://evil.example")
      .send({ reason: "SPAM" })
      .expect(403);
    await request(server)
      .post(path)
      .set("Cookie", sessionCookie(author))
      .set("Origin", WEB_ORIGIN)
      .send({ reason: "SPAM" })
      .expect(400);
    await request(server)
      .post(path)
      .set("Cookie", sessionCookie(viewer))
      .set("Origin", WEB_ORIGIN)
      .send({ reason: "INVALID" })
      .expect(400);
    const report = () =>
      request(server)
        .post(path)
        .set("Cookie", sessionCookie(viewer))
        .set("Origin", WEB_ORIGIN)
        .send({ reason: "SPAM", details: "광고 링크" });
    const results = await Promise.all([report(), report()]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await db.review.count()).toBe(1);
    await request(server)
      .post(`/api/v1/reviews/${randomUUID()}/reports`)
      .set("Cookie", sessionCookie(viewer))
      .set("Origin", WEB_ORIGIN)
      .send({ reason: "SPAM" })
      .expect(404);
  });

  it("persists viewer-only blocks and restores reviews after an owner-scoped unblock", async () => {
    const db = requirePrisma(prisma);
    const author = await createAuthenticatedKakaoUser("차단 대상");
    const viewer = await createAuthenticatedKakaoUser("차단한 사용자");
    const stranger = await createAuthenticatedKakaoUser("다른 사용자");
    const review = await db.review.create({
      data: {
        userId: author.id,
        placeId: requirePlaceId(placeId),
        title: "후기",
        content: "차단 테스트 후기 내용입니다",
        rating: 5,
      },
    });
    const server = getHttpServer(requireApp(app));
    const path = `/api/v1/reviews/${review.id}/block-author`;
    await request(server).post(path).set("Origin", WEB_ORIGIN).expect(401);
    await request(server)
      .post(path)
      .set("Cookie", sessionCookie(author))
      .set("Origin", WEB_ORIGIN)
      .expect(400);
    for (let i = 0; i < 2; i++)
      await request(server)
        .post(path)
        .set("Cookie", sessionCookie(viewer))
        .set("Origin", WEB_ORIGIN)
        .expect(204);
    const listPath = `/api/v1/place-reviews/${requirePlaceId(placeId)}`;
    const hidden = await request(server)
      .get(listPath)
      .set("Cookie", sessionCookie(viewer))
      .expect(200);
    expect(
      PlaceReviewsResponseSchema.parse(hidden.body as unknown).items,
    ).toEqual([]);
    expect(hidden.headers["cache-control"]).toContain("no-store");
    const visible = await request(server).get(listPath).expect(200);
    expect(
      PlaceReviewsResponseSchema.parse(visible.body as unknown).items,
    ).toHaveLength(1);
    await request(server)
      .delete(`/api/v1/user-blocks/${author.id}`)
      .set("Cookie", sessionCookie(stranger))
      .set("Origin", WEB_ORIGIN)
      .expect(204);
    const blocks = await request(server)
      .get("/api/v1/user-blocks")
      .set("Cookie", sessionCookie(viewer))
      .expect(200);
    expect(
      BlockedUsersResponseSchema.parse(blocks.body as unknown).items,
    ).toEqual([
      expect.objectContaining({ userId: author.id, displayName: "차단 대상" }),
    ]);
    await request(server)
      .delete(`/api/v1/user-blocks/${author.id}`)
      .set("Cookie", sessionCookie(viewer))
      .set("Origin", WEB_ORIGIN)
      .expect(204);
    const restored = await request(server)
      .get(listPath)
      .set("Cookie", sessionCookie(viewer))
      .expect(200);
    expect(
      PlaceReviewsResponseSchema.parse(restored.body as unknown).items,
    ).toHaveLength(1);
  });

  it("preserves report evidence and target identifiers after the author deletes a review", async () => {
    const db = requirePrisma(prisma);
    const author = await createAuthenticatedKakaoUser("작성자");
    const viewer = await createAuthenticatedKakaoUser("신고자");
    const review = await db.review.create({
      data: {
        userId: author.id,
        placeId: requirePlaceId(placeId),
        title: "신고 당시 제목",
        content: "신고 당시 후기 내용입니다",
        rating: 5,
      },
    });
    await request(getHttpServer(requireApp(app)))
      .post(`/api/v1/reviews/${review.id}/reports`)
      .set("Cookie", sessionCookie(viewer))
      .set("Origin", WEB_ORIGIN)
      .send({ reason: "ABUSE", details: "욕설 신고" })
      .expect(201);
    await db.review.delete({ where: { id: review.id } });
    expect(
      await db.reviewReport.findFirstOrThrow({
        where: { reporterId: viewer.id },
      }),
    ).toMatchObject({
      reviewId: null,
      reviewIdSnapshot: review.id,
      authorIdSnapshot: author.id,
      titleSnapshot: "신고 당시 제목",
      contentSnapshot: "신고 당시 후기 내용입니다",
      status: "PENDING",
      reason: "ABUSE",
      details: "욕설 신고",
    });
  });

  it("protects block management and distinguishes anonymous, own and other review actions", async () => {
    const db = requirePrisma(prisma);
    const author = await createAuthenticatedKakaoUser("작성자");
    const viewer = await createAuthenticatedKakaoUser("다른 사용자");
    const review = await db.review.create({
      data: {
        userId: author.id,
        placeId: requirePlaceId(placeId),
        title: "후기",
        content: "후기 접근 권한 테스트입니다",
        rating: 4,
      },
    });
    const server = getHttpServer(requireApp(app));
    await request(server).get("/api/v1/user-blocks").expect(401);
    await request(server)
      .delete(`/api/v1/user-blocks/${author.id}`)
      .set("Origin", WEB_ORIGIN)
      .expect(401);
    await request(server)
      .delete(`/api/v1/user-blocks/${author.id}`)
      .set("Cookie", sessionCookie(viewer))
      .expect(403);
    await request(server)
      .delete("/api/v1/user-blocks/not-a-uuid")
      .set("Cookie", sessionCookie(viewer))
      .set("Origin", WEB_ORIGIN)
      .expect(400);
    await request(server)
      .post(`/api/v1/reviews/${review.id}/block-author`)
      .set("Cookie", sessionCookie(viewer))
      .set("Origin", "https://evil.example")
      .expect(403);
    const blocks = await request(server)
      .get("/api/v1/user-blocks")
      .set("Cookie", sessionCookie(viewer))
      .expect(200);
    expect(
      BlockedUsersResponseSchema.parse(blocks.body as unknown).items,
    ).toEqual([]);
    for (const [cookie, moderation] of [
      ["haetteum_session=expired", "login-required"],
      [sessionCookie(author), "own"],
      [sessionCookie(viewer), "available"],
    ]) {
      const response = await request(server)
        .get(`/api/v1/place-reviews/${requirePlaceId(placeId)}`)
        .set("Cookie", cookie)
        .expect(200);
      expect(
        PlaceReviewsResponseSchema.parse(response.body as unknown).items[0]
          .moderation,
      ).toBe(moderation);
    }
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
