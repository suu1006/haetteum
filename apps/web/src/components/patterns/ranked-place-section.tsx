import Link from "next/link";

import { PlaceRankingCard } from "@/components/travel/place-ranking-card";
import {
  buildDiscoveryHref,
  defaultDiscoveryQuery,
  type DiscoveryQuery,
  type PlaceRankingItem,
  type RegionId,
} from "@/features/discovery/discovery-model";
import { buildPlaceDetailHref } from "@/features/places/place-detail-model";
import { cn } from "@/lib/utils";

type RankedPlaceSectionProps = {
  places: readonly PlaceRankingItem[];
  query?: DiscoveryQuery;
  regions?: ReadonlyArray<{ id: RegionId; label: string }>;
};

function RankedPlaceSection({
  places,
  query = { ...defaultDiscoveryQuery, tab: "places" },
  regions = [],
}: RankedPlaceSectionProps) {
  return (
    <section
      id="places"
      data-section="places"
      aria-labelledby="ranked-place-title"
      className="px-4 pt-6"
    >
      <div className="flex items-end justify-between gap-3">
        <h2 id="ranked-place-title" className="type-title-md text-foreground">
          지역별 인기 관광지 TOP 3
        </h2>
      </div>

      {regions.length > 0 ? (
        <nav aria-label="지역 필터" className="mt-3 overflow-x-auto">
          <ul className="flex gap-2">
            {regions.map((region) => (
              <li key={region.id}>
                <Link
                  href={buildDiscoveryHref(
                    query,
                    { region: region.id },
                    "places",
                  )}
                  aria-current={query.region === region.id ? "true" : undefined}
                  className={cn(
                    "type-label inline-flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-muted-foreground transition-colors hover:bg-primary-subtle hover:text-primary",
                    query.region === region.id &&
                      "bg-primary text-primary-foreground",
                  )}
                >
                  {region.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {places.length > 0 ? (
        <ol
          aria-label="지역별 인기 관광지"
          className="scrollbar-none mt-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain pb-2"
        >
          {places.map((place) => (
            <li
              key={place.id}
              className="w-40 shrink-0 snap-start sm:w-44"
            >
              <PlaceRankingCard
                place={place}
                href={buildPlaceDetailHref(place.id, {
                  tab: "course",
                  source: "all",
                })}
              />
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/45 p-4">
          <p className="type-body-md text-muted-foreground">
            선택한 지역에서 조건에 맞는 관광지를 찾지 못했어요.
          </p>
          <Link
            href={buildDiscoveryHref(query, { q: "" }, "places")}
            className="type-label mt-3 inline-flex text-primary underline-offset-4 hover:underline"
          >
            검색어 지우기
          </Link>
        </div>
      )}
    </section>
  );
}

export { RankedPlaceSection, type RankedPlaceSectionProps };
