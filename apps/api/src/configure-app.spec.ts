import { ConfigService } from "@nestjs/config";
import { Controller, Get, Req, type INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Server } from "node:http";
import type { Request } from "express";
import request from "supertest";

import { configureApp } from "./configure-app.js";

type CookieRequest = Omit<Request, "cookies"> & {
  cookies: Record<string, string>;
};

function getHttpServer(application: INestApplication): Server {
  return application.getHttpServer() as Server;
}

@Controller("cookie")
class CookieController {
  @Get()
  readSessionCookie(@Req() incomingRequest: CookieRequest): {
    session: string | undefined;
  } {
    return { session: incomingRequest.cookies.haetteum_session };
  }
}

describe("configureApp", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [CookieController],
      providers: [
        {
          provide: ConfigService,
          useValue: {
            get: () => "http://localhost:3000",
          },
        },
      ],
    }).compile();

    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("parses the session Cookie header before controllers handle a request", async () => {
    const response = await request(getHttpServer(app))
      .get("/api/v1/cookie")
      .set("Cookie", "haetteum_session=value")
      .expect(200);

    expect(response.body).toEqual({ session: "value" });
  });
});
