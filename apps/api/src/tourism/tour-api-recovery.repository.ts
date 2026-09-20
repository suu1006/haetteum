import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  Prisma,
  TourApiCapture,
  TourApiItemRecovery,
} from "../generated/prisma/client.js";
export type ItemIdentity = {
  job: "tourism" | "festival";
  contentId: string;
  sourceVersion: string;
};
export type CaptureInput = Omit<
  TourApiCapture,
  "id" | "capturedAt" | "completedAt"
>;
@Injectable()
export class TourApiRecoveryRepository {
  constructor(private readonly prisma: PrismaService) {}
  capture(input: CaptureInput): Promise<TourApiCapture> {
    return this.prisma.tourApiCapture.create({
      data: { ...input, parameters: input.parameters as Prisma.InputJsonValue },
    });
  }
  find(
    job: string,
    scope: string,
    operation: string,
    requestKey: string,
  ): Promise<TourApiCapture | null> {
    return this.prisma.tourApiCapture.findFirst({
      where: {
        job,
        scope,
        operation,
        requestKey,
        truncated: false,
        state: { in: ["CAPTURED", "VALIDATED", "INVALID_SCHEMA"] },
      },
      orderBy: { capturedAt: "desc" },
    });
  }
  captures(job: string, scope: string): Promise<TourApiCapture[]> {
    return this.prisma.tourApiCapture.findMany({
      where: {
        job,
        scope,
        state: { in: ["CAPTURED", "VALIDATED", "INVALID_SCHEMA"] },
        truncated: false,
      },
    });
  }
  async mark(id: string, state: string): Promise<void> {
    await this.prisma.tourApiCapture.update({
      where: { id },
      data: {
        state,
        ...(state === "COMPLETE" ? { completedAt: new Date() } : {}),
      },
    });
  }
  async complete(job: string, scope: string): Promise<void> {
    await this.prisma.tourApiCapture.updateMany({
      where: { job, scope, state: "VALIDATED" },
      data: { state: "COMPLETE", completedAt: new Date() },
    });
  }
  failure(identity: ItemIdentity): Promise<TourApiItemRecovery | null> {
    return this.prisma.tourApiItemRecovery.findUnique({
      where: { job_contentId_sourceVersion: identity },
    });
  }
  failures(job: string): Promise<TourApiItemRecovery[]> {
    return this.prisma.tourApiItemRecovery.findMany({
      where: { job, state: { not: "COMPLETE" } },
    });
  }
  async saveFailure(input: TourApiItemRecovery): Promise<void> {
    await this.prisma.tourApiItemRecovery.upsert({
      where: {
        job_contentId_sourceVersion: {
          job: input.job,
          contentId: input.contentId,
          sourceVersion: input.sourceVersion,
        },
      },
      create: input,
      update: input,
    });
  }
  async resolve(identity: ItemIdentity): Promise<void> {
    await this.prisma.tourApiItemRecovery.updateMany({
      where: identity,
      data: { state: "COMPLETE", nextAttemptAt: null, updatedAt: new Date() },
    });
  }
  async requeue(job: string, ids: readonly string[]): Promise<void> {
    await this.prisma.tourApiItemRecovery.updateMany({
      where: { job, contentId: { in: [...ids] }, state: "QUARANTINED" },
      data: {
        state: "FAILED",
        attemptCount: 0,
        nextAttemptAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
  /** Only terminal successful evidence is eligible; failed and rejected evidence stays for operator review. */
  async cleanup(before: Date, limit: number): Promise<number> {
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000)
      throw new Error("Invalid retention limit");
    const rows = await this.prisma.tourApiCapture.findMany({
      where: { state: "COMPLETE", completedAt: { lt: before } },
      select: { id: true },
      orderBy: { completedAt: "asc" },
      take: limit,
    });
    return (
      await this.prisma.tourApiCapture.deleteMany({
        where: { id: { in: rows.map((r) => r.id) }, state: "COMPLETE" },
      })
    ).count;
  }
}
