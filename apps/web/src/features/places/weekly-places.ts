import { PlaceRegionSchema, PlacesPageSchema, type PlaceListItem } from "@haetteum/contracts";

export type WeeklyPlacesLoadState =
  | { status: "ready"; items: PlaceListItem[] }
  | { status: "error" };

// UTC+9의 월요일 날짜를 캐시 키와 무작위 선택 seed로 함께 사용한다.
export function getRecommendationWeek(now: Date): string {
  const date = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
  return date.toISOString().slice(0, 10);
}

function hash(value: string): number {
  let result = 2166136261;
  for (const character of value) {
    result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  }
  result = Math.imul(result ^ (result >>> 16), 0x85ebca6b);
  result = Math.imul(result ^ (result >>> 13), 0xc2b2ae35);
  return (result ^ (result >>> 16)) >>> 0;
}

export function selectWeeklyPlaces(items: readonly PlaceListItem[], week: string): PlaceListItem[] {
  const unique = [...new Map(items.map((item) => [item.id, item])).values()];
  return unique.sort((a, b) =>
    hash(`${week}:${a.id}`) - hash(`${week}:${b.id}`) || a.id.localeCompare(b.id),
  ).slice(0, 4);
}

export async function loadWeeklyPlaces(
  region: string,
  now = new Date(),
  fetchImpl: typeof fetch = fetch,
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
): Promise<WeeklyPlacesLoadState> {
  if (!baseUrl.trim()) return { status: "error" };
  const week = getRecommendationWeek(now);
  const parsedRegion = PlaceRegionSchema.safeParse(region);
  const regions = parsedRegion.success ? [parsedRegion.data] : PlaceRegionSchema.options;
  try {
    const pools = await Promise.all(regions.map(async (placeRegion) => {
      const url = new URL(`${baseUrl.trim().replace(/\/+$/, "")}/places`);
      url.searchParams.set("region", placeRegion);
      url.searchParams.set("page", "1");
      url.searchParams.set("pageSize", "100");
      // 헤더도 Next.js fetch 캐시 키에 포함된다. 새 주에는 이전 캐시를 재사용하지 않는다.
      const response = await fetchImpl(url.href, {
        cache: "force-cache",
        headers: { "X-Recommendation-Week": week },
        next: { revalidate: 604800 },
      });
      if (!response.ok) throw new Error("Failed to load weekly places");
      return PlacesPageSchema.parse(await response.json()).items;
    }));
    return { status: "ready", items: selectWeeklyPlaces(pools.flat(), week) };
  } catch {
    return { status: "error" };
  }
}
