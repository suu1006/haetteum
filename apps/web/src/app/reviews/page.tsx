import type { Metadata } from "next";

import { MyReviewsScreen } from "@/components/patterns/my-reviews-screen";
import { myReviewsMock } from "@/features/profile/my-reviews.mock";

export const metadata: Metadata = {
  title: "내 후기 | 해뜸",
  description: "작성한 후기와 북마크한 후기를 한곳에서 확인하세요.",
};

export default function ReviewsPage() {
  return <MyReviewsScreen data={myReviewsMock} />;
}
