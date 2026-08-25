import type { Metadata } from "next";
import { Suspense } from "react";

import { DiscoveryContent } from "@/features/discovery/discovery-content";
import type { DiscoverySearchParams } from "@/features/discovery/discovery-model";

export const metadata: Metadata = {
  title: "여행 탐색 | 해뜸",
  description: "인기 관광지와 축제를 살펴보고 AI 여행 코스를 추천받아 보세요.",
};

export default function Home({
  searchParams,
}: {
  searchParams: Promise<DiscoverySearchParams>;
}) {
  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={<p className="sr-only">여행 정보를 불러오는 중</p>}>
        <DiscoveryContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
