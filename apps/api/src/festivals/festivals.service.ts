import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";

import type {
  FestivalBrowseRegion,
  FestivalCategoryLabel,
  FestivalDetailResponse,
  FestivalDetailStatus,
  FestivalDiscoveryItem,
  FestivalDiscoveryQuery,
  FestivalDiscoveryResponse,
  FestivalStatus,
} from "@haetteum/contracts";

import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { TOUR_API_PORT } from "../tourism/tourism.constants.js";
import type { TourApiPort } from "../tourism/tour-api.types.js";

const VISIBLE_WHERE: Prisma.FestivalWhereInput = { isVisible: true };

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
  private readonly logger = new Logger(FestivalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(TOUR_API_PORT) private readonly tourApi: TourApiPort,
  ) {}

  async list(
    input: FestivalDiscoveryQuery,
    now = new Date(),
  ): Promise<FestivalDiscoveryResponse> {
    const asOfDate = seoulCalendarDate(now);
    const databaseDate = new Date(`${asOfDate}T00:00:00.000Z`);
    const regionWhere = REGION_WHERE[input.region];
    const skip = (input.page - 1) * input.pageSize;
    // 상단 순위(1~3위)는 지역 필터와 무관하게 전체 축제를 기준으로 노출하고,
    // 지역 필터는 아래 목록(items)에만 적용한다.
    const ongoingDateWhere: Prisma.FestivalWhereInput = {
      ...VISIBLE_WHERE,
      eventStartDate: { lte: databaseDate },
      eventEndDate: { gte: databaseDate },
    };
    const upcomingDateWhere: Prisma.FestivalWhereInput = {
      ...VISIBLE_WHERE,
      eventStartDate: { gt: databaseDate },
    };
    const ongoingWhere: Prisma.FestivalWhereInput = {
      ...regionWhere,
      ...ongoingDateWhere,
    };
    const upcomingWhere: Prisma.FestivalWhereInput = {
      ...regionWhere,
      ...upcomingDateWhere,
    };
    const result = await this.prisma.$transaction(async (transaction) => {
      const [ongoingCount, upcomingCount] = await Promise.all([
        transaction.festival.count({ where: ongoingWhere }),
        transaction.festival.count({ where: upcomingWhere }),
      ]);
      const [rankingOngoing, rankingUpcoming] = await Promise.all([
        transaction.festival.findMany({
          where: ongoingDateWhere,
          orderBy: [{ eventEndDate: "asc" }, { externalId: "asc" }],
          take: 3,
        }),
        transaction.festival.findMany({
          where: upcomingDateWhere,
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

  async detail(
    festivalId: string,
    now = new Date(),
  ): Promise<FestivalDetailResponse> {
    const festival = await this.prisma.festival.findFirst({
      where: { id: festivalId, isVisible: true },
    });
    if (festival == null) {
      throw new NotFoundException("축제를 찾을 수 없습니다.");
    }

    const [commonResult, introResult, imagesResult] = await Promise.allSettled([
      this.tourApi.getPlaceCommonDetail(festival.externalId),
      this.tourApi.getFestivalIntro(festival.externalId),
      this.tourApi.getPlaceImages(festival.externalId),
    ]);
    // TourAPI가 콘텐츠를 회수하면 상세/소개/이미지 조회가 모두 빈 응답이 되고
    // 화면에는 이유 없이 정보가 비어 보인다. 조용히 넘기지 말고 흔적을 남긴다.
    const common = this.settledDetail(
      commonResult,
      "detailCommon2",
      festival.externalId,
    );
    const intro = this.settledDetail(
      introResult,
      "detailIntro2",
      festival.externalId,
    );
    const rawImages =
      this.settledDetail(imagesResult, "detailImage2", festival.externalId) ??
      [];

    const images = rawImages
      .map((image) => {
        const url = providerImageUrl(image.originimgurl);
        return url == null
          ? null
          : {
              url,
              alt: image.imgname?.trim()
                ? image.imgname.trim()
                : `${festival.title} 사진`,
            };
      })
      .filter((image): image is { url: string; alt: string } => image != null);

    const startDate = dateOnly(festival.eventStartDate);
    const endDate = dateOnly(festival.eventEndDate);

    return {
      id: festival.id,
      externalId: festival.externalId,
      title: festival.title,
      status: detailStatus(seoulCalendarDate(now), startDate, endDate),
      eventStartDate: startDate,
      eventEndDate: endDate,
      address: joinedText(festival.address1, festival.address2),
      categoryLabel: festival.category3
        ? (CATEGORY_LABELS[festival.category3] ?? "축제")
        : "축제",
      telephone: festival.telephone?.trim() ? festival.telephone.trim() : null,
      longitude: festival.longitude?.toNumber() ?? null,
      latitude: festival.latitude?.toNumber() ?? null,
      primaryImageUrl: providerImageUrl(festival.primaryImageUrl),
      homepage: homepageUrl(common?.homepage),
      overview: common?.overview?.trim() ? common.overview.trim() : null,
      eventPlace: nullableText(intro?.eventplace),
      eventTime: nullableText(intro?.playtime),
      feeInfo: nullableText(intro?.usetimefestival),
      program: nullableText(intro?.program),
      organizer: nullableText(intro?.sponsor1),
      organizerTel: nullableText(intro?.sponsor1tel),
      hostAgency: nullableText(intro?.sponsor2),
      hostAgencyTel: nullableText(intro?.sponsor2tel),
      images,
    };
  }

  private settledDetail<T>(
    result: PromiseSettledResult<T>,
    operation: string,
    externalId: string,
  ): T | null {
    if (result.status === "fulfilled") return result.value;
    this.logger.warn(
      `TourAPI ${operation} lookup failed for festival content ${externalId}: ${
        result.reason instanceof Error ? result.reason.message : "unknown error"
      }`,
    );
    return null;
  }
}

function detailStatus(
  today: string,
  startDate: string,
  endDate: string,
): FestivalDetailStatus {
  if (today < startDate) return "UPCOMING";
  if (today > endDate) return "ENDED";
  return "ONGOING";
}

function nullableText(value: string | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function homepageUrl(value: string | undefined): string | null {
  const text = value?.trim();
  if (!text) return null;
  const anchorMatch = text.match(/href\s*=\s*["']([^"']+)["']/iu);
  const candidate = anchorMatch?.[1]?.trim() ?? text;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
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
