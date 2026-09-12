import "server-only";

import { getApiBaseUrl, normalizeApiBaseUrl } from "@/lib/api-base";
import {
  MySavedCoursesResponseSchema,
  SavedCourseItemSchema,
  type MySavedCoursesResponse,
  type SavedCourseItem,
} from "@haetteum/contracts";

export type MySavedCoursesLoadResult =
  | { status: "ready"; data: MySavedCoursesResponse }
  | { status: "error" };

export type SavedCourseLoadResult =
  | { status: "ready"; data: SavedCourseItem }
  | { status: "not-found" }
  | { status: "error" };

export async function loadMySavedCourses(
  cookieHeader: string | null,
  fetchImpl: typeof fetch = fetch,
  baseUrl = getApiBaseUrl(),
): Promise<MySavedCoursesLoadResult> {
  const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl);
  if (!normalizedBaseUrl) return { status: "error" };

  try {
    const response = await fetchImpl(
      `${normalizedBaseUrl}/saved-courses/mine`,
      {
        cache: "no-store",
        headers: cookieHeader ? { Cookie: cookieHeader } : {},
      },
    );
    if (!response.ok) return { status: "error" };

    const parsed = MySavedCoursesResponseSchema.safeParse(
      await response.json(),
    );
    if (!parsed.success) return { status: "error" };

    return { status: "ready", data: parsed.data };
  } catch {
    return { status: "error" };
  }
}

export async function loadSavedCourseById(
  id: string,
  cookieHeader: string | null,
  fetchImpl: typeof fetch = fetch,
  baseUrl = getApiBaseUrl(),
): Promise<SavedCourseLoadResult> {
  const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl);
  if (!normalizedBaseUrl) return { status: "error" };

  try {
    const response = await fetchImpl(
      `${normalizedBaseUrl}/saved-courses/${encodeURIComponent(id)}`,
      {
        cache: "no-store",
        headers: cookieHeader ? { Cookie: cookieHeader } : {},
      },
    );
    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) return { status: "error" };

    const parsed = SavedCourseItemSchema.safeParse(await response.json());
    if (!parsed.success) return { status: "error" };

    return { status: "ready", data: parsed.data };
  } catch {
    return { status: "error" };
  }
}
