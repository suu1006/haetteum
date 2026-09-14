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
    const week = recommendationWeek(now);
    const cutoff = new Date(now.getTime() - 7 * DAY);
    const candidates = await this.prisma.weeklyRecommendationCandidate.findMany(
      {
        where: {
          status: "PASSED",
          checkedAt: { gte: cutoff, lte: now },
          edition: { week: { lte: weekDate(week) } },
        },
        include: { edition: true },
        orderBy: [
          { edition: { week: "desc" } },
          { position: { sort: "asc", nulls: "last" } },
          { checkedAt: "desc" },
          { id: "asc" },
        ],
      },
    );
    const places = await this.prisma.place.findMany({
      where: {
        id: { in: candidates.map((c) => c.placeId) },
        isVisible: true,
        region: { is: { isActive: true } },
      },
      include: placeInclude,
    });
    const byId = new Map(places.map((p) => [p.id, p]));
    const items: WeeklyPlaceItem[] = [];
    const identities = new Set<string>();
    let responseWeek: string | null = null;
    for (const candidate of candidates) {
      const place = byId.get(candidate.placeId);
      const checks = (candidate.checks ?? {}) as Record<string, unknown>;
      const parsed = WeeklyPlaceItemSchema.safeParse(candidate.snapshot);
      if (
        !place ||
        place.source !== "TOUR_API" ||
        place.contentTypeId !== 12 ||
        !place.isVisible ||
        !place.region.isActive ||
        candidate.status !== "PASSED" ||
        !candidate.checkedAt ||
        candidate.checkedAt < cutoff ||
        candidate.checkedAt > now ||
        candidate.edition.week > weekDate(week) ||
        checks.policyVersion !== 2 ||
        checks.source !== "PASSED" ||
        checks.fields !== "PASSED" ||
        checks.thumbnail !== "PASSED" ||
        !place.detailSyncedAt ||
        !place.detailSourceModifiedAt ||
        place.detailSourceModifiedAt.getTime() !==
          place.providerModifiedAt.getTime() ||
        checks.sourceModifiedAt !== place.providerModifiedAt.toISOString() ||
        visitAvailability(place.restDate ?? "", place.useSeason ?? "", week) ===
          "CLOSED" ||
        !parsed.success ||
        parsed.data.id !== place.id ||
        !parsed.data.primaryImageUrl ||
        parsed.data.imageCopyrightType !== "Type1"
      )
        continue;
      const identity = placeIdentity({ ...parsed.data, kind: candidate.kind });
      if (
        identities.has(identity) ||
        items.some((item) => item.id === place.id)
      )
        continue;
      identities.add(identity);
      items.push(parsed.data);
      responseWeek ??= candidate.edition.week.toISOString().slice(0, 10);
      if (items.length === 20) break;
    }
    return { week: responseWeek, items };
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
      await this.fenced(token, (tx) =>
        tx.weeklyRecommendationEdition.update({
          where: { id: edition.id },
          data: { status: "DRAFT", verifiedAt: null, errorCode: null },
        }),
      );
      await this.prepareCandidates(edition, week, token, true);
    }, week);
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
            status: result.status,
          },
          update: {
            ...result,
            status: result.status,
            kind: candidate.kind,
          },
        }),
      );
      if (result.status === "PASSED") prepared.add(candidate.id);
    }
    if (prepared.size === 0)
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
      if (passed.length === 0) {
        await this.fail(edition.id, "NO_VERIFIED_CANDIDATES", token);
        return;
      }
      await this.fenced(token, async (tx) => {
        await tx.weeklyRecommendationEdition.update({
          where: { id: edition.id },
          data: { status: "VERIFIED", verifiedAt: new Date(), errorCode: null },
        });
      });
    }, week);
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
        if (selected.length === 0)
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
    }, week);
  }

  async repair(now = new Date()): Promise<void> {
    const week = recommendationWeek(now);
    await this.prepare(now, week);
    await this.validate(now, week);
    await this.publish(now);
    const result = await this.current(
      new Date(Math.max(now.getTime(), Date.now())),
    );
    if (result.items.length < 20)
      this.logger.warn(
        JSON.stringify({
          event: "weekly_supply_low",
          count: result.items.length,
          week,
        }),
      );
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
            policyVersion: 2,
            sourceModifiedAt: place.providerModifiedAt.toISOString(),
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
  private async locked(work: (token: string) => Promise<void>, week?: string) {
    const token = randomUUID();
    const rows = await this.prisma.$queryRaw<
      { token: string }[]
    >`INSERT INTO weekly_recommendation_leases(name,token,expires_at) VALUES (${LOCK},${token},${new Date(Date.now() + LEASE_MS)}) ON CONFLICT(name) DO UPDATE SET token=EXCLUDED.token,expires_at=EXCLUDED.expires_at WHERE weekly_recommendation_leases.expires_at<NOW() RETURNING token`;
    if (!rows.length) return;
    try {
      await work(token);
    } catch (error) {
      if (week && !(error instanceof Error && error.message === "LEASE_LOST")) {
        try {
          const edition =
            await this.prisma.weeklyRecommendationEdition.findUnique({
              where: { week: weekDate(week) },
            });
          if (edition) await this.fail(edition.id, "BATCH_FAILED", token);
        } catch {
          /* Preserve the original error; a DB outage may prevent recording failure. */
        }
      }
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
