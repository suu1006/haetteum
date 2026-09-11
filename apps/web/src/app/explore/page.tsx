import type { Metadata } from "next";

import { ExploreScreen } from "@/components/patterns/explore-screen";
import { parseDiscoveryQuery, type DiscoverySearchParams } from "@/features/discovery/discovery-model";
import { loadPopularReels } from "@/features/discovery/place-reels-api";

export const metadata: Metadata = {
  title: "탐색 | 해뜸",
  description: "짧은 영상으로 지역별 인기 관광지를 만나보세요.",
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<DiscoverySearchParams>;
}) {
  const params = await searchParams;
  const query = parseDiscoveryQuery({ ...params, reelRegion: params.reelRegion ?? params.region });
  const popularReels = await loadPopularReels("all", query.reelRegion);

  return (
    <main className="min-h-screen bg-background">
      <ExploreScreen
        query={query}
        popularReels={popularReels}
      />
    </main>
  );
}
