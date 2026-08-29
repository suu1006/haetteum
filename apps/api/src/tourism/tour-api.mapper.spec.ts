import { Prisma } from "../generated/prisma/client.js";

import {
  mapChangedPlace,
  mapCourseBundle,
  mapDistrict,
  mapFestival,
  mapPlace,
  mapPlaceDetail,
  mapPlaceDetailBundle,
} from "./tour-api.mapper.js";
import type {
  TourApiChangedPlace,
  TourApiFestival,
  TourApiPlace,
  TourApiPlaceImage,
  TourApiPlaceInfo,
  TourApiPlaceIntro,
} from "./tour-api.types.js";

const lastSyncedAt = new Date("2026-08-24T00:00:00.000Z");

const completePlace: TourApiPlace = {
  contentid: "2704412",
  contenttypeid: "12",
  title: "아침미소목장",
  addr1: "제주특별자치도 제주시 첨단동길 160-20",
  addr2: "목장 안내소",
  zipcode: "63312",
  mapx: "126.5851000000",
  mapy: "33.4541000000",
  mlevel: "6",
  tel: "064-727-2545",
  firstimage: "https://example.test/original.jpg",
  firstimage2: "https://example.test/thumb.jpg",
  cpyrhtDivCd: "Type1",
  createdtime: "20190717123456",
  modifiedtime: "20260720123456",
  lDongRegnCd: "50",
  lDongSignguCd: "110",
  lclsSystm1: "VE",
  lclsSystm2: "VE03",
  lclsSystm3: "VE030500",
};

const completeFestival: TourApiFestival = {
  contentid: "141268",
  contenttypeid: "15",
  title: "서천 홍원항 자연산 전어 꽃게 축제",
  eventstartdate: "20260822",
  eventenddate: "20260906",
  addr1: "충청남도 서천군 홍원길 88",
  addr2: "홍원항 일원",
  zipcode: "33657",
  mapx: "126.5012345",
  mapy: "36.1567890",
  mlevel: "6",
  tel: "041-000-0000",
  firstimage: "https://example.test/festival.jpg",
  firstimage2: "https://example.test/festival-thumb.jpg",
  cpyrhtDivCd: "Type1",
  createdtime: "20190717123456",
  modifiedtime: "20260824173655",
  lDongRegnCd: "44",
  lDongSignguCd: "770",
  lclsSystm1: "EV",
  lclsSystm2: "EV01",
  lclsSystm3: "EV010300",
};

