import {
  ExternalPlaceSearchResponseSchema,
  type ExternalPlaceSearchResponse,
  type PlaceListItem,
  type PlaceRegion,
} from "@haetteum/contracts";
import { getApiBaseUrl, normalizeApiBaseUrl } from "@/lib/api-base";
import { searchPlaces } from "./place-search-api";

export type DiscoveryPlaceSearchLoadState =
  | {
      status: "ready";
      items: PlaceListItem[];
      external?: ExternalPlaceSearchResponse;
    }
  | { status: "error" };

export async function searchDiscoveryPlaces(
  region: PlaceRegion | undefined,
  query: string,
  includeExternal = false,
  fetchImpl: typeof fetch = fetch,
  baseUrl = getApiBaseUrl(),
): Promise<DiscoveryPlaceSearchLoadState> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length > 100) return { status: "error" };
  const results = await searchPlaces(region, trimmed, fetchImpl, baseUrl);
  if (
    results.status === "error" ||
    (!includeExternal && results.items.length > 0)
  ) {
    return results;
  }

  let external: ExternalPlaceSearchResponse = {
    status: "unavailable",
    reason: "provider_unavailable",
  };
  try {
    const url = new URL(
      `${normalizeApiBaseUrl(baseUrl)}/places/external-search`,
    );
    url.searchParams.set("q", trimmed);
    if (region) url.searchParams.set("region", region);
    const response = await fetchImpl(url.href, {
      cache: "no-store",
      credentials: "include",
    });
    if (response.ok) {
      const parsed = ExternalPlaceSearchResponseSchema.safeParse(
        await response.json(),
      );
      if (parsed.success) external = parsed.data;
    }
  } catch {
    // A provider failure must not erase the already loaded database results.
  }
  return { ...results, external };
}
