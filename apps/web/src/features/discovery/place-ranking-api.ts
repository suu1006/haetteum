import { getServerApiBaseUrl } from "@/lib/api-base";
import {
  PlaceRankingResponseSchema,
  type PlaceRankingAudience,
  type PlaceRankingResponse,
} from "@haetteum/contracts";

export type PlaceRankingLoadState =
  | { status: "ready"; data: PlaceRankingResponse }
  | { status: "error" };

export async function loadPlaceRankings(
  audience: PlaceRankingAudience,
): Promise<PlaceRankingLoadState> {
  const baseUrl = getServerApiBaseUrl();
  if (!baseUrl) return { status: "error" };

  try {
    const url = new URL(`${baseUrl}/place-rankings`);
    url.searchParams.set("audience", audience);
    url.searchParams.set("limit", "10");

    const response = await fetch(url.href, { next: { revalidate: 30 } });
    if (!response.ok) return { status: "error" };

    const parsed = PlaceRankingResponseSchema.safeParse(await response.json());
    if (!parsed.success) return { status: "error" };

    return { status: "ready", data: parsed.data };
  } catch {
    return { status: "error" };
  }
}
