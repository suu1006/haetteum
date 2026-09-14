"use client";

import type { HotPlaceRankingAudience } from "@haetteum/contracts";
import Link from "next/link";
import { useEffect } from "react";

import {
  buildDiscoveryHref,
  buildExploreHref,
  type DiscoveryQuery,
} from "@/features/discovery/discovery-model";
import { cn } from "@/lib/utils";

type HotPlaceRankingAudienceFilterProps = {
  query: DiscoveryQuery;
  explore?: boolean;
};

type ScrollSnapshot = {
  href: string;
  scrollY: number;
};

const audienceFilters: ReadonlyArray<{
  id: HotPlaceRankingAudience;
  label: string;
}> = [
  { id: "all", label: "전체" },
  { id: "20s", label: "20대" },
  { id: "30s", label: "30대" },
  { id: "40s", label: "40대" },
  { id: "50s", label: "50대" },
  { id: "60s-plus", label: "60대 이상" },
];

const scrollSnapshotKey = "haetteum:hot-place-audience:scroll";

function HotPlaceRankingAudienceFilter({
  query,
  explore = false,
}: HotPlaceRankingAudienceFilterProps) {
  useEffect(() => {
    try {
      const rawSnapshot = window.sessionStorage.getItem(scrollSnapshotKey);
      if (!rawSnapshot) return;

      const snapshot = JSON.parse(rawSnapshot) as Partial<ScrollSnapshot>;
      const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (
        snapshot.href !== currentHref ||
        typeof snapshot.scrollY !== "number"
      ) {
        return;
      }

      window.sessionStorage.removeItem(scrollSnapshotKey);
      window.requestAnimationFrame(() => {
        window.scrollTo(0, snapshot.scrollY as number);
      });
    } catch {
      // Navigation remains available when storage is unavailable.
    }
  }, [query.hotAudience]);

  const rememberScrollPosition = (href: string) => {
    try {
      window.sessionStorage.setItem(
        scrollSnapshotKey,
        JSON.stringify({ href, scrollY: window.scrollY }),
      );
    } catch {
      // Navigation remains available when storage is unavailable.
    }
  };

  return (
    <nav
      aria-label="핫플레이스 세대 필터"
      className="scrollbar-none mt-3 overflow-x-auto"
    >
      <ul className="flex gap-2">
        {audienceFilters.map((audience) => {
          const href = explore
            ? buildExploreHref(query, { hotAudience: audience.id })
            : buildDiscoveryHref(query, { hotAudience: audience.id });
          return (
            <li key={audience.id} className="shrink-0">
              <Link
                href={href}
                scroll={false}
                onClick={() => rememberScrollPosition(href)}
                aria-current={
                  query.hotAudience === audience.id ? "true" : undefined
                }
                className={cn(
                  "type-label inline-flex h-11 min-w-11 items-center justify-center whitespace-nowrap rounded-full px-3 text-muted-foreground transition-colors hover:bg-primary-subtle hover:text-primary",
                  query.hotAudience === audience.id &&
                    "bg-primary text-primary-foreground",
                )}
              >
                {audience.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export {
  HotPlaceRankingAudienceFilter,
  scrollSnapshotKey,
  type HotPlaceRankingAudienceFilterProps,
};
