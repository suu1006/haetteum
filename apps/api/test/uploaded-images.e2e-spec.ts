import { z } from "zod";
import {
  AuthUserSchema,
  ReviewItemSchema,
  ProfilePhotoResponseSchema,
} from "@haetteum/contracts";
import { AuthService } from "../src/auth/auth.service.js";
import { KakaoAuthClient } from "../src/auth/kakao-auth.client.js";
import { createHash, randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import request from "supertest";
import sharp from "sharp";
import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/configure-app.js";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { applyMigrations } from "./apply-migrations.js";

describe("Uploaded images (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let pool: Pool;
  const schema = `images_e2e_${randomUUID().replaceAll("-", "")}`;
  const owner = randomUUID();
  const other = randomUUID();
  const tokens = [randomUUID(), randomUUID()];
  let placeId: string;
  let png: Buffer;
  const server = () => app.getHttpServer() as Server;
  const cookie = (index = 0) => `haetteum_session=${tokens[index]}`;
  const review = (images: string[]) => ({
    placeId,
    title: "사진 후기",
    content: "사진과 함께 남기는 후기입니다.",
    rating: 5,
    images,
  });
  const upload = (path = "/api/v1/reviews/images", index = 0) =>
    request(server())
      .post(path)
      .set("Origin", "http://localhost:3000")
      .set("Cookie", cookie(index));

  beforeAll(async () => {
    const connectionString = process.env.DATABASE_URL!;
    pool = new Pool({ connectionString });
    const client = await pool.connect();
    try {
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET search_path TO "${schema}"`);
      await applyMigrations(client);
    } finally {
      client.release();
    }
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }, { schema }),
    });
    for (const [index, id] of [owner, other].entries()) {
      await prisma.user.create({
        data: {
          id,
          provider: index === 0 ? "KAKAO" : "EMAIL",
          providerUserId: id,
          displayName: "사진 사용자",
        },
      });
      await prisma.session.create({
        data: {
          userId: id,
          tokenHash: createHash("sha256").update(tokens[index]).digest("hex"),
          expiresAt: new Date(Date.now() + 3600000),
          lastSeenAt: new Date(),
        },
      });
    }
    const region = await prisma.tourismRegion.findFirstOrThrow();
    const place = await prisma.place.create({
      data: {
        source: "TEST",
        externalId: randomUUID(),
        contentTypeId: 12,
        regionId: region.id,
        title: "사진 장소",
        providerModifiedAt: new Date(),
        lastSyncedAt: new Date(),
      },
    });
    placeId = place.id;
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(KakaoAuthClient)
      .useValue({
        exchangeCode: () => Promise.resolve("test-token"),
        getUser: () =>
          Promise.resolve({
            providerUserId: owner,
            displayName: "사진 사용자",
            profileImageUrl: "https://k.kakaocdn.net/provider.jpg",
          }),
      })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    png = await sharp({
      create: { width: 1200, height: 600, channels: 3, background: "red" },
    })
      .png()
      .toBuffer();
  });

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    if (pool) {
      await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await pool.end();
    }
  });

  it("stores WebP as bytea, serves bytes, and attaches only the owner's review image", async () => {
    const response = await upload()
      .attach("file", png, { filename: "fake.html", contentType: "image/png" })
      .expect(201);
    const url = z.object({ url: z.string().url() }).parse(response.body).url;
    expect(url).toMatch(
      /^http:\/\/localhost:4001\/api\/v1\/images\/[a-f0-9-]+$/,
    );
    const id = url.split("/").pop()!;
    const rows = await pool.query<{
      type: string;
      data: Buffer;
      owner_id: string;
      purpose: string;
    }>(
      `SELECT pg_typeof(data)::text AS type, data, owner_id, purpose FROM "${schema}".uploaded_images WHERE id = $1`,
      [id],
    );
    expect(rows.rows[0]).toMatchObject({
      type: "bytea",
      owner_id: owner,
      purpose: "REVIEW",
    });
    expect(await sharp(rows.rows[0].data).metadata()).toMatchObject({
      format: "webp",
      width: 1200,
      height: 600,
    });
    const get = await request(server())
      .get(new URL(url).pathname)
      .expect(200)
      .expect("Content-Type", "image/webp")
      .expect("X-Content-Type-Options", "nosniff");
    expect(get.body).toEqual(rows.rows[0].data);

    await upload("/api/v1/reviews", 1)
      .send(review([url]))
      .expect(400);
    const created = await upload("/api/v1/reviews")
      .send(review([url]))
      .expect(201);
    const createdReview = ReviewItemSchema.parse(created.body);
    expect(createdReview.images).toEqual([url]);
    expect(JSON.stringify(created.body)).not.toContain('"data"');
    const relation = await pool.query<{ uploaded_image_id: string }>(
      `SELECT uploaded_image_id FROM "${schema}".review_images WHERE review_id=$1`,
      [createdReview.id],
    );
    expect(relation.rows[0].uploaded_image_id).toBe(id);
    await request(server())
      .patch(`/api/v1/reviews/${createdReview.id}`)
      .set("Cookie", cookie())
      .set("Origin", "http://localhost:3000")
      .send({
        title: "수정한 사진 후기",
        content: "기존 사진을 유지하는 수정입니다.",
        rating: 4,
        images: [url],
      })
      .expect(200);
    await request(server()).get(new URL(url).pathname).expect(200);
    await request(server())
      .delete(`/api/v1/reviews/${createdReview.id}`)
      .set("Cookie", cookie())
      .set("Origin", "http://localhost:3000")
      .expect(204);
  });

  it("links a profile image atomically, with bounded dimensions and no binary in auth/me", async () => {
    const response = await upload("/api/v1/profile/photo")
      .attach("file", png, { filename: "photo.png", contentType: "image/png" })
      .expect(201);
    const url = ProfilePhotoResponseSchema.parse(response.body).profileImageUrl;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: owner } });
    expect(user.profileImageUrl).toBe(url);
    const rows = await pool.query<{
      profile_image_id: string;
      data: Buffer;
      purpose: string;
    }>(
      `SELECT u.profile_image_id, i.data, i.purpose FROM "${schema}".users u JOIN "${schema}".uploaded_images i ON i.id=u.profile_image_id WHERE u.id=$1`,
      [owner],
    );
    expect(rows.rows[0].profile_image_id).toBe(url.split("/").pop());
    expect(rows.rows[0].purpose).toBe("PROFILE");
    expect(await sharp(rows.rows[0].data).metadata()).toMatchObject({
      format: "webp",
      width: 512,
      height: 256,
    });
    const me = await request(server())
      .get("/api/v1/auth/me")
      .set("Cookie", cookie())
      .expect(200);
    expect(AuthUserSchema.parse(me.body).profileImageUrl).toBe(url);
    expect(me.body).not.toHaveProperty("data");
    await upload("/api/v1/reviews")
      .send(review([url]))
      .expect(400);
  });

  it("keeps the uploaded profile after a subsequent Kakao login", async () => {
    await upload("/api/v1/profile/photo")
      .attach("file", png, { filename: "photo.png", contentType: "image/png" })
      .expect(201);
    const before = await prisma.user.findUniqueOrThrow({
      where: { id: owner },
    });
    const result = await app.get(AuthService).completeKakaoLogin("test-code");
    expect(result.user.profileImageUrl).toBe(before.profileImageUrl);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: owner } }))
        .profileImageUrl,
    ).toBe(before.profileImageUrl);
  });

  it("rejects unauthenticated, malformed, over-limit and wrong-MIME uploads without persisting them", async () => {
    const before = await pool.query(
      `SELECT count(*) FROM "${schema}".uploaded_images`,
    );
    await request(server())
      .post("/api/v1/reviews/images")
      .attach("file", png, "photo.png")
      .expect(401);
    await upload()
      .attach("file", Buffer.from("<script>bad</script>"), {
        filename: "a.html",
        contentType: "image/png",
      })
      .expect(400);
    await upload()
      .attach("file", png, { filename: "a.png", contentType: "text/plain" })
      .expect(400);
    await upload()
      .attach("file", Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: "a.png",
        contentType: "image/png",
      })
      .expect(413);
    const after = await pool.query(
      `SELECT count(*) FROM "${schema}".uploaded_images`,
    );
    expect(after.rows).toEqual(before.rows);
    await request(server()).get(`/api/v1/images/${randomUUID()}`).expect(404);
    await request(server()).get("/api/v1/images/not-a-uuid").expect(400);
  });

  it("preserves legacy URLs on an existing review but refuses new arbitrary URLs", async () => {
    const legacy = "https://example.test/uploads/reviews/legacy.jpg";
    const row = await prisma.review.create({
      data: {
        userId: other,
        placeId,
        title: "기존 후기",
        content: "기존 후기 내용입니다.",
        rating: 4,
        images: { create: { url: legacy, sortOrder: 0 } },
      },
    });
    await request(server())
      .patch(`/api/v1/reviews/${row.id}`)
      .set("Cookie", cookie(1))
      .set("Origin", "http://localhost:3000")
      .send({
        title: "수정한 후기",
        content: "기존 사진을 유지합니다.",
        rating: 4,
        images: [legacy],
      })
      .expect(200);
    await upload("/api/v1/reviews")
      .send(review([legacy]))
      .expect(400);
  });
  it("rolls back image creation if updating the profile fails", async () => {
    const before = await pool.query(
      `SELECT count(*) FROM "${schema}".uploaded_images`,
    );
    const profileBefore = await prisma.user.findUniqueOrThrow({
      where: { id: owner },
    });
    await pool.query(
      `CREATE FUNCTION "${schema}".reject_profile() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test-only profile update failure'; END $$`,
    );
    await pool.query(
      `CREATE TRIGGER reject_profile BEFORE UPDATE OF profile_image_id ON "${schema}".users FOR EACH ROW EXECUTE FUNCTION "${schema}".reject_profile()`,
    );
    try {
      await upload("/api/v1/profile/photo")
        .attach("file", png, {
          filename: "photo.png",
          contentType: "image/png",
        })
        .expect(500);
      const after = await pool.query(
        `SELECT count(*) FROM "${schema}".uploaded_images`,
      );
      expect(after.rows).toEqual(before.rows);
      expect(
        (await prisma.user.findUniqueOrThrow({ where: { id: owner } }))
          .profileImageUrl,
      ).toBe(profileBefore.profileImageUrl);
    } finally {
      await pool.query(`DROP TRIGGER reject_profile ON "${schema}".users`);
      await pool.query(`DROP FUNCTION "${schema}".reject_profile()`);
    }
  });

  it("allows deletion of a user together with their linked images and review", async () => {
    const response = await upload()
      .attach("file", png, { filename: "photo.png", contentType: "image/png" })
      .expect(201);
    const { url } = z.object({ url: z.string().url() }).parse(response.body);
    await upload("/api/v1/reviews")
      .send(review([url]))
      .expect(201);
    await prisma.user.delete({ where: { id: owner } });
    const rows = await pool.query(
      `SELECT id FROM "${schema}".uploaded_images WHERE owner_id=$1`,
      [owner],
    );
    expect(rows.rowCount).toBe(0);
  });
});
