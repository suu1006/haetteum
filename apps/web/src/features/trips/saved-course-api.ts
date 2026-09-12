import { getApiBaseUrl } from "@/lib/api-base";
import {
  MySavedCoursesResponseSchema,
  SavedCourseItemSchema,
  type MySavedCoursesResponse,
  type SaveCourseRequest,
  type SavedCourseItem,
  type UpdateSavedCourseRequest,
} from "@haetteum/contracts";

const savedCoursesApiError = "Unable to reach saved courses API.";

function apiBaseUrl(): string {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error(savedCoursesApiError);
  return baseUrl;
}

export async function loadMySavedCourses(): Promise<MySavedCoursesResponse> {
  const response = await fetch(`${apiBaseUrl()}/saved-courses/mine`, {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(savedCoursesApiError);

  const parsed = MySavedCoursesResponseSchema.safeParse(
    await response.json(),
  );
  if (!parsed.success) throw new Error(savedCoursesApiError);
  return parsed.data;
}

export async function saveCourse(
  input: SaveCourseRequest,
): Promise<SavedCourseItem> {
  const response = await fetch(`${apiBaseUrl()}/saved-courses`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(savedCoursesApiError);

  const parsed = SavedCourseItemSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error(savedCoursesApiError);
  return parsed.data;
}

export async function updateSavedCourse(
  id: string,
  input: UpdateSavedCourseRequest,
): Promise<SavedCourseItem> {
  const response = await fetch(
    `${apiBaseUrl()}/saved-courses/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) throw new Error(savedCoursesApiError);

  const parsed = SavedCourseItemSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error(savedCoursesApiError);
  return parsed.data;
}

export async function removeSavedCourse(id: string): Promise<void> {
  const response = await fetch(
    `${apiBaseUrl()}/saved-courses/${encodeURIComponent(id)}`,
    { method: "DELETE", credentials: "include" },
  );
  if (!response.ok) throw new Error(savedCoursesApiError);
}
