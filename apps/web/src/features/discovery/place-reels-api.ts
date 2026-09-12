import { getApiBaseUrl, normalizeApiBaseUrl } from "@/lib/api-base";
import {
  PlaceReelListResponseSchema,
  PopularReelsResponseSchema,
  type PlaceRankingAudience,
  type PlaceReelListResponse,
  type PopularReelRegion,
  type PopularReelsResponse,
} from "@haetteum/contracts";

export type PopularReelsLoadState =
  | { status: "ready"; data: PopularReelsResponse }
  | { status: "empty" }
  | { status: "error" };

export type PlaceReelsLoadState =
  | { status: "ready"; data: PlaceReelListResponse }
  | { status: "empty" }
  | { status: "not-found" }
  | { status: "error" };

function apiBaseUrl(value: string | undefined): string | null {
  const baseUrl = normalizeApiBaseUrl(value);
  return baseUrl ? baseUrl.replace(/\/+$/, "") : null;
}

export type PopularReelsPage = {
  cursor?: number;
  limit?: number;
};

export async function loadPopularReels(
  audience: PlaceRankingAudience,
  region: PopularReelRegion = "all",
  fetchImpl: typeof fetch = fetch,
  baseUrl = getApiBaseUrl(),
  page: PopularReelsPage = {},
): Promise<PopularReelsLoadState> {
  const api = apiBaseUrl(baseUrl);
  if (api == null) return { status: "error" };

  try {
    const url = new URL(`${api}/place-reels`);
    url.searchParams.set("audience", audience);
    url.searchParams.set("region", region);
    url.searchParams.set("limit", String(page.limit ?? 12));
    if (page.cursor !== undefined) {
      url.searchParams.set("cursor", String(page.cursor));
    }

    const response = await fetchImpl(url.href, { next: { revalidate: 30 } });
    if (!response.ok) return { status: "error" };

    const parsed = PopularReelsResponseSchema.safeParse(await response.json());
    if (!parsed.success) return { status: "error" };
    if (parsed.data.items.length === 0) return { status: "empty" };

    return { status: "ready", data: parsed.data };
  } catch {
    return { status: "error" };
  }
}

export async function loadPlaceReels(
  placeId: string,
  fetchImpl: typeof fetch = fetch,
  baseUrl = getApiBaseUrl(),
): Promise<PlaceReelsLoadState> {
  const api = apiBaseUrl(baseUrl);
  if (api == null) return { status: "error" };

  try {
    const response = await fetchImpl(
      `${api}/place-reels/${encodeURIComponent(placeId)}`,
      { cache: "no-store" },
    );
    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) return { status: "error" };

    const parsed = PlaceReelListResponseSchema.safeParse(await response.json());
    if (!parsed.success) return { status: "error" };
    if (parsed.data.items.length === 0) return { status: "empty" };

    return { status: "ready", data: parsed.data };
  } catch {
    return { status: "error" };
  }
}

export function orderPlaceReelItemsFrom<T extends { videoId: string }>(
  items: readonly T[],
  videoId: string | undefined,
): readonly T[] {
  if (videoId === undefined) return items;
  const index = items.findIndex((item) => item.videoId === videoId);
  if (index <= 0) return items;
  return [...items.slice(index), ...items.slice(0, index)];
}
