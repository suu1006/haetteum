import { describe, expect, it } from "vitest";

import {
  AuthUserSchema,
  CreateReviewRequestSchema,
  FestivalDetailResponseSchema,
  FestivalDiscoveryItemSchema,
  FestivalDiscoveryQuerySchema,
  FestivalDiscoveryResponseSchema,
  GeneratedCourseResponseSchema,
  HealthResponseSchema,
  HotPlaceRankingResponseSchema,
  ListHotPlaceRankingsQuerySchema,
  ListPlacesQuerySchema,
  MyReviewsResponseSchema,
  NearbyPlacesQuerySchema,
  NearbyPlacesResponseSchema,
  PlaceDetailResponseSchema,
  PlaceListItemSchema,
  PlaceRankingResponseSchema,
  ListPlaceRankingsQuerySchema,
  ListPopularReelsQuerySchema,
  PlaceCourseItemSchema,
  PlaceCoursesResponseSchema,
  PlaceReelItemSchema,
  PlaceReelListResponseSchema,
  PlaceReviewsResponseSchema,
  PopularReelsResponseSchema,
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

  it("validates a generated course's anchor and Kakao stops, and rejects a bad placeUrl", () => {
    const ready = {
      status: "ready",
      partial: false,
      stops: [
        {
          role: "anchor",
          sequence: 1,
          placeId: "24684077-a907-45c3-85bf-b509dab12377",
          title: "에버랜드",
          categoryLabel: null,
          address: "경기 용인시",
          longitude: 127.2,
          latitude: 37.2,
          distanceMeters: 0,
          placeUrl: null,
        },
        {
          role: "attraction",
          sequence: 2,
          placeId: null,
          title: "캐리비안 베이",
          categoryLabel: "관광,명소 > 워터파크",
          address: null,
          longitude: 127.201,
          latitude: 37.201,
          distanceMeters: 300,
          placeUrl: "https://place.map.kakao.com/26338954",
        },
      ],
    } as const;

    expect(GeneratedCourseResponseSchema.parse(ready)).toEqual(ready);
    expect(() =>
      GeneratedCourseResponseSchema.parse({
        ...ready,
        stops: [
          { ...ready.stops[1], placeUrl: "https://example.com/place" },
        ],
      }),
    ).toThrow();
    expect(
      GeneratedCourseResponseSchema.parse({
        status: "unavailable",
        reason: "coordinates_missing",
      }),
    ).toEqual({ status: "unavailable", reason: "coordinates_missing" });
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

  it("accepts a festival detail response and enforces provider media/status", () => {
    const detail = {
      id: "84549352-0c20-4e11-af50-2d4f278f41ef",
      externalId: "141268",
      title: "서천 홍원항 자연산 전어 꽃게 축제",
      status: "ENDED",
      eventStartDate: "2026-08-22",
      eventEndDate: "2026-09-06",
      address: "충청남도 서천군 서면 홍원길",
      categoryLabel: "지역특산물축제",
      telephone: "041-000-0000",
      longitude: 126.5,
      latitude: 36.1,
      primaryImageUrl: "https://tong.visitkorea.or.kr/cms/resource/1/a.jpg",
      homepage: "https://festival.example.or.kr",
      overview: "가을 제철 수산물을 즐기는 지역 축제입니다.",
      eventPlace: "홍원항 특설무대",
      eventTime: "10:00~18:00",
      feeInfo: "입장료 무료",
      program: "1. 개막식\n2. 전어 맨손잡기 체험",
      organizer: "서천군",
      organizerTel: "041-000-0000",
      hostAgency: "서천군축제위원회",
      hostAgencyTel: null,
      images: [
        {
          url: "https://tong.visitkorea.or.kr/cms/resource/2/b.jpg",
          alt: "축제 현장",
        },
      ],
    } as const;

    expect(FestivalDetailResponseSchema.parse(detail)).toEqual(detail);
    expect(() =>
      FestivalDetailResponseSchema.parse({ ...detail, status: "SOON" }),
    ).toThrow();
    expect(() =>
      FestivalDetailResponseSchema.parse({
        ...detail,
        images: [{ url: "https://example.com/x.jpg", alt: "bad host" }],
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
            imageAttribution: null,
            imageAttributionUrl: null,
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
      imageAttribution: null,
      imageAttributionUrl: null,
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

describe("hot place ranking contracts", () => {
  const item = {
    rank: 1,
    sourcePlaceId: "5ceb29adcd4b4944f1d50efcfac3aa12",
    title: "장릉",
    category: "관광명소",
    provinceName: "강원특별자치도",
    districtName: "영월군",
    growthPercent: 398.9,
    placeId: null,
    primaryImageUrl: null,
    imageCopyrightType: null,
    imageAttribution: null,
    imageAttributionUrl: null,
  };
  const response = {
    source: "KTO_DATALAB",
    scope: "national",
    baseYearMonth: "202607",
    periodStart: "2026-07-01",
    periodEnd: "2026-07-31",
    audience: "all",
    items: [item],
  };

  it("defaults the audience and limit and accepts only approved audiences", () => {
    expect(ListHotPlaceRankingsQuerySchema.parse({})).toEqual({
      audience: "all",
      limit: 10,
    });
    expect(() =>
      ListHotPlaceRankingsQuerySchema.parse({ audience: "teens" }),
    ).toThrow();
    expect(() =>
      ListHotPlaceRankingsQuerySchema.parse({ audience: "all", limit: 11 }),
    ).toThrow();
  });

  it("keeps growth percentages above 100 and requires the base year month", () => {
    expect(
      HotPlaceRankingResponseSchema.parse(response).items[0]?.growthPercent,
    ).toBe(398.9);
    expect(
      HotPlaceRankingResponseSchema.parse({
        ...response,
        items: [{ ...item, growthPercent: 959.6 }],
      }).items[0]?.growthPercent,
    ).toBe(959.6);
    expect(() =>
      HotPlaceRankingResponseSchema.parse({
        ...response,
        baseYearMonth: "2026-07",
      }),
    ).toThrow();
    expect(() =>
      HotPlaceRankingResponseSchema.parse({
        ...response,
        items: [{ ...item, growthPercent: 0 }],
      }),
    ).toThrow();
  });
});

describe("place reels contracts", () => {
  const reel = {
    provider: "YOUTUBE",
    videoId: "dQw4w9WgXcQ",
    title: "성산일출봉 일출 브이로그",
    channelTitle: "여행하는 haetteum",
    thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/oardefault.jpg",
    durationSeconds: 42,
    viewCount: 128000,
    publishedAt: "2026-08-20T21:00:00.000Z",
    embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  } as const;

  it("accepts a factual reel item with a nullable view count", () => {
    expect(PlaceReelItemSchema.parse(reel)).toEqual(reel);
    expect(PlaceReelItemSchema.parse({ ...reel, viewCount: null }).viewCount).toBe(
      null,
    );
  });

  it("rejects a non-short duration and a malformed video id", () => {
    expect(() =>
      PlaceReelItemSchema.parse({ ...reel, durationSeconds: 61 }),
    ).toThrow();
    expect(() =>
      PlaceReelItemSchema.parse({ ...reel, videoId: "too-short" }),
    ).toThrow();
  });

  it("accepts a per-place list response and a nullable fetchedAt", () => {
    const response = PlaceReelListResponseSchema.parse({
      placeId: "84549352-0c20-4e11-af50-2d4f278f41ef",
      source: "YOUTUBE",
      fetchedAt: null,
      items: [reel],
    });

    expect(response.items).toHaveLength(1);
    expect(response.fetchedAt).toBe(null);
  });

  it("defaults the popular reels query and validates the aggregate response", () => {
    expect(ListPopularReelsQuerySchema.parse({})).toEqual({
      audience: "all",
      limit: 12,
    });
    expect(() =>
      ListPopularReelsQuerySchema.parse({ limit: 31 }),
    ).toThrow();

    expect(
      PopularReelsResponseSchema.parse({
        source: "YOUTUBE",
        audience: "all",
        items: [
          {
            ...reel,
            placeId: "84549352-0c20-4e11-af50-2d4f278f41ef",
            placeTitle: "성산일출봉",
            region: "제주특별자치도",
          },
        ],
      }).items[0]?.placeTitle,
    ).toBe("성산일출봉");
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

describe("place course contracts", () => {
  const placeId = "84549352-0c20-4e11-af50-2d4f278f41ef";
  const course = {
    id: "0e4b9e9b-2b8a-4d61-9b6b-2f5c1b0f9d21",
    title: "선사유적지와 분단의 현장에 발을 딛다.",
    overview: "경기도 최북단 연천을 걷는 하루 코스.",
    takeTime: "1일",
    distance: "65.93km",
    schedule: "기타",
    theme: "지자체",
    imageUrl: "https://tong.visitkorea.or.kr/cms/resource/13/1049613_image2_1.jpg",
    stops: [
      {
        sequence: 1,
        placeId,
        title: "재인폭포",
        overview: "한탄강 서쪽에 자리한 폭포.",
        imageUrl: null,
      },
    ],
  } as const;

  it("accepts a course whose provider fields are all absent", () => {
    const sparse = PlaceCourseItemSchema.parse({
      ...course,
      overview: null,
      takeTime: null,
      distance: null,
      schedule: null,
      theme: null,
      imageUrl: null,
    });

    expect(sparse.takeTime).toBe(null);
    expect(sparse.imageUrl).toBe(null);
  });

  it("keeps a stop we do not carry addressable by title alone", () => {
    const stop = PlaceCourseItemSchema.parse({
      ...course,
      stops: [{ ...course.stops[0], placeId: null }],
    }).stops[0];

    expect(stop?.placeId).toBe(null);
    expect(stop?.title).toBe("재인폭포");
  });

  it("rejects a stop sequence that does not start counting from one", () => {
    expect(() =>
      PlaceCourseItemSchema.parse({
        ...course,
        stops: [{ ...course.stops[0], sequence: 0 }],
      }),
    ).toThrow();
  });

  it("treats an empty course list as a valid response", () => {
    expect(
      PlaceCoursesResponseSchema.parse({
        placeId,
        source: "TOUR_API",
        items: [],
      }).items,
    ).toEqual([]);
  });
});

describe("place review list contracts", () => {
  const placeId = "84549352-0c20-4e11-af50-2d4f278f41ef";
  const emptyDistribution = [
    { score: 5, count: 0 },
    { score: 4, count: 0 },
    { score: 3, count: 0 },
    { score: 2, count: 0 },
    { score: 1, count: 0 },
  ] as const;

  it("represents a place with no review as a null average", () => {
    const summary = PlaceReviewsResponseSchema.parse({
      placeId,
      reviewCount: 0,
      averageRating: null,
      ratingDistribution: emptyDistribution,
      items: [],
    });

    expect(summary.averageRating).toBe(null);
    expect(summary.items).toEqual([]);
  });

  it("exposes only the author's display name and avatar", () => {
    const item = PlaceReviewsResponseSchema.parse({
      placeId,
      reviewCount: 1,
      averageRating: 4.5,
      ratingDistribution: [
        { score: 5, count: 0 },
        { score: 4, count: 1 },
        { score: 3, count: 0 },
        { score: 2, count: 0 },
        { score: 1, count: 0 },
      ],
      items: [
        {
          id: "347c54e6-91ac-46b0-a371-176364401f82",
          rating: 4,
          content: "전망이 좋았습니다.",
          author: { displayName: "정수", profileImageUrl: null },
          createdAt: "2026-08-26T03:00:00.000Z",
          updatedAt: "2026-08-26T03:00:00.000Z",
        },
      ],
    }).items[0];

    expect(Object.keys(item?.author ?? {}).sort()).toEqual([
      "displayName",
      "profileImageUrl",
    ]);
  });

  it("requires a bucket for every score and rejects an out-of-range average", () => {
    expect(() =>
      PlaceReviewsResponseSchema.parse({
        placeId,
        reviewCount: 0,
        averageRating: null,
        ratingDistribution: emptyDistribution.slice(0, 4),
        items: [],
      }),
    ).toThrow();

    expect(() =>
      PlaceReviewsResponseSchema.parse({
        placeId,
        reviewCount: 1,
        averageRating: 5.5,
        ratingDistribution: emptyDistribution,
        items: [],
      }),
    ).toThrow();
  });
});
