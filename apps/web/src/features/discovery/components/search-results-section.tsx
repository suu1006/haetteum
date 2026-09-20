import { ErrorState } from "@/components/patterns/error-state/error-state";
import { EmptyState } from "@/components/patterns/empty-state/empty-state";
import Link from "next/link";

import { SearchPlaceResult } from "@/components/domain/place/search-place-result";
import { PlaceRankingRetryButton } from "@/components/domain/place/place-ranking-retry-button";
import { ExternalPlaceResult } from "@/features/places/components/external-place-result";
import {
  buildDiscoveryHref,
  type DiscoveryQuery,
} from "@/features/discovery/discovery-model";
import type { DiscoveryPlaceSearchLoadState } from "@/features/places/discovery-place-search-api";

type SearchResultsSectionProps = {
  results: DiscoveryPlaceSearchLoadState | null;
  query: DiscoveryQuery;
  clearSearchHref?: string;
  externalSearchHref?: string;
};

function SearchResultsSection({
  results,
  query,
  clearSearchHref = buildDiscoveryHref(query, { q: "", externalSearch: false }),
  externalSearchHref = buildDiscoveryHref(query, { externalSearch: true }),
}: SearchResultsSectionProps) {
  const items = results?.status === "ready" ? results.items : [];
  const external = results?.status === "ready" ? results.external : undefined;
  const seen = new Set(items.map((place) => place.id));
  const externalItems =
    external?.status === "ready"
      ? external.items.filter((place) => {
          const key = place.matchedPlaceId ?? `kakao:${place.providerPlaceId}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
      : [];
  const hasResults = items.length > 0 || externalItems.length > 0;

  return (
    <section
      id="search-results"
      data-section="search-results"
      aria-labelledby="search-results-title"
      className="px-4 pt-6"
    >
      <div className="flex items-end justify-between gap-3">
        <h2
          id="search-results-title"
          className="type-title-md break-words text-foreground"
        >
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
      ) : (
        <>
          {items.length > 0 && (
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
          {externalItems.length > 0 && (
            <div className="mt-6">
              <h3 className="type-label text-foreground">추가로 찾은 장소</h3>
              <p className="type-caption mt-1 text-muted-foreground">
                카카오맵 검색 결과예요.
              </p>
              <ul
                aria-label="추가 장소 검색 결과"
                className="mt-3 grid grid-cols-2 gap-3"
              >
                {externalItems.map((place) => (
                  <ExternalPlaceResult
                    key={place.providerPlaceId}
                    place={place}
                  />
                ))}
              </ul>
            </div>
          )}
          {external?.status === "unavailable" ? (
            <ErrorState
              variant="inline"
              title="추가 장소를 불러오지 못했어요."
              description="잠시 후 다시 시도해 주세요."
              action={<PlaceRankingRetryButton />}
            />
          ) : !hasResults ? (
            <EmptyState
              title={<>‘{query.q}’에 대한 검색 결과가 없어요.</>}
              description="다른 검색어로 다시 시도해 보세요."
            />
          ) : external?.status === "ready" && externalItems.length === 0 ? (
            <p className="type-caption mt-4 text-muted-foreground">
              추가로 찾은 장소가 없어요.
            </p>
          ) : null}
          {!external && (
            <Link
              href={externalSearchHref}
              prefetch={false}
              scroll={false}
              className="type-label mt-5 flex min-h-12 items-center justify-center rounded-xl border border-border bg-card px-4 text-primary hover:bg-muted"
            >
              다른 장소 더 찾아보기
            </Link>
          )}
        </>
      )}
    </section>
  );
}

export { SearchResultsSection, type SearchResultsSectionProps };
