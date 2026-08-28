import Image from "next/image";
import Link from "next/link";
import { PlayIcon } from "lucide-react";

import type { PopularReelItem } from "@haetteum/contracts";

type PopularReelRailProps = {
  reels: readonly PopularReelItem[];
};

function durationLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function PopularReelRail({ reels }: PopularReelRailProps) {
  return (
    <ul
      aria-label="릴스형 인기 관광지 목록"
      className="scrollbar-none mt-3 flex gap-3 overflow-x-auto pb-1"
    >
      {reels.map((reel) => (
        <li key={`${reel.placeId}-${reel.videoId}`} className="shrink-0">
          <Link
            href={`/reels/place/${reel.placeId}`}
            scroll={false}
            className="group block w-36 overflow-hidden rounded-xl border border-border bg-card outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
          >
            <span className="relative block aspect-[9/16] w-full overflow-hidden bg-muted">
              <Image
                src={reel.thumbnailUrl}
                alt={`${reel.placeTitle} 릴스 미리보기`}
                fill
                sizes="144px"
                className="object-cover transition-transform group-hover:scale-105"
              />
              <span aria-hidden="true" className="absolute inset-0 bg-black/15" />
              <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[0.625rem] font-semibold text-white">
                <PlayIcon aria-hidden="true" className="size-3 fill-current" />
                {durationLabel(reel.durationSeconds)}
              </span>
            </span>
            <span className="block px-2.5 py-2">
              <span className="type-caption block truncate font-semibold text-foreground">
                {reel.placeTitle}
              </span>
              <span className="mt-0.5 block truncate text-[0.6875rem] text-muted-foreground">
                {reel.region}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export { PopularReelRail, type PopularReelRailProps };
