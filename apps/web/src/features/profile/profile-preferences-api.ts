import { getApiBaseUrl, normalizeApiBaseUrl } from "@/lib/api-base";
import {
  ProblemDetailsSchema,
  ProfilePreferencesResponseSchema,
  type ProfilePreferencesResponse,
  type TravelStyle,
} from "@haetteum/contracts";
import type { PlaceRegion } from "@haetteum/contracts";

const genericErrorMessage = "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";

export type UpdateProfilePreferencesResult =
  | { ok: true; data: ProfilePreferencesResponse }
  | { ok: false; message: string };

export async function updateProfilePreferences(
  travelStyles: TravelStyle[],
  interestedRegions: PlaceRegion[],
  fetchImpl: typeof fetch = fetch,
  baseUrl = getApiBaseUrl(),
): Promise<UpdateProfilePreferencesResult> {
  const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl);
  if (!normalizedBaseUrl) {
    return { ok: false, message: genericErrorMessage };
  }

  try {
    const response = await fetchImpl(`${normalizedBaseUrl}/profile`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ travelStyles, interestedRegions }),
    });

    if (!response.ok) {
      const parsed = ProblemDetailsSchema.safeParse(await response.json());
      return {
        ok: false,
        message: parsed.success ? parsed.data.detail : genericErrorMessage,
      };
    }

    const parsed = ProfilePreferencesResponseSchema.safeParse(
      await response.json(),
    );
    if (!parsed.success) {
      return { ok: false, message: genericErrorMessage };
    }
    return { ok: true, data: parsed.data };
  } catch {
    return { ok: false, message: genericErrorMessage };
  }
}
