import type { Metadata } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";

import { MyReviewsScreen } from "@/components/patterns/my-reviews-screen";
import { requireCurrentUser } from "@/features/auth/auth-server";
import { AuthUserHydrator } from "@/features/auth/auth-user-hydrator";
import type { MyReviewsData } from "@/features/profile/my-reviews-model";
import { loadMyReviews } from "@/features/reviews/my-reviews-api";

export const metadata: Metadata = {
  title: "내 후기 | 해뜸",
  description: "작성한 후기와 북마크한 후기를 한곳에서 확인하세요.",
};

const emptyReviews: MyReviewsData = { written: [], bookmarked: [] };

export default async function ReviewsPage() {
  await connection();
  const user = await requireCurrentUser("/reviews");
  const cookieHeader = (await headers()).get("cookie");
  const reviews = await loadMyReviews(cookieHeader);

  return (
    <>
      <AuthUserHydrator user={user} />
      <MyReviewsScreen
        data={reviews.status === "ready" ? reviews.data : emptyReviews}
        writtenLoadState={reviews.status}
      />
    </>
  );
}
