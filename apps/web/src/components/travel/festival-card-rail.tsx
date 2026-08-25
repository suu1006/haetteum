"use client";

import { useState } from "react";
import { ChevronRightIcon } from "lucide-react";

import { FestivalRankingCard } from "@/components/travel/festival-ranking-card";
import { Button } from "@/components/ui/button";
import type { FestivalItem } from "@/features/discovery/discovery-model";
import { buildFestivalDetailHref } from "@/features/festivals/festival-detail-model";

type FestivalCardRailProps = {
  festivals: readonly FestivalItem[];
};

const previewCount = 4;

function FestivalCardRail({ festivals }: FestivalCardRailProps) {
  const [expanded, setExpanded] = useState(false);
  const visibleFestivals = expanded
    ? festivals
    : festivals.slice(0, previewCount);
  const hasMore = festivals.length > previewCount;

  return (
    <div>
      <ol
        aria-label="축제 순위"
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2"
      >
        {visibleFestivals.map((festival) => (
          <li key={festival.id} className="flex shrink-0">
            <FestivalRankingCard
              festival={festival}
              href={buildFestivalDetailHref(festival.id)}
            />
          </li>
        ))}
      </ol>

      {hasMore ? (
        expanded ? (
          <p
            role="status"
            className="type-caption mt-3 text-center text-muted-foreground"
          >
            추가 축제를 모두 펼쳤어요
          </p>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="mt-3 w-full"
            onClick={() => setExpanded(true)}
          >
            더 많은 축제 보기
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        )
      ) : null}
    </div>
  );
}

export { FestivalCardRail, type FestivalCardRailProps };
