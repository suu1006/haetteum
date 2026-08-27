import { Inject, Injectable } from "@nestjs/common";

import { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
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
      select: { id: true; title: true };
    }): Promise<PlaceCandidate[]>;
  };
  placeRanking: {
    deleteMany(args: { where: SnapshotIdentity }): Promise<unknown>;
    createMany(args: { data: PlaceRankingCreateManyInput[] }): Promise<unknown>;
  };
  $transaction<T>(
    callback: (transaction: PlaceRankingPrisma) => Promise<T>,
  ): Promise<T>;
}

export function normalizePlaceTitle(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ");
}

@Injectable()
export class PlaceRankingImportService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PlaceRankingPrisma,
  ) {}

  async importDirectory(directory: string): Promise<PlaceRankingImportSummary> {
    const [snapshot, places] = await Promise.all([
      parsePlaceRankingDirectory(directory),
      this.prisma.place.findMany({
        where: { isVisible: true },
        select: { id: true, title: true },
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
  const placeId = candidates?.length === 1 ? candidates[0]?.id : null;

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
    placeId: placeId ?? null,
    sourceFileName: row.sourceFileName,
    importedAt,
  };
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
