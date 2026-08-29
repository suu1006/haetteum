import { describe, expect, it } from "vitest";

import type { FestivalDetailResponse } from "@haetteum/contracts";

import {
  buildFestivalDetailHref,
  formatFestivalDateRange,
  mapFestivalDetail,
} from "@/features/festivals/festival-detail-model";

const base: FestivalDetailResponse = {
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
};

describe("festival detail model", () => {
  it("builds a stable detail route", () => {
    expect(buildFestivalDetailHref("abc def")).toBe("/festivals/abc%20def");
  });

  it("formats a same-year date range", () => {
    expect(formatFestivalDateRange("2026-08-28", "2026-08-30")).toBe(
      "2026. 8. 28. – 8. 30.",
    );
    expect(formatFestivalDateRange("2026-12-30", "2027-01-02")).toBe(
      "2026. 12. 30. – 2027. 1. 2.",
    );
  });

  it("maps a ready response into the view model", () => {
    expect(mapFestivalDetail(base)).toEqual({
      id: base.id,
      title: "동대문구 맥주축제",
      status: "ongoing",
      statusLabel: "진행 중",
      dateLabel: "2026. 8. 28. – 8. 29.",
      location: "서울특별시 동대문구 장안동 24-1",
      categoryLabel: "문화예술축제",
      telephone: "02-3291-5506",
      homepage: "https://www.ddmac.or.kr/",
      mapUrl:
        "https://map.kakao.com/link/map/%EB%8F%99%EB%8C%80%EB%AC%B8%EA%B5%AC%20%EB%A7%A5%EC%A3%BC%EC%B6%95%EC%A0%9C,37.5666,127.0753",
      overview: "도심형 여름 축제입니다.",
      program: "1. 메인프로그램: 메인 스테이지\n2. 부대프로그램: 비어 테라스",
      eventInfo: [
        { id: "place", label: "행사 장소", value: "장안1수변공원" },
        { id: "time", label: "행사 시간", value: "17:00~22:00" },
        {
          id: "fee",
          label: "이용 요금",
          value: "입장료 무료 (주류, 식음료 유료)",
        },
        {
          id: "organizer",
          label: "주최/주관",
          value: "주최 동대문구 (02-3291-5506) · 주관 동대문문화재단",
        },
      ],
      primaryImage: {
        src: "https://tong.visitkorea.or.kr/cms/resource/21/a.jpg",
        alt: "동대문구 맥주축제 대표 이미지",
      },
      gallery: [
        {
          src: "https://tong.visitkorea.or.kr/cms/resource/20/b.jpg",
          alt: "정문",
        },
      ],
    });
  });

  it("falls back to the primary image when there is no gallery and marks past festivals ended", () => {
    const view = mapFestivalDetail({
      ...base,
      status: "ENDED",
      images: [],
      overview: null,
      latitude: null,
      longitude: null,
    });

    expect(view.status).toBe("ended");
    expect(view.statusLabel).toBe("종료");
    expect(view.mapUrl).toBeNull();
    expect(view.gallery).toEqual([view.primaryImage]);
  });

  it("handles a festival with no media", () => {
    const view = mapFestivalDetail({
      ...base,
      primaryImageUrl: null,
      images: [],
    });

    expect(view.primaryImage).toBeNull();
    expect(view.gallery).toEqual([]);
  });

  it("omits missing event info rows and drops the organizer telephone when absent", () => {
    const emptyView = mapFestivalDetail({
      ...base,
      eventPlace: null,
      eventTime: null,
      feeInfo: null,
      organizer: null,
      organizerTel: null,
      hostAgency: null,
      hostAgencyTel: null,
    });
    expect(emptyView.eventInfo).toEqual([]);

    const hostOnlyView = mapFestivalDetail({
      ...base,
      organizer: null,
      organizerTel: null,
      hostAgency: "동대문문화재단",
      hostAgencyTel: "02-0000-0000",
    });
    expect(hostOnlyView.eventInfo).toContainEqual({
      id: "organizer",
      label: "주최/주관",
      value: "주관 동대문문화재단 (02-0000-0000)",
    });
  });
});
