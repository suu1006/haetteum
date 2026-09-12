import { PhotoPriorityRankingList } from "@/components/travel/photo-priority-ranking-list";
import { PlaceRankingRetryButton } from "@/components/travel/place-ranking-retry-button";
import { RankedPlaceAudienceFilter } from "@/components/travel/ranked-place-audience-filter";
import {
  defaultDiscoveryQuery,
  type DiscoveryQuery,
} from "@/features/discovery/discovery-model";
import type { PlaceRankingLoadState } from "@/features/discovery/place-ranking-api";

type RankedPlaceSectionProps = {
  ranking: PlaceRankingLoadState | null;
  query?: DiscoveryQuery;
  explore?: boolean;
};

function formatPeriod(start: string, end: string) {
  const [startYear, startMonth] = start.split("-");
  const [endYear, endMonth] = end.split("-");
  return `${startYear}.${startMonth}~${endYear}.${endMonth}`;
}

function RankedPlaceSection({
  ranking,
  query = defaultDiscoveryQuery,
  explore = false,
}: RankedPlaceSectionProps) {
  const rankingData =
    ranking?.status === "ready" && ranking.data.items.length === 10
      ? ranking.data
      : null;

  return (
    <section
      id="places"
      data-section="places"
      aria-labelledby="ranked-place-title"
      className="px-4 pt-6"
    >
      <div className="flex items-end justify-between gap-3">
        <h2 id="ranked-place-title" className="type-title-md text-foreground">
          세대별 인기관광지 순위
        </h2>
        {rankingData ? (
          <p className="type-caption whitespace-nowrap text-muted-foreground">
            전국 ·{" "}
            {formatPeriod(rankingData.periodStart, rankingData.periodEnd)}
          </p>
        ) : null}
      </div>

      <RankedPlaceAudienceFilter query={query} explore={explore} />

      {rankingData ? (
        <PhotoPriorityRankingList
          key={query.audience}
          kind="popular"
          items={rankingData.items}
          label="세대별 인기관광지 순위"
        />
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/45 p-4">
          <p className="type-body-md text-muted-foreground">
            인기 관광지 순위 정보를 불러오지 못했어요.
          </p>
          <p className="type-caption mt-1 text-muted-foreground">
            잠시 후 다시 시도해 주세요.
          </p>
          <PlaceRankingRetryButton />
        </div>
      )}
    </section>
  );
}

export { RankedPlaceSection, type RankedPlaceSectionProps };
