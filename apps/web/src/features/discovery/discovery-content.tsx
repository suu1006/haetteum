import { MainDiscovery } from "@/components/patterns/main-discovery";
import type { DiscoverySearchParams } from "@/features/discovery/discovery-model";
import {
  isPlaceSearchRegion,
  parseDiscoveryQuery,
  selectDiscoveryView,
} from "@/features/discovery/discovery-model";
import { loadHotPlaceRankings } from "@/features/discovery/hot-place-ranking-api";
import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";
import { loadPlaceRankings } from "@/features/discovery/place-ranking-api";
import { loadPopularReels } from "@/features/discovery/place-reels-api";
import { searchPlaces } from "@/features/places/place-search-api";
import {
  festivalBrowseRegion,
  loadFestivalDiscovery,
  loadMonthlyFestivals,
} from "@/features/festivals/festival-discovery-api";

type DiscoveryContentProps = {
  searchParams: Promise<DiscoverySearchParams>;
};

async function DiscoveryContent({ searchParams }: DiscoveryContentProps) {
  const query = parseDiscoveryQuery(await searchParams);
  const data =
    query.tab === "festivals"
      ? {
          ...mainDiscoveryMock,
          festivalDiscovery: await loadFestivalDiscovery(
            festivalBrowseRegion(query.region),
          ),
        }
      : mainDiscoveryMock;
  const view = selectDiscoveryView(data, query);
  const [ranking, hotRanking, monthlyFestivals, popularReels, searchResults] =
    await Promise.all([
      view.showRankedPlaces ? loadPlaceRankings(query.audience) : null,
      view.showRankedPlaces ? loadHotPlaceRankings(query.hotAudience) : null,
      view.showRankedPlaces
        ? loadMonthlyFestivals(festivalBrowseRegion(query.region))
        : null,
      view.showPopularPlaces ? loadPopularReels("all", query.reelRegion) : null,
      view.showSearchResults && isPlaceSearchRegion(query.region)
        ? searchPlaces(query.region, query.q)
        : null,
    ]);

  return (
    <MainDiscovery
      data={data}
      query={query}
      view={view}
      ranking={ranking}
      hotRanking={hotRanking}
      monthlyFestivals={monthlyFestivals}
      popularReels={popularReels}
      searchResults={searchResults}
    />
  );
}

export { DiscoveryContent, type DiscoveryContentProps };
