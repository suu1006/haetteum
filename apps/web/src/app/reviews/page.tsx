import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";

import { MyReviewsScreen } from "@/components/patterns/my-reviews-screen";
import { requireCurrentUser } from "@/features/auth/auth-server";
import { AuthUserHydrator } from "@/features/auth/auth-user-hydrator";
import { favoritesQueryKey } from "@/features/places/favorite-place-query";
import type { MyReviewsTabId } from "@/features/profile/my-reviews-model";
import { loadMyFavorites } from "@/features/profile/my-favorites-api";
import { getServerQueryClient } from "@/features/query/query-client.server";
import { loadMyReviews } from "@/features/reviews/my-reviews-api";

export const metadata: Metadata = {
  title: "내 후기 | 해뜸",
  description: "작성한 후기와 찜한 장소를 한곳에서 확인하세요.",
};

type ReviewsPageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

function parseTab(value: string | string[] | undefined): MyReviewsTabId {
  return value === "bookmarked" ? "bookmarked" : "written";
}

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  await connection();
  const user = await requireCurrentUser("/reviews");
  const cookieHeader = (await headers()).get("cookie");
  const initialTab = parseTab((await searchParams).tab);
  const [reviews, favorites] = await Promise.all([
    loadMyReviews(cookieHeader),
    loadMyFavorites(cookieHeader),
  ]);

  const queryClient = getServerQueryClient();
  if (favorites.status === "ready") {
    queryClient.setQueryData(favoritesQueryKey(), favorites.data);
  }

  return (
    <>
      <AuthUserHydrator user={user} />
      <HydrationBoundary state={dehydrate(queryClient)}>
        <MyReviewsScreen
          writtenReviews={reviews.status === "ready" ? reviews.data.written : []}
          writtenLoadState={reviews.status}
          bookmarkedLoadState={favorites.status}
          initialTab={initialTab}
        />
      </HydrationBoundary>
    </>
  );
}
