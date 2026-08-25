import { MainDiscovery } from "@/components/patterns/main-discovery";
import type { DiscoverySearchParams } from "@/features/discovery/discovery-model";
import {
  parseDiscoveryQuery,
  selectDiscoveryView,
} from "@/features/discovery/discovery-model";
import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";

type DiscoveryContentProps = {
  searchParams: Promise<DiscoverySearchParams>;
};

async function DiscoveryContent({ searchParams }: DiscoveryContentProps) {
  const query = parseDiscoveryQuery(await searchParams);
  const view = selectDiscoveryView(mainDiscoveryMock, query);

  return <MainDiscovery data={mainDiscoveryMock} query={query} view={view} />;
}

export { DiscoveryContent, type DiscoveryContentProps };
