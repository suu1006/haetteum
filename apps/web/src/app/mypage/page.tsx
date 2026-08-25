import type { Metadata } from "next";

import { MyPageScreen } from "@/components/patterns/my-page-screen";
import { myPageMock } from "@/features/profile/my-page.mock";

export const metadata: Metadata = {
  title: "마이페이지 | 해뜸",
  description: "여행 기록과 계정 정보를 확인하세요.",
};

export default function MyPage() {
  return <MyPageScreen data={myPageMock} />;
}
