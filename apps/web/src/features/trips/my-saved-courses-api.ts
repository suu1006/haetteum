import "server-only";

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
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
): Promise<MySavedCoursesLoadResult> {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
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
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
): Promise<SavedCourseLoadResult> {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
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
