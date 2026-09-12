import { getApiBaseUrl } from "@/lib/api-base";
import {
  HotPlaceRankingResponseSchema,
  type HotPlaceRankingAudience,
  type HotPlaceRankingResponse,
} from "@haetteum/contracts";

export type HotPlaceRankingLoadState =
  | { status: "ready"; data: HotPlaceRankingResponse }
  | { status: "error" };

export async function loadHotPlaceRankings(
  audience: HotPlaceRankingAudience,
): Promise<HotPlaceRankingLoadState> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return { status: "error" };

  try {
    const url = new URL(`${baseUrl}/hot-place-rankings`);
    url.searchParams.set("audience", audience);
    url.searchParams.set("limit", "10");

    const response = await fetch(url.href, { cache: "no-store" });
    if (!response.ok) return { status: "error" };

    const parsed = HotPlaceRankingResponseSchema.safeParse(
      await response.json(),
    );
    if (!parsed.success) return { status: "error" };

    return { status: "ready", data: parsed.data };
  } catch {
    return { status: "error" };
  }
}
