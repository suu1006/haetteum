import "server-only";

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
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
): Promise<MyFavoritesLoadResult> {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
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
