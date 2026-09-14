"use client";

import type { PopularReelRegion } from "@haetteum/contracts";
import Link from "next/link";
import { useEffect } from "react";

import {
  buildDiscoveryHref,
  buildExploreHref,
  type DiscoveryQuery,
} from "@/features/discovery/discovery-model";
import { cn } from "@/lib/utils";

type PopularReelRegionFilterProps = {
  query: DiscoveryQuery;
  explore?: boolean;
};

type ScrollSnapshot = {
  href: string;
  scrollY: number;
};

const regionFilters: ReadonlyArray<{
  id: PopularReelRegion;
  label: string;
}> = [
  { id: "all", label: "전체" },
  { id: "seoul", label: "서울" },
  { id: "gyeonggi", label: "경기" },
  { id: "gangwon", label: "강원" },
  { id: "busan", label: "부산" },
  { id: "jeju", label: "제주" },
];

const scrollSnapshotKey = "haetteum:popular-reel-region:scroll";

function PopularReelRegionFilter({ query, explore = false }: PopularReelRegionFilterProps) {
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
  }, [query.reelRegion]);

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
    <nav aria-label="릴스 지역 필터" className="mt-2 overflow-x-auto">
      <ul className="flex gap-2">
        {regionFilters.map((region) => {
          const href = explore
            ? buildExploreHref(query, { reelRegion: region.id })
            : buildDiscoveryHref(query, { reelRegion: region.id });
          return (
            <li key={region.id}>
              <Link
                href={href}
                scroll={false}
                onClick={() => rememberScrollPosition(href)}
                aria-current={
                  query.reelRegion === region.id ? "true" : undefined
                }
                className={cn(
                  "type-label inline-flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-muted-foreground transition-colors hover:bg-primary-subtle hover:text-primary",
                  query.reelRegion === region.id &&
                    "bg-primary text-primary-foreground",
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

export {
  PopularReelRegionFilter,
  scrollSnapshotKey,
  type PopularReelRegionFilterProps,
};
