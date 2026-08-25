import { describe, expect, it } from "vitest";

import {
  HealthResponseSchema,
  ListPlacesQuerySchema,
  PlaceListItemSchema,
  PlacesPageSchema,
  ProblemDetailsSchema,
} from "./index.js";

describe("HealthResponseSchema", () => {
  it("accepts the direct Terminus success response", () => {
    expect(
      HealthResponseSchema.parse({
        status: "ok",
        info: { database: { status: "up" } },
        error: {},
        details: { database: { status: "up" } },
      }),
    ).toEqual({
      status: "ok",
      info: { database: { status: "up" } },
      error: {},
      details: { database: { status: "up" } },
    });
  });
});

describe("ProblemDetailsSchema", () => {
  it("accepts an RFC 9457 problem with Haetteum extensions", () => {
    expect(
      ProblemDetailsSchema.parse({
        type: "about:blank",
        title: "Bad Request",
        status: 400,
        detail: "요청값이 올바르지 않습니다.",
        instance: "/api/v1/example",
        code: "VALIDATION_ERROR",
        requestId: "f2e09553-1b48-40de-8d6e-a3d68a0d9636",
        errors: [{ path: "body.name", message: "필수 값입니다." }],
      }).code,
    ).toBe("VALIDATION_ERROR");
  });

  it("rejects success status codes", () => {
    expect(() =>
      ProblemDetailsSchema.parse({
        type: "about:blank",
        title: "OK",
        status: 200,
        detail: "not an error",
        instance: "/api/v1/health",
        code: "OK",
        requestId: "f2e09553-1b48-40de-8d6e-a3d68a0d9636",
      }),
    ).toThrow();
  });
});

describe("places contracts", () => {
  it("defaults pagination and trims a search query", () => {
    expect(
      ListPlacesQuerySchema.parse({ region: "jeju", q: "  성산  " }),
    ).toEqual({
      region: "jeju",
      page: 1,
      pageSize: 20,
      q: "성산",
    });
  });

  it("rejects an unsupported region and an oversized page", () => {
    expect(() => ListPlacesQuerySchema.parse({ region: "incheon" })).toThrow();
    expect(() =>
      ListPlacesQuerySchema.parse({ region: "jeju", pageSize: 101 }),
    ).toThrow();
  });

  it("accepts a direct page response with nullable media and location", () => {
    const item = PlaceListItemSchema.parse({
      id: "84549352-0c20-4e11-af50-2d4f278f41ef",
      title: "성산일출봉",
      region: "jeju",
      district: null,
      address: null,
      longitude: null,
      latitude: null,
      primaryImageUrl: null,
      imageCopyrightType: null,
    });

    expect(
      PlacesPageSchema.parse({
        items: [item],
        page: 1,
        pageSize: 20,
        totalCount: 1,
      }),
    ).toEqual({
      items: [item],
      page: 1,
      pageSize: 20,
      totalCount: 1,
    });
  });
});
