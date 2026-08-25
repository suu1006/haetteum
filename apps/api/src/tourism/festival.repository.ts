import { Injectable } from "@nestjs/common";

import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { NormalizedFestival } from "./tour-api.mapper.js";
import { TOUR_API_SOURCE } from "./tourism.constants.js";

export type FestivalSyncCounters = {
  fetchedCount: number;
  insertedCount: number;
  updatedCount: number;
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
        deactivatedCount: 0,
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
        deactivatedCount: 0,
        failedCount: 1,
        errorSummary,
      },
    });
  }
}
