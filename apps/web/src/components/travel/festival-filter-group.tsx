import Link from "next/link";

import {
  buildFestivalFilterHref,
  type DiscoveryQuery,
  type FestivalFilterKey,
} from "@/features/discovery/discovery-model";
import { cn } from "@/lib/utils";

type FestivalFilterGroupProps = {
  query: DiscoveryQuery;
};

const festivalFilters: ReadonlyArray<{
  id: FestivalFilterKey;
  label: string;
}> = [
  { id: "ongoing", label: "진행 중" },
  { id: "thisWeek", label: "이번 주" },
  { id: "free", label: "무료" },
  { id: "family", label: "가족" },
];

function FestivalFilterGroup({ query }: FestivalFilterGroupProps) {
  return (
    <nav aria-label="축제 필터" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex w-max gap-2 pb-1">
        {festivalFilters.map((filter) => {
          const active = query.festivalFilters[filter.id];

          return (
            <li key={filter.id}>
              <Link
                href={buildFestivalFilterHref(query, filter.id)}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "type-label inline-flex h-11 min-w-11 items-center justify-center rounded-full border px-4 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary hover:bg-primary-subtle hover:text-primary",
                )}
              >
                {filter.label}
                {active ? <span className="sr-only"> 선택됨</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export { FestivalFilterGroup, type FestivalFilterGroupProps };
