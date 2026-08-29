import {
  FestivalDetailResponseSchema,
  type FestivalDetailResponse,
} from "@haetteum/contracts";

export type FestivalDetailLoadState =
  | { status: "ready"; data: FestivalDetailResponse }
  | { status: "not-found" }
  | { status: "error" };

function apiBaseUrl(value: string | undefined): string | null {
  const baseUrl = value?.trim();
  return baseUrl ? baseUrl.replace(/\/+$/, "") : null;
}

export async function loadFestivalDetail(
  festivalId: string,
  fetchImpl: typeof fetch = fetch,
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL,
): Promise<FestivalDetailLoadState> {
  const api = apiBaseUrl(baseUrl);
  if (api == null) return { status: "error" };
  try {
    const response = await fetchImpl(
      `${api}/festivals/${encodeURIComponent(festivalId)}`,
      { cache: "no-store" },
    );
    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) return { status: "error" };
    const parsed = FestivalDetailResponseSchema.safeParse(
      await response.json(),
    );
    return parsed.success
      ? { status: "ready", data: parsed.data }
      : { status: "error" };
  } catch {
    return { status: "error" };
  }
}