describe("TourAPI mapper", () => {
  it("maps a complete festival into normalized database values", () => {
    expect(mapFestival(completeFestival, lastSyncedAt)).toEqual({
      source: "TOUR_API",
      externalId: "141268",
      contentTypeId: 15,
      title: "서천 홍원항 자연산 전어 꽃게 축제",
      eventStartDate: new Date("2026-08-22T00:00:00.000Z"),
      eventEndDate: new Date("2026-09-06T00:00:00.000Z"),
      providerRegionCode: "44",
      providerDistrictCode: "770",
      address1: "충청남도 서천군 홍원길 88",
      address2: "홍원항 일원",
      zipcode: "33657",
      longitude: new Prisma.Decimal("126.5012345"),
      latitude: new Prisma.Decimal("36.1567890"),
      mapLevel: 6,
      category1: "EV",
      category2: "EV01",
      category3: "EV010300",
      telephone: "041-000-0000",
      primaryImageUrl: "https://example.test/festival.jpg",
      primaryThumbnailUrl: "https://example.test/festival-thumb.jpg",
      imageCopyrightType: "Type1",
      providerCreatedAt: new Date("2019-07-17T03:34:56.000Z"),
      providerModifiedAt: new Date("2026-08-24T08:36:55.000Z"),
      isVisible: true,
      lastSyncedAt,
    });
  });

  it("rejects invalid festival type, classification, dates, and sync time", () => {
    expect(() =>
      mapFestival({ ...completeFestival, contenttypeid: "12" }, lastSyncedAt),
    ).toThrow("Invalid TourAPI festival content type");
    expect(() =>
      mapFestival({ ...completeFestival, lclsSystm1: "VE" }, lastSyncedAt),
    ).toThrow("Invalid TourAPI festival classification");
    expect(() =>
      mapFestival(
        { ...completeFestival, eventstartdate: "20260229" },
        lastSyncedAt,
      ),
    ).toThrow("Invalid TourAPI event date");
    expect(() =>
      mapFestival(
        {
          ...completeFestival,
          eventstartdate: "20260907",
          eventenddate: "20260906",
        },
        lastSyncedAt,
      ),
    ).toThrow("Invalid TourAPI festival date range");
    expect(() => mapFestival(completeFestival, new Date("invalid"))).toThrow(
      "Invalid last synced timestamp",
    );
  });

  it("maps optional festival values to null and rejects malformed coordinates", () => {
    expect(
      mapFestival(
        {
          ...completeFestival,
          lDongRegnCd: " ",
          lDongSignguCd: "",
          addr2: " ",
          mapx: "null",
          mapy: "",
          createdtime: "",
        },
        lastSyncedAt,
      ),
    ).toMatchObject({
      providerRegionCode: null,
      providerDistrictCode: null,
      address2: null,
      longitude: null,
      latitude: null,
      providerCreatedAt: null,
    });
    expect(() =>
      mapFestival({ ...completeFestival, mapx: "126.5E2" }, lastSyncedAt),
    ).toThrow("Invalid TourAPI coordinate");
  });

  it("maps a district item into normalized database values", () => {
    expect(
      mapDistrict({
        lDongRegnCd: "50",
        lDongRegnNm: "제주특별자치도",
        lDongSignguCd: "110",
        lDongSignguNm: "제주시",
      }),
    ).toEqual({
      providerCode: "110",
      name: "제주시",
    });
  });

  it("maps a complete place item into normalized database values", () => {
    expect(mapPlace(completePlace, lastSyncedAt)).toEqual({
      source: "TOUR_API",
      externalId: "2704412",
      contentTypeId: 12,
      title: "아침미소목장",
      address1: "제주특별자치도 제주시 첨단동길 160-20",
      address2: "목장 안내소",
      zipcode: "63312",
      longitude: new Prisma.Decimal("126.5851000000"),
      latitude: new Prisma.Decimal("33.4541000000"),
      mapLevel: 6,
      category1: "VE",
      category2: "VE03",
      category3: "VE030500",
      telephone: "064-727-2545",
      primaryImageUrl: "https://example.test/original.jpg",
      primaryThumbnailUrl: "https://example.test/thumb.jpg",
      imageCopyrightType: "Type1",
      providerCreatedAt: new Date("2019-07-17T03:34:56.000Z"),
      providerModifiedAt: new Date("2026-07-20T03:34:56.000Z"),
      isVisible: true,
      lastSyncedAt,
    });
  });

  it("trims optional strings and maps empty strings to null", () => {
    const mapped = mapPlace(
      {
        ...completePlace,
        addr1: "  제주특별자치도 제주시 첨단동길 160-20  ",
        addr2: "   ",
        zipcode: "  63312  ",
        mapx: " ",
        mapy: "",
        mlevel: "  ",
        tel: "  064-727-2545  ",
        firstimage: " ",
        firstimage2: "  https://example.test/thumb.jpg  ",
        cpyrhtDivCd: "\t",
        createdtime: "",
        lclsSystm1: "  VE  ",
        lclsSystm2: "",
        lclsSystm3: "  VE030500  ",
      },
      lastSyncedAt,
    );

    expect(mapped).toMatchObject({
      address1: "제주특별자치도 제주시 첨단동길 160-20",
      address2: null,
      zipcode: "63312",
      longitude: null,
      latitude: null,
      mapLevel: null,
      category1: "VE",
      category2: null,
      category3: "VE030500",
      telephone: "064-727-2545",
      primaryImageUrl: null,
      primaryThumbnailUrl: "https://example.test/thumb.jpg",
      imageCopyrightType: null,
      providerCreatedAt: null,
    });
  });

  it('maps TourAPI literal "null" coordinates to absent coordinates', () => {
    const mapped = mapPlace(
      {
        ...completePlace,
        mapx: "null",
        mapy: "null",
      },
      lastSyncedAt,
    );

    expect(mapped).toMatchObject({
      longitude: null,
      latitude: null,
      mapLevel: 6,
    });
  });

  it("parses WGS84 decimals, map level, and 14-digit provider timestamps", () => {
    const mapped = mapPlace(
      {
        ...completePlace,
        mapx: " 126.5851000000 ",
        mapy: " 33.4541000000 ",
        mlevel: " 6 ",
        createdtime: "20190717123456",
        modifiedtime: "20260720123456",
      },
      lastSyncedAt,
    );

    expect(mapped.longitude?.toString()).toBe("126.5851");
    expect(mapped.latitude?.toString()).toBe("33.4541");
    expect(mapped.mapLevel).toBe(6);
    expect(mapped.providerCreatedAt?.toISOString()).toBe(
      "2019-07-17T03:34:56.000Z",
    );
    expect(mapped.providerModifiedAt.toISOString()).toBe(
      "2026-07-20T03:34:56.000Z",
    );
  });

  it("rejects a malformed content ID, coordinate, content type, or timestamp", () => {
    expect(() =>
      mapPlace({ ...completePlace, contentid: "  " }, lastSyncedAt),
    ).toThrow("Invalid TourAPI content ID");
    expect(() =>
      mapPlace({ ...completePlace, mapx: "126.58E2" }, lastSyncedAt),
    ).toThrow("Invalid TourAPI coordinate");
    expect(() =>
      mapPlace({ ...completePlace, contenttypeid: "14" }, lastSyncedAt),
    ).toThrow("Invalid TourAPI content type");
    expect(() =>
      mapPlace({ ...completePlace, modifiedtime: "20260720" }, lastSyncedAt),
    ).toThrow("Invalid TourAPI timestamp");
    expect(() =>
      mapPlace({ ...completePlace, title: " " }, lastSyncedAt),
    ).toThrow("Invalid TourAPI title");
    expect(() =>
      mapPlace({ ...completePlace, lDongRegnCd: " " }, lastSyncedAt),
    ).toThrow("Invalid TourAPI region code");
  });

  it("rejects an impossible calendar day in a provider timestamp", () => {
    expect(() =>
      mapPlace(
        { ...completePlace, modifiedtime: "20260231123456" },
        lastSyncedAt,
      ),
    ).toThrow("Invalid TourAPI timestamp");
  });

  it("rejects February 29 in a non-leap year", () => {
    expect(() =>
      mapPlace(
        { ...completePlace, modifiedtime: "20260229123456" },
        lastSyncedAt,
      ),
    ).toThrow("Invalid TourAPI timestamp");
  });

  it("maps showflag 0 to invisible and preserves oldContentid separately", () => {
    const changedPlace: TourApiChangedPlace = {
      ...completePlace,
      showflag: "0",
      oldContentid: " 2704000 ",
    };

    const mapped = mapChangedPlace(changedPlace, lastSyncedAt);

    expect(mapped.place).toMatchObject({
      externalId: "2704412",
      isVisible: false,
    });
    expect(mapped.oldContentId).toBe("2704000");
    expect(mapped.place).not.toHaveProperty("oldContentId");
  });

  it("maps detail overview and homepage without overwriting absent fields", () => {
    expect(
      mapPlaceDetail({
        contentid: "2704412",
        overview: "  초원의 아침을 만나는 목장입니다.  ",
        homepage: " ",
      }),
    ).toEqual({
      overview: "초원의 아침을 만나는 목장입니다.",
      homepage: null,
    });
    expect(mapPlaceDetail({ contentid: "2704412" })).toEqual({});
  });

  it("maps an atomic place detail bundle without inventing fields", () => {
    const intro: TourApiPlaceIntro = {
      contentid: "2704412",
      infocenter: " 064-000-0000 ",
      usetime: " 09:00~18:00 ",
      parking: " ",
    };
    const information: TourApiPlaceInfo[] = [
      {
        contentid: "2704412",
        serialnum: "1",
        fldgubun: "1",
        infoname: " 이용안내 ",
        infotext: " 방문 전 확인 ",
      },
    ];
    const images: TourApiPlaceImage[] = [
      {
        contentid: "2704412",
        serialnum: "1",
        imgname: " 전경 ",
        originimgurl: "http://tong.visitkorea.or.kr/image.jpg",
        smallimageurl: "https://tong.visitkorea.or.kr/thumb.jpg",
        cpyrhtDivCd: "Type1",
      },
      {
        contentid: "2704412",
        serialnum: "2",
        originimgurl: "https://tong.visitkorea.or.kr/image.jpg",
      },
    ];

    const result = mapPlaceDetailBundle({
      contentId: "2704412",
      common: { contentid: "2704412", overview: " 소개 " },
      intro,
      information,
      images,
      syncedAt: lastSyncedAt,
    });

    expect(result.place).toMatchObject({
      overview: "소개",
      infoCenter: "064-000-0000",
      useTime: "09:00~18:00",
      parking: null,
      detailSyncedAt: lastSyncedAt,
    });
    expect(result.information).toEqual([
      {
        source: "TOUR_API",
        serialNumber: "1",
        fieldGroup: "1",
        name: "이용안내",
        text: "방문 전 확인",
        displayOrder: 0,
      },
    ]);
    expect(result.images).toEqual([
      {
        source: "TOUR_API",
        serialNumber: "1",
        name: "전경",
        originalUrl: "https://tong.visitkorea.or.kr/image.jpg",
        thumbnailUrl: "https://tong.visitkorea.or.kr/thumb.jpg",
        copyrightType: "Type1",
        displayOrder: 0,
      },
    ]);
  });
});

