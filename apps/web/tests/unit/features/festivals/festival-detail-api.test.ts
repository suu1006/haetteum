import { describe, expect, it, vi } from "vitest";

import { loadFestivalDetail } from "@/features/festivals/festival-detail-api";

const detail = {
  id: "21c0f38f-de9f-46ce-9d98-08e6154886d3",
  externalId: "3351268",
  title: "동대문구 맥주축제",
  status: "ONGOING",
  eventStartDate: "2026-08-28",
  eventEndDate: "2026-08-29",
  address: "서울특별시 동대문구 장안동 24-1",
  categoryLabel: "문화예술축제",
  telephone: "02-3291-5506",
  longitude: 127.0753,
  latitude: 37.5666,
  primaryImageUrl: "https://tong.visitkorea.or.kr/cms/resource/21/a.jpg",
  homepage: "https://www.ddmac.or.kr/",
  overview: "도심형 여름 축제입니다.",
  eventPlace: "장안1수변공원",
  eventTime: "17:00~22:00",
  feeInfo: "입장료 무료 (주류, 식음료 유료)",
  program: "1. 메인프로그램: 메인 스테이지\n2. 부대프로그램: 비어 테라스",
  organizer: "동대문구",
  organizerTel: "02-3291-5506",
  hostAgency: "동대문문화재단",
  hostAgencyTel: null,
  images: [
    { url: "https://tong.visitkorea.or.kr/cms/resource/20/b.jpg", alt: "정문" },
  ],
} as const;

const baseUrl = "http://localhost:4000/api/v1";

describe("loadFestivalDetail", () => {
  it("fetches and validates the detail without caching", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(detail), { status: 200 }));

    await expect(
      loadFestivalDetail(detail.id, fetchImpl, baseUrl),
    ).resolves.toEqual({ status: "ready", data: detail });
    expect(fetchImpl).toHaveBeenCalledWith(
      `${baseUrl}/festivals/${detail.id}`,
      { cache: "no-store" },
    );
  });

  it("distinguishes not found from other load errors", async () => {
    const notFoundFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("missing", { status: 404 }));
    const errorFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("failure", { status: 503 }));

    await expect(
      loadFestivalDetail(detail.id, notFoundFetch, baseUrl),
    ).resolves.toEqual({ status: "not-found" });
    await expect(
      loadFestivalDetail(detail.id, errorFetch, baseUrl),
    ).resolves.toEqual({ status: "error" });
  });

  it("returns an error when the base URL is missing or the payload is malformed", async () => {
    await expect(loadFestivalDetail(detail.id, vi.fn(), "")).resolves.toEqual({
      status: "error",
    });

    const badFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ id: "x" }), { status: 200 }));
    await expect(
      loadFestivalDetail(detail.id, badFetch, baseUrl),
    ).resolves.toEqual({ status: "error" });
  });
});
