import type { Metadata } from "next";

import { ExploreScreen } from "@/components/patterns/explore-screen";
import { isPlaceSearchRegion, parseDiscoveryQuery, type DiscoverySearchParams } from "@/features/discovery/discovery-model";
import { loadPopularReels } from "@/features/discovery/place-reels-api";

import { searchPlaces } from "@/features/places/place-search-api";

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
  const isSearching = Boolean(query.q.trim());
  const popularReels = isSearching ? null : await loadPopularReels("all", query.reelRegion);
  const searchResults = isSearching && isPlaceSearchRegion(query.region)
    ? await searchPlaces(query.region, query.q)
    : null;

  return (
    <main className="min-h-screen bg-background">
      <ExploreScreen
        query={query}
        popularReels={popularReels}
        searchResults={searchResults}
      />
    </main>
  );
}
