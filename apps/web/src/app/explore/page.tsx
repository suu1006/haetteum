import type { Metadata } from "next";

import { ExploreScreen } from "@/components/patterns/explore-screen";
import { exploreMock } from "@/features/explore/explore.mock";
import {
  parseExploreRegion,
  type ExploreSearchParams,
} from "@/features/explore/explore-model";

export const metadata: Metadata = {
  title: "탐색 | 해뜸",
  description: "인기 여행지와 지역별 추천 여행지를 한눈에 둘러보세요.",
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<ExploreSearchParams>;
}) {
  const params = await searchParams;
  const region = parseExploreRegion(params.region);

  return (
    <main className="min-h-screen bg-background">
      <ExploreScreen data={exploreMock} region={region} />
    </main>
  );
}
