import { PhotoPriorityRankingList } from "@/components/travel/photo-priority-ranking-list";
import { HotPlaceRankingAudienceFilter } from "@/components/travel/hot-place-ranking-audience-filter";
import { PlaceRankingRetryButton } from "@/components/travel/place-ranking-retry-button";
import {
  defaultDiscoveryQuery,
  type DiscoveryQuery,
} from "@/features/discovery/discovery-model";
import type { HotPlaceRankingLoadState } from "@/features/discovery/hot-place-ranking-api";

type HotPlaceSectionProps = {
  ranking: HotPlaceRankingLoadState | null;
  query?: DiscoveryQuery;
  explore?: boolean;
};

function formatBaseYearMonth(baseYearMonth: string) {
  return `${baseYearMonth.slice(0, 4)}.${baseYearMonth.slice(4, 6)}`;
}

function HotPlaceSection({
  ranking,
  query = defaultDiscoveryQuery,
  explore = false,
}: HotPlaceSectionProps) {
  const rankingData =
    ranking?.status === "ready" && ranking.data.items.length === 10
      ? ranking.data
      : null;

  return (
    <section
      id="hot-places"
      data-section="hot-places"
      aria-labelledby="hot-place-title"
      className="px-4 pt-6"
    >
      <div className="flex items-end justify-between gap-3">
        <h2 id="hot-place-title" className="type-title-md text-foreground">
          세대별 핫플레이스
        </h2>
        {rankingData ? (
          <p className="type-caption whitespace-nowrap text-muted-foreground">
            전국 · {formatBaseYearMonth(rankingData.baseYearMonth)}
          </p>
        ) : null}
      </div>

      <HotPlaceRankingAudienceFilter query={query} explore={explore} />

      {rankingData ? (
        <PhotoPriorityRankingList
          key={query.hotAudience}
          kind="hot"
          items={rankingData.items}
          label="세대별 핫플레이스"
        />
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/45 p-4">
          <p className="type-body-md text-muted-foreground">
            핫플레이스 정보를 불러오지 못했어요.
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

export { HotPlaceSection, type HotPlaceSectionProps };
