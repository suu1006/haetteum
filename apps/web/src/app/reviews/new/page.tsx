import type { Metadata } from "next";

import { ReviewEditorScreen } from "@/components/patterns/review-editor-screen";
import { loadMyReviews } from "@/features/profile/my-reviews-api";

export const metadata: Metadata = {
  title: "후기 작성 | 해뜸",
  description: "다녀온 관광지의 경험을 후기로 남겨 보세요.",
};

export default async function ReviewNewPage() {
  const reviews = await loadMyReviews();
  const reviewedPlaceIds =
    reviews.status === "ready"
      ? reviews.items.map(({ placeId }) => placeId)
      : [];

  return (
    <ReviewEditorScreen
      mode="create"
      reviewedPlaceIds={reviewedPlaceIds}
    />
  );
}
