import { Prisma } from "../generated/prisma/client.js";

import type {
  TourApiChangedPlace,
  TourApiDistrict,
  TourApiFestival,
  TourApiPlace,
  TourApiPlaceDetail,
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

export type NormalizedChangedPlace = {
  place: NormalizedPlace;
  oldContentId: string | null;
};

export type NormalizedPlaceDetail = {
  overview?: string | null;
  homepage?: string | null;
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

function providerTimestamp(value: string): Date {
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

  requiredText(item.lDongRegnCd, "region code");

  const createdTime = optionalText(item.createdtime);

  return {
    source: "TOUR_API",
    externalId: requiredText(item.contentid, "content ID"),
    contentTypeId: 12,
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
