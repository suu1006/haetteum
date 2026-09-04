import type { PlaceListItem } from "@haetteum/contracts";
import Link from "next/link";

import { ExploreDestinationCard } from "@/components/travel/explore-destination-card";
import { PlaceRankingRetryButton } from "@/components/travel/place-ranking-retry-button";
import { buildDiscoveryHref, type DiscoveryQuery } from "@/features/discovery/discovery-model";
import type { ExploreDestination } from "@/features/explore/explore-model";
import type { PlaceSearchLoadState } from "@/features/places/place-search-api";
import { resolveOfficialImageSource } from "@/lib/official-image";

type SearchResultsSectionProps = {
  results: PlaceSearchLoadState | null;
  query: DiscoveryQuery;
};

function toDestination(place: PlaceListItem): ExploreDestination {
  return {
    id: place.id,
    title: place.title,
    location: place.address ?? place.district ?? undefined,
    href: `/places/${place.id}?tab=introduction`,
    image: {
      src: resolveOfficialImageSource(place.primaryImageUrl),
      alt: `${place.title} 대표 이미지`,
    },
  };
}

function SearchResultsSection({ results, query }: SearchResultsSectionProps) {
  const items = results?.status === "ready" ? results.items.map(toDestination) : [];
  const clearSearchHref = buildDiscoveryHref(query, { q: "" });

  return (
    <section
      id="search-results"
      data-section="search-results"
      aria-labelledby="search-results-title"
      className="px-4 pt-6"
    >
      <div className="flex items-end justify-between gap-3">
        <h2 id="search-results-title" className="type-title-md text-foreground">
          &lsquo;{query.q}&rsquo; 검색 결과
        </h2>
        <Link
          href={clearSearchHref}
          scroll={false}
          className="type-body-md whitespace-nowrap text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          검색 초기화
        </Link>
      </div>

      {results == null || results.status === "error" ? (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/45 p-4">
          <p className="type-body-md text-muted-foreground">
            검색 결과를 불러오지 못했어요.
          </p>
          <p className="type-caption mt-1 text-muted-foreground">
            잠시 후 다시 시도해 주세요.
          </p>
          <PlaceRankingRetryButton />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/45 p-4">
          <p className="type-body-md text-muted-foreground">
            &lsquo;{query.q}&rsquo;에 대한 검색 결과가 없어요.
          </p>
          <p className="type-caption mt-1 text-muted-foreground">
            다른 검색어로 다시 시도해 보세요.
          </p>
        </div>
      ) : (
        <ul
          aria-label={`'${query.q}' 검색 결과`}
          className="mt-4 grid grid-cols-3 gap-3"
        >
          {items.map((destination) => (
            <li key={destination.id} className="min-w-0">
              <ExploreDestinationCard destination={destination} variant="regional" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export { SearchResultsSection, type SearchResultsSectionProps };
