import {
  PlaceReelListResponseSchema,
  PopularReelsResponseSchema,
  type PlaceRankingAudience,
  type PlaceReelListResponse,
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
  const baseUrl = value?.trim();
  return baseUrl ? baseUrl.replace(/\/+$/, "") : null;
}

export async function loadPopularReels(
  audience: PlaceRankingAudience,
  fetchImpl: typeof fetch = fetch,
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL,
): Promise<PopularReelsLoadState> {
  const api = apiBaseUrl(baseUrl);
  if (api == null) return { status: "error" };

  try {
    const url = new URL(`${api}/place-reels`);
    url.searchParams.set("audience", audience);
    url.searchParams.set("limit", "12");

    const response = await fetchImpl(url.href, { cache: "no-store" });
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
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL,
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
