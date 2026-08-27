import { describe, expect, it } from "vitest";

import {
  AuthUserSchema,
  CreateReviewRequestSchema,
  FestivalDiscoveryItemSchema,
  FestivalDiscoveryQuerySchema,
  FestivalDiscoveryResponseSchema,
  HealthResponseSchema,
  ListPlacesQuerySchema,
  MyReviewsResponseSchema,
  NearbyPlacesQuerySchema,
  NearbyPlacesResponseSchema,
  PlaceDetailResponseSchema,
  PlaceListItemSchema,
  PlaceRankingResponseSchema,
  ListPlaceRankingsQuerySchema,
  PlacesPageSchema,
  PlaceRankingAudienceSchema,
  ProblemDetailsSchema,
  ReviewIdParamsSchema,
  ReviewItemSchema,
  UpdateReviewRequestSchema,
} from "./index.js";

describe("AuthUserSchema", () => {
  it("exposes the authenticated user without provider identity details", () => {
    const authUser = AuthUserSchema.parse({
      id: "10000000-0000-4000-8000-000000000001",
      displayName: "해뜸 여행자",
      profileImageUrl: null,
    });

    expect(authUser).toEqual({
      id: "10000000-0000-4000-8000-000000000001",
      displayName: "해뜸 여행자",
      profileImageUrl: null,
    });
    expect(
      AuthUserSchema.parse({ ...authUser, providerUserId: "do-not-expose" }),
    ).toEqual(authUser);
    expect(() =>
      AuthUserSchema.parse({ ...authUser, id: "not-a-uuid" }),
    ).toThrow();
  });
});

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

  it("accepts a factual place detail with nullable provider fields", () => {
    const detail = PlaceDetailResponseSchema.parse({
      id: "24684077-a907-45c3-85bf-b509dab12377",
      title: "에버랜드",
      category: { primary: "VE", secondary: null, tertiary: null },
      region: "gyeonggi",
      district: "용인시",
      address: "경기도 용인시 처인구 포곡읍 에버랜드로 199",
      longitude: 127.2025,
      latitude: 37.2939,
      telephone: null,
      homepage: null,
      overview: null,
      images: [],
      introduction: {
        infoCenter: null,
        restDate: null,
        useSeason: null,
        useTime: null,
        parking: null,
        experienceAgeRange: null,
        experienceGuide: null,
        babyCarriage: null,
        creditCard: null,
        pet: null,
      },
      information: [],
      detailSyncedAt: null,
    });

    expect(detail.title).toBe("에버랜드");
    expect(() =>
      PlaceDetailResponseSchema.parse({ ...detail, id: "everland" }),
    ).toThrow();
  });

  it("defaults nearby search and validates ready or unavailable responses", () => {
    expect(NearbyPlacesQuerySchema.parse({})).toEqual({
      category: "attraction",
      limit: 10,
    });
    expect(() => NearbyPlacesQuerySchema.parse({ limit: 16 })).toThrow();

    expect(
      NearbyPlacesResponseSchema.parse({
        status: "unavailable",
        reason: "provider_not_configured",
      }),
    ).toEqual({
      status: "unavailable",
      reason: "provider_not_configured",
    });

    const ready = {
      status: "ready",
      category: "restaurant",
      partial: false,
      items: [
        {
          provider: "KAKAO_LOCAL",
          providerPlaceId: "26338954",
          title: "한식당",
          categoryLabel: "음식점 > 한식",
          telephone: null,
          address: null,
          roadAddress: null,
          longitude: 127.059,
          latitude: 37.512,
          distanceMeters: 418,
          placeUrl: "https://place.map.kakao.com/26338954",
        },
      ],
    } as const;

    expect(NearbyPlacesResponseSchema.parse(ready)).toEqual(ready);
    expect(() =>
      NearbyPlacesResponseSchema.parse({
        ...ready,
        items: [{ ...ready.items[0], placeUrl: "https://example.com/place" }],
      }),
    ).toThrow();
    expect(() =>
      NearbyPlacesResponseSchema.parse({
        status: "unavailable",
        reason: "unknown",
      }),
    ).toThrow();
  });
});

