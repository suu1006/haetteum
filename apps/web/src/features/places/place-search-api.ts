import { getApiBaseUrl, normalizeApiBaseUrl } from "@/lib/api-base";
import {
  PlacesPageSchema,
  type PlaceListItem,
  type PlaceRegion,
} from "@haetteum/contracts";

export type PlaceSearchLoadState =
  | { status: "ready"; items: PlaceListItem[] }
  | { status: "error" };

function apiUrl(baseUrl: string | undefined, path: string): string | null {
  const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl);
  return normalizedBaseUrl ? `${normalizedBaseUrl}${path}` : null;
}

export async function searchPlaces(
  region: PlaceRegion,
  query: string,
  fetchImpl: typeof fetch = fetch,
  baseUrl = getApiBaseUrl(),
): Promise<PlaceSearchLoadState> {
  const url = apiUrl(baseUrl, "/places");
  if (url == null) return { status: "error" };

  try {
    const requestUrl = new URL(url);
    requestUrl.searchParams.set("region", region);
    requestUrl.searchParams.set("page", "1");
    requestUrl.searchParams.set("pageSize", "20");
    requestUrl.searchParams.set("q", query);

    const response = await fetchImpl(requestUrl.href, {
      cache: "no-store",
      credentials: "include",
    });
    if (!response.ok) return { status: "error" };

    const parsed = PlacesPageSchema.safeParse(await response.json());
    return parsed.success
      ? { status: "ready", items: parsed.data.items }
      : { status: "error" };
  } catch {
    return { status: "error" };
  }
}
