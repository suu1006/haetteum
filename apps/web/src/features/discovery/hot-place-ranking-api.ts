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
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  if (!baseUrl.trim()) return { status: "error" };

  try {
    const url = new URL(`${baseUrl.replace(/\/+$/, "")}/hot-place-rankings`);
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
