import "server-only";

import { getApiBaseUrl, normalizeApiBaseUrl } from "@/lib/api-base";
import {
  MyReviewsResponseSchema,
  type ReviewItem,
} from "@haetteum/contracts";

import type {
  MyReviewItem,
  MyReviewsData,
} from "@/features/profile/my-reviews-model";

import { resolveOfficialImageSource } from "@/lib/official-image";

export type MyReviewsLoadResult =
  | { status: "ready"; data: MyReviewsData }
  | { status: "error" };

export async function loadMyReviews(
  cookieHeader: string | null,
  fetchImpl: typeof fetch = fetch,
  baseUrl = getApiBaseUrl(),
): Promise<MyReviewsLoadResult> {
  const normalizedBaseUrl = normalizeApiBaseUrl(baseUrl);
  if (!normalizedBaseUrl) return { status: "error" };

  try {
    const response = await fetchImpl(`${normalizedBaseUrl}/reviews/mine`, {
      cache: "no-store",
      headers: cookieHeader ? { Cookie: cookieHeader } : {},
    });
    if (!response.ok) return { status: "error" };

    const parsed = MyReviewsResponseSchema.safeParse(await response.json());
    if (!parsed.success) return { status: "error" };

    return {
      status: "ready",
      data: {
        written: parsed.data.items.map(mapReviewItem),
      },
    };
  } catch {
    return { status: "error" };
  }
}

function mapReviewItem(item: ReviewItem): MyReviewItem {
  return {
    id: item.id,
    placeId: item.placeId,
    title: item.placeTitle,
    location: item.location,
    rating: item.rating,
    date: formatKoreanDate(item.updatedAt),
    content: item.content,
    likeCount: 0,
    commentCount: 0,
    image: {
      src: resolveOfficialImageSource(item.primaryImageUrl),
      alt: `${item.placeTitle} 대표 이미지`,
    },
  };
}

function formatKoreanDate(value: string): string {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(({ type: partType }) => partType === type)?.value;

  return `${part("year")}.${part("month")}.${part("day")}`;
}
