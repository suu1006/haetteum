import type { CSSProperties } from "react";

import { DiscoveryAppHeader } from "@/features/discovery/components/discovery-app-header";
import { DiscoverySearchPanel } from "@/features/discovery/components/discovery-search-panel";
import { FestivalDiscovery } from "@/features/festivals/components/festival-discovery";
import { FestivalRankingSection } from "@/features/festivals/components/festival-ranking-section";
import { WeeklyPlacesSection } from "@/features/discovery/components/weekly-places-section";
import { HotPlaceSection } from "@/features/discovery/components/hot-place-section";
import { RankedPlaceSection } from "@/features/discovery/components/ranked-place-section";
import { SearchResultsSection } from "@/features/discovery/components/search-results-section";
import {
  BottomNavigation,
} from "@/components/patterns/navigation/bottom-navigation";
import { RandomCourseBanner } from "@/components/domain/course/random-course-banner";
import { createMainNavigationItems } from "@/components/patterns/navigation/main-navigation-items";
import type {
  DiscoveryQuery,
  DiscoveryView,
  MainDiscoveryData,
} from "@/features/discovery/discovery-model";
import type { HotPlaceRankingLoadState } from "@/features/discovery/hot-place-ranking-api";
import type { PlaceRankingLoadState } from "@/features/discovery/place-ranking-api";
import type { WeeklyPlacesLoadState } from "@/features/places/weekly-places";
import type { PlaceSearchLoadState } from "@/features/places/place-search-api";

export type MainDiscoveryProps = {
  data: Pick<MainDiscoveryData, "aiCourse" | "festivalDiscovery">;
  query: DiscoveryQuery;
  view: DiscoveryView;
  ranking?: PlaceRankingLoadState | null;
  hotRanking?: HotPlaceRankingLoadState | null;
  weeklyPlaces?: WeeklyPlacesLoadState | null;
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
          <DiscoveryAppHeader />
        </div>
      ) : null}
      {!view.showSearchResults ? (
        <div data-testid="main-region" data-region="tabs">
          <DiscoverySearchPanel query={query} />
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
        <BottomNavigation items={createMainNavigationItems("home")} />
      </div>
    </div>
  );
}

export { MainDiscovery };
