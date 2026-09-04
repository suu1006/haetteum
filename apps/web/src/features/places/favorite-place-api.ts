import {
  FavoritePlaceItemSchema,
  MyFavoritesResponseSchema,
  type FavoritePlaceItem,
  type MyFavoritesResponse,
} from "@haetteum/contracts";

const favoritesApiError = "Unable to reach favorites API.";

function apiBaseUrl(): string {
  const baseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
  if (!baseUrl) throw new Error(favoritesApiError);
  return baseUrl;
}

export async function loadMyFavorites(): Promise<MyFavoritesResponse> {
  const response = await fetch(`${apiBaseUrl()}/favorites/mine`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(favoritesApiError);

  const parsed = MyFavoritesResponseSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error(favoritesApiError);
  return parsed.data;
}

export async function addFavorite(placeId: string): Promise<FavoritePlaceItem> {
  const response = await fetch(`${apiBaseUrl()}/favorites`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placeId }),
  });
  if (!response.ok) throw new Error(favoritesApiError);

  const parsed = FavoritePlaceItemSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error(favoritesApiError);
  return parsed.data;
}

export async function removeFavorite(placeId: string): Promise<void> {
  const response = await fetch(
    `${apiBaseUrl()}/favorites/${encodeURIComponent(placeId)}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!response.ok) throw new Error(favoritesApiError);
}
