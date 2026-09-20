import { publicMetadata } from "@/lib/seo";

import { ExploreScreen } from "@/features/explore/components/explore-screen";
import { parseDiscoveryQuery, type DiscoverySearchParams } from "@/features/discovery/discovery-model";
import { loadPopularReels } from "@/features/discovery/place-reels-api";

import { searchDiscoveryPlaces } from "@/features/places/discovery-place-search-api";

export const metadata = publicMetadata("/explore", "탐색 | 해뜸", "짧은 영상으로 지역별 인기 관광지를 만나보세요.");

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<DiscoverySearchParams>;
}) {
  const params = await searchParams;
  const query = parseDiscoveryQuery({ ...params, reelRegion: params.reelRegion ?? params.region });
  const isSearching = Boolean(query.q.trim());
  const popularReels = isSearching ? null : await loadPopularReels("all", query.reelRegion);
  const searchResults = isSearching
    ? await searchDiscoveryPlaces(undefined, query.q, query.externalSearch)
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
