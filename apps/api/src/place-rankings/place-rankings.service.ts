import { Injectable, NotFoundException } from "@nestjs/common";

import type {
  ListPlaceRankingsQuery,
  PlaceRankingAudience,
  PlaceRankingItem,
  PlaceRankingResponse,
} from "@haetteum/contracts";

import { PrismaService } from "../prisma/prisma.service.js";
import { DATALAB_SOURCE, NATIONAL_SCOPE } from "./place-ranking.constants.js";
import type { RankingAudienceDb } from "./place-ranking-csv.js";

const AUDIENCE_TO_DB = {
  all: "ALL",
  "20s": "TWENTIES",
  "30s": "THIRTIES",
  "40s": "FORTIES",
  "50s": "FIFTIES",
  "60s-plus": "SIXTIES_PLUS",
} as const satisfies Record<PlaceRankingAudience, RankingAudienceDb>;

type PlaceRankingRow = {
  rank: number;
  sourcePlaceId: string;
  sourcePlaceName: string;
  sourceCategory: string;
  sharePercent: { toNumber(): number };
  place: {
    id: string;
    primaryImageUrl: string | null;
    imageCopyrightType: string | null;
  } | null;
};

@Injectable()
export class PlaceRankingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(input: ListPlaceRankingsQuery): Promise<PlaceRankingResponse> {
    const audience = AUDIENCE_TO_DB[input.audience];
    const snapshot = await this.prisma.placeRanking.findFirst({
      where: {
        source: DATALAB_SOURCE,
        scope: NATIONAL_SCOPE,
        audience,
      },
      orderBy: [{ periodEnd: "desc" }, { periodStart: "desc" }],
      select: {
        source: true,
        scope: true,
        periodStart: true,
        periodEnd: true,
      },
    });

    if (snapshot === null) {
      throw new NotFoundException({
        code: "PLACE_RANKING_SNAPSHOT_NOT_FOUND",
        detail: "세대별 인기관광지 순위 데이터를 찾을 수 없습니다.",
      });
    }

    const rows = await this.prisma.placeRanking.findMany({
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
        sharePercent: true,
        place: {
          select: {
            id: true,
            primaryImageUrl: true,
            imageCopyrightType: true,
          },
        },
      },
    });

    return {
      source: "KTO_DATALAB",
      scope: "national",
      periodStart: dateOnly(snapshot.periodStart),
      periodEnd: dateOnly(snapshot.periodEnd),
      audience: input.audience,
      items: rows.map(mapRankingRow),
    };
  }
}

function mapRankingRow(row: PlaceRankingRow): PlaceRankingItem {
  return {
    rank: row.rank,
    sourcePlaceId: row.sourcePlaceId,
    title: row.sourcePlaceName,
    category: row.sourceCategory,
    sharePercent: row.sharePercent.toNumber(),
    placeId: row.place?.id ?? null,
    primaryImageUrl: row.place?.primaryImageUrl ?? null,
    imageCopyrightType: row.place?.imageCopyrightType ?? null,
  };
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
