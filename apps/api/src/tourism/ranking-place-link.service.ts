import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service.js";
import { TOUR_API_SOURCE } from "./tourism.constants.js";

const PROVIDER_REGION_CODE_BY_AREA_CODE: Readonly<Record<string, string>> = {
  "1": "11",
  "2": "28",
  "3": "30",
  "4": "27",
  "5": "29",
  "6": "26",
  "7": "31",
  "8": "36",
  "31": "41",
  "32": "51",
  "33": "43",
  "34": "44",
  "35": "47",
  "36": "48",
  "37": "52",
  "38": "46",
  "39": "50",
};

interface PlaceMatch {
  id: string;
  title: string;
}

export interface RankingPlaceLinkPrisma {
  place: {
    findMany(args: {
      where: {
        source: string;
        isVisible: true;
        region?: { providerCode: string; isActive: true };
      };
      select: { id: true; title: true };
    }): Promise<PlaceMatch[]>;
  };
}

export type RankingPlaceLinkInput = {
  placeName: string;
  areaCode?: string;
};

export interface RankingPlaceLinker {
  resolvePlaceId(input: RankingPlaceLinkInput): Promise<string | null>;
}

/** 데이터랩 랭킹 명칭을 이미 수집된 TourAPI 관광지와 연결한다. */
@Injectable()
export class RankingPlaceLinkService implements RankingPlaceLinker {
  constructor(
    @Inject(PrismaService) private readonly prisma: RankingPlaceLinkPrisma,
  ) {}

  async resolvePlaceId(input: RankingPlaceLinkInput): Promise<string | null> {
    const providerCode =
      input.areaCode === undefined
        ? undefined
        : PROVIDER_REGION_CODE_BY_AREA_CODE[input.areaCode];

    if (input.areaCode !== undefined && providerCode === undefined) return null;

    const places = await this.prisma.place.findMany({
      where: {
        source: TOUR_API_SOURCE,
        isVisible: true,
        ...(providerCode === undefined
          ? {}
          : { region: { providerCode, isActive: true as const } }),
      },
      select: { id: true, title: true },
    });
    const target = normalizePlaceTitle(input.placeName);
    const matches = places.filter(
      (place) => normalizePlaceTitle(place.title) === target,
    );

    return matches.length === 1 ? (matches[0]?.id ?? null) : null;
  }
}

function normalizePlaceTitle(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ");
}
