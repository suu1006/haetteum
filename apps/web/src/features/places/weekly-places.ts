import { WeeklyRecommendationsResponseSchema, type WeeklyPlaceItem } from "@haetteum/contracts";

export type WeeklyPlacesLoadState =
  | { status: "ready"; items: WeeklyPlaceItem[] }
  | { status: "error" };

export async function loadWeeklyPlaces(
  fetchImpl: typeof fetch = fetch,
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
): Promise<WeeklyPlacesLoadState> {
  if (!baseUrl.trim()) return { status: "error" };
  try {
    const url = `${baseUrl.trim().replace(/\/+$/, "")}/places/recommendations/weekly`;
    const response = await fetchImpl(url, { cache: "no-store" });
    if (!response.ok) return { status: "error" };
    const { items } = WeeklyRecommendationsResponseSchema.parse(await response.json());
    return { status: "ready", items };
  } catch {
    return { status: "error" };
  }
}
