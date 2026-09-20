import { PlaceSearchForm } from "@/features/places/components/place-search-form";
import type { CSSProperties } from "react";
import { BellIcon } from "lucide-react";

import { SearchResultsSection } from "@/features/discovery/components/search-results-section";
import type { DiscoveryPlaceSearchLoadState } from "@/features/places/discovery-place-search-api";
import { PopularPlacesTab } from "@/features/discovery/components/popular-places-tab";
import { BottomNavigation } from "@/components/patterns/navigation/bottom-navigation";
import { createMainNavigationItems } from "@/components/patterns/navigation/main-navigation-items";
import type { DiscoveryQuery } from "@/features/discovery/discovery-model";
import type { PopularReelsLoadState } from "@/features/discovery/place-reels-api";

type ExploreScreenProps = {
  query: DiscoveryQuery;
  popularReels: PopularReelsLoadState | null;
  searchResults?: DiscoveryPlaceSearchLoadState | null;
};

const exploreScreenStyle = {
  "--main-navigation-height": "5rem",
  "--main-navigation-reserve":
    "calc(var(--main-navigation-height) + var(--safe-area-bottom) + 25px)",
} as CSSProperties;

function ExploreScreen({
  query,
  popularReels,
  searchResults = null,
}: ExploreScreenProps) {
  const isSearching = Boolean(query.q.trim());
  const params = new URLSearchParams({ reelRegion: query.reelRegion });
  const clearSearchHref = `/explore?${params}`;
  params.set("q", query.q);
  params.set("external", "1");
  const externalSearchHref = `/explore?${params}`;
  return (
    <div
      className="mx-auto min-h-screen w-full max-w-[30rem] bg-card pb-[var(--main-navigation-reserve)]"
      style={exploreScreenStyle}
    >
      <header className="flex items-center justify-between px-5 pt-[25px] pb-4">
        <h1 className="text-[1.55rem] font-bold leading-9 tracking-[-0.03em] text-foreground">
          탐색
        </h1>
        <button
          type="button"
          aria-label="알림"
          className="inline-flex size-11 items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-primary-subtle hover:text-primary"
        >
          <BellIcon className="size-5" aria-hidden="true" />
        </button>
      </header>

      <section aria-label="여행지 검색" className="px-5">
        <PlaceSearchForm query={query} />
      </section>

      {isSearching ? (
        <SearchResultsSection results={searchResults} query={query} clearSearchHref={clearSearchHref} externalSearchHref={externalSearchHref} />
      ) : (
        <div className="mt-6 bg-background pb-5">
          <PopularPlacesTab query={query} popularReels={popularReels} explore />
        </div>
      )}

      <div className="safe-area-bottom fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[30rem] bg-card">
        <BottomNavigation items={createMainNavigationItems("explore")} />
      </div>
    </div>
  );
}

export { ExploreScreen, type ExploreScreenProps };
