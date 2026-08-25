import type { CSSProperties } from "react";
import { BellIcon, FlameIcon, SearchIcon } from "lucide-react";
import Link from "next/link";

import { ExploreSectionHeader } from "@/components/patterns/explore-section-header";
import { ExploreCategoryLink } from "@/components/travel/explore-category-link";
import { ExploreDestinationCard } from "@/components/travel/explore-destination-card";
import { BottomNavigation } from "@/components/travel/bottom-navigation";
import { createMainNavigationItems } from "@/components/travel/main-navigation-items";
import {
  buildExploreRegionHref,
  type ExploreData,
  type ExploreRegionId,
} from "@/features/explore/explore-model";
import { cn } from "@/lib/utils";

type ExploreScreenProps = {
  data: ExploreData;
  region: ExploreRegionId;
};

const exploreScreenStyle = {
  "--main-navigation-height": "5rem",
  "--main-navigation-reserve":
    "calc(var(--main-navigation-height) + var(--safe-area-bottom) + 25px)",
} as CSSProperties;

function ExploreScreen({ data, region }: ExploreScreenProps) {
  const selectedRegion = data.regions.find((item) => item.id === region);
  const regionalDestinations = data.regionalDestinations[region];

  return (
    <div
      className="mx-auto min-h-screen w-full max-w-[30rem] bg-card pb-[var(--main-navigation-reserve)]"
      style={exploreScreenStyle}
    >
      <header className="flex items-center justify-between px-5 pt-[25px] pb-4">
        <h1 className="type-title-lg text-foreground">탐색</h1>
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

      <nav aria-label="탐색 카테고리" className="px-5 pt-5">
        <ul className="grid grid-cols-5 gap-3">
          {data.categories.map((category) => (
            <li key={category.id} className="min-w-0">
              <ExploreCategoryLink category={category} />
            </li>
          ))}
        </ul>
      </nav>

      <section
        aria-labelledby="trending-destinations-title"
        className="px-5 pt-2"
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
        <ol
          aria-label="지금 뜨는 여행지"
          className="mt-3 grid grid-cols-3 gap-3"
        >
          {data.trending.map((destination) => (
            <li key={destination.id} className="min-w-0">
              <ExploreDestinationCard
                destination={destination}
                variant="trending"
              />
            </li>
          ))}
        </ol>
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
        <ul
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
      </section>

      <div className="safe-area-bottom fixed inset-x-0 bottom-0 z-30 mx-auto min-h-[var(--main-navigation-height)] w-full max-w-[30rem] bg-card">
        <BottomNavigation items={createMainNavigationItems("explore")} />
      </div>
    </div>
  );
}

export { ExploreScreen, type ExploreScreenProps };
