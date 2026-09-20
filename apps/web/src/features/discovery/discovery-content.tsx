import { MainDiscovery } from "@/features/discovery/components/main-discovery";
import type { DiscoverySearchParams } from "@/features/discovery/discovery-model";
import {
  parseDiscoveryQuery,
  selectDiscoveryView,
} from "@/features/discovery/discovery-model";
import { loadHotPlaceRankings } from "@/features/discovery/hot-place-ranking-api";
import { loadPlaceRankings } from "@/features/discovery/place-ranking-api";
import { searchDiscoveryPlaces } from "@/features/places/discovery-place-search-api";
import {
  emptyFestivalDiscovery,
  festivalBrowseRegion,
  loadFestivalDiscovery,
} from "@/features/festivals/festival-discovery-api";

import { loadWeeklyPlaces } from "@/features/places/weekly-places";

type DiscoveryContentProps = {
  searchParams: Promise<DiscoverySearchParams>;
};

async function DiscoveryContent({ searchParams }: DiscoveryContentProps) {
  const query = parseDiscoveryQuery(await searchParams);
  const view = selectDiscoveryView(query);
  const [festivalDiscovery, ranking, hotRanking, weeklyPlaces, searchResults] =
    await Promise.all([
      query.tab === "festivals" || (query.tab === "recommended" && !query.q.trim())
        ? loadFestivalDiscovery(festivalBrowseRegion(query.region))
        : null,
      view.showRankedPlaces || view.showAiCourse ? loadPlaceRankings(query.audience) : null,
      view.showRankedPlaces || view.showAiCourse ? loadHotPlaceRankings(query.hotAudience) : null,
      view.showFestivals
        ? loadWeeklyPlaces()
        : null,
      view.showSearchResults
        ? searchDiscoveryPlaces(undefined, query.q, query.externalSearch)
        : null,
    ]);

  return (
    <MainDiscovery
      data={{
        aiCourse: { src: "/images/discovery/reference-main/ai-course-robot.png", alt: "여행 코스 안내" },
        festivalDiscovery: festivalDiscovery ?? emptyFestivalDiscovery("ready"),
      }}
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
