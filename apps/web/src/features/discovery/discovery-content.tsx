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
import { searchPlaces } from "@/features/places/place-search-api";
import {
  festivalBrowseRegion,
  loadFestivalDiscovery,
} from "@/features/festivals/festival-discovery-api";

import { loadWeeklyPlaces } from "@/features/places/weekly-places";

type DiscoveryContentProps = {
  searchParams: Promise<DiscoverySearchParams>;
};

async function DiscoveryContent({ searchParams }: DiscoveryContentProps) {
  const query = parseDiscoveryQuery(await searchParams);
  const data =
    query.tab === "festivals" || (query.tab === "recommended" && !query.q.trim())
      ? {
          ...mainDiscoveryMock,
          festivalDiscovery: await loadFestivalDiscovery(
            festivalBrowseRegion(query.region),
          ),
        }
      : mainDiscoveryMock;
  const view = selectDiscoveryView(data, query);
  const [ranking, hotRanking, weeklyPlaces, searchResults] =
    await Promise.all([
      view.showRankedPlaces || view.showAiCourse ? loadPlaceRankings(query.audience) : null,
      view.showRankedPlaces || view.showAiCourse ? loadHotPlaceRankings(query.hotAudience) : null,
      view.showFestivals
        ? loadWeeklyPlaces()
        : null,
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
      weeklyPlaces={weeklyPlaces}
      searchResults={searchResults}
    />
  );
}

export { DiscoveryContent, type DiscoveryContentProps };
