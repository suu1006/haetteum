import { randomUUID } from "node:crypto";

import type { Server } from "node:http";

import {
  PlaceCoursesResponseSchema,
  ProblemDetailsSchema,
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

import { applyMigrations } from "./apply-migrations.js";

function getHttpServer(application: INestApplication): Server {
  return application.getHttpServer() as Server;
}

describe("Place courses API PostgreSQL integration (e2e)", () => {
  let app: INestApplication | undefined;
  let prisma: PrismaClient | undefined;
  let adminPool: Pool | undefined;
  let schemaName: string | undefined;
  let visitedPlaceId: string | undefined;
  let untouchedPlaceId: string | undefined;

  beforeEach(async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL is required for E2E tests");

    schemaName = `courses_e2e_${randomUUID().replaceAll("-", "")}`;
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

    const now = new Date();
    const region = await prisma.tourismRegion.create({
      data: {
        slug: "courses-e2e",
        name: "코스 테스트 지역",
        providerCode: "98",
        displayOrder: 98,
        isActive: true,
      },
    });

    async function createPlace(externalId: string, title: string) {
      return prisma.place.create({
        data: {
          source: "TOUR_API",
          externalId,
          contentTypeId: 12,
          regionId: region.id,
          title,
          providerModifiedAt: now,
          lastSyncedAt: now,
          isVisible: true,
        },
        select: { id: true },
      });
    }

    const visited = await createPlace("1954916", "태풍전망대");
    const neighbour = await createPlace("1049613", "재인폭포");
    const untouched = await createPlace("9999999", "코스 없는 관광지");
    visitedPlaceId = visited.id;
    untouchedPlaceId = untouched.id;

    await prisma.tourCourse.create({
      data: {
        source: "TOUR_API",
        externalId: "2372032",
        title: "선사유적지와 분단의 현장에 발을 딛다.",
        overview: "경기도 최북단 연천을 걷는 하루 코스.",
        takeTime: "1일",
        distance: "65.93km",
        schedule: "기타",
        theme: "지자체",
        primaryImageUrl:
          "https://tong.visitkorea.or.kr/cms/resource/13/1049613_image2_1.jpg",
        providerModifiedAt: now,
        lastSyncedAt: now,
        stops: {
          create: [
            {
              sequence: 1,
              externalPlaceId: "1049613",
              placeId: neighbour.id,
              title: "재인폭포",
              overview: "한탄강 서쪽에 자리한 폭포.",
              imageUrl:
                "https://tong.visitkorea.or.kr/cms/resource/13/1049613_image2_1.jpg",
            },
            {
              sequence: 2,
              externalPlaceId: "1859001",
              placeId: null,
              title: "전곡선사박물관",
              overview: null,
              imageUrl: null,
            },
            {
              sequence: 3,
              externalPlaceId: "1954916",
              placeId: visited.id,
              title: "태풍전망대",
              overview: null,
              imageUrl: null,
            },
          ],
        },
      },
    });

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
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
    visitedPlaceId = undefined;
    untouchedPlaceId = undefined;

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

  it("returns the stored course with its stops ordered by sequence", async () => {
    const application = requireApp(app);
    const placeId = requireId(visitedPlaceId);

    const response = await request(getHttpServer(application))
      .get(`/api/v1/place-courses/${placeId}`)
      .expect(200);
    const body = PlaceCoursesResponseSchema.parse(response.body as unknown);

    expect(body.placeId).toBe(placeId);
    expect(body.source).toBe("TOUR_API");
    expect(body.items).toHaveLength(1);
    expect(body.items[0]).toMatchObject({
      title: "선사유적지와 분단의 현장에 발을 딛다.",
      takeTime: "1일",
      distance: "65.93km",
      theme: "지자체",
    });
    expect(body.items[0]?.stops.map((stop) => stop.sequence)).toEqual([
      1, 2, 3,
    ]);
    // 우리 DB에 없는 경유지는 링크 없이 이름만 노출한다.
    expect(body.items[0]?.stops[1]?.placeId).toBeNull();
    expect(body.items[0]?.stops[2]?.placeId).toBe(placeId);
  });

  it("returns an empty list for a place no course passes through", async () => {
    const application = requireApp(app);
    const placeId = requireId(untouchedPlaceId);

    const response = await request(getHttpServer(application))
      .get(`/api/v1/place-courses/${placeId}`)
      .expect(200);

    expect(PlaceCoursesResponseSchema.parse(response.body as unknown)).toEqual({
      placeId,
      source: "TOUR_API",
      items: [],
    });
  });

  it("reports a missing place with Problem Details", async () => {
    const application = requireApp(app);

    const response = await request(getHttpServer(application))
      .get("/api/v1/place-courses/00000000-0000-4000-8000-000000000000")
      .expect(404);

    expect(ProblemDetailsSchema.parse(response.body as unknown)).toMatchObject({
      code: "PLACE_NOT_FOUND",
    });
  });

  it("rejects a place id that is not a UUID", async () => {
    const application = requireApp(app);

    await request(getHttpServer(application))
      .get("/api/v1/place-courses/not-a-uuid")
      .expect(400);
  });
});

function requireApp(app: INestApplication | undefined): INestApplication {
  if (!app) throw new Error("Nest application was not initialized");
  return app;
}

function requireId(id: string | undefined): string {
  if (!id) throw new Error("Place was not seeded");
  return id;
}
