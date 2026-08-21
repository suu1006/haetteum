import type { Server } from "node:http";
import { createServer, type AddressInfo } from "node:net";

import {
  HealthResponseSchema,
  ProblemDetailsSchema,
} from "@haetteum/contracts";
import type { INestApplication, LoggerService } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaHealthIndicator } from "@nestjs/terminus";
import { Test } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module.js";
import { configureApp } from "../src/configure-app.js";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SENSITIVE_DATABASE_DETAILS = /DATABASE_URL|SELECT|postgresql:\/\//;

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

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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
