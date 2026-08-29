import { Inject, Injectable, Logger, Optional } from "@nestjs/common";

import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { resolveDatalabAreaCode } from "../tourism/datalab-area-code.js";
import {
  buildSearchKeywords,
  pickRelevantCandidate,
} from "../tourism/place-name-matching.js";
import {
  RankingPlaceLinkService,
  type RankingPlaceLinker,
} from "../tourism/ranking-place-link.service.js";
import type { TourApiPort } from "../tourism/tour-api.types.js";
import { TOUR_API_PORT } from "../tourism/tourism.constants.js";
import {
  parseHotPlaceRankingDirectory,
  type ParsedHotPlaceRankingRow,
} from "./hot-place-ranking-csv.js";

export interface HotPlaceRankingImportSummary {
  source: string;
  scope: string;
  baseYearMonth: string;
  periodStart: string;
  periodEnd: string;
  audienceCount: number;
  importedCount: number;
  matchedCount: number;
  unmatchedCount: number;
}

interface PlaceCandidate {
  id: string;
  title: string;
  primaryImageUrl: string | null;
  imageCopyrightType: string | null;
}

type SnapshotIdentity = {
  source: string;
  scope: string;
  periodStart: Date;
  periodEnd: Date;
};

type HotPlaceRankingCreateManyInput = Prisma.HotPlaceRankingCreateManyInput;

interface HotPlaceRankingPrisma {
  place: {
    findMany(args: {
      where: { isVisible: true };
      select: {
        id: true;
        title: true;
        primaryImageUrl: true;
        imageCopyrightType: true;
      };
    }): Promise<PlaceCandidate[]>;
  };
  hotPlaceRanking: {
    deleteMany(args: { where: SnapshotIdentity }): Promise<unknown>;
    createMany(args: {
      data: HotPlaceRankingCreateManyInput[];
    }): Promise<unknown>;
    findMany(args: {
      where: { primaryImageUrl: null } | { placeId: null };
      select: {
        id: true;
        sourcePlaceId: true;
        sourcePlaceName: true;
        provinceName: true;
      };
    }): Promise<
      Array<{
        id: string;
        sourcePlaceId: string;
        sourcePlaceName: string;
        provinceName: string;
      }>
    >;
    update(args: {
      where: { id: string };
      data:
        | { primaryImageUrl: string; imageCopyrightType: string | null }
        | { placeId: string };
    }): Promise<unknown>;
  };
  $transaction<T>(
    callback: (transaction: HotPlaceRankingPrisma) => Promise<T>,
  ): Promise<T>;
}

export interface RankingImageBackfillSummary {
  scanned: number;
  updated: number;
}

export interface RankingPlaceLinkBackfillSummary {
  scanned: number;
  linked: number;
}

export function normalizePlaceTitle(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ");
}

@Injectable()
export class HotPlaceRankingImportService {
  private readonly logger = new Logger(HotPlaceRankingImportService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: HotPlaceRankingPrisma,
    @Optional()
    @Inject(TOUR_API_PORT)
    private readonly tourApi: TourApiPort | null = null,
    @Optional()
    @Inject(RankingPlaceLinkService)
    private readonly placeLinks: RankingPlaceLinker | null = null,
  ) {}

  async importDirectory(
    directory: string,
  ): Promise<HotPlaceRankingImportSummary> {
    const [snapshot, places] = await Promise.all([
      parseHotPlaceRankingDirectory(directory),
      this.prisma.place.findMany({
        where: { isVisible: true },
        select: {
          id: true,
          title: true,
          primaryImageUrl: true,
          imageCopyrightType: true,
        },
      }),
    ]);
    const candidateIndex = buildCandidateIndex(places);
    const importedAt = new Date();
    const rows = snapshot.rows.map((row) =>
      toCreateManyInput(
        snapshot.source,
        snapshot.scope,
        snapshot.periodStart,
        snapshot.periodEnd,
        importedAt,
        row,
        candidateIndex,
      ),
    );
    await this.fillDisplayImages(rows);
    const matchedCount = rows.filter((row) => row.placeId !== null).length;
    const snapshotIdentity = {
      source: snapshot.source,
      scope: snapshot.scope,
      periodStart: snapshot.periodStart,
      periodEnd: snapshot.periodEnd,
    };

    await this.prisma.$transaction(async (transaction) => {
      await transaction.hotPlaceRanking.deleteMany({ where: snapshotIdentity });
      await transaction.hotPlaceRanking.createMany({ data: rows });
    });

    return {
      source: snapshot.source,
      scope: snapshot.scope,
      baseYearMonth: snapshot.baseYearMonth,
      periodStart: formatDateOnly(snapshot.periodStart),
      periodEnd: formatDateOnly(snapshot.periodEnd),
      audienceCount: new Set(snapshot.rows.map((row) => row.audience)).size,
      importedCount: rows.length,
      matchedCount,
      unmatchedCount: rows.length - matchedCount,
    };
  }

