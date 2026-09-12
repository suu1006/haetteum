import { Prisma } from "../generated/prisma/client.js";

import type {
  TourApiChangedPlace,
  TourApiCourseIntro,
  TourApiCourseStop,
  TourApiDistrict,
  TourApiFestival,
  TourApiPlace,
  TourApiPlaceDetail,
  TourApiPlaceImage,
  TourApiPlaceInfo,
  TourApiPlaceIntro,
} from "./tour-api.types.js";

export type NormalizedDistrict = {
  providerCode: string;
  name: string;
};

export type NormalizedPlace = {
  source: "TOUR_API";
  externalId: string;
  contentTypeId: 12;
  title: string;
  address1: string | null;
  address2: string | null;
  zipcode: string | null;
  longitude: Prisma.Decimal | null;
  latitude: Prisma.Decimal | null;
  mapLevel: number | null;
  category1: string | null;
  category2: string | null;
  category3: string | null;
  telephone: string | null;
  primaryImageUrl: string | null;
  primaryThumbnailUrl: string | null;
  imageCopyrightType: string | null;
  providerCreatedAt: Date | null;
  providerModifiedAt: Date;
  isVisible: boolean;
  lastSyncedAt: Date;
};

export type NormalizedSearchedPlace = Omit<NormalizedPlace, "contentTypeId"> & {
  contentTypeId: number;
};

export type NormalizedChangedPlace = {
  place: NormalizedPlace;
  oldContentId: string | null;
};

export type NormalizedPlaceDetail = {
  overview?: string | null;
  homepage?: string | null;
};

export type NormalizedPlaceIntro = {
  infoCenter: string | null;
  restDate: string | null;
  useSeason: string | null;
  useTime: string | null;
  parking: string | null;
  experienceAgeRange: string | null;
  experienceGuide: string | null;
  babyCarriage: string | null;
  creditCard: string | null;
  pet: string | null;
};

export type NormalizedPlaceImage = {
  source: "TOUR_API";
  serialNumber: string;
  name: string | null;
  originalUrl: string;
  thumbnailUrl: string | null;
  copyrightType: string | null;
  displayOrder: number;
};

export type NormalizedPlaceDetailInfo = {
  source: "TOUR_API";
  serialNumber: string;
  fieldGroup: string | null;
  name: string;
  text: string;
  displayOrder: number;
};

export type NormalizedPlaceDetailBundle = {
  place: NormalizedPlaceDetail &
    NormalizedPlaceIntro & { detailSyncedAt: Date };
  images: readonly NormalizedPlaceImage[];
  information: readonly NormalizedPlaceDetailInfo[];
};

export type NormalizedFestival = {
  source: "TOUR_API";
  externalId: string;
  contentTypeId: 15;
  title: string;
  eventStartDate: Date;
  eventEndDate: Date;
  providerRegionCode: string | null;
  providerDistrictCode: string | null;
  address1: string | null;
  address2: string | null;
  zipcode: string | null;
  longitude: Prisma.Decimal | null;
  latitude: Prisma.Decimal | null;
  mapLevel: number | null;
  category1: "EV";
  category2: "EV01";
  category3: string | null;
  telephone: string | null;
  primaryImageUrl: string | null;
  primaryThumbnailUrl: string | null;
  imageCopyrightType: string | null;
  providerCreatedAt: Date | null;
  providerModifiedAt: Date;
  isVisible: boolean;
  lastSyncedAt: Date;
};

