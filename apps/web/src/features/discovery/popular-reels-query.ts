import { infiniteQueryOptions } from "@tanstack/react-query";

import type { PlaceRankingAudience, PopularReelRegion } from "@haetteum/contracts";

import { loadPopularReels } from "@/features/discovery/place-reels-api";

const POPULAR_REELS_PAGE_SIZE = 12;

// The server just rendered the first page moments ago — without this, React
// Query treats it as stale immediately and kicks off a background revalidation
// of page 1 on mount. That refetch can race with a fetchNextPage() triggered
// by a user who's already scrolled past the fold (common on a short page,
// or a fast scroll), and the two in-flight requests can land as two separate
// pages instead of one refresh + one advance — duplicating page 1's items.
const POPULAR_REELS_STALE_TIME_MS = 60_000;

export function popularReelsQueryKey(
  audience: PlaceRankingAudience,
  region: PopularReelRegion,
) {
  return ["discovery", "popular-reels", audience, region] as const;
}

export function popularReelsInfiniteQueryOptions(
  audience: PlaceRankingAudience,
  region: PopularReelRegion,
) {
  return infiniteQueryOptions({
    queryKey: popularReelsQueryKey(audience, region),
    queryFn: ({ pageParam }) =>
      loadPopularReels(audience, region, fetch, undefined, {
        cursor: pageParam,
        limit: POPULAR_REELS_PAGE_SIZE,
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.status === "ready" ? (lastPage.data.nextCursor ?? undefined) : undefined,
    staleTime: POPULAR_REELS_STALE_TIME_MS,
  });
}

export { POPULAR_REELS_PAGE_SIZE };
