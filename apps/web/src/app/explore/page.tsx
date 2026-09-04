import type { Metadata } from "next";

import { ExploreScreen } from "@/components/patterns/explore-screen";
import { exploreMock } from "@/features/explore/explore.mock";
import {
  parseExploreRegion,
  type ExploreSearchParams,
} from "@/features/explore/explore-model";
import { loadPlaceRankings } from "@/features/discovery/place-ranking-api";
import { loadPopularReels } from "@/features/discovery/place-reels-api";

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

  const [trendingRanking, regionalReels] = await Promise.all([
    loadPlaceRankings("all"),
    // 릴스 커버리지가 아직 얕아 지역당 3곳을 채우려면 가능한 많이 끌어와야 한다.
    loadPopularReels("all", region, undefined, undefined, { limit: 30 }),
  ]);

  return (
    <main className="min-h-screen bg-background">
      <ExploreScreen
        data={exploreMock}
        region={region}
        trendingRanking={trendingRanking}
        regionalReels={regionalReels}
      />
    </main>
  );
}