function optionalText(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function requiredText(value: string | undefined, field: string): string {
  const text = optionalText(value);
  if (text == null) throw new Error(`Invalid TourAPI ${field}`);
  return text;
}

export function providerTimestamp(value: string): Date {
  if (!/^\d{14}$/.test(value)) throw new Error("Invalid TourAPI timestamp");
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(8, 10)}:${value.slice(10, 12)}:${value.slice(12, 14)}+09:00`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid TourAPI timestamp");
  }

  const kst = new Date(parsed.getTime() + 9 * 60 * 60 * 1000);
  const roundTrip = [
    kst.getUTCFullYear().toString().padStart(4, "0"),
    (kst.getUTCMonth() + 1).toString().padStart(2, "0"),
    kst.getUTCDate().toString().padStart(2, "0"),
    kst.getUTCHours().toString().padStart(2, "0"),
    kst.getUTCMinutes().toString().padStart(2, "0"),
    kst.getUTCSeconds().toString().padStart(2, "0"),
  ].join("");
  if (roundTrip !== value) throw new Error("Invalid TourAPI timestamp");

  return parsed;
}

function providerDate(value: string): Date {
  if (!/^\d{8}$/.test(value)) throw new Error("Invalid TourAPI event date");

  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const roundTrip = [
    parsed.getUTCFullYear().toString().padStart(4, "0"),
    (parsed.getUTCMonth() + 1).toString().padStart(2, "0"),
    parsed.getUTCDate().toString().padStart(2, "0"),
  ].join("");

  if (roundTrip !== value) throw new Error("Invalid TourAPI event date");
  return parsed;
}

function coordinate(value: string | undefined): Prisma.Decimal | null {
  const text = optionalText(value);
  if (text == null || text === "null") return null;
  if (!/^-?\d+(\.\d+)?$/.test(text)) {
    throw new Error("Invalid TourAPI coordinate");
  }
  return new Prisma.Decimal(text);
}

function mapLevel(value: string | undefined): number | null {
  const text = optionalText(value);
  if (text == null) return null;
  if (!/^\d+$/.test(text)) throw new Error("Invalid map level");

  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed)) throw new Error("Invalid map level");
  return parsed;
}

function contentTypeId(value: string): number {
  const text = optionalText(value);
  if (text == null || !/^\d+$/.test(text)) {
    throw new Error("Invalid TourAPI content type");
  }

  const parsed = Number(text);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error("Invalid TourAPI content type");
  }
  return parsed;
}

function validatedLastSyncedAt(value: Date): Date {
  if (Number.isNaN(value.getTime())) {
    throw new Error("Invalid last synced timestamp");
  }
  return value;
}

export function mapDistrict(item: TourApiDistrict): NormalizedDistrict {
  requiredText(item.lDongRegnCd, "region code");

  return {
    providerCode: requiredText(item.lDongSignguCd, "district code"),
    name: requiredText(item.lDongSignguNm, "district name"),
  };
}

export function mapPlace(
  item: TourApiPlace,
  lastSyncedAt: Date,
): NormalizedPlace {
  if (item.contenttypeid !== "12") {
    throw new Error("Invalid TourAPI content type");
  }

  return { ...mapSearchedPlace(item, lastSyncedAt), contentTypeId: 12 };
}

/**
 * 키워드 검색으로 찾은 콘텐츠를 관광지 레코드로 정규화한다.
 * 지역 기반 동기화(`mapPlace`)와 달리 관광지(12) 외 콘텐츠 타입도 허용한다 —
 * 데이터랩 랭킹에는 문화시설·레포츠처럼 동기화 범위 밖 콘텐츠가 섞여 있고,
 * 이들도 상세 화면을 열 수 있어야 하기 때문이다.
 */
export function mapSearchedPlace(
  item: TourApiPlace,
  lastSyncedAt: Date,
): NormalizedSearchedPlace {
  requiredText(item.lDongRegnCd, "region code");

  const createdTime = optionalText(item.createdtime);

  return {
    source: "TOUR_API",
    externalId: requiredText(item.contentid, "content ID"),
    contentTypeId: contentTypeId(item.contenttypeid),
    title: requiredText(item.title, "title"),
    address1: optionalText(item.addr1),
    address2: optionalText(item.addr2),
    zipcode: optionalText(item.zipcode),
    longitude: coordinate(item.mapx),
    latitude: coordinate(item.mapy),
    mapLevel: mapLevel(item.mlevel),
    category1: optionalText(item.lclsSystm1),
    category2: optionalText(item.lclsSystm2),
    category3: optionalText(item.lclsSystm3),
    telephone: optionalText(item.tel),
    primaryImageUrl: optionalText(item.firstimage),
    primaryThumbnailUrl: optionalText(item.firstimage2),
    imageCopyrightType: optionalText(item.cpyrhtDivCd),
    providerCreatedAt:
      createdTime == null ? null : providerTimestamp(createdTime),
    providerModifiedAt: providerTimestamp(item.modifiedtime.trim()),
    isVisible: true,
    lastSyncedAt: validatedLastSyncedAt(lastSyncedAt),
  };
}

export function mapChangedPlace(
  item: TourApiChangedPlace,
  lastSyncedAt: Date,
): NormalizedChangedPlace {
  if (item.showflag !== "0" && item.showflag !== "1") {
    throw new Error("Invalid TourAPI show flag");
  }

  return {
    place: {
      ...mapPlace(item, lastSyncedAt),
      isVisible: item.showflag === "1",
    },
    oldContentId: optionalText(item.oldContentid),
  };
}

export function mapFestival(
  item: TourApiFestival,
  lastSyncedAt: Date,
): NormalizedFestival {
  if (item.contenttypeid.trim() !== "15") {
    throw new Error("Invalid TourAPI festival content type");
  }

  const category1 = requiredText(item.lclsSystm1, "festival category 1");
  const category2 = requiredText(item.lclsSystm2, "festival category 2");
  if (category1 !== "EV" || category2 !== "EV01") {
    throw new Error("Invalid TourAPI festival classification");
  }

  const eventStartDate = providerDate(item.eventstartdate.trim());
  const eventEndDate = providerDate(item.eventenddate.trim());
  if (eventEndDate < eventStartDate) {
    throw new Error("Invalid TourAPI festival date range");
  }

  const createdTime = optionalText(item.createdtime);

  return {
    source: "TOUR_API",
    externalId: requiredText(item.contentid, "content ID"),
    contentTypeId: 15,
    title: requiredText(item.title, "title"),
    eventStartDate,
    eventEndDate,
    providerRegionCode: optionalText(item.lDongRegnCd),
    providerDistrictCode: optionalText(item.lDongSignguCd),
    address1: optionalText(item.addr1),
    address2: optionalText(item.addr2),
    zipcode: optionalText(item.zipcode),
    longitude: coordinate(item.mapx),
    latitude: coordinate(item.mapy),
    mapLevel: mapLevel(item.mlevel),
    category1,
    category2,
    category3: optionalText(item.lclsSystm3),
    telephone: optionalText(item.tel),
    primaryImageUrl: optionalText(item.firstimage),
    primaryThumbnailUrl: optionalText(item.firstimage2),
    imageCopyrightType: optionalText(item.cpyrhtDivCd),
    providerCreatedAt:
      createdTime == null ? null : providerTimestamp(createdTime),
    providerModifiedAt: providerTimestamp(item.modifiedtime.trim()),
    isVisible: true,
    lastSyncedAt: validatedLastSyncedAt(lastSyncedAt),
  };
}

export function mapPlaceDetail(
  item: TourApiPlaceDetail,
): NormalizedPlaceDetail {
  const detail: NormalizedPlaceDetail = {};

  if (item.overview !== undefined) {
    detail.overview = optionalText(item.overview);
  }
  if (item.homepage !== undefined) {
    detail.homepage = optionalText(item.homepage);
  }

  return detail;
}

function assertContentId(expected: string, actual: string, operation: string) {
  if (actual.trim() !== expected) {
    throw new Error(`Invalid TourAPI ${operation} content ID`);
  }
}

function providerImageUrl(value: string | undefined): string | null {
  const text = optionalText(value);
  if (text == null) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new Error("Invalid TourAPI detail image URL");
  }
  if (url.hostname !== "tong.visitkorea.or.kr" || url.port !== "") {
    throw new Error("Invalid TourAPI detail image URL");
  }
  if (url.protocol === "http:") url.protocol = "https:";
  if (url.protocol !== "https:") {
    throw new Error("Invalid TourAPI detail image URL");
  }
  return url.toString();
}

export function mapPlaceDetailBundle(input: {
  contentId: string;
  common: TourApiPlaceDetail;
  intro: TourApiPlaceIntro;
  information: readonly TourApiPlaceInfo[];
  images: readonly TourApiPlaceImage[];
  syncedAt: Date;
}): NormalizedPlaceDetailBundle {
  const contentId = input.contentId.trim();
  if (!contentId) throw new Error("Invalid TourAPI detail content ID");
  assertContentId(contentId, input.common.contentid, "common detail");
  assertContentId(contentId, input.intro.contentid, "intro detail");
  for (const item of input.information) {
    assertContentId(contentId, item.contentid, "repeat detail");
  }
  for (const item of input.images) {
    assertContentId(contentId, item.contentid, "image detail");
  }
  const detailSyncedAt = validatedLastSyncedAt(input.syncedAt);
  const seenImages = new Set<string>();

  const images = input.images.flatMap((item, index) => {
    const originalUrl = providerImageUrl(item.originimgurl);
    if (originalUrl == null || seenImages.has(originalUrl)) return [];
    seenImages.add(originalUrl);
    const serialNumber = requiredText(item.serialnum, "image serial number");
    return [
      {
        source: "TOUR_API" as const,
        serialNumber,
        name: optionalText(item.imgname),
        originalUrl,
        thumbnailUrl: providerImageUrl(item.smallimageurl),
        copyrightType: optionalText(item.cpyrhtDivCd),
        displayOrder: index,
      },
    ];
  });

  const information = input.information.map((item, displayOrder) => ({
    source: "TOUR_API" as const,
    serialNumber: requiredText(item.serialnum, "detail serial number"),
    fieldGroup: optionalText(item.fldgubun),
    name: requiredText(item.infoname, "detail name"),
    text: requiredText(item.infotext, "detail text"),
    displayOrder,
  }));

  return {
    place: {
      ...mapPlaceDetail(input.common),
      infoCenter: optionalText(input.intro.infocenter),
      restDate: optionalText(input.intro.restdate),
      useSeason: optionalText(input.intro.useseason),
      useTime: optionalText(input.intro.usetime),
      parking: optionalText(input.intro.parking),
      experienceAgeRange: optionalText(input.intro.expagerange),
      experienceGuide: optionalText(input.intro.expguide),
      babyCarriage: optionalText(input.intro.chkbabycarriage),
      creditCard: optionalText(input.intro.chkcreditcard),
      pet: optionalText(input.intro.chkpet),
      detailSyncedAt,
    },
    images,
    information,
  };
}

export type NormalizedCourseStop = {
  sequence: number;
  externalPlaceId: string;
  title: string;
  overview: string | null;
  imageUrl: string | null;
};

export type NormalizedCourse = {
  source: "TOUR_API";
  externalId: string;
  title: string;
  overview: string | null;
  takeTime: string | null;
  distance: string | null;
  schedule: string | null;
  theme: string | null;
  primaryImageUrl: string | null;
  longitude: Prisma.Decimal | null;
  latitude: Prisma.Decimal | null;
  providerModifiedAt: Date;
  lastSyncedAt: Date;
  stops: readonly NormalizedCourseStop[];
};

/**
 * 여행코스(contentTypeId=25)를 코스 레코드와 경유지 목록으로 정규화한다.
 *
 * TourAPI 여행코스는 관광지와 달리 `lDongRegnCd`·`areacode`가 비어 있어
 * 지역으로 좁힐 수 없다. 대신 경유지의 `subcontentid`를 우리 관광지
 * `external_id`와 맞춰 "이 장소가 포함된 코스"를 역으로 찾는다.
 *
 * 일부 코스는 같은 `subcontentid`를 연속한 `subnum`에 중복해서 내려주므로
 * 콘텐츠 식별자 기준으로 첫 등장만 남기고 순번을 1부터 다시 매긴다.
 */
export function mapCourseBundle(input: {
  item: TourApiPlace;
  common: TourApiPlaceDetail;
  intro: TourApiCourseIntro;
  stops: readonly TourApiCourseStop[];
  lastSyncedAt: Date;
}): NormalizedCourse {
  if (input.item.contenttypeid.trim() !== "25") {
    throw new Error("Invalid TourAPI course content type");
  }

  const externalId = requiredText(input.item.contentid, "content ID");
  assertContentId(externalId, input.common.contentid, "course common detail");
  assertContentId(externalId, input.intro.contentid, "course intro detail");
  for (const stop of input.stops) {
    assertContentId(externalId, stop.contentid, "course stop detail");
  }

  const seen = new Set<string>();
  const stops: NormalizedCourseStop[] = [];
  for (const stop of input.stops) {
    const externalPlaceId = optionalText(stop.subcontentid);
    const title = optionalText(stop.subname);
    if (externalPlaceId == null || title == null) continue;
    if (seen.has(externalPlaceId)) continue;
    seen.add(externalPlaceId);
    stops.push({
      sequence: stops.length + 1,
      externalPlaceId,
      title,
      overview: optionalText(stop.subdetailoverview),
      imageUrl: providerImageUrl(stop.subdetailimg),
    });
  }

  return {
    source: "TOUR_API",
    externalId,
    title: requiredText(input.item.title, "title"),
    overview: optionalText(input.common.overview),
    takeTime: optionalText(input.intro.taketime),
    distance: optionalText(input.intro.distance),
    schedule: optionalText(input.intro.schedule),
    theme: optionalText(input.intro.theme),
    primaryImageUrl:
      providerImageUrl(input.item.firstimage) ??
      stops.find((stop) => stop.imageUrl !== null)?.imageUrl ??
      null,
    longitude: coordinate(input.item.mapx),
    latitude: coordinate(input.item.mapy),
    providerModifiedAt: providerTimestamp(input.item.modifiedtime.trim()),
    lastSyncedAt: validatedLastSyncedAt(input.lastSyncedAt),
    stops,
  };
}
