import {
  PlacesPageSchema,
  ProblemDetailsSchema,
  MyReviewsResponseSchema,
  ReviewIdParamsSchema,
  ReviewItemSchema,
  type CreateReviewRequest,
  type PlaceListItem,
  type PlaceRegion,
  type ReviewItem,
  type UpdateReviewRequest,
} from "@haetteum/contracts";

import type {
  MyReviewItem,
  MyWrittenReviewsLoadState,
} from "@/features/profile/my-reviews-model";

export type { MyWrittenReviewsLoadState } from "@/features/profile/my-reviews-model";

const fallbackImage = "/images/explore/categories/popular-attraction.png";
const reviewMutationErrorMessage =
  "후기를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.";

export type ReviewMutationResult =
  | { status: "success"; review: ReviewItem }
  | { status: "duplicate" }
  | { status: "error"; message: string };

export type ReviewDetailLoadState =
  | { status: "ready"; review: ReviewItem }
  | { status: "not-found" }
  | { status: "error" };

export type ReviewPlacesLoadState =
  | { status: "ready"; items: PlaceListItem[] }
  | { status: "error" };

export async function loadMyReviews(
  fetchImpl: typeof fetch = fetch,
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
): Promise<MyWrittenReviewsLoadState> {
  const url = apiUrl(baseUrl, "/reviews/mine");
  if (url == null) return { status: "error" };

  try {
    const response = await fetchImpl(url, { cache: "no-store" });
    if (!response.ok) return { status: "error" };

    const parsed = MyReviewsResponseSchema.safeParse(await response.json());
    if (!parsed.success) return { status: "error" };

    return {
      status: "ready",
      items: parsed.data.items.map(mapReviewItem),
    };
  } catch {
    return { status: "error" };
  }
}

export async function loadReview(
  reviewId: string,
  fetchImpl: typeof fetch = fetch,
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
): Promise<ReviewDetailLoadState> {
  if (!ReviewIdParamsSchema.safeParse({ reviewId }).success) {
    return { status: "error" };
  }

  const url = apiUrl(baseUrl, `/reviews/${encodeURIComponent(reviewId)}`);
  if (url == null) return { status: "error" };

  try {
    const response = await fetchImpl(url, { cache: "no-store" });
    if (response.status === 404) return { status: "not-found" };
    if (!response.ok) return { status: "error" };

    const parsed = ReviewItemSchema.safeParse(await response.json());
    return parsed.success
      ? { status: "ready", review: parsed.data }
      : { status: "error" };
  } catch {
    return { status: "error" };
  }
}

export async function createReview(
  input: CreateReviewRequest,
  fetchImpl: typeof fetch = fetch,
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
): Promise<ReviewMutationResult> {
  return mutateReview("/reviews", "POST", input, fetchImpl, baseUrl);
}

export async function updateReview(
  reviewId: string,
  input: UpdateReviewRequest,
  fetchImpl: typeof fetch = fetch,
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
): Promise<ReviewMutationResult> {
  if (!ReviewIdParamsSchema.safeParse({ reviewId }).success) {
    return reviewMutationError();
  }

  return mutateReview(
    `/reviews/${encodeURIComponent(reviewId)}`,
    "PATCH",
    input,
    fetchImpl,
    baseUrl,
  );
}

export async function searchReviewPlaces(
  region: PlaceRegion,
  query: string,
  fetchImpl: typeof fetch = fetch,
  baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
): Promise<ReviewPlacesLoadState> {
  const url = apiUrl(baseUrl, "/places");
  if (url == null) return { status: "error" };

  try {
    const requestUrl = new URL(url);
    requestUrl.searchParams.set("region", region);
    requestUrl.searchParams.set("page", "1");
    requestUrl.searchParams.set("pageSize", "20");
    requestUrl.searchParams.set("q", query);

    const response = await fetchImpl(requestUrl.href, { cache: "no-store" });
    if (!response.ok) return { status: "error" };

    const parsed = PlacesPageSchema.safeParse(await response.json());
    return parsed.success
      ? { status: "ready", items: parsed.data.items }
      : { status: "error" };
  } catch {
    return { status: "error" };
  }
}

export function mapReviewItem(item: ReviewItem): MyReviewItem {
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
    bookmarked: false,
    image: {
      src: item.primaryImageUrl ?? fallbackImage,
      alt: `${item.placeTitle} 대표 이미지`,
    },
  };
}

async function mutateReview(
  path: string,
  method: "POST" | "PATCH",
  input: CreateReviewRequest | UpdateReviewRequest,
  fetchImpl: typeof fetch,
  baseUrl: string,
): Promise<ReviewMutationResult> {
  const url = apiUrl(baseUrl, path);
  if (url == null) return reviewMutationError();

  try {
    const response = await fetchImpl(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!response.ok) {
      if (response.status === 409 && (await isDuplicateReview(response))) {
        return { status: "duplicate" };
      }

      return reviewMutationError();
    }

    const parsed = ReviewItemSchema.safeParse(await response.json());
    return parsed.success
      ? { status: "success", review: parsed.data }
      : reviewMutationError();
  } catch {
    return reviewMutationError();
  }
}

async function isDuplicateReview(response: Response): Promise<boolean> {
  const parsed = ProblemDetailsSchema.safeParse(await response.json());
  return (
    parsed.success &&
    parsed.data.status === response.status &&
    parsed.data.code === "REVIEW_ALREADY_EXISTS"
  );
}

function reviewMutationError(): ReviewMutationResult {
  return { status: "error", message: reviewMutationErrorMessage };
}

function apiUrl(baseUrl: string | undefined, path: string): string | null {
  const normalizedBaseUrl = baseUrl?.trim().replace(/\/+$/, "");
  return normalizedBaseUrl ? `${normalizedBaseUrl}${path}` : null;
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
