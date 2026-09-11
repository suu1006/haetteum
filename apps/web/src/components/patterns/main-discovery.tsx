import type { CSSProperties } from "react";

import { DiscoveryAppHeader } from "@/components/patterns/discovery-app-header";
import { DiscoverySearchPanel } from "@/components/patterns/discovery-search-panel";
import { FestivalDiscovery } from "@/components/patterns/festival-discovery";
import { FestivalRankingSection } from "@/components/patterns/festival-ranking-section";
import { WeeklyPlacesSection } from "@/components/patterns/weekly-places-section";
import { HotPlaceSection } from "@/components/patterns/hot-place-section";
import { RankedPlaceSection } from "@/components/patterns/ranked-place-section";
import { SearchResultsSection } from "@/components/patterns/search-results-section";
import {
  BottomNavigation,
} from "@/components/travel/bottom-navigation";
import { RandomCourseBanner } from "@/components/travel/random-course-banner";
import { createMainNavigationItems } from "@/components/travel/main-navigation-items";
import type {
  DiscoveryQuery,
  DiscoveryView,
  MainDiscoveryData,
} from "@/features/discovery/discovery-model";
import type { HotPlaceRankingLoadState } from "@/features/discovery/hot-place-ranking-api";
import type { PlaceRankingLoadState } from "@/features/discovery/place-ranking-api";
import type { WeeklyPlacesLoadState } from "@/features/places/weekly-places";
import type { PopularReelsLoadState } from "@/features/discovery/place-reels-api";
import type { PlaceSearchLoadState } from "@/features/places/place-search-api";
import { ThemeCourseExplorer } from "@/features/themes/theme-course-explorer";

export type MainDiscoveryProps = {
  data: MainDiscoveryData;
  query: DiscoveryQuery;
  view: DiscoveryView;
  ranking?: PlaceRankingLoadState | null;
  hotRanking?: HotPlaceRankingLoadState | null;
  weeklyPlaces?: WeeklyPlacesLoadState | null;
  popularReels?: PopularReelsLoadState | null;
  searchResults?: PlaceSearchLoadState | null;
};

const mainDiscoveryStyle = {
  "--main-navigation-height": "5rem",
  "--main-navigation-reserve":
    "calc(var(--main-navigation-height) + var(--safe-area-bottom) + 25px)",
} as CSSProperties;

function MainDiscovery({
  data,
  query,
  view,
  ranking = { status: "error" },
  hotRanking = { status: "error" },
  weeklyPlaces = { status: "error" },
  searchResults = null,
}: MainDiscoveryProps) {
  return (
    <div
      className={`mx-auto min-h-screen w-full max-w-[30rem] pb-[var(--main-navigation-reserve)] ${
        view.showFestivalDiscovery ? "bg-card" : "bg-background"
      }`}
      style={mainDiscoveryStyle}
    >
      {!view.showSearchResults ? (
        <div data-testid="main-region" data-region="hero">
          <DiscoveryAppHeader compact={view.showThemeTravel} />
        </div>
      ) : null}
      {!view.showSearchResults ? (
        <div data-testid="main-region" data-region="tabs">
          <DiscoverySearchPanel query={query} compact={view.showThemeTravel} />
        </div>
      ) : null}
      <div data-testid="main-region" data-region="list">
        {view.showSearchResults ? (
          <SearchResultsSection results={searchResults} query={query} />
        ) : null}
        {view.showFestivals ? (
          <FestivalRankingSection data={data.festivalDiscovery} />
        ) : null}
        {view.showRankedPlaces ? (
          <RankedPlaceSection
            ranking={ranking}
            query={query}
          />
        ) : null}
        {view.showRankedPlaces ? (
          <HotPlaceSection
            ranking={hotRanking}
            query={query}
          />
        ) : null}
        {view.showThemeTravel ? (
          <ThemeCourseExplorer data={data.themeTravel} />
        ) : null}
        {view.showAiCourse ? (
          <div
            id="ai-course"
            data-testid="main-region"
            data-region="banner"
            className="px-4 pt-6"
          >
            <RandomCourseBanner
              imageAlt={data.aiCourse.alt}
              imageSrc={data.aiCourse.src}
              ranking={ranking}
              hotRanking={hotRanking}
            />
          </div>
        ) : null}
        {view.showFestivals ? (
          <WeeklyPlacesSection results={weeklyPlaces} />
        ) : null}
        {view.showFestivalDiscovery ? (
          <FestivalDiscovery
            data={data.festivalDiscovery}
            query={query}
          />
        ) : null}
      </div>
      <div
        data-testid="main-region"
        data-region="navigation"
        className="safe-area-bottom fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[30rem] bg-card"
      >
        <BottomNavigation
          items={
            view.showFestivalDiscovery || view.showThemeTravel
              ? createMainNavigationItems("home", "compact")
              : createMainNavigationItems("home")
          }
          variant={
            view.showFestivalDiscovery || view.showThemeTravel
              ? "festival"
              : "default"
          }
        />
      </div>
    </div>
  );
}

export { MainDiscovery };
