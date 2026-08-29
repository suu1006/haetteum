import {
  FestivalDiscoveryResponseSchema,
  type FestivalBrowseRegion,
  type FestivalDiscoveryItem as ApiFestivalDiscoveryItem,
} from "@haetteum/contracts";

import type {
  FestivalDiscoveryData,
  FestivalDiscoveryListItem,
  FestivalDiscoveryRankingItem,
} from "@/features/discovery/discovery-model";

const FESTIVAL_REGIONS: FestivalDiscoveryData["regions"] = [
  { id: "all", label: "전체" },
  { id: "jeju", label: "제주" },
  { id: "seoul", label: "서울" },
  { id: "busan", label: "부산" },
  { id: "gangwon", label: "강원" },
  { id: "gyeongju", label: "경주" },
  { id: "jeonju", label: "전주" },
];

export async function loadFestivalDiscovery(
  region: FestivalBrowseRegion,
  fetchImpl: typeof fetch = fetch,
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
): Promise<FestivalDiscoveryData> {
  if (!baseUrl.trim()) return emptyFestivalDiscovery("error");

  try {
    const url = new URL(
      `${baseUrl.replace(/\/+$/, "")}/festivals/discovery`,
    );
    url.searchParams.set("region", region);
    url.searchParams.set("page", "1");
    url.searchParams.set("pageSize", "20");
    const response = await fetchImpl(url.href, { cache: "no-store" });
    if (!response.ok) return emptyFestivalDiscovery("error");

    const payload = FestivalDiscoveryResponseSchema.parse(
      await response.json(),
    );
    return {
      regions: FESTIVAL_REGIONS,
      ranking: payload.ranking.map((festival) => ({
        ...mapFestival(festival),
        rank: festival.rank,
      })),
      festivals: [...payload.items].sort(byEventDateAscending).map(mapFestival),
      loadState: "ready",
    };
  } catch {
    return emptyFestivalDiscovery("error");
  }
}

export function festivalBrowseRegion(
  region: FestivalDiscoveryData["regions"][number]["id"],
): FestivalBrowseRegion {
  return region === "gyeonggi" ? "all" : region;
}

export type MonthlyFestivalsLoadState =
  | { status: "ready"; items: readonly FestivalDiscoveryListItem[] }
  | { status: "error" };

const MONTHLY_FESTIVAL_LIMIT = 4;

export async function loadMonthlyFestivals(
  region: FestivalBrowseRegion,
  fetchImpl: typeof fetch = fetch,
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  now: Date = new Date(),
): Promise<MonthlyFestivalsLoadState> {
  if (!baseUrl.trim()) return { status: "error" };

  try {
    const url = new URL(`${baseUrl.replace(/\/+$/, "")}/festivals/discovery`);
    url.searchParams.set("region", region);
    url.searchParams.set("page", "1");
    url.searchParams.set("pageSize", "40");
    const response = await fetchImpl(url.href, { cache: "no-store" });
    if (!response.ok) return { status: "error" };

    const payload = FestivalDiscoveryResponseSchema.parse(
      await response.json(),
    );
    const month = seoulYearMonth(now);
    const items = [...payload.items]
      .filter(
        (festival) =>
          festival.eventStartDate.slice(0, 7) <= month &&
          festival.eventEndDate.slice(0, 7) >= month,
      )
      .sort(byEventDateAscending)
      .slice(0, MONTHLY_FESTIVAL_LIMIT)
      .map(mapFestival)
      .filter(
        (festival): festival is FestivalDiscoveryListItem =>
          !("rank" in festival),
      );
    return { status: "ready", items };
  } catch {
    return { status: "error" };
  }
}

function seoulYearMonth(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(now);
}

function byEventDateAscending(
  a: ApiFestivalDiscoveryItem,
  b: ApiFestivalDiscoveryItem,
): number {
  return (
    a.eventStartDate.localeCompare(b.eventStartDate) ||
    a.eventEndDate.localeCompare(b.eventEndDate) ||
    a.externalId.localeCompare(b.externalId)
  );
}

function mapFestival(
  festival: ApiFestivalDiscoveryItem,
): FestivalDiscoveryListItem | FestivalDiscoveryRankingItem {
  const ongoing = festival.status === "ONGOING";
  return {
    id: festival.id,
    title: festival.title,
    status: ongoing ? "ongoing" : "upcoming",
    statusLabel: ongoing ? "진행 중" : "곧 시작",
    dateLabel: formatDateRange(
      festival.eventStartDate,
      festival.eventEndDate,
    ),
    location: festival.address ?? "지역 정보 없음",
    categoryLabel: festival.categoryLabel,
    image: {
      src: festival.primaryImageUrl,
      alt: `${festival.title} 대표 이미지`,
    },
  };
}

function formatDateRange(start: string, end: string): string {
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  const startLabel = `${startYear}. ${startMonth}. ${startDay}.`;
  const endLabel =
    startYear === endYear
      ? `${endMonth}. ${endDay}.`
      : `${endYear}. ${endMonth}. ${endDay}.`;
  return `${startLabel} – ${endLabel}`;
}

function emptyFestivalDiscovery(
  loadState: FestivalDiscoveryData["loadState"],
): FestivalDiscoveryData {
  return {
    regions: FESTIVAL_REGIONS,
    ranking: [],
    festivals: [],
    loadState,
  };
}
