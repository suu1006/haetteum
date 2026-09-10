"use client";

import { useCallback, useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";

import type {
  PlaceRankingAudience,
  PopularReelRegion,
  PopularReelsResponse,
} from "@haetteum/contracts";

import { PopularReelGrid } from "@/components/travel/popular-reel-grid";
import { popularReelsInfiniteQueryOptions } from "@/features/discovery/popular-reels-query";

type PopularReelFeedProps = {
  audience: PlaceRankingAudience;
  region: PopularReelRegion;
  initialPage: PopularReelsResponse;
};

function PopularReelFeed({ audience, region, initialPage }: PopularReelFeedProps) {
  const { data, fetchNextPage, hasNextPage, isFetching, isFetchingNextPage } =
    useInfiniteQuery({
      ...popularReelsInfiniteQueryOptions(audience, region),
      initialData: {
        pages: [{ status: "ready" as const, data: initialPage }],
        pageParams: [undefined],
      },
    });

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isIntersectingRef = useRef(false);

  // A synchronous in-flight guard, separate from React Query's own
  // isFetchingNextPage. A fast scroll can make the browser deliver several
  // IntersectionObserver callbacks back to back in the same tick, all
  // before React has re-rendered with the first fetchNextPage() call's
  // state update — so a guard that only reads state (even through a ref
  // updated at render time) still lets every one of those calls through and
  // fetches the same page multiple times. Flipping this ref the instant a
  // fetch starts, before yielding control, is what actually serializes them.
  const isRequestingRef = useRef(false);

  // Gate on the latest fetch state via a callback rather than the observer's
  // effect deps: an IntersectionObserver reports the current intersection
  // state as soon as observe() is called, so recreating the observer every
  // time isFetching(NextPage) flips — which happens mid-fetch — would
  // re-fire immediately whenever the sentinel is still in view (e.g. after a
  // fast scroll on a short page), racing a fresh fetchNextPage() against the
  // one still in flight and duplicating a page.
  const maybeFetchNextPage = useCallback(() => {
    if (
      isIntersectingRef.current &&
      hasNextPage &&
      !isFetching &&
      !isFetchingNextPage &&
      !isRequestingRef.current
    ) {
      isRequestingRef.current = true;
      void fetchNextPage().finally(() => {
        isRequestingRef.current = false;
      });
    }
  }, [fetchNextPage, hasNextPage, isFetching, isFetchingNextPage]);

  // The observer's own callback must always see the latest gate — reading it
  // through a ref (rather than closing over it) is what lets the observer
  // itself be created exactly once yet still react correctly to fetch state
  // that changes after mount.
  const maybeFetchNextPageRef = useRef(maybeFetchNextPage);
  useEffect(() => {
    maybeFetchNextPageRef.current = maybeFetchNextPage;
  }, [maybeFetchNextPage]);

  // The observer itself is created once and only reacts to real intersection
  // changes.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isIntersectingRef.current = entry?.isIntersecting ?? false;
        maybeFetchNextPageRef.current();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Re-evaluate whenever the fetch state settles: if the sentinel is still
  // in view (the user scrolled past it before the previous fetch finished),
  // this is what keeps pagination advancing without waiting for a fresh
  // intersection-crossing event that may never come.
  useEffect(() => {
    maybeFetchNextPage();
  }, [maybeFetchNextPage]);

  // Defense in depth against a duplicate page ever landing in the cache
  // (e.g. an interrupted background revalidation): the feed must never
  // render two tiles for the same video, since each one links to a specific
  // videoId — a repeated key would let the wrong tile's autoplay/click state
  // bleed into its duplicate.
  const seenKeys = new Set<string>();
  const reels = data.pages
    .flatMap((page) => (page.status === "ready" ? page.data.items : []))
    .filter((item) => {
      const key = `${item.placeId}-${item.videoId}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

  return (
    <>
      <PopularReelGrid reels={reels} />
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      {isFetchingNextPage ? (
        <p className="type-caption mt-3 text-center text-muted-foreground">
          더 불러오는 중...
        </p>
      ) : null}
    </>
  );
}

export { PopularReelFeed, type PopularReelFeedProps };
