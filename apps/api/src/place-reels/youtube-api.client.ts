import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { ApiEnvironment } from "../config/environment.js";
import {
  SHORT_MAX_SECONDS,
  YOUTUBE_API_FETCH,
  YOUTUBE_API_SLEEP,
} from "./place-reels.constants.js";
import {
  parseIso8601Seconds,
  youtubeSearchResponseSchema,
  youtubeVideosResponseSchema,
} from "./youtube-api.schemas.js";
import type {
  YouTubeApiFetch,
  YouTubeApiPort,
  YouTubeApiSleep,
  YouTubeSearchInput,
  YouTubeShort,
} from "./youtube-api.types.js";

const SEARCH_URL = "https://www.googleapis.com/youtube/v3/search";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";
const REQUEST_TIMEOUT_MS = 15_000;
const RETRY_DELAYS_MS = [250, 750] as const;

export class YouTubeApiError extends Error {
  constructor(
    readonly operation: string,
    readonly providerCode: string,
    readonly httpStatus?: number,
  ) {
    super(`YouTube ${operation} failed (${providerCode})`);
    this.name = "YouTubeApiError";
  }
}

@Injectable()
export class YouTubeApiClient implements YouTubeApiPort {
  constructor(
    private readonly config: ConfigService<ApiEnvironment, true>,
    @Inject(YOUTUBE_API_FETCH) private readonly fetch: YouTubeApiFetch,
    @Inject(YOUTUBE_API_SLEEP) private readonly sleep: YouTubeApiSleep,
  ) {}

  async searchPlaceShorts(
    input: YouTubeSearchInput,
  ): Promise<readonly YouTubeShort[]> {
    const key = this.config.get("YOUTUBE_API_KEY", { infer: true });
    if (!key) {
      throw new YouTubeApiError("search", "MISSING_CONFIGURATION");
    }

    const orderedIds = await this.searchVideoIds(input.query, key);
    if (orderedIds.length === 0) return [];

    const details = await this.listVideoDetails(orderedIds, key);
    const shorts: YouTubeShort[] = [];

    for (const videoId of orderedIds) {
      const detail = details.get(videoId);
      if (detail === undefined) continue;
      if (shorts.length >= input.maxResults) break;
      shorts.push(detail);
    }

    return shorts;
  }

  private async searchVideoIds(
    query: string,
    key: string,
  ): Promise<readonly string[]> {
    const url = new URL(SEARCH_URL);
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("videoDuration", "short");
    url.searchParams.set("videoEmbeddable", "true");
    url.searchParams.set("order", "relevance");
    url.searchParams.set("regionCode", "KR");
    url.searchParams.set("relevanceLanguage", "ko");
    url.searchParams.set("safeSearch", "moderate");
    url.searchParams.set("maxResults", "20");
    url.searchParams.set("q", query);
    url.searchParams.set("key", key);

    const payload = await this.request("search", url);
    const parsed = youtubeSearchResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new YouTubeApiError("search", "INVALID_RESPONSE");
    }

    const ids: string[] = [];
    for (const item of parsed.data.items) {
      const videoId = item.id?.videoId;
      if (videoId && !ids.includes(videoId)) ids.push(videoId);
    }
    return ids;
  }

  private async listVideoDetails(
    ids: readonly string[],
    key: string,
  ): Promise<Map<string, YouTubeShort>> {
    const url = new URL(VIDEOS_URL);
    url.searchParams.set("part", "snippet,contentDetails,statistics,status");
    url.searchParams.set("id", ids.join(","));
    url.searchParams.set("maxResults", String(ids.length));
    url.searchParams.set("key", key);

    const payload = await this.request("videos", url);
    const parsed = youtubeVideosResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new YouTubeApiError("videos", "INVALID_RESPONSE");
    }

    const byId = new Map<string, YouTubeShort>();
    for (const item of parsed.data.items) {
      const durationSeconds = parseIso8601Seconds(
        item.contentDetails?.duration,
      );
      const title = item.snippet?.title?.trim();
      const channelTitle = item.snippet?.channelTitle?.trim();
      const thumbnailUrl = pickThumbnail(item.snippet?.thumbnails);
      const publishedAt = parseDate(item.snippet?.publishedAt);

      if (
        durationSeconds === null ||
        durationSeconds > SHORT_MAX_SECONDS ||
        item.status?.embeddable !== true ||
        !title ||
        !channelTitle ||
        thumbnailUrl === null ||
        publishedAt === null
      ) {
        continue;
      }

      byId.set(item.id, {
        videoId: item.id,
        title,
        channelTitle,
        thumbnailUrl,
        durationSeconds,
        viewCount: parseCount(item.statistics?.viewCount),
        publishedAt,
      });
    }

    return byId;
  }

  private async request(operation: string, url: URL): Promise<unknown> {
    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
      try {
        return await this.requestOnce(operation, url);
      } catch (error) {
        const sanitized = this.sanitizeError(error, operation);
        if (
          attempt === RETRY_DELAYS_MS.length ||
          !this.isRetryable(sanitized)
        ) {
          throw sanitized;
        }
        await this.sleep(RETRY_DELAYS_MS[attempt]);
      }
    }

    throw new YouTubeApiError(operation, "NETWORK_ERROR");
  }

  private async requestOnce(operation: string, url: URL): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await this.fetch(url, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    const body = await response.text();

    if (!response.ok) {
      throw new YouTubeApiError(
        operation,
        providerErrorReason(body) ?? `HTTP_${response.status}`,
        response.status,
      );
    }

    try {
      return JSON.parse(body) as unknown;
    } catch {
      throw new YouTubeApiError(operation, "INVALID_RESPONSE", response.status);
    }
  }

  private sanitizeError(error: unknown, operation: string): YouTubeApiError {
    if (error instanceof YouTubeApiError) return error;
    if (error instanceof Error && error.name === "AbortError") {
      return new YouTubeApiError(operation, "TIMEOUT");
    }
    return new YouTubeApiError(operation, "NETWORK_ERROR");
  }

  private isRetryable(error: YouTubeApiError): boolean {
    return (
      error.providerCode === "NETWORK_ERROR" ||
      error.providerCode === "TIMEOUT" ||
      error.httpStatus === 500 ||
      error.httpStatus === 503
    );
  }
}

type ThumbnailSet = {
  default?: { url: string };
  medium?: { url: string };
  high?: { url: string };
  standard?: { url: string };
  maxres?: { url: string };
};

function pickThumbnail(thumbnails: ThumbnailSet | undefined): string | null {
  const candidate =
    thumbnails?.standard?.url ??
    thumbnails?.high?.url ??
    thumbnails?.medium?.url ??
    thumbnails?.maxres?.url ??
    thumbnails?.default?.url;
  return candidate && candidate.trim() !== "" ? candidate : null;
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseCount(value: string | undefined): number | null {
  if (value === undefined) return null;
  const count = Number(value);
  return Number.isFinite(count) && count >= 0 ? Math.trunc(count) : null;
}

function providerErrorReason(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as {
      error?: { errors?: Array<{ reason?: string }>; status?: string };
    };
    return parsed.error?.errors?.[0]?.reason ?? parsed.error?.status;
  } catch {
    return undefined;
  }
}
