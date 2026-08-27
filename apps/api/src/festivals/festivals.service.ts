import { Injectable } from "@nestjs/common";

import type {
  FestivalBrowseRegion,
  FestivalCategoryLabel,
  FestivalDiscoveryItem,
  FestivalDiscoveryQuery,
  FestivalDiscoveryResponse,
  FestivalStatus,
} from "@haetteum/contracts";

import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";

const REGION_WHERE = {
  all: {},
  jeju: { providerRegionCode: "50" },
  seoul: { providerRegionCode: "11" },
  busan: { providerRegionCode: "26" },
  gangwon: { providerRegionCode: "51" },
  gyeongju: {
    providerRegionCode: "47",
    providerDistrictCode: "130",
  },
  jeonju: {
    providerRegionCode: "52",
    providerDistrictCode: { in: ["111", "113"] },
  },
} as const satisfies Record<FestivalBrowseRegion, Prisma.FestivalWhereInput>;

const CATEGORY_LABELS: Readonly<Record<string, FestivalCategoryLabel>> = {
  EV010100: "문화관광축제",
  EV010200: "문화예술축제",
  EV010300: "지역특산물축제",
  EV010400: "전통역사축제",
  EV010500: "생태자연축제",
  EV010600: "기타축제",
};

type FestivalRow = Awaited<
  ReturnType<PrismaService["festival"]["findMany"]>
>[number];

@Injectable()
export class FestivalsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    input: FestivalDiscoveryQuery,
    now = new Date(),
  ): Promise<FestivalDiscoveryResponse> {
    const asOfDate = seoulCalendarDate(now);
    const databaseDate = new Date(`${asOfDate}T00:00:00.000Z`);
    const regionWhere = REGION_WHERE[input.region];
    const skip = (input.page - 1) * input.pageSize;
    const ongoingWhere: Prisma.FestivalWhereInput = {
      ...regionWhere,
      eventStartDate: { lte: databaseDate },
      eventEndDate: { gte: databaseDate },
    };
    const upcomingWhere: Prisma.FestivalWhereInput = {
      ...regionWhere,
      eventStartDate: { gt: databaseDate },
    };
    const result = await this.prisma.$transaction(async (transaction) => {
      const [ongoingCount, upcomingCount] = await Promise.all([
        transaction.festival.count({ where: ongoingWhere }),
        transaction.festival.count({ where: upcomingWhere }),
      ]);
      const [rankingOngoing, rankingUpcoming] = await Promise.all([
        transaction.festival.findMany({
          where: ongoingWhere,
          orderBy: [{ eventEndDate: "asc" }, { externalId: "asc" }],
          take: 3,
        }),
        transaction.festival.findMany({
          where: upcomingWhere,
          orderBy: [{ eventStartDate: "asc" }, { externalId: "asc" }],
          take: 3,
        }),
      ]);
      const ongoingTake = Math.max(
        0,
        Math.min(input.pageSize, ongoingCount - skip),
      );
      const upcomingTake = input.pageSize - ongoingTake;
      const upcomingSkip = Math.max(0, skip - ongoingCount);
      const [pageOngoing, pageUpcoming] = await Promise.all([
        ongoingTake > 0
          ? transaction.festival.findMany({
              where: ongoingWhere,
              orderBy: [{ eventEndDate: "asc" }, { externalId: "asc" }],
              skip,
              take: ongoingTake,
            })
          : Promise.resolve([]),
        upcomingTake > 0
          ? transaction.festival.findMany({
              where: upcomingWhere,
              orderBy: [{ eventStartDate: "asc" }, { externalId: "asc" }],
              skip: upcomingSkip,
              take: upcomingTake,
            })
          : Promise.resolve([]),
      ]);

      return {
        ongoingCount,
        upcomingCount,
        rankingOngoing,
        rankingUpcoming,
        pageOngoing,
        pageUpcoming,
      };
    });
    const ranking = [
      ...result.rankingOngoing.map((festival) =>
        mapFestival(festival, "ONGOING"),
      ),
      ...result.rankingUpcoming.map((festival) =>
        mapFestival(festival, "UPCOMING"),
      ),
    ].slice(0, 3);
    const items = [
      ...result.pageOngoing.map((festival) => mapFestival(festival, "ONGOING")),
      ...result.pageUpcoming.map((festival) =>
        mapFestival(festival, "UPCOMING"),
      ),
    ];

    return {
      asOfDate,
      region: input.region,
      ranking: ranking.map((festival, index) => ({
        ...festival,
        rank: (index + 1) as 1 | 2 | 3,
      })),
      items,
      page: input.page,
      pageSize: input.pageSize,
      totalCount: result.ongoingCount + result.upcomingCount,
    };
  }
}

function seoulCalendarDate(now: Date): string {
  if (Number.isNaN(now.getTime())) throw new Error("Invalid current timestamp");
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function mapFestival(
  festival: FestivalRow,
  status: FestivalStatus,
): FestivalDiscoveryItem {
  return {
    id: festival.id,
    externalId: festival.externalId,
    title: festival.title,
    status,
    eventStartDate: dateOnly(festival.eventStartDate),
    eventEndDate: dateOnly(festival.eventEndDate),
    address: joinedText(festival.address1, festival.address2),
    categoryLabel: festival.category3
      ? (CATEGORY_LABELS[festival.category3] ?? "축제")
      : "축제",
    primaryImageUrl: providerImageUrl(festival.primaryImageUrl),
  };
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function joinedText(...values: Array<string | null>): string | null {
  const parts = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  return parts.length > 0 ? parts.join(" ") : null;
}

function providerImageUrl(value: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "https:" && url.hostname === "tong.visitkorea.or.kr"
      ? url.href
      : null;
  } catch {
    return null;
  }
}
