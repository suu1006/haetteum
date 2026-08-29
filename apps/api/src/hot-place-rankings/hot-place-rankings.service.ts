import { Injectable, NotFoundException } from "@nestjs/common";

import type {
  HotPlaceRankingAudience,
  HotPlaceRankingItem,
  HotPlaceRankingResponse,
  ListHotPlaceRankingsQuery,
} from "@haetteum/contracts";

import { PrismaService } from "../prisma/prisma.service.js";
import {
  DATALAB_SOURCE,
  NATIONAL_SCOPE,
} from "./hot-place-ranking.constants.js";
import type { HotPlaceRankingAudienceDb } from "./hot-place-ranking-csv.js";

const AUDIENCE_TO_DB = {
  all: "ALL",
  "20s": "TWENTIES",
  "30s": "THIRTIES",
  "40s": "FORTIES",
  "50s": "FIFTIES",
  "60s-plus": "SIXTIES_PLUS",
} as const satisfies Record<HotPlaceRankingAudience, HotPlaceRankingAudienceDb>;

type HotPlaceRankingRow = {
  rank: number;
  sourcePlaceId: string;
  sourcePlaceName: string;
  sourceCategory: string;
  provinceName: string;
  districtName: string;
  growthPercent: { toNumber(): number };
  placeId: string | null;
  primaryImageUrl: string | null;
  imageCopyrightType: string | null;
  imageAttribution: string | null;
  imageAttributionUrl: string | null;
};

@Injectable()
export class HotPlaceRankingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    input: ListHotPlaceRankingsQuery,
  ): Promise<HotPlaceRankingResponse> {
    const audience = AUDIENCE_TO_DB[input.audience];
    const snapshot = await this.prisma.hotPlaceRanking.findFirst({
      where: {
        source: DATALAB_SOURCE,
        scope: NATIONAL_SCOPE,
        audience,
      },
      orderBy: [{ periodEnd: "desc" }, { periodStart: "desc" }],
      select: {
        source: true,
        scope: true,
        baseYearMonth: true,
        periodStart: true,
        periodEnd: true,
      },
    });

    if (snapshot === null) {
      throw new NotFoundException({
        code: "HOT_PLACE_RANKING_SNAPSHOT_NOT_FOUND",
        detail: "세대별 핫플레이스 순위 데이터를 찾을 수 없습니다.",
      });
    }

    const rows = await this.prisma.hotPlaceRanking.findMany({
      where: {
        source: snapshot.source,
        scope: snapshot.scope,
        audience,
        periodStart: snapshot.periodStart,
        periodEnd: snapshot.periodEnd,
      },
      orderBy: { rank: "asc" },
      take: input.limit,
      select: {
        rank: true,
        sourcePlaceId: true,
        sourcePlaceName: true,
        sourceCategory: true,
        provinceName: true,
        districtName: true,
        growthPercent: true,
        placeId: true,
        primaryImageUrl: true,
        imageCopyrightType: true,
        imageAttribution: true,
        imageAttributionUrl: true,
      },
    });

    return {
      source: "KTO_DATALAB",
      scope: "national",
      baseYearMonth: snapshot.baseYearMonth,
      periodStart: dateOnly(snapshot.periodStart),
      periodEnd: dateOnly(snapshot.periodEnd),
      audience: input.audience,
      items: rows.map(mapRankingRow),
    };
  }
}

function mapRankingRow(row: HotPlaceRankingRow): HotPlaceRankingItem {
  return {
    rank: row.rank,
    sourcePlaceId: row.sourcePlaceId,
    title: row.sourcePlaceName,
    category: row.sourceCategory,
    provinceName: row.provinceName,
    districtName: row.districtName,
    growthPercent: row.growthPercent.toNumber(),
    placeId: row.placeId ?? null,
    primaryImageUrl: httpsImageUrl(row.primaryImageUrl),
    imageCopyrightType: row.imageCopyrightType ?? null,
    imageAttribution: row.imageAttribution ?? null,
    imageAttributionUrl: httpsImageUrl(row.imageAttributionUrl),
  };
}

/** 저장된 대표 이미지 URL을 https로 정규화한다. next/image가 http 원본을 거부한다. */
function httpsImageUrl(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";

  if (trimmed === "") return null;
  if (trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("http://")) return `https://${trimmed.slice(7)}`;

  return null;
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
