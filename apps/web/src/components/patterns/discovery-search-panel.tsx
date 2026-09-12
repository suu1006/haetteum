import Link from "next/link";

import {
  buildDiscoveryHref,
  type DiscoveryQuery,
  type DiscoveryTabId,
} from "@/features/discovery/discovery-model";

type DiscoverySearchPanelProps = {
  query: DiscoveryQuery;
};

const discoveryTabs: ReadonlyArray<{
  id: DiscoveryTabId;
  label: string;
}> = [
  { id: "recommended", label: "추천" },
  { id: "places", label: "인기 관광지" },
  { id: "festivals", label: "관광 축제" },
];

const tabDefaultRegions: Record<DiscoveryTabId, DiscoveryQuery["region"]> = {
  recommended: "gyeonggi",
  places: "jeju",
  festivals: "all",
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
}: DiscoverySearchPanelProps) {
  return (
    <nav
      aria-label="탐색 분류"
      className="overflow-x-auto bg-card px-5 py-2"
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
  );
}

export { DiscoverySearchPanel, type DiscoverySearchPanelProps };
