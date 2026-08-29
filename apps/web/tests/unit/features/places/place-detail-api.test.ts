import { describe, expect, it, vi } from "vitest";

import {
  loadPlaceCourses,
  loadPlaceDetail,
  loadPlaceReviews,
} from "@/features/places/place-detail-api";

const detail = {
  id: "24684077-a907-45c3-85bf-b509dab12377",
  title: "에버랜드",
  category: { primary: "VE", secondary: null, tertiary: null },
  region: "gyeonggi",
  district: "용인시",
  address: "경기 용인시",
  longitude: 127.2,
  latitude: 37.2,
  telephone: null,
  homepage: null,
  overview: "테마파크",
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
} as const;

describe("loadPlaceDetail", () => {
  it("fetches and validates one UUID detail without caching", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(detail), { status: 200 }),
    );
    await expect(
      loadPlaceDetail(detail.id, fetchImpl, "http://localhost:4000/api/v1"),
    ).resolves.toEqual({ status: "ready", data: detail });
    expect(fetchImpl).toHaveBeenCalledWith(
      `http://localhost:4000/api/v1/places/${detail.id}`,
      { cache: "no-store" },
    );
  });

  it("distinguishes not found from other load errors", async () => {
    const notFoundFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("missing", { status: 404 }),
    );
    const errorFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("failure", { status: 503 }),
    );
    await expect(
      loadPlaceDetail(detail.id, notFoundFetch, "http://localhost:4000/api/v1"),
    ).resolves.toEqual({ status: "not-found" });
    await expect(
      loadPlaceDetail(detail.id, errorFetch, "http://localhost:4000/api/v1"),
    ).resolves.toEqual({ status: "error" });
  });
});

const placeId = "24684077-a907-45c3-85bf-b509dab12377";
const apiBase = "http://localhost:4000/api/v1";

const reviews = {
  placeId,
  reviewCount: 1,
  averageRating: 4,
  ratingDistribution: [
    { score: 5, count: 0 },
    { score: 4, count: 1 },
    { score: 3, count: 0 },
    { score: 2, count: 0 },
    { score: 1, count: 0 },
  ],
  items: [
    {
      id: "10000000-0000-4000-8000-000000000001",
      rating: 4,
      content: "좋았어요",
      author: { displayName: "정수", profileImageUrl: null },
      createdAt: "2026-08-25T03:00:00.000Z",
      updatedAt: "2026-08-25T03:00:00.000Z",
    },
  ],
} as const;

const courses = {
  placeId,
  source: "TOUR_API",
  items: [
    {
      id: "20000000-0000-4000-8000-000000000001",
      title: "연천 하루 코스",
      overview: null,
      takeTime: "1일",
      distance: "65.93km",
      schedule: "기타",
      theme: "지자체",
      imageUrl: null,
      stops: [
        {
          sequence: 1,
          placeId: null,
          title: "재인폭포",
          overview: null,
          imageUrl: null,
        },
      ],
    },
  ],
} as const;

describe("loadPlaceReviews", () => {
  it("fetches and validates the public review summary without caching", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(reviews), { status: 200 }));

    await expect(
      loadPlaceReviews(placeId, fetchImpl, apiBase),
    ).resolves.toEqual({ status: "ready", data: reviews });
    expect(fetchImpl).toHaveBeenCalledWith(
      `${apiBase}/place-reviews/${placeId}`,
      { cache: "no-store" },
    );
  });

  it("reports an error for a non-OK response", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("", { status: 404 }));

    await expect(
      loadPlaceReviews(placeId, fetchImpl, apiBase),
    ).resolves.toEqual({ status: "error" });
  });

  it("reports an error for a payload that breaks the contract", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ...reviews, reviewCount: -1 }), {
        status: 200,
      }),
    );

    await expect(
      loadPlaceReviews(placeId, fetchImpl, apiBase),
    ).resolves.toEqual({ status: "error" });
  });

  it("reports an error when the API base URL is missing", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    await expect(loadPlaceReviews(placeId, fetchImpl, "")).resolves.toEqual({
      status: "error",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe("loadPlaceCourses", () => {
  it("fetches and validates the course list without caching", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(courses), { status: 200 }));

    await expect(
      loadPlaceCourses(placeId, fetchImpl, apiBase),
    ).resolves.toEqual({ status: "ready", data: courses });
    expect(fetchImpl).toHaveBeenCalledWith(
      `${apiBase}/place-courses/${placeId}`,
      { cache: "no-store" },
    );
  });

  it("keeps an empty course list as a ready state", async () => {
    const empty = { placeId, source: "TOUR_API", items: [] };
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(empty), { status: 200 }));

    await expect(
      loadPlaceCourses(placeId, fetchImpl, apiBase),
    ).resolves.toEqual({ status: "ready", data: empty });
  });

  it("reports an error when the request throws", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error("network down"));

    await expect(
      loadPlaceCourses(placeId, fetchImpl, apiBase),
    ).resolves.toEqual({ status: "error" });
  });
});
