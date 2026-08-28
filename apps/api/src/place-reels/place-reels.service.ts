import { Injectable, NotFoundException } from "@nestjs/common";

import type {
  ListPopularReelsQuery,
  PlaceReelItem,
  PlaceReelListResponse,
  PopularReelItem,
  PopularReelsResponse,
} from "@haetteum/contracts";

import type { PlaceRankingAudience } from "@haetteum/contracts";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  DATALAB_SOURCE,
  NATIONAL_SCOPE,
  YOUTUBE_SOURCE,
  youtubeEmbedUrl,
} from "./place-reels.constants.js";

const AUDIENCE_TO_DB = {
  all: "ALL",
  "20s": "TWENTIES",
  "30s": "THIRTIES",
  "40s": "FORTIES",
  "50s": "FIFTIES",
  "60s-plus": "SIXTIES_PLUS",
} as const satisfies Record<PlaceRankingAudience, string>;

type ReelRow = {
  providerVideoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSeconds: number;
  viewCount: bigint | null;
  publishedAt: Date;
};

@Injectable()
export class PlaceReelsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForPlace(placeId: string): Promise<PlaceReelListResponse> {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
      select: { id: true, reelsSyncedAt: true },
    });

    if (place === null) {
      throw new NotFoundException({
        code: "PLACE_NOT_FOUND",
        detail: "관광지를 찾을 수 없습니다.",
      });
    }

    const rows = await this.prisma.placeReel.findMany({
      where: { placeId, provider: YOUTUBE_SOURCE },
      orderBy: { displayOrder: "asc" },
      select: reelSelect,
    });

    return {
      placeId,
      source: "YOUTUBE",
      fetchedAt: place.reelsSyncedAt?.toISOString() ?? null,
      items: rows.map(mapReel),
    };
  }

  async listPopular(
    query: ListPopularReelsQuery,
  ): Promise<PopularReelsResponse> {
    const audience = AUDIENCE_TO_DB[query.audience];
    const snapshot = await this.prisma.placeRanking.findFirst({
      where: { source: DATALAB_SOURCE, scope: NATIONAL_SCOPE, audience },
      orderBy: [{ periodEnd: "desc" }, { periodStart: "desc" }],
      select: { periodStart: true, periodEnd: true },
    });

    if (snapshot === null) {
      return { source: "YOUTUBE", audience: query.audience, items: [] };
    }

    const ranked = await this.prisma.placeRanking.findMany({
      where: {
        source: DATALAB_SOURCE,
        scope: NATIONAL_SCOPE,
        audience,
        periodStart: snapshot.periodStart,
        periodEnd: snapshot.periodEnd,
        placeId: { not: null },
      },
      orderBy: { rank: "asc" },
      take: query.limit,
      select: {
        placeId: true,
        place: {
          select: {
            id: true,
            title: true,
            region: { select: { name: true } },
            reels: {
              where: { provider: YOUTUBE_SOURCE },
              orderBy: { displayOrder: "asc" },
              select: reelSelect,
            },
          },
        },
      },
    });

    const items: PopularReelItem[] = [];
    for (const row of ranked) {
      const place = row.place;
      if (place == null) continue;
      for (const reel of place.reels) {
        if (items.length >= query.limit) break;
        items.push({
          ...mapReel(reel),
          placeId: place.id,
          placeTitle: place.title,
          region: place.region.name,
        });
      }
      if (items.length >= query.limit) break;
    }

    return { source: "YOUTUBE", audience: query.audience, items };
  }
}

const reelSelect = {
  providerVideoId: true,
  title: true,
  channelTitle: true,
  thumbnailUrl: true,
  durationSeconds: true,
  viewCount: true,
  publishedAt: true,
} as const;

function mapReel(row: ReelRow): PlaceReelItem {
  return {
    provider: "YOUTUBE",
    videoId: row.providerVideoId,
    title: row.title,
    channelTitle: row.channelTitle,
    thumbnailUrl: row.thumbnailUrl,
    durationSeconds: row.durationSeconds,
    viewCount: row.viewCount === null ? null : Number(row.viewCount),
    publishedAt: row.publishedAt.toISOString(),
    embedUrl: youtubeEmbedUrl(row.providerVideoId),
  };
}
