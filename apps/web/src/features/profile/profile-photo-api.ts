import { ProfilePhotoResponseSchema } from "@haetteum/contracts";

const profilePhotoUploadErrorMessage =
  "사진을 업로드하지 못했어요. 잠시 후 다시 시도해 주세요.";

export type ProfilePhotoUploadResult =
  | { status: "success"; profileImageUrl: string }
  | { status: "error"; message: string };

export async function uploadProfilePhoto(
  file: File,
  fetchImpl: typeof fetch = fetch,
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
): Promise<ProfilePhotoUploadResult> {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
  if (!normalizedBaseUrl) {
    return { status: "error", message: profilePhotoUploadErrorMessage };
  }

  const body = new FormData();
  body.append("file", file);

  try {
    const response = await fetchImpl(`${normalizedBaseUrl}/profile/photo`, {
      method: "POST",
      credentials: "include",
      body,
    });
    if (!response.ok) {
      return { status: "error", message: profilePhotoUploadErrorMessage };
    }

    const parsed = ProfilePhotoResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      return { status: "error", message: profilePhotoUploadErrorMessage };
    }

    return { status: "success", profileImageUrl: parsed.data.profileImageUrl };
  } catch {
    return { status: "error", message: profilePhotoUploadErrorMessage };
  }
}
