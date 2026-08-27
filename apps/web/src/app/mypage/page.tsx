import type { Metadata } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";

import { MyPageScreen } from "@/components/patterns/my-page-screen";
import { requireCurrentUser } from "@/features/auth/auth-server";
import { AuthUserHydrator } from "@/features/auth/auth-user-hydrator";
import { createMyPageData } from "@/features/profile/my-page-data";
import { loadMyReviews } from "@/features/reviews/my-reviews-api";

export const metadata: Metadata = {
  title: "마이페이지 | 해뜸",
  description: "여행 기록과 계정 정보를 확인하세요.",
};

export default async function MyPage() {
  await connection();
  const user = await requireCurrentUser("/mypage");
  const cookieHeader = (await headers()).get("cookie");
  const reviews = await loadMyReviews(cookieHeader);
  const data = createMyPageData(
    user,
    reviews.status === "ready"
      ? { reviewCount: reviews.data.written.length }
      : {},
  );

  return (
    <>
      <AuthUserHydrator user={user} />
      <MyPageScreen data={data} />
    </>
  );
}