  /**
   * 매칭된 관광지 이미지가 없는 행에 대해 TourAPI 키워드 검색으로 대표 이미지를 채운다.
   * 데이터랩 관광지 식별자 단위로 결과를 캐싱해 세대별 파일에 걸친 중복 호출을 없애고,
   * 검색 실패는 조용히 건너뛰어(이미지 null 유지) 스냅샷 적재 자체는 막지 않는다.
   */
  private async fillDisplayImages(
    rows: HotPlaceRankingCreateManyInput[],
  ): Promise<void> {
    if (this.tourApi === null) return;

    const cache = new Map<string, string | null>();
    const copyrightCache = new Map<string, string | null>();

    for (const row of rows) {
      if (row.primaryImageUrl != null) continue;

      const key = row.sourcePlaceId;

      if (!cache.has(key)) {
        const resolved = await this.resolveDisplayImage(
          row.sourcePlaceName,
          row.provinceName,
        );
        cache.set(key, resolved.imageUrl);
        copyrightCache.set(key, resolved.copyrightType);
      }

      row.primaryImageUrl = cache.get(key) ?? null;
      row.imageCopyrightType = copyrightCache.get(key) ?? null;
    }
  }

  /**
   * 이미 적재된 스냅샷 중 대표 이미지가 비어 있는 행을 다시 채운다.
   * CSV 재적재 없이 실행할 수 있는 복구용 경로이며, 매칭된 관광지 이미지 →
   * TourAPI 키워드 검색 순으로 확정하고 데이터랩 관광지 식별자 단위로 캐싱한다.
   */
  async backfillDisplayImages(): Promise<RankingImageBackfillSummary> {
    const rows = await this.prisma.hotPlaceRanking.findMany({
      where: { primaryImageUrl: null },
      select: {
        id: true,
        sourcePlaceId: true,
        sourcePlaceName: true,
        provinceName: true,
      },
    });

    if (rows.length === 0 || this.tourApi === null) {
      return { scanned: rows.length, updated: 0 };
    }

    const places = await this.prisma.place.findMany({
      where: { isVisible: true },
      select: {
        id: true,
        title: true,
        primaryImageUrl: true,
        imageCopyrightType: true,
      },
    });
    const candidateIndex = buildCandidateIndex(places);
    const cache = new Map<
      string,
      { imageUrl: string | null; copyrightType: string | null }
    >();
    let updated = 0;

    for (const row of rows) {
      const matched = candidateIndex.get(
        normalizePlaceTitle(row.sourcePlaceName),
      );
      const matchedImage =
        matched?.length === 1
          ? httpsImageUrl(matched[0]?.primaryImageUrl ?? undefined)
          : null;
      let resolved =
        matchedImage != null
          ? {
              imageUrl: matchedImage,
              copyrightType: matched?.[0]?.imageCopyrightType ?? null,
            }
          : cache.get(row.sourcePlaceId);

      if (resolved === undefined) {
        resolved = await this.resolveDisplayImage(
          row.sourcePlaceName,
          row.provinceName,
        );
        cache.set(row.sourcePlaceId, resolved);
      }

      if (resolved.imageUrl === null) continue;

      await this.prisma.hotPlaceRanking.update({
        where: { id: row.id },
        data: {
          primaryImageUrl: resolved.imageUrl,
          imageCopyrightType: resolved.copyrightType,
        },
      });
      updated += 1;
    }

    return { scanned: rows.length, updated };
  }

