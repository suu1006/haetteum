import { Injectable } from "@nestjs/common";

import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { NormalizedFestival } from "./tour-api.mapper.js";
import { TOUR_API_SOURCE } from "./tourism.constants.js";

export type FestivalSyncCounters = {
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
  deactivatedCount: number;
};

export type FestivalPageDelta = Pick<
  FestivalSyncCounters,
  "insertedCount" | "updatedCount"
>;

export type FestivalSyncSummary = FestivalSyncCounters & {
  runId: string;
  status: "SUCCEEDED";
  failedCount: 0;
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

  async completeSyncRun(
    runId: string,
    counters: FestivalSyncCounters,
  ): Promise<FestivalSyncSummary> {
    await this.prisma.tourismSyncRun.update({
      where: { id: runId },
      data: {
        status: "SUCCEEDED",
        finishedAt: new Date(),
        ...counters,
        failedCount: 0,
        errorSummary: null,
      },
    });

    return {
      runId,
      status: "SUCCEEDED",
      ...counters,
      failedCount: 0,
    };
  }

  async failSyncRun(
    runId: string,
    counters: FestivalSyncCounters,
    errorSummary: string,
  ): Promise<void> {
    await this.prisma.tourismSyncRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        ...counters,
        failedCount: 1,
        errorSummary,
      },
    });
  }
}
