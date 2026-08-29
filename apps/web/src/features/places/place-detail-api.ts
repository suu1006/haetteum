import {
  GeneratedCourseResponseSchema,
  NearbyPlacesResponseSchema,
  PlaceCoursesResponseSchema,
  PlaceDetailResponseSchema,
  PlaceReviewsResponseSchema,
  type GeneratedCourseResponse,
  type NearbyPlaceCategory,
  type NearbyPlacesResponse,
  type PlaceCoursesResponse,
  type PlaceDetailResponse,
  type PlaceReviewsResponse,
} from "@haetteum/contracts";

export type PlaceDetailLoadState =
  | { status: "ready"; data: PlaceDetailResponse }
  | { status: "not-found" }
  | { status: "error" };

function apiBaseUrl(value: string | undefined): string | null {
  const baseUrl = value?.trim();
  return baseUrl ? baseUrl.replace(/\/+$/, "") : null;
}

export async function loadPlaceDetail(
  placeId: string,
  fetchImpl: typeof fetch = fetch,
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL,
): Promise<PlaceDetailLoadState> {
  const api = apiBaseUrl(baseUrl);
  if (api == null) return { status: "error" };
  try {
    const response = await fetchImpl(
      `${api}/places/${encodeURIComponent(placeId)}`,
      { cache: "no-store" },
    );
    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) return { status: "error" };
    const parsed = PlaceDetailResponseSchema.safeParse(await response.json());
    return parsed.success
      ? { status: "ready", data: parsed.data }
      : { status: "error" };
  } catch {
    return { status: "error" };
  }
}

export async function loadNearbyPlaces(
  placeId: string,
  category: NearbyPlaceCategory,
  fetchImpl: typeof fetch = fetch,
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL,
): Promise<NearbyPlacesResponse> {
  const api = apiBaseUrl(baseUrl);
  if (api == null) {
    return { status: "unavailable", reason: "provider_unavailable" };
  }
  try {
    const url = new URL(`${api}/places/${encodeURIComponent(placeId)}/nearby`);
    url.searchParams.set("category", category);
    url.searchParams.set("limit", "10");
    const response = await fetchImpl(url.href, { cache: "no-store" });
    if (!response.ok) {
      return { status: "unavailable", reason: "provider_unavailable" };
    }
    const parsed = NearbyPlacesResponseSchema.safeParse(await response.json());
    return parsed.success
      ? parsed.data
      : { status: "unavailable", reason: "provider_unavailable" };
  } catch {
    return { status: "unavailable", reason: "provider_unavailable" };
  }
}

export async function loadGeneratedCourse(
  placeId: string,
  fetchImpl: typeof fetch = fetch,
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL,
): Promise<GeneratedCourseResponse> {
  const api = apiBaseUrl(baseUrl);
  if (api == null) {
    return { status: "unavailable", reason: "provider_unavailable" };
  }
  try {
    const response = await fetchImpl(
      `${api}/places/${encodeURIComponent(placeId)}/course`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      return { status: "unavailable", reason: "provider_unavailable" };
    }
    const parsed = GeneratedCourseResponseSchema.safeParse(
      await response.json(),
    );
    return parsed.success
      ? parsed.data
      : { status: "unavailable", reason: "provider_unavailable" };
  } catch {
    return { status: "unavailable", reason: "provider_unavailable" };
  }
}

export type PlaceReviewsLoadState =
  | { status: "ready"; data: PlaceReviewsResponse }
  | { status: "error" };

export type PlaceCoursesLoadState =
  | { status: "ready"; data: PlaceCoursesResponse }
  | { status: "error" };

export async function loadPlaceReviews(
  placeId: string,
  fetchImpl: typeof fetch = fetch,
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL,
): Promise<PlaceReviewsLoadState> {
  const api = apiBaseUrl(baseUrl);
  if (api == null) return { status: "error" };
  try {
    const response = await fetchImpl(
      `${api}/place-reviews/${encodeURIComponent(placeId)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return { status: "error" };
    const parsed = PlaceReviewsResponseSchema.safeParse(await response.json());
    return parsed.success
      ? { status: "ready", data: parsed.data }
      : { status: "error" };
  } catch {
    return { status: "error" };
  }
}

export async function loadPlaceCourses(
  placeId: string,
  fetchImpl: typeof fetch = fetch,
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL,
): Promise<PlaceCoursesLoadState> {
  const api = apiBaseUrl(baseUrl);
  if (api == null) return { status: "error" };
  try {
    const response = await fetchImpl(
      `${api}/place-courses/${encodeURIComponent(placeId)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return { status: "error" };
    const parsed = PlaceCoursesResponseSchema.safeParse(await response.json());
    return parsed.success
      ? { status: "ready", data: parsed.data }
      : { status: "error" };
  } catch {
    return { status: "error" };
  }
}
