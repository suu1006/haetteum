import { randomUUID } from "node:crypto";
import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  WeeklyPlaceItemSchema,
  type WeeklyPlaceItem,
  type WeeklyRecommendationsResponse,
} from "@haetteum/contracts";
import { PrismaService } from "../prisma/prisma.service.js";
import { Prisma } from "../generated/prisma/client.js";
import { TOUR_API_SLEEP } from "../tourism/tourism.constants.js";
import type { TourApiSleep } from "../tourism/tour-api.types.js";
import { WeeklyThumbnailService } from "./weekly-thumbnail.service.js";
import {
  balancedSelection,
  placeKind,
  placeIdentity,
  recommendationWeek,
  validComposition,
  visitAvailability,
  weekDate,
} from "./weekly-selection.js";

const LEASE_MS = 10 * 60_000;
const LOCK = "weekly-recommendations";
const DAY = 86_400_000;
const placeInclude = { region: true, district: true, images: true } as const;
type Place = Prisma.PlaceGetPayload<{ include: typeof placeInclude }>;
type Edition = Prisma.WeeklyRecommendationEditionGetPayload<
  Record<string, never>
>;
function card(
  place: Place,
  imageUrl = place.primaryImageUrl,
  copyright = place.imageCopyrightType,
): WeeklyPlaceItem {
  return {
    id: place.id,
    title: place.title,
    region: place.region.slug,
    district: place.district?.name ?? null,
    address: [place.address1, place.address2].filter(Boolean).join(" ") || null,
    longitude: place.longitude?.toNumber() ?? null,
    latitude: place.latitude?.toNumber() ?? null,
    primaryImageUrl: imageUrl,
    imageCopyrightType: copyright,
  };
}
function selection(item: WeeklyPlaceItem, kind: string) {
  return { ...item, kind };
}
function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class WeeklyRecommendationsService {
  private readonly logger = new Logger(WeeklyRecommendationsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly thumbnails: WeeklyThumbnailService,
    @Inject(TOUR_API_SLEEP) private readonly sleep: TourApiSleep,
  ) {}

  async current(now = new Date()): Promise<WeeklyRecommendationsResponse> {
    const edition = await this.prisma.weeklyRecommendationEdition.findFirst({
      where: {
        status: "PUBLISHED",
        week: { lte: weekDate(recommendationWeek(now)) },
      },
      orderBy: { week: "desc" },
      include: {
        candidates: {
          where: { status: "PASSED", position: { not: null } },
          orderBy: { position: "asc" },
          take: 20,
        },
      },
    });
    if (!edition) return { week: null, items: [] };
    // Requests never select replacements or contact providers. Hidden entries are suppressed immediately.
    const visible = await this.prisma.place.findMany({
      where: {
        id: { in: edition.candidates.map((p) => p.placeId) },
        isVisible: true,
        region: { is: { isActive: true } },
      },
      select: { id: true },
    });
    const ids = new Set(visible.map((p) => p.id));
    return {
      week: edition.week.toISOString().slice(0, 10),
      items: edition.candidates
        .filter((p) => ids.has(p.placeId))
        .map((p) => WeeklyPlaceItemSchema.parse(p.snapshot)),
    };
  }

  async bootstrap(now = new Date()): Promise<void> {
    const existing = await this.prisma.weeklyRecommendationEdition.findFirst({
      where: { status: "PUBLISHED" },
    });
    if (existing) return;
    const week = recommendationWeek(now);
    await this.prepare(now, week);
    await this.validate(now, week);
    await this.publish(now);
    const published = await this.prisma.weeklyRecommendationEdition.findUnique({
      where: { week: weekDate(week) },
    });
    if (published?.status !== "PUBLISHED")
      throw new Error("BOOTSTRAP_VALIDATION_FAILED");
  }

  async prepare(
    now = new Date(),
    week = recommendationWeek(now, true),
  ): Promise<void> {
    await this.locked(async (token) => {
      const edition = await this.prisma.weeklyRecommendationEdition.upsert({
        where: { week: weekDate(week) },
        create: { week: weekDate(week) },
        update: {},
      });
      if (edition.status === "PUBLISHED" || edition.status === "VERIFIED")
        return;
      await this.fenced(token, (tx) =>
        tx.weeklyRecommendationEdition.update({
          where: { id: edition.id },
          data: { status: "DRAFT", verifiedAt: null, errorCode: null },
        }),
      );
      await this.prepareCandidates(edition, week, token, true);
    });
  }

  private async prepareCandidates(
    edition: Edition,
    week: string,
    token: string,
    retryRejected = false,
  ): Promise<void> {
    const recent = await this.prisma.weeklyRecommendationCandidate.findMany({
      where: {
        position: { not: null },
        edition: {
          status: "PUBLISHED",
          week: {
            gte: new Date(weekDate(week).getTime() - 28 * DAY),
            lt: weekDate(week),
          },
        },
      },
      select: { placeId: true },
    });
    const places = await this.prisma.place.findMany({
      where: {
        source: "TOUR_API",
        contentTypeId: 12,
        isVisible: true,
        region: { is: { isActive: true } },
        title: { not: "" },
        address1: { not: null },
        latitude: { not: null },
        longitude: { not: null },
      },
      include: placeInclude,
    });
    // Batch-only metadata read over the entire eligible population, never an alphabetic first page.
    const candidates = balancedSelection(
      places
        .filter(
          (p) =>
            placeKind(p.category1) !== "unknown" &&
            p.detailSyncedAt != null &&
            p.detailSourceModifiedAt != null &&
            p.detailSourceModifiedAt.getTime() ===
              p.providerModifiedAt.getTime(),
        )
        .map((p) => ({
          ...selection(card(p), placeKind(p.category1)),
          place: p,
        })),
      week,
      120,
      new Set(recent.map((p) => p.placeId)),
    );
    const previous = await this.prisma.weeklyRecommendationCandidate.findMany({
      where: { editionId: edition.id },
    });
    const rejected = new Set(
      previous.filter((p) => p.status === "REJECTED").map((p) => p.placeId),
    );
    const prepared = new Set(
      previous
        .filter((p) => p.status === "PREPARED" || p.status === "PASSED")
        .map((p) => p.placeId),
    );
    for (const candidate of candidates) {
      if (prepared.size >= 60) break;
      if (
        prepared.has(candidate.id) ||
        (!retryRejected && rejected.has(candidate.id))
      )
        continue;
      await this.renew(token);
      const result = await this.check(candidate.place, week);
      await this.fenced(token, (tx) =>
        tx.weeklyRecommendationCandidate.upsert({
          where: {
            editionId_placeId: { editionId: edition.id, placeId: candidate.id },
          },
          create: {
            editionId: edition.id,
            placeId: candidate.id,
            kind: candidate.kind,
            ...result,
            status: result.status === "PASSED" ? "PREPARED" : "REJECTED",
          },
          update: {
            ...result,
            status: result.status === "PASSED" ? "PREPARED" : "REJECTED",
            kind: candidate.kind,
          },
        }),
      );
      if (result.status === "PASSED") prepared.add(candidate.id);
    }
    if (prepared.size < 25)
      await this.fail(edition.id, "INSUFFICIENT_PREPARED_CANDIDATES", token);
  }

  async validate(
    now = new Date(),
    week = recommendationWeek(now, true),
  ): Promise<void> {
    await this.locked(async (token) => {
      const edition = await this.prisma.weeklyRecommendationEdition.findUnique({
        where: { week: weekDate(week) },
      });
      if (!edition) {
        this.logger.error(
          JSON.stringify({
            event: "weekly_failed",
            week,
            reason: "MISSING_DRAFT",
          }),
        );
        return;
      }
      if (edition.status === "PUBLISHED") return;
      await this.fenced(token, (tx) =>
        tx.weeklyRecommendationEdition.update({
          where: { id: edition.id },
          data: { status: "DRAFT", verifiedAt: null, errorCode: null },
        }),
      );
      // Allows recovery after partial Saturday/provider failures while keeping prior audit records.
      await this.prepareCandidates(edition, week, token, true);
      for (let round = 0; round < 2; round++) {
        const candidates =
          await this.prisma.weeklyRecommendationCandidate.findMany({
            where: {
              editionId: edition.id,
              status: {
                in: round === 0 ? ["PREPARED", "PASSED"] : ["PREPARED"],
              },
            },
          });
        for (const candidate of candidates) {
          await this.renew(token);
          const place = await this.prisma.place.findUnique({
            where: { id: candidate.placeId },
            include: placeInclude,
          });
          const result = place
            ? await this.check(place, week)
            : {
                status: "REJECTED",
                reason: "PLACE_MISSING",
                checks: json({ source: false }),
                snapshot: candidate.snapshot as Prisma.InputJsonValue,
                checkedAt: new Date(),
              };
          await this.fenced(token, (tx) =>
            tx.weeklyRecommendationCandidate.update({
              where: { id: candidate.id },
              data: {
                ...result,
                ...(place ? { kind: placeKind(place.category1) } : {}),
              },
            }),
          );
        }
        if (round === 0) await this.prepareCandidates(edition, week, token);
      }
      const passed = await this.passed(edition.id);
      const selected = balancedSelection(passed, week, 20);
      if (!validComposition(selected) || passed.length < 25) {
        await this.fail(
          edition.id,
          "INSUFFICIENT_VERIFIED_DIVERSITY_OR_RESERVES",
          token,
        );
        return;
      }
      await this.fenced(token, async (tx) => {
        await tx.weeklyRecommendationEdition.update({
          where: { id: edition.id },
          data: { status: "VERIFIED", verifiedAt: new Date(), errorCode: null },
        });
      });
    });
  }

  async publish(now = new Date()): Promise<void> {
    const week = recommendationWeek(now);
    await this.locked(async (token) => {
      const edition = await this.prisma.weeklyRecommendationEdition.findUnique({
        where: { week: weekDate(week) },
      });
      if (edition?.status === "PUBLISHED") return;
      if (
        !edition ||
        edition.status !== "VERIFIED" ||
        !edition.verifiedAt ||
        now.getTime() - edition.verifiedAt.getTime() > 48 * 3_600_000
      ) {
        this.logger.error(
          JSON.stringify({
            event: "weekly_failed",
            week,
            reason: "NOT_RECENTLY_VERIFIED",
          }),
        );
        return;
      }
      await this.fenced(token, async (tx) => {
        const candidates = await tx.weeklyRecommendationCandidate.findMany({
          where: { editionId: edition.id, status: "PASSED" },
        });
        const visible = await tx.place.findMany({
          where: {
            id: { in: candidates.map((p) => p.placeId) },
            isVisible: true,
            region: { is: { isActive: true } },
          },
          select: { id: true },
        });
        const ids = new Set(visible.map((p) => p.id));
        const selected = balancedSelection(
          candidates
            .filter((p) => ids.has(p.placeId))
            .map((p) =>
              selection(WeeklyPlaceItemSchema.parse(p.snapshot), p.kind),
            ),
          week,
          20,
        );
        if (!validComposition(selected))
          throw new Error("PUBLICATION_COVERAGE_FAILED");
        await tx.weeklyRecommendationCandidate.updateMany({
          where: { editionId: edition.id },
          data: { position: null },
        });
        for (const [position, p] of selected.entries())
          await tx.weeklyRecommendationCandidate.update({
            where: {
              editionId_placeId: { editionId: edition.id, placeId: p.id },
            },
            data: { position },
          });
        await tx.weeklyRecommendationEdition.update({
          where: { id: edition.id },
          data: { status: "PUBLISHED", publishedAt: now, errorCode: null },
        });
      });
    });
  }

  async repair(now = new Date()): Promise<void> {
    await this.locked(async (token) => {
      const edition = await this.prisma.weeklyRecommendationEdition.findFirst({
        where: {
          status: "PUBLISHED",
          week: { lte: weekDate(recommendationWeek(now)) },
        },
        orderBy: { week: "desc" },
        include: {
          candidates: {
            where: { status: "PASSED" },
            orderBy: { position: "asc" },
          },
        },
      });
      if (!edition) return;
      const visible = await this.prisma.place.findMany({
        where: {
          id: { in: edition.candidates.map((p) => p.placeId) },
          isVisible: true,
          region: { is: { isActive: true } },
        },
        select: { id: true },
      });
      const ids = new Set(visible.map((p) => p.id));
      const current = edition.candidates.filter((p) => p.position !== null);
      const healthy = current.filter((p) => ids.has(p.placeId));
      if (healthy.length === 20) return;
      const items = healthy.map((p) =>
        selection(WeeklyPlaceItemSchema.parse(p.snapshot), p.kind),
      );
      const replacements: { id: string; position: number }[] = [];
      for (const missing of current.filter((p) => !ids.has(p.placeId))) {
        for (const reserve of edition.candidates.filter(
          (p) =>
            p.position === null &&
            ids.has(p.placeId) &&
            !replacements.some((r) => r.id === p.id),
        )) {
          await this.renew(token);
          const place = await this.prisma.place.findUnique({
            where: { id: reserve.placeId },
            include: placeInclude,
          });
          if (!place) continue;
          const checked = await this.check(place, recommendationWeek(now));
          await this.fenced(token, (tx) =>
            tx.weeklyRecommendationCandidate.update({
              where: { id: reserve.id },
              data: { ...checked, kind: placeKind(place.category1) },
            }),
          );
          if (checked.status !== "PASSED") continue;
          const item = selection(
            WeeklyPlaceItemSchema.parse(checked.snapshot),
            placeKind(place.category1),
          );
          const sameRegion = items.filter(
            (p) => p.region === item.region,
          ).length;
          const sameKind = items.filter((p) => p.kind === item.kind).length;
          if (
            sameRegion >= 4 ||
            sameKind >= 10 ||
            items.some((p) => placeIdentity(p) === placeIdentity(item))
          )
            continue;
          items.push(item);
          replacements.push({ id: reserve.id, position: missing.position! });
          break;
        }
      }
      if (!validComposition(items)) {
        this.logger.error(
          JSON.stringify({
            event: "weekly_failed",
            editionId: edition.id,
            reason: "REPAIR_RESERVES_EXHAUSTED",
          }),
        );
        return;
      }
      await this.fenced(token, async (tx) => {
        for (const missing of current.filter((p) => !ids.has(p.placeId)))
          await tx.weeklyRecommendationCandidate.update({
            where: { id: missing.id },
            data: {
              position: null,
              status: "REJECTED",
              reason: "HIDDEN_AFTER_PUBLICATION",
            },
          });
        for (const replacement of replacements)
          await tx.weeklyRecommendationCandidate.update({
            where: { id: replacement.id },
            data: { position: replacement.position },
          });
      });
    });
  }

  private async passed(editionId: string) {
    const rows = await this.prisma.weeklyRecommendationCandidate.findMany({
      where: { editionId, status: "PASSED" },
    });
    return rows.map((row) =>
      selection(WeeklyPlaceItemSchema.parse(row.snapshot), row.kind),
    );
  }

  private async check(place: Place, week: string) {
    const checkedAt = new Date();
    const snapshot = card(place);
    try {
      if (
        place.source !== "TOUR_API" ||
        place.contentTypeId !== 12 ||
        !place.isVisible ||
        !place.region.isActive
      )
        throw new Error("NOT_VISIBLE");
      if (
        !snapshot.title.trim() ||
        !snapshot.address?.trim() ||
        snapshot.latitude === null ||
        snapshot.longitude === null ||
        snapshot.latitude < 33 ||
        snapshot.latitude > 39 ||
        snapshot.longitude < 124 ||
        snapshot.longitude > 132 ||
        placeKind(place.category1) === "unknown"
      )
        throw new Error("MISSING_OR_INVALID_FIELDS");
      if (
        place.detailSyncedAt == null ||
        place.detailSourceModifiedAt == null ||
        place.detailSourceModifiedAt.getTime() !==
          place.providerModifiedAt.getTime()
      )
        throw new Error("DETAIL_NOT_SYNCHRONIZED");
      const sourceCheckedAt = place.detailSyncedAt.toISOString();
      const availability = visitAvailability(
        place.restDate ?? "",
        place.useSeason ?? "",
        week,
      );
      if (availability === "CLOSED") throw new Error("CLOSED_NEXT_WEEK");
      return await this.retry(async () => {
        const thumbnail = await this.thumbnails.prepare({
          placeId: place.id,
          urls: [
            ...place.images.map((i) => ({
              url: i.originalUrl,
              copyrightType: i.copyrightType ?? null,
            })),
            ...(place.primaryImageUrl
              ? [
                  {
                    url: place.primaryImageUrl,
                    copyrightType: place.imageCopyrightType,
                  },
                ]
              : []),
          ],
        });
        return {
          status: "PASSED",
          reason: null,
          checkedAt,
          snapshot: json(
            WeeklyPlaceItemSchema.parse({
              ...snapshot,
              title: snapshot.title,
              primaryImageUrl: thumbnail.url,
              imageCopyrightType: thumbnail.copyrightType,
            }),
          ),
          checks: json({
            source: "PASSED",
            fields: "PASSED",
            availability,
            thumbnail: "PASSED",
            sourceCheckedAt,
          }),
        };
      });
    } catch (error) {
      const reason =
        error instanceof Error && /^[A-Z_]{3,100}$/.test(error.message)
          ? error.message
          : "PROVIDER_OR_IMAGE_UNAVAILABLE";
      return {
        status: "REJECTED",
        reason,
        checkedAt,
        snapshot: json(snapshot),
        checks: json({ result: "REJECTED", reason }),
      };
    }
  }
  private async retry<T>(work: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await work();
      } catch (error) {
        if (attempt >= 2) throw error;
        await this.sleep(1000 * (attempt + 1));
      }
    }
  }
  private async fail(id: string, reason: string, token: string) {
    await this.fenced(token, (tx) =>
      tx.weeklyRecommendationEdition.update({
        where: { id },
        data: { status: "FAILED", verifiedAt: null, errorCode: reason },
      }),
    );
    this.logger.error(
      JSON.stringify({ event: "weekly_failed", editionId: id, reason }),
    );
  }
  private async renew(token: string) {
    const result = await this.prisma.weeklyRecommendationLease.updateMany({
      where: { name: LOCK, token, expiresAt: { gt: new Date() } },
      data: { expiresAt: new Date(Date.now() + LEASE_MS) },
    });
    if (result.count !== 1) throw new Error("LEASE_LOST");
  }
  private async fenced<T>(
    token: string,
    work: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        const lease = await tx.$queryRaw<
          { token: string }[]
        >`SELECT token FROM weekly_recommendation_leases WHERE name=${LOCK} AND token=${token} AND expires_at>NOW() FOR UPDATE`;
        if (!lease.length) throw new Error("LEASE_LOST");
        return work(tx);
      },
      { timeout: 30_000 },
    );
  }
  private async locked(work: (token: string) => Promise<void>) {
    const token = randomUUID();
    const rows = await this.prisma.$queryRaw<
      { token: string }[]
    >`INSERT INTO weekly_recommendation_leases(name,token,expires_at) VALUES (${LOCK},${token},${new Date(Date.now() + LEASE_MS)}) ON CONFLICT(name) DO UPDATE SET token=EXCLUDED.token,expires_at=EXCLUDED.expires_at WHERE weekly_recommendation_leases.expires_at<NOW() RETURNING token`;
    if (!rows.length) return;
    try {
      await work(token);
    } catch (error) {
      this.logger.error(
        JSON.stringify({
          event: "weekly_failed",
          reason:
            error instanceof Error && /^[A-Z_]+$/.test(error.message)
              ? error.message
              : "BATCH_FAILED",
        }),
      );
      throw error;
    } finally {
      await this.prisma.weeklyRecommendationLease.deleteMany({
        where: { name: LOCK, token },
      });
    }
  }
}