describe("festival discovery contracts", () => {
  const item = {
    id: "84549352-0c20-4e11-af50-2d4f278f41ef",
    externalId: "141268",
    title: "서천 홍원항 자연산 전어 꽃게 축제",
    status: "ONGOING",
    eventStartDate: "2026-08-22",
    eventEndDate: "2026-09-06",
    address: null,
    categoryLabel: "지역특산물축제",
    primaryImageUrl: null,
  } as const;

  it("defaults the festival region and pagination", () => {
    expect(FestivalDiscoveryQuerySchema.parse({})).toEqual({
      region: "all",
      page: 1,
      pageSize: 20,
    });
  });

  it("accepts every approved region and rejects invalid pagination", () => {
    for (const region of [
      "all",
      "jeju",
      "seoul",
      "busan",
      "gangwon",
      "gyeongju",
      "jeonju",
    ]) {
      expect(FestivalDiscoveryQuerySchema.parse({ region }).region).toBe(
        region,
      );
    }
    expect(() =>
      FestivalDiscoveryQuerySchema.parse({ region: "incheon" }),
    ).toThrow();
    expect(() => FestivalDiscoveryQuerySchema.parse({ page: 0 })).toThrow();
    expect(() =>
      FestivalDiscoveryQuerySchema.parse({ pageSize: 41 }),
    ).toThrow();
  });

  it("accepts factual festival fields and rejects invalid dates or statuses", () => {
    expect(FestivalDiscoveryItemSchema.parse(item)).toEqual(item);
    expect(() =>
      FestivalDiscoveryItemSchema.parse({
        ...item,
        eventStartDate: "2026-02-30",
      }),
    ).toThrow();
    expect(() =>
      FestivalDiscoveryItemSchema.parse({ ...item, status: "ENDED" }),
    ).toThrow();
    expect(() =>
      FestivalDiscoveryItemSchema.parse({
        ...item,
        primaryImageUrl: "https://example.com/unapproved.jpg",
      }),
    ).toThrow();
  });

  it("accepts a ranking and paginated list response", () => {
    expect(
      FestivalDiscoveryResponseSchema.parse({
        asOfDate: "2026-08-25",
        region: "all",
        ranking: [{ ...item, rank: 1 }],
        items: [item],
        page: 1,
        pageSize: 20,
        totalCount: 1,
      }),
    ).toMatchObject({
      asOfDate: "2026-08-25",
      ranking: [{ rank: 1 }],
      totalCount: 1,
    });
    expect(() =>
      FestivalDiscoveryResponseSchema.parse({
        asOfDate: "2026-08-25",
        region: "all",
        ranking: [{ ...item, rank: 4 }],
        items: [item],
        page: 1,
        pageSize: 20,
        totalCount: 1,
      }),
    ).toThrow();
  });
});

describe("place ranking contracts", () => {
  it("defaults the audience and limit and accepts only approved audiences", () => {
    expect(ListPlaceRankingsQuerySchema.parse({})).toEqual({
      audience: "all",
      limit: 10,
    });

    for (const audience of ["all", "20s", "30s", "40s", "50s", "60s-plus"]) {
      expect(PlaceRankingAudienceSchema.parse(audience)).toBe(audience);
    }

    expect(() =>
      ListPlaceRankingsQuerySchema.parse({ audience: "teens", limit: 11 }),
    ).toThrow();
    expect(() =>
      ListPlaceRankingsQuerySchema.parse({ audience: "all", limit: 11 }),
    ).toThrow();
  });

  it("accepts percentages, nullable place matching and media, and ISO dates", () => {
    expect(
      PlaceRankingResponseSchema.parse({
        source: "KTO_DATALAB",
        scope: "national",
        periodStart: "2025-08-01",
        periodEnd: "2026-07-31",
        audience: "all",
        items: [
          {
            rank: 1,
            sourcePlaceId: "3f73bffa7c6d98063eebe1ecd3305da6",
            title: "에버랜드",
            category: "레저/스포츠",
            sharePercent: 9,
            placeId: null,
            primaryImageUrl: null,
            imageCopyrightType: null,
          },
        ],
      }).items[0]?.sharePercent,
    ).toBe(9);
  });

  it("rejects out-of-range percentages and invalid dates", () => {
    const item = {
      rank: 1,
      sourcePlaceId: "3f73bffa7c6d98063eebe1ecd3305da6",
      title: "에버랜드",
      category: "레저/스포츠",
      sharePercent: 9,
      placeId: null,
      primaryImageUrl: null,
      imageCopyrightType: null,
    };
    const response = {
      source: "KTO_DATALAB",
      scope: "national",
      periodStart: "2025-08-01",
      periodEnd: "2026-07-31",
      audience: "all",
      items: [item],
    };

    expect(() =>
      PlaceRankingResponseSchema.parse({
        ...response,
        items: [{ ...item, sharePercent: 0 }],
      }),
    ).toThrow();
    expect(() =>
      PlaceRankingResponseSchema.parse({
        ...response,
        periodStart: "2025-02-30",
      }),
    ).toThrow();
  });
});

describe("reviews contracts", () => {
  const review = {
    id: "347c54e6-91ac-46b0-a371-176364401f82",
    placeId: "6c9bc5a5-836e-420c-bce4-ef68ff421233",
    placeTitle: "에버랜드",
    location: "경기 용인",
    rating: 5,
    content: "다시 방문하고 싶은 곳이에요.",
    primaryImageUrl: null,
    createdAt: "2026-08-26T03:00:00.000Z",
    updatedAt: "2026-08-26T03:00:00.000Z",
  };

  it("accepts and normalizes a create request", () => {
    expect(
      CreateReviewRequestSchema.parse({
        placeId: review.placeId,
        rating: 5,
        content: "  다시 방문하고 싶은 곳이에요.  ",
      }),
    ).toEqual({
      placeId: review.placeId,
      rating: 5,
      content: "다시 방문하고 싶은 곳이에요.",
    });
  });

  it("rejects malformed or incomplete review requests", () => {
    expect(() =>
      CreateReviewRequestSchema.parse({
        placeId: "not-a-uuid",
        rating: 4.5,
        content: "",
      }),
    ).toThrow();
    expect(() =>
      UpdateReviewRequestSchema.parse({
        placeId: review.placeId,
        rating: 4,
        content: "수정 내용",
      }),
    ).toThrow();
  });

  it("accepts review identifiers and response items", () => {
    expect(ReviewIdParamsSchema.parse({ reviewId: review.id })).toEqual({
      reviewId: review.id,
    });
    expect(ReviewItemSchema.parse(review)).toEqual(review);
    expect(MyReviewsResponseSchema.parse({ items: [review] })).toEqual({
      items: [review],
    });
  });
});
