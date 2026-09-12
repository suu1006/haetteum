import { afterEach, describe, expect, it } from "@jest/globals";
import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { configureApp } from "../configure-app.js";
import { WeeklyRecommendationsController } from "./weekly-recommendations.controller.js";
import { WeeklyRecommendationsService } from "./weekly-recommendations.service.js";

describe("Weekly recommendations HTTP route", () => {
  let app: INestApplication | undefined;
  afterEach(async () => {
    await app?.close();
  });
  it("serves twenty edition snapshots without caching at the public versioned route", async () => {
    const payload = {
      week: "2026-09-14",
      items: Array.from({ length: 20 }, (_, i) => ({
        id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
        title: `추천 장소 ${i + 1}`,
        region: "seoul",
        district: "종로구",
        address: "서울 종로구",
        latitude: 37.57,
        longitude: 126.98,
        primaryImageUrl: `https://cdn.example.com/uploads/weekly/${String(i).padStart(64, "0")}.webp`,
        imageCopyrightType: "Type1",
      })),
    };
    const module = await Test.createTestingModule({
      controllers: [WeeklyRecommendationsController],
      providers: [
        {
          provide: WeeklyRecommendationsService,
          useValue: { current: () => Promise.resolve(payload) },
        },
        {
          provide: ConfigService,
          useValue: new ConfigService({ WEB_ORIGIN: "http://localhost:3000" }),
        },
      ],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.listen(0, "127.0.0.1");
    const response = await request(
      app.getHttpServer() as Parameters<typeof request>[0],
    )
      .get("/api/v1/places/recommendations/weekly")
      .expect(200)
      .expect("Cache-Control", "no-store");
    expect(response.body).toEqual(payload);
  });
});
