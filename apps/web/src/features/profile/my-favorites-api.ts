import "server-only";

import { getApiBaseUrl, normalizeApiBaseUrl } from "@/lib/api-base";
import {
  MyFavoritesResponseSchema,
  type MyFavoritesResponse,
} from "@haetteum/contracts";

export type MyFavoritesLoadResult =
  | { status: "ready"; data: MyFavoritesResponse }
  | { status: "error" };

export async function loadMyFavorites(
  cookieHeader: string | null,
  fetchImpl: typeof fetch = fetch,
  baseUrl = getApiBaseUrl(),
): Promise<MyFavoritesLoadResult> {
  const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl);
  if (!normalizedBaseUrl) return { status: "error" };

  try {
    const response = await fetchImpl(`${normalizedBaseUrl}/favorites/mine`, {
      cache: "no-store",
      headers: cookieHeader ? { Cookie: cookieHeader } : {},
    });
    if (!response.ok) return { status: "error" };

    const parsed = MyFavoritesResponseSchema.safeParse(await response.json());
    if (!parsed.success) return { status: "error" };

    return { status: "ready", data: parsed.data };
  } catch {
    return { status: "error" };
  }
}
