import type { CSSProperties } from "react";

import { DiscoveryAppHeader } from "@/components/patterns/discovery-app-header";
import { DiscoverySearchPanel } from "@/components/patterns/discovery-search-panel";
import { FestivalDiscovery } from "@/components/patterns/festival-discovery";
import { FestivalSection } from "@/components/patterns/festival-section";
import { HotPlaceSection } from "@/components/patterns/hot-place-section";
import { PopularPlacesTab } from "@/components/patterns/popular-places-tab";
import { RankedPlaceSection } from "@/components/patterns/ranked-place-section";
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
import type { MonthlyFestivalsLoadState } from "@/features/festivals/festival-discovery-api";
import type { PopularReelsLoadState } from "@/features/discovery/place-reels-api";
import { ThemeCourseExplorer } from "@/features/themes/theme-course-explorer";

export type MainDiscoveryProps = {
  data: MainDiscoveryData;
  query: DiscoveryQuery;
  view: DiscoveryView;
  ranking?: PlaceRankingLoadState | null;
  hotRanking?: HotPlaceRankingLoadState | null;
  monthlyFestivals?: MonthlyFestivalsLoadState | null;
  popularReels?: PopularReelsLoadState | null;
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
  monthlyFestivals = { status: "error" },
  popularReels = null,
}: MainDiscoveryProps) {
  const festivalItems =
    monthlyFestivals?.status === "ready" ? monthlyFestivals.items : [];
  return (
    <div
      className={`mx-auto min-h-screen w-full max-w-[30rem] pb-[var(--main-navigation-reserve)] ${
        view.showFestivalDiscovery ? "bg-card" : "bg-background"
      }`}
      style={mainDiscoveryStyle}
    >
      <div data-testid="main-region" data-region="hero">
        <DiscoveryAppHeader compact={view.showThemeTravel} />
      </div>
      <div data-testid="main-region" data-region="search">
        <DiscoverySearchPanel query={query} compact={view.showThemeTravel} />
      </div>
      <div data-testid="main-region" data-region="list">
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
        {view.showPopularPlaces ? (
          <PopularPlacesTab
            videos={view.popularVideos}
            themes={view.travelThemes}
            query={query}
            popularReels={popularReels}
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
          <FestivalSection festivals={festivalItems} />
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
        className="safe-area-bottom fixed inset-x-0 bottom-0 z-30 mx-auto min-h-[var(--main-navigation-height)] w-full max-w-[30rem] bg-card"
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
