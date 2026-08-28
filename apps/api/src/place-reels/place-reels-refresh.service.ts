import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { PlaceRankingAudience } from "@haetteum/contracts";

import type { ApiEnvironment } from "../config/environment.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  DATALAB_SOURCE,
  DEFAULT_RANKED_PLACE_LIMIT,
  MAX_REELS_PER_PLACE,
  NATIONAL_SCOPE,
  REFRESH_THROTTLE_MS,
  YOUTUBE_API_PORT,
  YOUTUBE_API_SLEEP,
  YOUTUBE_SOURCE,
} from "./place-reels.constants.js";
import type { YouTubeApiPort, YouTubeApiSleep } from "./youtube-api.types.js";

const AUDIENCE_TO_DB = {
  all: "ALL",
  "20s": "TWENTIES",
  "30s": "THIRTIES",
  "40s": "FORTIES",
  "50s": "FIFTIES",
  "60s-plus": "SIXTIES_PLUS",
} as const satisfies Record<PlaceRankingAudience, string>;

export type PlaceReelsRefreshOptions = {
  audience?: PlaceRankingAudience;
  limit?: number;
};

export type PlaceReelsRefreshSummary = {
  enabled: boolean;
  audience: PlaceRankingAudience;
  processedPlaces: number;
  insertedReels: number;
  emptyPlaces: number;
  failedPlaces: number;
};

type RankedPlace = { id: string; title: string; regionName: string };

@Injectable()
export class PlaceReelsRefreshService {
  private readonly logger = new Logger(PlaceReelsRefreshService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<ApiEnvironment, true>,
    @Inject(YOUTUBE_API_PORT) private readonly youtube: YouTubeApiPort,
    @Inject(YOUTUBE_API_SLEEP) private readonly sleep: YouTubeApiSleep,
  ) {}

  async refreshRankedPlaces(
    options: PlaceReelsRefreshOptions = {},
  ): Promise<PlaceReelsRefreshSummary> {
    const audience = options.audience ?? "all";
    const limit = options.limit ?? DEFAULT_RANKED_PLACE_LIMIT;
    const summary: PlaceReelsRefreshSummary = {
      enabled: this.config.get("PLACE_REELS_ENABLED", { infer: true }),
      audience,
      processedPlaces: 0,
      insertedReels: 0,
      emptyPlaces: 0,
      failedPlaces: 0,
    };

    if (!summary.enabled) return summary;

    const places = await this.resolveRankedPlaces(audience, limit);

    for (const [index, place] of places.entries()) {
      if (index > 0) await this.sleep(REFRESH_THROTTLE_MS);

      try {
        const inserted = await this.refreshPlace(place);
        summary.processedPlaces += 1;
        summary.insertedReels += inserted;
        if (inserted === 0) summary.emptyPlaces += 1;
      } catch (error) {
        summary.failedPlaces += 1;
        this.logger.warn(
          `관광지 릴스 갱신 실패 (placeId=${place.id}): ${errorReason(error)}`,
        );
      }
    }

    return summary;
  }

  private async resolveRankedPlaces(
    audience: PlaceRankingAudience,
    limit: number,
  ): Promise<RankedPlace[]> {
    const dbAudience = AUDIENCE_TO_DB[audience];
    const snapshot = await this.prisma.placeRanking.findFirst({
      where: {
        source: DATALAB_SOURCE,
        scope: NATIONAL_SCOPE,
        audience: dbAudience,
      },
      orderBy: [{ periodEnd: "desc" }, { periodStart: "desc" }],
      select: { periodStart: true, periodEnd: true },
    });
    if (snapshot === null) return [];

    const rows = await this.prisma.placeRanking.findMany({
      where: {
        source: DATALAB_SOURCE,
        scope: NATIONAL_SCOPE,
        audience: dbAudience,
        periodStart: snapshot.periodStart,
        periodEnd: snapshot.periodEnd,
        placeId: { not: null },
      },
      orderBy: { rank: "asc" },
      take: limit,
      select: {
        place: {
          select: { id: true, title: true, region: { select: { name: true } } },
        },
      },
    });

    const seen = new Set<string>();
    const places: RankedPlace[] = [];
    for (const row of rows) {
      if (row.place == null || seen.has(row.place.id)) continue;
      seen.add(row.place.id);
      places.push({
        id: row.place.id,
        title: row.place.title,
        regionName: row.place.region.name,
      });
    }
    return places;
  }

  private async refreshPlace(place: RankedPlace): Promise<number> {
    const query = `${place.title} ${place.regionName} 여행`;
    const shorts = await this.youtube.searchPlaceShorts({
      query,
      maxResults: MAX_REELS_PER_PLACE,
    });
    const fetchedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.placeReel.deleteMany({
        where: { placeId: place.id, provider: YOUTUBE_SOURCE },
      });
      if (shorts.length > 0) {
        await tx.placeReel.createMany({
          data: shorts.map((short, index) => ({
            placeId: place.id,
            provider: YOUTUBE_SOURCE,
            providerVideoId: short.videoId,
            title: short.title.slice(0, 500),
            channelTitle: short.channelTitle.slice(0, 255),
            thumbnailUrl: short.thumbnailUrl,
            durationSeconds: short.durationSeconds,
            viewCount:
              short.viewCount === null ? null : BigInt(short.viewCount),
            publishedAt: short.publishedAt,
            displayOrder: index,
            fetchedAt,
          })),
        });
      }
      await tx.place.update({
        where: { id: place.id },
        data: { reelsSyncedAt: fetchedAt },
      });
    });

    return shorts.length;
  }
}

function errorReason(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return "unknown error";
}
