import { SparklesIcon } from "lucide-react";

import { FestivalRankingShowcase } from "@/components/travel/festival-ranking-showcase";
import type { FestivalDiscoveryData } from "@/features/discovery/discovery-model";

function FestivalRankingSection({ data }: { data: FestivalDiscoveryData }) {
  const hasRanking = data.loadState === "ready" && data.ranking.length > 0;

  return (
    <section
      data-section="festival-ranking"
      aria-labelledby="festival-discovery-title"
      className="px-[0.8rem] pt-[1.55rem]"
    >
      <header className="px-2">
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
        <div className="mt-6">
          <FestivalRankingShowcase festivals={data.ranking} />
        </div>
      ) : null}

      {!hasRanking ? (
        <p className="px-2 py-8 text-sm text-muted-foreground" role={data.loadState === "error" ? "alert" : undefined}>
          {data.loadState === "error" ? "축제 정보를 불러오지 못했어요." : "지금 만날 수 있는 축제가 없어요."}
        </p>
      ) : null}
    </section>
  );
}

export { FestivalRankingSection };
