const reviewImageUploadErrorMessage =
  "사진을 업로드하지 못했어요. 잠시 후 다시 시도해 주세요.";

export type ReviewImageUploadResult =
  | { status: "success"; url: string }
  | { status: "error"; message: string };

export async function uploadReviewImage(
  file: File,
  fetchImpl: typeof fetch = fetch,
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
): Promise<ReviewImageUploadResult> {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");
  if (!normalizedBaseUrl) {
    return { status: "error", message: reviewImageUploadErrorMessage };
  }

  const body = new FormData();
  body.append("file", file);

  try {
    const response = await fetchImpl(`${normalizedBaseUrl}/reviews/images`, {
      method: "POST",
      credentials: "include",
      body,
    });
    if (!response.ok) {
      return { status: "error", message: reviewImageUploadErrorMessage };
    }

    const parsed = (await response.json()) as { url?: unknown };
    if (typeof parsed.url !== "string") {
      return { status: "error", message: reviewImageUploadErrorMessage };
    }

    return { status: "success", url: parsed.url };
  } catch {
    return { status: "error", message: reviewImageUploadErrorMessage };
  }
}
