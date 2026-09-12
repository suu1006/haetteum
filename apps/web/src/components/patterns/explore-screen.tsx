import type { CSSProperties } from "react";
import { BellIcon, SearchIcon } from "lucide-react";

import { SearchResultsSection } from "@/components/patterns/search-results-section";
import type { PlaceSearchLoadState } from "@/features/places/place-search-api";
import { PopularPlacesTab } from "@/components/patterns/popular-places-tab";
import { BottomNavigation } from "@/components/travel/bottom-navigation";
import { createMainNavigationItems } from "@/components/travel/main-navigation-items";
import type { DiscoveryQuery } from "@/features/discovery/discovery-model";
import type { PopularReelsLoadState } from "@/features/discovery/place-reels-api";

type ExploreScreenProps = {
  query: DiscoveryQuery;
  popularReels: PopularReelsLoadState | null;
  searchResults?: PlaceSearchLoadState | null;
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
  const clearSearchHref = `/explore?${new URLSearchParams({ region: query.region, reelRegion: query.reelRegion })}`;
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
        <form action="/explore" method="get" role="search" className="relative">
          <input type="hidden" name="region" value={query.region} />
          <input type="hidden" name="reelRegion" value={query.reelRegion} />
          <label htmlFor="explore-search" className="sr-only">
            여행지 검색
          </label>
          <input
            id="explore-search"
            name="q"
            key={query.q}
            defaultValue={query.q}
            type="search"
            placeholder="어디로 떠나볼까요?"
            className="type-body-md h-12 w-full rounded-full border border-transparent bg-muted pr-12 pl-4 text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
          />
          <button
            type="submit"
            aria-label="검색"
            className="absolute inset-y-0 right-1 inline-flex size-10 items-center justify-center self-center rounded-full text-muted-foreground outline-none hover:bg-primary-subtle hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/25"
          >
            <SearchIcon className="size-5" aria-hidden="true" />
          </button>
        </form>
      </section>

      {isSearching ? (
        <SearchResultsSection results={searchResults} query={query} clearSearchHref={clearSearchHref} />
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
