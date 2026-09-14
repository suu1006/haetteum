import { WeeklyRecommendationsResponseSchema, type WeeklyPlaceItem } from "@haetteum/contracts";
import { getApiBaseUrl, joinApiUrl } from "@/lib/api-base";

export type WeeklyPlacesLoadState =
  | { status: "ready"; items: WeeklyPlaceItem[] }
  | { status: "error" };

export async function loadWeeklyPlaces(
  fetchImpl: typeof fetch = fetch,
  baseUrl = getApiBaseUrl(),
): Promise<WeeklyPlacesLoadState> {
  if (!baseUrl) return { status: "error" };
  try {
    const url = joinApiUrl(baseUrl, "/places/recommendations/weekly");
    const response = await fetchImpl(url, { next: { revalidate: 30 } });
    if (!response.ok) return { status: "error" };
    const { items } = WeeklyRecommendationsResponseSchema.parse(await response.json());
    return { status: "ready", items };
  } catch {
    return { status: "error" };
  }
}
