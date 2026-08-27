import { describe, expect, it, vi } from "vitest";

import { loadPlaceDetail } from "@/features/places/place-detail-api";

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
