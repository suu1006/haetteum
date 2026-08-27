import { MapPinIcon, SparklesIcon } from "lucide-react";

import { FestivalDiscoveryListItem } from "@/components/travel/festival-discovery-list-item";
import { FestivalRankingShowcase } from "@/components/travel/festival-ranking-showcase";
import { FestivalRegionFilter } from "@/components/travel/festival-region-filter";
import type {
  DiscoveryQuery,
  FestivalDiscoveryData,
} from "@/features/discovery/discovery-model";

type FestivalDiscoveryProps = {
  data: FestivalDiscoveryData;
  query: DiscoveryQuery;
};

function FestivalDiscovery({ data, query }: FestivalDiscoveryProps) {
  const hasRanking = data.loadState === "ready" && data.ranking.length > 0;

  return (
    <section
      id="festivals"
      data-section="festival-discovery"
      aria-labelledby="festival-discovery-title"
      className="px-[0.8rem] pt-[1.55rem]"
    >
      <header className="px-2">
        <hr className="mb-2.5 w-7 border-t-2 border-foreground" />
        <h1
          id="festival-discovery-title"
          aria-label="지금 만날 수 있는 축제 ✨"
          className="flex items-center gap-1.5 text-[1.45rem] leading-7 font-bold tracking-[-0.035em] text-foreground"
        >
          지금 만날 수 있는 축제
          <SparklesIcon aria-hidden="true" className="size-5 text-amber-500" />
          <span className="sr-only">✨</span>
        </h1>
      </header>

      {hasRanking ? (
        <div className="mt-2.5">
          <FestivalRankingShowcase festivals={data.ranking} />
        </div>
      ) : null}

      <section
        aria-labelledby="festival-region-title"
        className={hasRanking ? "mt-[1.15rem] px-2" : "mt-8 px-2"}
      >
        <h2
          id="festival-region-title"
          className="flex items-center gap-1 text-[1.05rem] leading-6 font-semibold tracking-[-0.025em] text-foreground"
        >
          지역별 축제 둘러보기
          <span className="flex size-5 items-center justify-center rounded-full bg-primary-subtle text-primary">
            <MapPinIcon aria-hidden="true" className="size-3.5" />
          </span>
        </h2>
        <div className="mt-2">
          <FestivalRegionFilter query={query} regions={data.regions} />
        </div>
      </section>

      {data.loadState === "error" ? (
        <div
          role="alert"
          className="mx-2 mt-4 rounded-xl border border-dashed border-border bg-muted/45 px-4 py-8 text-center"
        >
          <p className="type-body-md font-semibold text-foreground">
            축제 정보를 불러오지 못했어요.
          </p>
          <p className="mt-1 type-body-sm text-muted-foreground">
            잠시 후 다시 시도해 주세요.
          </p>
        </div>
      ) : data.festivals.length > 0 ? (
        <ul
          aria-label="지역별 축제"
          className="mt-2 grid grid-cols-2 gap-3 px-2"
        >
          {data.festivals.map((festival, index) => (
            <li key={festival.id} className="min-w-0">
              <FestivalDiscoveryListItem
                festival={festival}
                eager={index === 0}
              />
            </li>
          ))}
        </ul>
      ) : (
        <div className="mx-2 mt-8 rounded-xl border border-dashed border-border bg-muted/45 px-4 py-8 text-center">
          <p className="type-body-md text-muted-foreground">
            선택한 지역에 예정된 축제가 없어요.
          </p>
        </div>
      )}
    </section>
  );
}

export { FestivalDiscovery, type FestivalDiscoveryProps };
