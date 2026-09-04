import Link from "next/link";
import { FlameIcon } from "lucide-react";
import { useId, type ReactNode } from "react";

import { PopularReelFeed } from "@/components/travel/popular-reel-feed";
import { PopularReelRegionFilter } from "@/components/travel/popular-reel-region-filter";
import { PopularVideoRail } from "@/components/travel/popular-video-rail";
import {
  buildDiscoveryHref,
  type DiscoveryQuery,
  type PopularVideoItem,
} from "@/features/discovery/discovery-model";
import type { PopularReelsLoadState } from "@/features/discovery/place-reels-api";

type PopularPlacesTabProps = {
  videos: readonly PopularVideoItem[];
  query: DiscoveryQuery;
  popularReels?: PopularReelsLoadState | null;
};

type SectionHeadingProps = {
  id: string;
  title: string;
  description: string;
  icon?: ReactNode;
};

function SectionHeading({ id, title, description, icon }: SectionHeadingProps) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        {icon}
        <h2 id={id} className="type-body-lg font-semibold text-foreground">
          {title}
        </h2>
      </div>
      <p className="type-caption mt-0.5 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function PopularPlacesTab({
  videos,
  query,
  popularReels,
}: PopularPlacesTabProps) {
  const headingIdPrefix = useId();
  const liveReelsPage =
    popularReels?.status === "ready" ? popularReels.data : null;
  const popularVideosTitleId = `${headingIdPrefix}-popular-videos-title`;

  return (
    <div id="places" aria-label="인기 관광지" className="space-y-4 pt-4">
      <section
        aria-labelledby={popularVideosTitleId}
        data-testid="popular-place-section"
        data-section="popular-videos"
        className="px-4"
      >
        <SectionHeading
          id={popularVideosTitleId}
          title="릴스형 인기 관광지"
          description="짧은 미리보기로 여행지를 만나보세요."
          icon={
            <FlameIcon
              aria-hidden="true"
              className="size-4.5 fill-destructive text-destructive"
            />
          }
        />
        <PopularReelRegionFilter query={query} />
        {liveReelsPage ? (
          <PopularReelFeed
            key={query.reelRegion}
            audience="all"
            region={query.reelRegion}
            initialPage={liveReelsPage}
          />
        ) : videos.length > 0 ? (
          <PopularVideoRail videos={videos} />
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/45 p-4">
            <p className="type-body-md text-muted-foreground">
              조건에 맞는 인기 관광지를 찾지 못했어요.
            </p>
            <Link
              href={buildDiscoveryHref(query, { q: "" }, "places")}
              className="type-label mt-3 inline-flex text-primary underline-offset-4 hover:underline"
            >
              검색어 지우기
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

export { PopularPlacesTab, type PopularPlacesTabProps };