describe("mapCourseBundle", () => {
  const item = {
    contentid: "2372032",
    contenttypeid: "25",
    title: "이국적인 분위기와 달콤한 도시 송도",
    mapx: "126.6368401215",
    mapy: "37.3967115076",
    modifiedtime: "20260827090244",
    lDongRegnCd: "",
  };
  const common = {
    contentid: "2372032",
    overview: "국제도시 송도의 맛코스.",
  };
  const intro = {
    contentid: "2372032",
    distance: "5.19km",
    taketime: "5시간",
    schedule: "기타",
    theme: "지자체",
  };
  const syncedAt = new Date("2026-08-29T00:00:00.000Z");

  it("normalizes the course with its stops renumbered from one", () => {
    const course = mapCourseBundle({
      item,
      common,
      intro,
      stops: [
        {
          contentid: "2372032",
          subnum: "0",
          subcontentid: "2350389",
          subname: "버거룸181",
          subdetailoverview: "수제버거 전문점",
          subdetailimg:
            "http://tong.visitkorea.or.kr/cms/resource/29/2050729_image2_1.jpg",
        },
        {
          contentid: "2372032",
          subnum: "1",
          subcontentid: "1851364",
          subname: "인천 컴팩 스마트시티",
        },
      ],
      lastSyncedAt: syncedAt,
    });

    expect(course).toMatchObject({
      source: "TOUR_API",
      externalId: "2372032",
      title: "이국적인 분위기와 달콤한 도시 송도",
      overview: "국제도시 송도의 맛코스.",
      takeTime: "5시간",
      distance: "5.19km",
      schedule: "기타",
      theme: "지자체",
      lastSyncedAt: syncedAt,
    });
    expect(course.stops).toEqual([
      {
        sequence: 1,
        externalPlaceId: "2350389",
        title: "버거룸181",
        overview: "수제버거 전문점",
        imageUrl:
          "https://tong.visitkorea.or.kr/cms/resource/29/2050729_image2_1.jpg",
      },
      {
        sequence: 2,
        externalPlaceId: "1851364",
        title: "인천 컴팩 스마트시티",
        overview: null,
        imageUrl: null,
      },
    ]);
  });

  it("keeps only the first appearance when a stop repeats across subnum values", () => {
    const course = mapCourseBundle({
      item,
      common,
      intro,
      stops: [
        {
          contentid: "2372032",
          subnum: "1",
          subcontentid: "1851364",
          subname: "인천 컴팩 스마트시티",
        },
        {
          contentid: "2372032",
          subnum: "1",
          subcontentid: "2350373",
          subname: "그리다디저트",
        },
        {
          contentid: "2372032",
          subnum: "2",
          subcontentid: "1851364",
          subname: "인천 컴팩 스마트시티",
        },
      ],
      lastSyncedAt: syncedAt,
    });

    expect(course.stops.map((stop) => stop.externalPlaceId)).toEqual([
      "1851364",
      "2350373",
    ]);
    expect(course.stops.map((stop) => stop.sequence)).toEqual([1, 2]);
  });

  it("falls back to the first stop image when the course carries none", () => {
    const course = mapCourseBundle({
      item: { ...item, firstimage: "" },
      common,
      intro,
      stops: [
        { contentid: "2372032", subcontentid: "2350389", subname: "버거룸181" },
        {
          contentid: "2372032",
          subcontentid: "1851364",
          subname: "인천 컴팩 스마트시티",
          subdetailimg:
            "https://tong.visitkorea.or.kr/cms/resource/52/2015152_image2_1.jpg",
        },
      ],
      lastSyncedAt: syncedAt,
    });

    expect(course.primaryImageUrl).toBe(
      "https://tong.visitkorea.or.kr/cms/resource/52/2015152_image2_1.jpg",
    );
  });

  it("rejects a bundle whose content type is not a travel course", () => {
    expect(() =>
      mapCourseBundle({
        item: { ...item, contenttypeid: "12" },
        common,
        intro,
        stops: [],
        lastSyncedAt: syncedAt,
      }),
    ).toThrow("Invalid TourAPI course content type");
  });

  it("rejects a bundle whose detail responses belong to another content", () => {
    expect(() =>
      mapCourseBundle({
        item,
        common: { ...common, contentid: "9999999" },
        intro,
        stops: [],
        lastSyncedAt: syncedAt,
      }),
    ).toThrow("Invalid TourAPI course common detail content ID");
  });
});
