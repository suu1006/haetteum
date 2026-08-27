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
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  if (!baseUrl.trim()) return { status: "error" };

  try {
    const url = new URL(`${baseUrl.replace(/\/+$/, "")}/place-rankings`);
    url.searchParams.set("audience", audience);
    url.searchParams.set("limit", "10");

    const response = await fetch(url.href, { cache: "no-store" });
    if (!response.ok) return { status: "error" };

    const parsed = PlaceRankingResponseSchema.safeParse(await response.json());
    if (!parsed.success) return { status: "error" };

    return { status: "ready", data: parsed.data };
  } catch {
    return { status: "error" };
  }
}
