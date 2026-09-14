import { ErrorState } from "@/components/patterns/error-state/error-state";
import { EmptyState } from "@/components/patterns/empty-state/empty-state";
import Link from "next/link";

import { SearchPlaceResult } from "@/components/domain/place/search-place-result";
import { PlaceRankingRetryButton } from "@/components/domain/place/place-ranking-retry-button";
import {
  buildDiscoveryHref,
  type DiscoveryQuery,
} from "@/features/discovery/discovery-model";
import type { PlaceSearchLoadState } from "@/features/places/place-search-api";

type SearchResultsSectionProps = {
  results: PlaceSearchLoadState | null;
  query: DiscoveryQuery;
  clearSearchHref?: string;
};

function SearchResultsSection({
  results,
  query,
  clearSearchHref = buildDiscoveryHref(query, { q: "" }),
}: SearchResultsSectionProps) {
  const items = results?.status === "ready" ? results.items : [];

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
        <ErrorState
          variant="inline"
          title="검색 결과를 불러오지 못했어요."
          description="잠시 후 다시 시도해 주세요."
          action={<PlaceRankingRetryButton />}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title={<>‘{query.q}’에 대한 검색 결과가 없어요.</>}
          description="다른 검색어로 다시 시도해 보세요."
        />
      ) : (
        <ul
          aria-label={`'${query.q}' 검색 결과`}
          className="mt-4 grid grid-cols-2 gap-3"
        >
          {items.map((place, index) => (
            <SearchPlaceResult
              key={place.id}
              place={place}
              priority={index < 2}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

export { SearchResultsSection, type SearchResultsSectionProps };
