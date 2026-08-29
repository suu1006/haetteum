import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { createServer, type AddressInfo } from "node:net";

import {
  FestivalDiscoveryResponseSchema,
  HealthResponseSchema,
  PlaceRankingResponseSchema,
  PlacesPageSchema,
  ProblemDetailsSchema,
} from "@haetteum/contracts";
import type { INestApplication, LoggerService } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { jest } from "@jest/globals";
import { PrismaHealthIndicator } from "@nestjs/terminus";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/configure-app.js";
import { PrismaService } from "../src/prisma/prisma.service.js";
import { TOUR_API_FETCH } from "../src/tourism/tourism.constants.js";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SENSITIVE_DATABASE_DETAILS = /DATABASE_URL|SELECT|postgresql:\/\//;
const E2E_PLACE_RANKING_SOURCE_FILE_PREFIX = "e2e-place-rankings-";

function getHttpServer(application: INestApplication): Server {
  return application.getHttpServer() as Server;
}

async function reserveUnusedLoopbackPort(): Promise<number> {
  const server = createServer();

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address() as AddressInfo;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  return address.port;
}

describe("API HTTP boundary (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const createdPlaceRankingIds: string[] = [];
  const createdPlaceIds: string[] = [];
  const createdFestivalIds: string[] = [];
  const createdRegionIds: string[] = [];
  const tourApiFetch = jest.fn();

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(TOUR_API_FETCH)
      .useValue(tourApiFetch)
      .compile();

    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    try {
      if (createdPlaceRankingIds.length > 0) {
        await prisma.placeRanking.deleteMany({
          where: { id: { in: createdPlaceRankingIds } },
        });
      }
      if (createdFestivalIds.length > 0) {
        await prisma.festival.deleteMany({
          where: { id: { in: createdFestivalIds } },
        });
      }
      if (createdPlaceIds.length > 0) {
        await prisma.place.deleteMany({
          where: { id: { in: createdPlaceIds } },
        });
      }
      if (createdRegionIds.length > 0) {
        await prisma.tourismRegion.deleteMany({
          where: { id: { in: createdRegionIds } },
        });
      }
    } finally {
      await app.close();
    }
  });

  it("serves PostgreSQL festival discovery data without calling TourAPI", async () => {
    const current = new Date(Date.now() + 9 * 60 * 60 * 1_000);
    const today = new Date(
      Date.UTC(
        current.getUTCFullYear(),
        current.getUTCMonth(),
        current.getUTCDate(),
      ),
    );
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1_000);
    const externalId = `0000-e2e-${randomUUID()}`;
    const festival = await prisma.festival.create({
      data: {
        source: "E2E_TEST",
        externalId,
        contentTypeId: 15,
        title: "E2E 경주 실데이터 축제",
        eventStartDate: yesterday,
        eventEndDate: today,
        providerRegionCode: "47",
        providerDistrictCode: "130",
        address1: "경상북도 경주시",
        address2: "테스트로 1",
        category1: "EV",
        category2: "EV01",
        category3: "EV010400",
        providerModifiedAt: new Date(),
        lastSyncedAt: new Date(),
      },
    });
    createdFestivalIds.push(festival.id);

    tourApiFetch.mockClear();
    const response = await request(getHttpServer(app))
      .get("/api/v1/festivals/discovery?region=gyeongju&page=1&pageSize=40")
      .expect(200);
    const discovery = FestivalDiscoveryResponseSchema.parse(
      response.body as unknown,
    );

    expect(discovery.region).toBe("gyeongju");
    // 지역 필터는 목록(items)에만 적용된다.
    const listed = discovery.items.find((item) => item.id === festival.id);
    expect(listed).toMatchObject({
      id: festival.id,
      externalId,
      title: "E2E 경주 실데이터 축제",
      status: "ONGOING",
      eventStartDate: yesterday.toISOString().slice(0, 10),
      eventEndDate: today.toISOString().slice(0, 10),
      address: "경상북도 경주시 테스트로 1",
      categoryLabel: "전통역사축제",
      primaryImageUrl: null,
    });
    // 상단 순위(1~3위)는 지역 필터와 무관하게 전체 축제를 기준으로 노출한다.
    expect(discovery.ranking.length).toBeGreaterThan(0);
    expect(discovery.ranking.map((item) => item.rank)).toEqual(
      discovery.ranking.map((_, index) => index + 1),
    );
    expect(tourApiFetch).not.toHaveBeenCalled();

    const invalid = await request(getHttpServer(app))
      .get("/api/v1/festivals/discovery?region=incheon")
      .expect(400)
      .expect("content-type", /application\/problem\+json/);
    expect(ProblemDetailsSchema.parse(invalid.body as unknown).code).toBe(
      "VALIDATION_ERROR",
    );
  });

  it("reports a live database as healthy with the shared schema and a server UUID", async () => {
    const response = await request(getHttpServer(app))
      .get("/api/v1/health")
      .expect(200);
    const health = HealthResponseSchema.parse(response.body as unknown);

    expect(health.status).toBe("ok");
    expect(health.details.database.status).toBe("up");
    expect(response.headers["x-request-id"]).toMatch(UUID_V4);
  });

  it("serializes missing routes as Problem Details tied to the response request ID", async () => {
    const response = await request(getHttpServer(app))
      .get("/api/v1/missing")
      .expect(404)
      .expect("content-type", /application\/problem\+json/);

    expect(response.text).not.toMatch(SENSITIVE_DATABASE_DETAILS);
    expect(response.text).not.toContain("stack");
    const problem = ProblemDetailsSchema.parse(response.body as unknown);
    expect(problem.code).toBe("NOT_FOUND");
    expect(problem.requestId).toBe(response.headers["x-request-id"]);
  });

  it("allows credentialed CORS preflights from the configured web origin", async () => {
    const response = await request(getHttpServer(app))
      .options("/api/v1/health")
      .set("Origin", "http://localhost:3000")
      .set("Access-Control-Request-Method", "GET")
      .set("X-Request-Id", "client-provided-request-id")
      .expect("access-control-allow-origin", "http://localhost:3000")
      .expect("access-control-allow-credentials", "true");

    expect(response.headers["x-request-id"]).toMatch(UUID_V4);
    expect(response.headers["x-request-id"]).not.toBe(
      "client-provided-request-id",
    );
  });

  it("does not grant CORS access to an untrusted origin", async () => {
    const response = await request(getHttpServer(app))
      .options("/api/v1/health")
      .set("Origin", "https://untrusted.example")
      .set("Access-Control-Request-Method", "GET")
      .set("X-Request-Id", "client-provided-request-id");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    expect(response.headers["x-request-id"]).toMatch(UUID_V4);
    expect(response.headers["x-request-id"]).not.toBe(
      "client-provided-request-id",
    );
  });

  it("correlates malformed JSON Problem Details with its response request ID", async () => {
    const response = await request(getHttpServer(app))
      .post("/api/v1/missing")
      .set("Content-Type", "application/json")
      .set("X-Request-Id", "client-provided-request-id")
      .send('{"incomplete":')
      .expect(400)
      .expect("content-type", /application\/problem\+json/);

    const problem = ProblemDetailsSchema.parse(response.body as unknown);
    expect(response.headers["x-request-id"]).toMatch(UUID_V4);
    expect(problem.requestId).toBe(response.headers["x-request-id"]);
    expect(problem.requestId).not.toBe("client-provided-request-id");
  });

  it("lists only visible places in the active requested region without calling TourAPI", async () => {
    const uniqueTitle = `e2e-place-${randomUUID()}`;
    const now = new Date();
    const activeJeju = await prisma.tourismRegion.findUniqueOrThrow({
      where: { slug: "jeju" },
    });
    const inactiveRegion = await prisma.tourismRegion.create({
      data: {
        slug: `e2e-inactive-${randomUUID().replaceAll("-", "").slice(0, 16)}`,
        name: "비활성 테스트 지역",
        providerCode: `i${randomUUID().replaceAll("-", "").slice(0, 9)}`,
        displayOrder: 999,
        isActive: false,
      },
    });
    createdRegionIds.push(inactiveRegion.id);

    const visible = await prisma.place.create({
      data: {
        source: "E2E_TEST",
        externalId: `${randomUUID()}-visible`,
        contentTypeId: 12,
        regionId: activeJeju.id,
        title: uniqueTitle,
        address1: "  제주특별자치도 서귀포시 성산읍  ",
        address2: "  성산리 1-1  ",
        longitude: "126.940506",
        latitude: "33.458056",
        primaryImageUrl: "https://example.test/e2e-visible.jpg",
        imageCopyrightType: "Type1",
        providerModifiedAt: now,
        lastSyncedAt: now,
        isVisible: true,
      },
    });
    createdPlaceIds.push(visible.id);
    const hidden = await prisma.place.create({
      data: {
        source: "E2E_TEST",
        externalId: `${randomUUID()}-hidden`,
        contentTypeId: 12,
        regionId: activeJeju.id,
        title: uniqueTitle,
        providerModifiedAt: now,
        lastSyncedAt: now,
        isVisible: false,
      },
    });
    createdPlaceIds.push(hidden.id);
    const inactive = await prisma.place.create({
      data: {
        source: "E2E_TEST",
        externalId: `${randomUUID()}-inactive`,
        contentTypeId: 12,
        regionId: inactiveRegion.id,
        title: uniqueTitle,
        providerModifiedAt: now,
        lastSyncedAt: now,
        isVisible: true,
      },
    });
    createdPlaceIds.push(inactive.id);

    tourApiFetch.mockClear();
    const query = new URLSearchParams({ region: "jeju", q: uniqueTitle });
    const response = await request(getHttpServer(app))
      .get(`/api/v1/places?${query.toString()}`)
      .expect(200);
    const page = PlacesPageSchema.parse(response.body as unknown);

    expect(page).toEqual({
      items: [
        {
          id: visible.id,
          title: uniqueTitle,
          region: "jeju",
          district: null,
          address: "제주특별자치도 서귀포시 성산읍 성산리 1-1",
          longitude: 126.940506,
          latitude: 33.458056,
          primaryImageUrl: "https://example.test/e2e-visible.jpg",
          imageCopyrightType: "Type1",
        },
      ],
      page: 1,
      pageSize: 20,
      totalCount: 1,
    });
    expect(tourApiFetch).not.toHaveBeenCalled();

    const invalidRegion = await request(getHttpServer(app))
      .get("/api/v1/places?region=incheon")
      .expect(400)
      .expect("content-type", /application\/problem\+json/);
    expect(ProblemDetailsSchema.parse(invalidRegion.body as unknown).code).toBe(
      "VALIDATION_ERROR",
    );

    const invalidPageSize = await request(getHttpServer(app))
      .get("/api/v1/places?region=jeju&pageSize=101")
      .expect(400)
      .expect("content-type", /application\/problem\+json/);
    expect(
      ProblemDetailsSchema.parse(invalidPageSize.body as unknown).code,
    ).toBe("VALIDATION_ERROR");
  });

  it("serves the latest place ranking snapshot without calling TourAPI", async () => {
    const now = new Date();
    await prisma.placeRanking.deleteMany({
      where: {
        source: "KTO_DATALAB",
        scope: "NATIONAL",
        sourceFileName: { startsWith: E2E_PLACE_RANKING_SOURCE_FILE_PREFIX },
      },
    });
    const activeJeju = await prisma.tourismRegion.findUniqueOrThrow({
      where: { slug: "jeju" },
    });
    const matchedPlace = await prisma.place.create({
      data: {
        source: "E2E_TEST",
        externalId: `${randomUUID()}-ranking-match`,
        contentTypeId: 12,
        regionId: activeJeju.id,
        title: "E2E 랭킹 매칭 관광지",
        primaryImageUrl: "https://example.test/ranking-match.jpg",
        imageCopyrightType: "Type1",
        providerModifiedAt: now,
        lastSyncedAt: now,
        isVisible: true,
      },
    });
    createdPlaceIds.push(matchedPlace.id);
    const periodStart = new Date("2099-01-01T00:00:00.000Z");
    const periodEnd = new Date("2099-12-31T00:00:00.000Z");
    const sourceFileName = `${E2E_PLACE_RANKING_SOURCE_FILE_PREFIX}${randomUUID()}.csv`;
    const [second, first] = await Promise.all([
      prisma.placeRanking.create({
        data: {
          source: "KTO_DATALAB",
          scope: "NATIONAL",
          sourcePlaceId: randomUUID().replaceAll("-", ""),
          sourcePlaceName: "E2E 랭킹 미매칭 관광지",
          sourceCategory: "자연관광",
          audience: "ALL",
          periodStart,
          periodEnd,
          rank: 2,
          sharePercent: "7.89",
          sourceFileName,
          importedAt: now,
        },
      }),
      prisma.placeRanking.create({
        data: {
          source: "KTO_DATALAB",
          scope: "NATIONAL",
          sourcePlaceId: randomUUID().replaceAll("-", ""),
          sourcePlaceName: "E2E 랭킹 매칭 관광지",
          sourceCategory: "문화관광",
          audience: "ALL",
          periodStart,
          periodEnd,
          rank: 1,
          sharePercent: "12.34",
          placeId: matchedPlace.id,
          sourceFileName,
          importedAt: now,
        },
      }),
    ]);
    createdPlaceRankingIds.push(second.id, first.id);

    tourApiFetch.mockClear();
    const response = await request(getHttpServer(app))
      .get("/api/v1/place-rankings?audience=all&limit=10")
      .expect(200);
    const rankings = PlaceRankingResponseSchema.parse(response.body as unknown);

    expect(rankings).toMatchObject({
      source: "KTO_DATALAB",
      scope: "national",
      periodStart: "2099-01-01",
      periodEnd: "2099-12-31",
      audience: "all",
    });
    expect(rankings.items).toEqual([
      {
        rank: 1,
        sourcePlaceId: first.sourcePlaceId,
        title: "E2E 랭킹 매칭 관광지",
        category: "문화관광",
        sharePercent: 12.34,
        placeId: matchedPlace.id,
        primaryImageUrl: "https://example.test/ranking-match.jpg",
        imageCopyrightType: "Type1",
      },
      {
        rank: 2,
        sourcePlaceId: second.sourcePlaceId,
        title: "E2E 랭킹 미매칭 관광지",
        category: "자연관광",
        sharePercent: 7.89,
        placeId: null,
        primaryImageUrl: null,
        imageCopyrightType: null,
      },
    ]);
    expect(tourApiFetch).not.toHaveBeenCalled();

    const invalidAudience = await request(getHttpServer(app))
      .get("/api/v1/place-rankings?audience=teens")
      .expect(400)
      .expect("content-type", /application\/problem\+json/);
    expect(
      ProblemDetailsSchema.parse(invalidAudience.body as unknown).code,
    ).toBe("VALIDATION_ERROR");

    const invalidLimit = await request(getHttpServer(app))
      .get("/api/v1/place-rankings?limit=11")
      .expect(400)
      .expect("content-type", /application\/problem\+json/);
    expect(ProblemDetailsSchema.parse(invalidLimit.body as unknown).code).toBe(
      "VALIDATION_ERROR",
    );
  });

  it("rejects initialization without creating a listener when its project database is unreachable", async () => {
    const unusedPort = await reserveUnusedLoopbackPort();
    const values = {
      NODE_ENV: "test",
      API_PORT: 4001,
      WEB_ORIGIN: "http://localhost:3000",
      DATABASE_URL: `postgresql://haetteum:local-development-only@127.0.0.1:${unusedPort}/haetteum_cold_start_e2e`,
    } as const;
    const unreachableModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ConfigService)
      .useValue({
        get: (key: keyof typeof values) => values[key],
      })
      .compile();
    const unreachableApp = unreachableModule.createNestApplication();
    unreachableApp.useLogger(false);
    configureApp(unreachableApp);
    const httpServer = getHttpServer(unreachableApp);

    try {
      expect(httpServer.listening).toBe(false);
      await expect(unreachableApp.init()).rejects.toBeDefined();
      expect(httpServer.listening).toBe(false);
    } finally {
      await unreachableApp.close();
    }
  });

  it("returns a sanitized Problem Details response when the database indicator is down", async () => {
    const loggedErrors: unknown[][] = [];
    const silentLogger: LoggerService = {
      log: () => undefined,
      error: (message: unknown, ...optionalParams: unknown[]) => {
        loggedErrors.push([message, ...optionalParams]);
      },
      warn: () => undefined,
      debug: () => undefined,
      verbose: () => undefined,
      fatal: () => undefined,
    };
    const downModule = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaHealthIndicator)
      .useValue({
        pingCheck: () =>
          Promise.resolve({ database: { status: "down" as const } }),
      })
      .compile();
    const downApp = downModule.createNestApplication();
    downApp.useLogger(silentLogger);
    configureApp(downApp);

    try {
      await downApp.init();

      const response = await request(getHttpServer(downApp))
        .get("/api/v1/health")
        .expect(503)
        .expect("content-type", /application\/problem\+json/);
      expect(response.text).not.toMatch(SENSITIVE_DATABASE_DETAILS);
      expect(response.text).not.toContain("stack");
      const problem = ProblemDetailsSchema.parse(response.body as unknown);
      const loggedDetails = JSON.stringify(loggedErrors);

      expect(problem.code).toBe("SERVICE_UNAVAILABLE");
      expect(problem.requestId).toBe(response.headers["x-request-id"]);
      expect(loggedErrors).toContainEqual([
        expect.stringMatching(
          new RegExp(`requestId=${problem.requestId} status=503 errorType=`),
        ),
        undefined,
        "ProblemDetailsFilter",
      ]);
      expect(loggedDetails).not.toMatch(SENSITIVE_DATABASE_DETAILS);
    } finally {
      await downApp.close();
    }
  });
});
