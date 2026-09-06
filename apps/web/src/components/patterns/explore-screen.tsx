import type { CSSProperties } from "react";
import { BellIcon, FlameIcon, SearchIcon } from "lucide-react";
import Link from "next/link";

import { ExploreSectionHeader } from "@/components/patterns/explore-section-header";
import { ExploreDestinationCard } from "@/components/travel/explore-destination-card";
import { BottomNavigation } from "@/components/travel/bottom-navigation";
import { PlaceRankingRetryButton } from "@/components/travel/place-ranking-retry-button";
import { createMainNavigationItems } from "@/components/travel/main-navigation-items";
import type { PlaceRankingLoadState } from "@/features/discovery/place-ranking-api";
import type { PopularReelsLoadState } from "@/features/discovery/place-reels-api";
import {
  buildExploreRegionHref,
  mapRegionalDestinations,
  mapTrendingDestinations,
  type ExploreData,
  type ExploreRegionId,
} from "@/features/explore/explore-model";
import { cn } from "@/lib/utils";

type ExploreScreenProps = {
  data: ExploreData;
  region: ExploreRegionId;
  trendingRanking: PlaceRankingLoadState | null;
  regionalReels: PopularReelsLoadState | null;
};

const exploreScreenStyle = {
  "--main-navigation-height": "5rem",
  "--main-navigation-reserve":
    "calc(var(--main-navigation-height) + var(--safe-area-bottom) + 25px)",
} as CSSProperties;

function ExploreScreen({
  data,
  region,
  trendingRanking,
  regionalReels,
}: ExploreScreenProps) {
  const selectedRegion = data.regions.find((item) => item.id === region);
  const trending =
    trendingRanking?.status === "ready"
      ? mapTrendingDestinations(trendingRanking.data)
      : [];
  const regionalDestinations =
    regionalReels?.status === "ready"
      ? mapRegionalDestinations(regionalReels.data)
      : [];

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
        <form action="/" method="get" role="search" className="relative">
          <input type="hidden" name="region" value={region} />
          <input type="hidden" name="tab" value="recommended" />
          <label htmlFor="explore-search" className="sr-only">
            여행지 검색
          </label>
          <input
            id="explore-search"
            name="q"
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

      <section
        aria-labelledby="trending-destinations-title"
        className="px-5 pt-5"
      >
        <ExploreSectionHeader
          headingId="trending-destinations-title"
          title={
            <>
              지금 뜨는 여행지
              <FlameIcon
                className="size-5 fill-amber-400 text-red-500"
                aria-hidden="true"
              />
            </>
          }
          moreHref="/?region=jeju&tab=places"
        />
        {trending.length > 0 ? (
          <ol
            aria-label="지금 뜨는 여행지"
            className="mt-3 grid grid-cols-3 gap-3"
          >
            {trending.map((destination) => (
              <li key={destination.id} className="min-w-0">
                <ExploreDestinationCard
                  destination={destination}
                  variant="trending"
                />
              </li>
            ))}
          </ol>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/45 p-4">
            <p className="type-body-md text-muted-foreground">
              지금 뜨는 여행지를 불러오지 못했어요.
            </p>
            <p className="type-caption mt-1 text-muted-foreground">
              잠시 후 다시 시도해 주세요.
            </p>
            <PlaceRankingRetryButton />
          </div>
        )}
      </section>

      <section
        id="regional-destinations"
        aria-labelledby="regional-destinations-title"
        className="px-5 pt-6"
      >
        <ExploreSectionHeader
          headingId="regional-destinations-title"
          title="지역별 추천 여행지"
          moreHref={`/?region=${region}&tab=recommended`}
        />
        <nav aria-label="추천 지역" className="mt-1">
          <ul className="grid grid-cols-5">
            {data.regions.map((item) => (
              <li key={item.id}>
                <Link
                  href={buildExploreRegionHref(item.id)}
                  scroll={false}
                  prefetch={false}
                  aria-current={item.id === region ? "page" : undefined}
                  className={cn(
                    "type-label relative flex min-h-11 items-center justify-center px-1 text-muted-foreground outline-none after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent hover:text-primary focus-visible:ring-3 focus-visible:ring-ring/25",
                    item.id === region &&
                      "text-primary after:bg-primary",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {regionalDestinations.length > 0 ? (
          <ul
            key={region}
            aria-label={`${selectedRegion?.label ?? "선택 지역"} 추천 여행지`}
            className="mt-4 grid grid-cols-3 gap-3"
          >
            {regionalDestinations.map((destination) => (
              <li key={destination.id} className="min-w-0">
                <ExploreDestinationCard
                  destination={destination}
                  variant="regional"
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/45 p-4">
            <p className="type-body-md text-muted-foreground">
              {selectedRegion?.label ?? "선택 지역"} 추천 여행지를 아직
              준비하지 못했어요.
            </p>
            <p className="type-caption mt-1 text-muted-foreground">
              다른 지역을 둘러보시거나 잠시 후 다시 시도해 주세요.
            </p>
            <PlaceRankingRetryButton />
          </div>
        )}
      </section>

      <div className="safe-area-bottom fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[30rem] bg-card">
        <BottomNavigation items={createMainNavigationItems("explore")} />
      </div>
    </div>
  );
}

export { ExploreScreen, type ExploreScreenProps };
