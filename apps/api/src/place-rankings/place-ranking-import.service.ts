import { Inject, Injectable, Optional } from "@nestjs/common";

import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  RankingPlaceLinkService,
  type RankingPlaceLinker,
} from "../tourism/ranking-place-link.service.js";
import {
  parsePlaceRankingDirectory,
  type ParsedPlaceRankingRow,
} from "./place-ranking-csv.js";

export interface PlaceRankingImportSummary {
  source: string;
  scope: string;
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

type PlaceRankingCreateManyInput = Prisma.PlaceRankingCreateManyInput;

interface PlaceRankingPrisma {
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
  placeRanking: {
    deleteMany(args: { where: SnapshotIdentity }): Promise<unknown>;
    createMany(args: { data: PlaceRankingCreateManyInput[] }): Promise<unknown>;
    findMany(args: {
      where: { primaryImageUrl: null } | { placeId: null };
      select: { id: true; sourcePlaceId: true; sourcePlaceName: true };
    }): Promise<
      Array<{ id: string; sourcePlaceId: string; sourcePlaceName: string }>
    >;
    update(args: {
      where: { id: string };
      data:
        | { primaryImageUrl: string; imageCopyrightType: string | null }
        | { placeId: string };
    }): Promise<unknown>;
  };
  $transaction<T>(
    callback: (transaction: PlaceRankingPrisma) => Promise<T>,
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
export class PlaceRankingImportService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PlaceRankingPrisma,
    @Optional()
    @Inject(RankingPlaceLinkService)
    private readonly placeLinks: RankingPlaceLinker | null = null,
  ) {}

  async importDirectory(directory: string): Promise<PlaceRankingImportSummary> {
    const [snapshot, places] = await Promise.all([
      parsePlaceRankingDirectory(directory),
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
    const matchedCount = rows.filter((row) => row.placeId !== null).length;
    const snapshotIdentity = {
      source: snapshot.source,
      scope: snapshot.scope,
      periodStart: snapshot.periodStart,
      periodEnd: snapshot.periodEnd,
    };

    await this.prisma.$transaction(async (transaction) => {
      await transaction.placeRanking.deleteMany({ where: snapshotIdentity });
      await transaction.placeRanking.createMany({ data: rows });
    });

    return {
      source: snapshot.source,
      scope: snapshot.scope,
      periodStart: formatDateOnly(snapshot.periodStart),
      periodEnd: formatDateOnly(snapshot.periodEnd),
      audienceCount: new Set(snapshot.rows.map((row) => row.audience)).size,
      importedCount: rows.length,
      matchedCount,
      unmatchedCount: rows.length - matchedCount,
    };
  }

  /**
   * 이미 적재된 스냅샷 중 대표 이미지가 비어 있는 행을 다시 채운다.
   * CSV 재적재 없이 실행할 수 있는 복구용 경로이며, 유일하게 이름이 일치하는
   * 저장 관광지의 이미지와 저작권 정보만 사용한다.
   */
  async backfillDisplayImages(): Promise<RankingImageBackfillSummary> {
    const rows = await this.prisma.placeRanking.findMany({
      where: { primaryImageUrl: null },
      select: { id: true, sourcePlaceId: true, sourcePlaceName: true },
    });

    if (rows.length === 0) {
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
    let updated = 0;

    for (const row of rows) {
      const matched = candidateIndex.get(
        normalizePlaceTitle(row.sourcePlaceName),
      );
      const imageUrl =
        matched?.length === 1
          ? httpsImageUrl(matched[0]?.primaryImageUrl ?? undefined)
          : null;

      if (imageUrl === null) continue;

      await this.prisma.placeRanking.update({
        where: { id: row.id },
        data: {
          primaryImageUrl: imageUrl,
          imageCopyrightType: matched?.[0]?.imageCopyrightType ?? null,
        },
      });
      updated += 1;
    }

    return { scanned: rows.length, updated };
  }

  /** 저장된 관광지와 연결되지 않은 행을 정확한 이름으로 다시 연결한다. */
  async backfillPlaceLinks(): Promise<RankingPlaceLinkBackfillSummary> {
    const rows = await this.prisma.placeRanking.findMany({
      where: { placeId: null },
      select: { id: true, sourcePlaceId: true, sourcePlaceName: true },
    });

    if (rows.length === 0 || this.placeLinks === null) {
      return { scanned: rows.length, linked: 0 };
    }

    const cache = new Map<string, string | null>();
    let linked = 0;

    for (const row of rows) {
      if (!cache.has(row.sourcePlaceId)) {
        cache.set(
          row.sourcePlaceId,
          await this.placeLinks.resolvePlaceId({
            placeName: row.sourcePlaceName,
          }),
        );
      }

      const placeId = cache.get(row.sourcePlaceId) ?? null;

      if (placeId === null) continue;

      await this.prisma.placeRanking.update({
        where: { id: row.id },
        data: { placeId },
      });
      linked += 1;
    }

    return { scanned: rows.length, linked };
  }
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
  row: ParsedPlaceRankingRow,
  candidateIndex: Map<string, PlaceCandidate[]>,
): PlaceRankingCreateManyInput {
  const candidates = candidateIndex.get(
    normalizePlaceTitle(row.sourcePlaceName),
  );
  const match = candidates?.length === 1 ? candidates[0] : undefined;

  return {
    source,
    scope,
    sourcePlaceId: row.sourcePlaceId,
    sourcePlaceName: row.sourcePlaceName,
    sourceCategory: row.sourceCategory,
    audience: row.audience,
    periodStart,
    periodEnd,
    rank: row.rank,
    sharePercent: new Prisma.Decimal(row.sharePercent),
    placeId: match?.id ?? null,
    primaryImageUrl: httpsImageUrl(match?.primaryImageUrl ?? undefined),
    imageCopyrightType: match?.imageCopyrightType ?? null,
    sourceFileName: row.sourceFileName,
    importedAt,
  };
}

function httpsImageUrl(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";

  if (trimmed === "") return null;
  if (trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("http://")) return `https://${trimmed.slice(7)}`;

  return null;
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
