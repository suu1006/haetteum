import type { DetailEnrichmentSummary } from "./detail-enrichment-summary.js";
import type { TourApiDeferredReason } from "./tour-api-policy.js";
import { Injectable } from "@nestjs/common";

import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { NormalizedFestival } from "./tour-api.mapper.js";
import type { FestivalDetailSnapshot } from "./festival-detail-snapshot.js";
import { TOUR_API_SOURCE } from "./tourism.constants.js";

export type FestivalSyncCounters = {
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  deactivatedCount: number;
  failedCount: number;
};

export type FestivalPageDelta = Pick<
  FestivalSyncCounters,
  "insertedCount" | "updatedCount"
>;

export type FestivalSyncSummary = FestivalSyncCounters & {
  runId: string;
  status: "SUCCEEDED" | "DEFERRED" | "FAILED";
  deferredReason?: TourApiDeferredReason;
  details?: DetailEnrichmentSummary;
};

export type PendingFestivalDetail = {
  id: string;
  externalId: string;
  providerModifiedAt: Date;
};

@Injectable()
export class FestivalRepository {
  constructor(private readonly prisma: PrismaService) {}

  createSyncRun(rangeStart: Date): Promise<{ id: string }> {
    return this.prisma.tourismSyncRun.create({
      data: {
        provider: TOUR_API_SOURCE,
        jobType: "FESTIVAL_FULL",
        status: "RUNNING",
        requestedFrom: rangeStart,
      },
      select: { id: true },
    });
  }

  async upsertPage(
    festivals: readonly NormalizedFestival[],
  ): Promise<FestivalPageDelta> {
    if (festivals.length === 0) {
      return { insertedCount: 0, updatedCount: 0 };
    }

    const externalIds = festivals.map((festival) => festival.externalId);
    if (new Set(externalIds).size !== externalIds.length) {
      throw new Error("Invalid TourAPI duplicate festival content ID");
    }

    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.festival.findMany({
        where: {
          source: TOUR_API_SOURCE,
          externalId: {
            in: externalIds,
          },
        },
        select: { externalId: true },
      });
      const existingIds = new Set(existing.map((item) => item.externalId));

      for (const festival of festivals) {
        await transaction.festival.upsert({
          where: {
            source_externalId: {
              source: festival.source,
              externalId: festival.externalId,
            },
          },
          create: festival satisfies Prisma.FestivalUncheckedCreateInput,
          update: festival satisfies Prisma.FestivalUncheckedUpdateInput,
        });
      }

      return {
        insertedCount: festivals.length - existingIds.size,
        updatedCount: existingIds.size,
      };
    });
  }

  /**
   * TourAPI가 더 이상 내려주지 않는 축제를 비표출로 전환한다.
   * TourAPI는 콘텐츠를 회수(showflag=0)해도 삭제 목록을 축제 검색에 남기지 않으므로,
   * 전체 동기화 범위 안에서 이번 실행에 등장하지 않은 콘텐츠를 회수된 것으로 본다.
   * 상세 조회(detailCommon2/detailIntro2)가 빈 응답만 돌려주는 유령 축제를 걸러내는 장치다.
   */
  async deactivateMissing(input: {
    rangeStart: Date;
    rangeEnd: Date;
    seenExternalIds: ReadonlySet<string>;
    lastSyncedAt: Date;
  }): Promise<number> {
    const result = await this.prisma.festival.updateMany({
      where: {
        source: TOUR_API_SOURCE,
        isVisible: true,
        eventStartDate: { gte: input.rangeStart },
        eventEndDate: { lte: input.rangeEnd },
        ...(input.seenExternalIds.size > 0
          ? { externalId: { notIn: [...input.seenExternalIds] } }
          : {}),
      },
      data: { isVisible: false, lastSyncedAt: input.lastSyncedAt },
    });
    return result.count;
  }

  findDetailTarget(contentId: string) {
    return this.prisma.festival.findUnique({
      where: {
        source_externalId: { source: TOUR_API_SOURCE, externalId: contentId },
      },
      select: {
        id: true,
        externalId: true,
        providerModifiedAt: true,
        detailSourceModifiedAt: true,
        isVisible: true,
      },
    });
  }

  async findPendingDetails(): Promise<PendingFestivalDetail[]> {
    const rows = await this.prisma.festival.findMany({
      where: { source: TOUR_API_SOURCE, isVisible: true },
      select: {
        id: true,
        externalId: true,
        providerModifiedAt: true,
        detailSourceModifiedAt: true,
      },
      orderBy: { id: "asc" },
    });
    return rows.flatMap((festival) =>
      festival.detailSourceModifiedAt == null ||
      festival.detailSourceModifiedAt.getTime() !==
        festival.providerModifiedAt.getTime()
        ? [
            {
              id: festival.id,
              externalId: festival.externalId,
              providerModifiedAt: festival.providerModifiedAt,
            },
          ]
        : [],
    );
  }

  async saveDetailSnapshot(input: {
    id: string;
    providerModifiedAt: Date;
    snapshot: FestivalDetailSnapshot;
    detailSyncedAt: Date;
  }): Promise<void> {
    const result = await this.prisma.festival.updateMany({
      where: {
        id: input.id,
        source: TOUR_API_SOURCE,
        isVisible: true,
        providerModifiedAt: input.providerModifiedAt,
      },
      data: {
        detailSnapshot: input.snapshot,
        detailSourceModifiedAt: input.providerModifiedAt,
        detailSyncedAt: input.detailSyncedAt,
      },
    });
    if (result.count !== 1) {
      throw new Error(
        "Festival source version changed during detail synchronization",
      );
    }
  }

  async completeSyncRun(
    runId: string,
    counters: FestivalSyncCounters,
  ): Promise<FestivalSyncSummary> {
    await this.prisma.tourismSyncRun.update({
      where: { id: runId },
      data: {
        status: counters.failedCount > 0 ? "FAILED" : "SUCCEEDED",
        finishedAt: new Date(),
        ...counters,
        errorSummary:
          counters.failedCount === 0
            ? null
            : `Festival detail synchronization failed for ${counters.failedCount} festival(s).`,
      },
    });

    return {
      runId,
      status: counters.failedCount > 0 ? "FAILED" : "SUCCEEDED",
      ...counters,
    };
  }

  async deferSyncRun(
    runId: string,
    counters: FestivalSyncCounters,
    reason: TourApiDeferredReason,
  ): Promise<FestivalSyncSummary> {
    const status = counters.failedCount > 0 ? "FAILED" : "DEFERRED";
    await this.prisma.tourismSyncRun.update({
      where: { id: runId },
      data: {
        ...counters,
        status,
        finishedAt: new Date(),
        errorSummary: reason,
      },
    });
    return { ...counters, runId, status, deferredReason: reason };
  }

  async failSyncRun(
    runId: string,
    counters: FestivalSyncCounters,
    errorSummary: string,
    options: { incrementFailedCount?: boolean } = {},
  ): Promise<void> {
    await this.prisma.tourismSyncRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        ...counters,
        failedCount:
          options.incrementFailedCount === false
            ? counters.failedCount
            : counters.failedCount + 1,
        errorSummary,
      },
    });
  }
}
