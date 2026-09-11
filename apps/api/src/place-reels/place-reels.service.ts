import { Injectable, NotFoundException } from "@nestjs/common";

import type {
  ListPopularReelsQuery,
  PlaceReelItem,
  PlaceReelListResponse,
  PopularReelItem,
  PopularReelsResponse,
} from "@haetteum/contracts";

import type {
  PlaceRankingAudience,
  PopularReelRegion,
} from "@haetteum/contracts";
import type { Prisma } from "../generated/prisma/client.js";
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

const REGION_WHERE = {
  all: {},
  seoul: { region: { is: { slug: "seoul" } } },
  gyeonggi: { region: { is: { slug: "gyeonggi" } } },
  gangwon: { region: { is: { slug: "gangwon" } } },
  busan: { region: { is: { slug: "busan" } } },
  jeju: { region: { is: { slug: "jeju" } } },
} as const satisfies Record<PopularReelRegion, Prisma.PlaceWhereInput>;

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

    const ranked =
      snapshot === null
        ? []
        : await this.prisma.placeRanking.findMany({
            where: {
              source: DATALAB_SOURCE,
              scope: NATIONAL_SCOPE,
              audience,
              periodStart: snapshot.periodStart,
              periodEnd: snapshot.periodEnd,
              placeId: { not: null },
              place: { is: REGION_WHERE[query.region] },
            },
            orderBy: { rank: "asc" },
            take: MAX_RANKED_PLACES,
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
                    take: MAX_REELS_PER_PLACE,
                    select: reelSelect,
                  },
                },
              },
            },
          });

    const regionalPlaces = await this.prisma.place.findMany({
      where: {
        ...REGION_WHERE[query.region],
        id: {
          notIn: ranked.flatMap((row) => (row.place ? [row.place.id] : [])),
        },
        reels: { some: { provider: YOUTUBE_SOURCE } },
      },
      orderBy: [{ title: "asc" }, { id: "asc" }],
      select: {
        id: true,
        title: true,
        region: { select: { name: true } },
        reels: {
          where: { provider: YOUTUBE_SOURCE },
          orderBy: { displayOrder: "asc" },
          take: MAX_REELS_PER_PLACE,
          select: reelSelect,
        },
      },
    });

    // Every place's own reels are already collected, so paginate over the
    // full flattened feed in memory rather than re-querying per page — the
    // ranked-place pool is capped at MAX_RANKED_PLACES, so this stays small.
    const allItems: PopularReelItem[] = [];
    for (const row of [
      ...ranked,
      ...regionalPlaces.map((place) => ({ place })),
    ]) {
      const place = row.place;
      if (place == null) continue;
      for (const reel of place.reels) {
        allItems.push({
          ...mapReel(reel),
          placeId: place.id,
          placeTitle: place.title,
          region: place.region.name,
        });
      }
    }

    const offset = query.cursor ?? 0;
    const items = allItems.slice(offset, offset + query.limit);
    const nextOffset = offset + items.length;
    const nextCursor = nextOffset < allItems.length ? nextOffset : null;

    return {
      source: "YOUTUBE",
      audience: query.audience,
      region: query.region,
      items,
      nextCursor,
    };
  }
}

const MAX_RANKED_PLACES = 30;
const MAX_REELS_PER_PLACE = 10;

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
