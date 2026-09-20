import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { Prisma } from "../generated/prisma/client.js";
import type {
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

  /** Join before LIMIT: obsolete history never occupies an actionable replay slot. */
  selectCurrent(
    job: ItemIdentity["job"],
    ids: readonly string[],
    limit: number,
    committed: boolean,
    includeQuarantined = false,
  ): Promise<ItemIdentity[]> {
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100 ||
      ids.length > 100
    )
      throw new Error("Invalid recovery selection");
    const table = Prisma.raw(job === "tourism" ? "places" : "festivals");
    const state = includeQuarantined
      ? Prisma.sql`r.state IN ('FAILED','QUARANTINED')`
      : Prisma.sql`r.state = 'FAILED'`;
    return this.prisma.$queryRaw<ItemIdentity[]>(Prisma.sql`
      SELECT ${job}::text AS job, d.external_id AS "contentId",
        to_char(d.provider_modified_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "sourceVersion"
      FROM ${table} d
      WHERE d.source='TOUR_API'
        AND ${ids.length ? Prisma.sql`d.external_id IN (${Prisma.join(ids)})` : Prisma.sql`TRUE`}
        AND ${
          committed
            ? Prisma.sql`
          d.detail_source_modified_at=d.provider_modified_at AND (
            EXISTS (SELECT 1 FROM tour_api_item_recovery r WHERE r.job=${job} AND r.content_id=d.external_id
              AND r.source_version=to_char(d.provider_modified_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AND r.state <> 'COMPLETE')
            OR EXISTS (SELECT 1 FROM tour_api_captures c WHERE c.job=${job} AND c.content_id=d.external_id
              AND c.source_version=to_char(d.provider_modified_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AND c.state='VALIDATED')
          )`
            : Prisma.sql`
          d.is_visible=true AND d.detail_source_modified_at IS DISTINCT FROM d.provider_modified_at
          AND EXISTS (SELECT 1 FROM tour_api_item_recovery r WHERE r.job=${job} AND r.content_id=d.external_id
            AND r.source_version=to_char(d.provider_modified_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AND ${state})`
        }
      ORDER BY d.external_id ASC LIMIT ${limit}
    `);
  }
  async requeue(identities: readonly ItemIdentity[]): Promise<void> {
    if (identities.length === 0) return;
    await this.prisma.tourApiItemRecovery.updateMany({
      where: { OR: [...identities], state: "QUARANTINED" },
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
