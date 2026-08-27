import Link from "next/link";
import { SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  buildDiscoveryHref,
  type DiscoveryQuery,
  type DiscoveryTabId,
} from "@/features/discovery/discovery-model";
import { cn } from "@/lib/utils";

type DiscoverySearchPanelProps = {
  query: DiscoveryQuery;
  compact?: boolean;
};

const discoveryTabs: ReadonlyArray<{
  id: DiscoveryTabId;
  label: string;
}> = [
  { id: "recommended", label: "추천" },
  { id: "places", label: "인기 관광지" },
  { id: "festivals", label: "관광 축제" },
  // TODO: 테마 여행 데이터 연동 후 탭을 다시 활성화한다.
  // { id: "ai-course", label: "테마 여행" },
];

const tabDefaultRegions: Record<DiscoveryTabId, DiscoveryQuery["region"]> = {
  recommended: "gyeonggi",
  places: "jeju",
  festivals: "all",
  "ai-course": "gyeonggi",
};

function discoveryLinkHref(
  query: DiscoveryQuery,
  changes: Partial<DiscoveryQuery>,
) {
  return buildDiscoveryHref(query, {
    ...changes,
    ...(changes.tab ? { region: tabDefaultRegions[changes.tab] } : {}),
  });
}

const linkClassName =
  "type-label inline-flex h-11 min-w-11 shrink-0 items-center justify-center whitespace-nowrap border-b-2 border-transparent px-1.5 text-muted-foreground transition-colors hover:border-primary hover:text-primary aria-[current=page]:border-primary aria-[current=page]:text-primary";

function DiscoverySearchPanel({
  query,
  compact = false,
}: DiscoverySearchPanelProps) {
  return (
    <section
      aria-label="여행지 탐색"
      className={cn("bg-card px-5", compact ? "py-1" : "py-2")}
    >
      <form action="" method="get" role="search" className="flex gap-2">
        <input name="tab" type="hidden" value={query.tab} />
        <input name="region" type="hidden" value={query.region} />
        {query.audience !== "all" ? (
          <input name="audience" type="hidden" value={query.audience} />
        ) : null}
        {query.festivalFilters.ongoing ? (
          <input name="festivalStatus" type="hidden" value="ongoing" />
        ) : null}
        {query.festivalFilters.thisWeek ? (
          <input name="festivalPeriod" type="hidden" value="week" />
        ) : null}
        {query.festivalFilters.free ? (
          <input name="festivalPrice" type="hidden" value="free" />
        ) : null}
        {query.festivalFilters.family ? (
          <input name="festivalAudience" type="hidden" value="family" />
        ) : null}
        <Input
          aria-label="여행지 검색"
          className="rounded-full border-transparent bg-muted"
          defaultValue={query.q}
          name="q"
          placeholder="지역, 관광지, 축제 검색"
          type="search"
        />
        <Button
          className="rounded-full"
          size="icon"
          type="submit"
          aria-label="검색"
        >
          <SearchIcon aria-hidden="true" />
        </Button>
      </form>

      <nav
        aria-label="탐색 분류"
        className={cn("overflow-x-auto", compact ? "mt-1" : "mt-3")}
      >
        <ul className="flex gap-4">
          {discoveryTabs.map((tab) => (
            <li key={tab.id}>
              <Link
                href={discoveryLinkHref(query, { tab: tab.id })}
                scroll={false}
                aria-current={query.tab === tab.id ? "page" : undefined}
                className={linkClassName}
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}

export { DiscoverySearchPanel, type DiscoverySearchPanelProps };
