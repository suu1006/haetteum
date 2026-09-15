import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile, access, rm } from "node:fs/promises";
import { join } from "node:path";
import { PROFILE_PHOTO_UPLOADS_DIR } from "../src/profile/profile-photo.constants.js";
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

describe("Account deletion (PostgreSQL)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let pool: Pool;
  const schema = `withdrawal_${randomUUID().replaceAll("-", "")}`;
  const owner = randomUUID();
  const other = randomUUID();
  const token = randomUUID();
  const secondToken = randomUUID();
  const email = `${owner}@example.test`;
  const testFiles: string[] = [];
  const server = () => app.getHttpServer() as Server;
  const deletion = () =>
    request(server())
      .delete("/api/v1/auth/account")
      .set("Origin", "http://localhost:3000")
      .set("Cookie", `haetteum_session=${token}`);

  beforeAll(async () => {
    const url = new URL(process.env.DATABASE_URL!);
    if (
      !["localhost", "127.0.0.1"].includes(url.hostname) ||
      !url.pathname.startsWith("/haetteum_tourapi_test_")
    ) {
      throw new Error(
        "Account deletion tests require a disposable local test database",
      );
    }
    pool = new Pool({ connectionString: url.href });
    const client = await pool.connect();
    try {
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET search_path TO "${schema}"`);
      await applyMigrations(client);
    } finally {
      client.release();
    }
    url.searchParams.set("options", `-c search_path=${schema}`);
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url.href }, { schema }),
    });
    for (const id of [owner, other]) {
      await prisma.user.create({
        data: {
          id,
          provider: "EMAIL",
          providerUserId: id,
          displayName: "개인정보 이름",
          ...(id === owner
            ? { email, passwordHash: "private-password-hash" }
            : {}),
        },
      });
    }
    for (const value of [token, secondToken]) {
      await prisma.session.create({
        data: {
          userId: owner,
          tokenHash: createHash("sha256").update(value).digest("hex"),
          expiresAt: new Date(Date.now() + 3600000),
          lastSeenAt: new Date(),
        },
      });
    }
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    for (const path of testFiles)
      await rm(path, { recursive: true, force: true });
    await app?.close();
    await prisma?.$disconnect();
    if (pool) {
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await pool.end();
    }
  });

  it("requires a session, trusted origin and explicit confirmation", async () => {
    await request(server())
      .delete("/api/v1/auth/account")
      .set("Origin", "http://localhost:3000")
      .send({ confirmed: true })
      .expect(401);
    await deletion()
      .set("Origin", "https://evil.example")
      .send({ confirmed: true })
      .expect(403);
    await deletion().send({ confirmed: false }).expect(400);
    await deletion().send({}).expect(400);
    expect(
      await prisma.user.findUnique({ where: { id: owner } }),
    ).not.toBeNull();
  });

  it("removes personal records and snapshots, revokes every session and preserves other users", async () => {
    const region = await prisma.tourismRegion.findFirstOrThrow();
    const place = await prisma.place.create({
      data: {
        source: "TEST",
        externalId: randomUUID(),
        contentTypeId: 12,
        regionId: region.id,
        title: "삭제 테스트 장소",
        providerModifiedAt: new Date(),
        lastSyncedAt: new Date(),
      },
    });
    const image = await prisma.uploadedImage.create({
      data: {
        ownerId: owner,
        purpose: "REVIEW",
        data: new Uint8Array([1, 2]),
        width: 1,
        height: 1,
        byteSize: 2,
      },
    });
    await prisma.user.update({
      where: { id: owner },
      data: {
        profileImageId: image.id,
        profileImageUrl: `http://localhost:4001/api/v1/images/${image.id}`,
      },
    });
    await request(server())
      .get(`/api/v1/images/${image.id}`)
      .expect("Cache-Control", "private, no-store")
      .expect(200);
    const review = await prisma.review.create({
      data: {
        userId: owner,
        placeId: place.id,
        rating: 5,
        title: "개인정보",
        content: "이름과 개인정보가 들어간 후기입니다.",
        images: {
          create: {
            uploadedImageId: image.id,
            url: `http://localhost:4001/api/v1/images/${image.id}`,
            sortOrder: 0,
          },
        },
      },
    });
    // A deleted review's snapshot has no live review foreign key.
    await prisma.reviewReport.createMany({
      data: [review.id, randomUUID()].map((id) => ({
        reporterId: other,
        reviewId: id === review.id ? id : null,
        reviewIdSnapshot: id,
        authorIdSnapshot: owner,
        reason: "OTHER",
        details: "개인정보",
        titleSnapshot: "개인정보",
        contentSnapshot: "삭제되어야 할 개인정보",
      })),
    });
    await prisma.placeFavorite.create({
      data: { userId: owner, placeId: place.id },
    });
    await prisma.savedCourse.create({
      data: { userId: owner, title: "개인 여행 일정" },
    });
    await prisma.userBlock.create({
      data: { blockerId: other, blockedUserId: owner },
    });
    const conversation = await prisma.chatConversation.create({
      data: {
        userId: owner,
        title: "내 개인정보",
        messages: { create: { role: "user", content: "내 개인 대화" } },
      },
    });
    await prisma.pendingEmailSignup.create({
      data: {
        email,
        passwordHash: "hash",
        codeHash: "0".repeat(64),
        codeExpiresAt: new Date(),
      },
    });
    const subject = `user:${owner}`;
    await prisma.chatDailyUsage.create({
      data: { subjectKey: subject, day: new Date("2026-09-15"), used: 1 },
    });
    await prisma.$executeRaw`INSERT INTO chat_requests (subject_key, request_id, payload_hash, day, status, attempt_id, reply, conversation_id)
      VALUES (${subject}, ${randomUUID()}::uuid, 'hash', CURRENT_DATE, 'COMPLETED', ${randomUUID()}::uuid, '개인 답변', ${conversation.id}::uuid)`;

    // A late DB error must roll back every database deletion and keep the session.
    await prisma.$executeRawUnsafe(
      `CREATE FUNCTION reject_test_deletion() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'simulated deletion failure'; END $$`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE TRIGGER reject_test_deletion BEFORE DELETE ON users FOR EACH ROW EXECUTE FUNCTION reject_test_deletion()`,
    );
    await deletion().send({ confirmed: true }).expect(500);
    expect(
      await prisma.review.findUnique({ where: { id: review.id } }),
    ).not.toBeNull();
    expect(
      await prisma.uploadedImage.findUnique({ where: { id: image.id } }),
    ).not.toBeNull();
    expect(await prisma.reviewReport.count()).toBe(2);
    await request(server())
      .get("/api/v1/auth/me")
      .set("Cookie", `haetteum_session=${token}`)
      .expect(200);
    await prisma.$executeRawUnsafe(
      `DROP TRIGGER reject_test_deletion ON users`,
    );
    await prisma.$executeRawUnsafe(`DROP FUNCTION reject_test_deletion()`);

    const response = await deletion()
      .send({ confirmed: true, userId: other })
      .expect(204);
    expect(response.headers["set-cookie"]).toEqual(
      expect.arrayContaining([expect.stringMatching(/^haetteum_session=;/)]),
    );
    expect(await prisma.user.findUnique({ where: { id: owner } })).toBeNull();
    expect(
      await prisma.user.findUnique({ where: { id: other } }),
    ).not.toBeNull();
    for (const count of await Promise.all([
      prisma.session.count(),
      prisma.review.count(),
      prisma.reviewImage.count(),
      prisma.uploadedImage.count(),
      prisma.reviewReport.count(),
      prisma.userBlock.count(),
      prisma.placeFavorite.count(),
      prisma.savedCourse.count(),
      prisma.chatConversation.count(),
      prisma.chatMessage.count(),
      prisma.chatDailyUsage.count(),
      prisma.pendingEmailSignup.count(),
    ]))
      expect(count).toBe(0);
    expect(
      await prisma.$queryRaw`SELECT subject_key FROM chat_requests`,
    ).toEqual([]);
    for (const value of [token, secondToken]) {
      await request(server())
        .get("/api/v1/auth/me")
        .set("Cookie", `haetteum_session=${value}`)
        .expect(401);
    }
    await request(server()).get(`/api/v1/images/${image.id}`).expect(404);

    // A stale in-flight reservation cannot restore reply or usage data after deletion.
    await expect(
      prisma.$transaction(async (tx) => {
        await tx.chatDailyUsage.create({
          data: { subjectKey: subject, day: new Date("2026-09-15"), used: 1 },
        });
        await tx.$executeRaw`INSERT INTO chat_requests (subject_key, request_id, payload_hash, day, status, attempt_id, conversation_id)
        VALUES (${subject}, ${randomUUID()}::uuid, 'hash', CURRENT_DATE, 'RESERVED', ${randomUUID()}::uuid, ${conversation.id}::uuid)`;
      }),
    ).rejects.toThrow();
    expect(await prisma.chatDailyUsage.count()).toBe(0);
  });

  it.each(["file", "missing", "unremovable"])(
    "cleans legacy profile images and fails safely for an %s path",
    async (kind) => {
      const id = randomUUID();
      const name = `${randomUUID()}.png`;
      const path = join(PROFILE_PHOTO_UPLOADS_DIR, name);
      testFiles.push(path);
      await mkdir(PROFILE_PHOTO_UPLOADS_DIR, { recursive: true });
      if (kind === "file") await writeFile(path, "private-photo-bytes");
      if (kind === "unremovable") await mkdir(path);
      await prisma.user.create({
        data: {
          id,
          provider: "KAKAO",
          providerUserId: id,
          displayName: "이전 사진 사용자",
          profileImageUrl: `http://localhost:4001/uploads/profile-photos/${name}`,
        },
      });
      const value = randomUUID();
      await prisma.session.create({
        data: {
          userId: id,
          tokenHash: createHash("sha256").update(value).digest("hex"),
          expiresAt: new Date(Date.now() + 3600000),
          lastSeenAt: new Date(),
        },
      });
      const response = await request(server())
        .delete("/api/v1/auth/account")
        .set("Origin", "http://localhost:3000")
        .set("Cookie", `haetteum_session=${value}`)
        .send({ confirmed: true });
      if (kind === "unremovable") {
        expect(response.status).toBe(503);
        expect(await prisma.user.findUnique({ where: { id } })).not.toBeNull();
        await request(server())
          .get("/api/v1/auth/me")
          .set("Cookie", `haetteum_session=${value}`)
          .expect(200);
      } else {
        expect(response.status).toBe(204);
        await expect(access(path)).rejects.toMatchObject({ code: "ENOENT" });
        expect(await prisma.user.findUnique({ where: { id } })).toBeNull();
      }
    },
  );
});