  /**
   * 관광지와 연결되지 않은 행을 TourAPI 키워드 검색으로 다시 연결한다.
   * 지역 기반 동기화가 담지 않는 콘텐츠 타입 때문에 이름 정확매칭이 실패한 행이
   * 대부분이며, 연결되지 않으면 카드가 링크로 렌더되지 않아 상세 화면으로 갈 수 없다.
   * 데이터랩 시도명으로 검색 지역을 좁히고, 관광지 식별자 단위로 캐싱한다.
   */
  async backfillPlaceLinks(): Promise<RankingPlaceLinkBackfillSummary> {
    const rows = await this.prisma.hotPlaceRanking.findMany({
      where: { placeId: null },
      select: {
        id: true,
        sourcePlaceId: true,
        sourcePlaceName: true,
        provinceName: true,
      },
    });

    if (rows.length === 0 || this.placeLinks === null) {
      return { scanned: rows.length, linked: 0 };
    }

    const cache = new Map<string, string | null>();
    let linked = 0;

    for (const row of rows) {
      if (!cache.has(row.sourcePlaceId)) {
        const areaCode = resolveDatalabAreaCode(row.provinceName);
        cache.set(
          row.sourcePlaceId,
          await this.placeLinks.resolvePlaceId({
            placeName: row.sourcePlaceName,
            ...(areaCode === undefined ? {} : { areaCode }),
          }),
        );
      }

      const placeId = cache.get(row.sourcePlaceId) ?? null;

      if (placeId === null) continue;

      await this.prisma.hotPlaceRanking.update({
        where: { id: row.id },
        data: { placeId },
      });
      linked += 1;
    }

    return { scanned: rows.length, linked };
  }

  private async resolveDisplayImage(
    placeName: string,
    provinceName: string,
  ): Promise<{ imageUrl: string | null; copyrightType: string | null }> {
    if (this.tourApi === null) {
      return { imageUrl: null, copyrightType: null };
    }

    const areaCode = resolveDatalabAreaCode(provinceName);

    try {
      for (const keyword of buildSearchKeywords(placeName)) {
        const candidates = await this.tourApi.searchPlaceCandidates({
          keyword,
          areaCode,
        });
        const match = pickRelevantCandidate(candidates, keyword);
        const imageUrl = httpsImageUrl(match?.firstimage ?? match?.firstimage2);

        if (imageUrl === null) continue;

        return { imageUrl, copyrightType: match?.cpyrhtDivCd ?? null };
      }

      return { imageUrl: null, copyrightType: null };
    } catch (error) {
      this.logger.warn(
        `TourAPI 이미지 조회 실패 (${placeName}): ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return { imageUrl: null, copyrightType: null };
    }
  }
}

function httpsImageUrl(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";

  if (trimmed === "") return null;
  if (trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("http://")) return `https://${trimmed.slice(7)}`;

  return null;
}

function buildCandidateIndex(places: PlaceCandidate[]) {
  const candidateIndex = new Map<string, PlaceCandidate[]>();

  for (const place of places) {
    const normalizedTitle = normalizePlaceTitle(place.title);
    const candidates = candidateIndex.get(normalizedTitle) ?? [];
    candidates.push(place);
    candidateIndex.set(normalizedTitle, candidates);
  }

  return candidateIndex;
}

function toCreateManyInput(
  source: string,
  scope: string,
  periodStart: Date,
  periodEnd: Date,
  importedAt: Date,
  row: ParsedHotPlaceRankingRow,
  candidateIndex: Map<string, PlaceCandidate[]>,
): HotPlaceRankingCreateManyInput {
  const candidates = candidateIndex.get(
    normalizePlaceTitle(row.sourcePlaceName),
  );
  const match = candidates?.length === 1 ? candidates[0] : undefined;

  return {
    source,
    scope,
    baseYearMonth: row.baseYearMonth,
    provinceName: row.provinceName,
    districtName: row.districtName,
    sourcePlaceId: row.sourcePlaceId,
    sourcePlaceName: row.sourcePlaceName,
    sourceCategory: row.sourceCategory,
    audience: row.audience,
    periodStart,
    periodEnd,
    rank: row.rank,
    growthPercent: new Prisma.Decimal(row.growthPercent),
    placeId: match?.id ?? null,
    primaryImageUrl: httpsImageUrl(match?.primaryImageUrl ?? undefined),
    imageCopyrightType: match?.imageCopyrightType ?? null,
    sourceFileName: row.sourceFileName,
    importedAt,
  };
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
