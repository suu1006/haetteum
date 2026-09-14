import Link from "next/link";

import {
  buildFestivalRegionHref,
  type DiscoveryQuery,
  type FestivalDiscoveryData,
} from "@/features/discovery/discovery-model";
import { cn } from "@/lib/utils";

type FestivalRegionFilterProps = {
  query: DiscoveryQuery;
  regions: FestivalDiscoveryData["regions"];
};

function FestivalRegionFilter({
  query,
  regions,
}: FestivalRegionFilterProps) {
  return (
    <nav aria-label="축제 지역" className="scrollbar-none -mx-1 overflow-x-auto px-1">
      <ul className="flex w-max gap-1.5 pb-1">
        {regions.map((region) => {
          const current = query.region === region.id;

          return (
            <li key={region.id}>
              <Link
                href={buildFestivalRegionHref(query, region.id)}
                scroll={false}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex h-11 min-w-11 items-center justify-center rounded-full border px-3.5 text-xs font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/25",
                  current
                    ? "border-primary bg-primary text-primary-foreground shadow-card"
                    : "border-border bg-card text-foreground hover:border-primary hover:text-primary",
                )}
              >
                {region.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export { FestivalRegionFilter, type FestivalRegionFilterProps };
