import { MainDiscovery } from "@/components/patterns/main-discovery";
import type { DiscoverySearchParams } from "@/features/discovery/discovery-model";
import {
  parseDiscoveryQuery,
  selectDiscoveryView,
} from "@/features/discovery/discovery-model";
import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";
import { loadPlaceRankings } from "@/features/discovery/place-ranking-api";
import {
  festivalBrowseRegion,
  loadFestivalDiscovery,
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
  const ranking = view.showRankedPlaces
    ? await loadPlaceRankings(query.audience)
    : null;

  return <MainDiscovery data={data} query={query} view={view} ranking={ranking} />;
}

export { DiscoveryContent, type DiscoveryContentProps };
