import Image from "next/image";
import Link from "next/link";

import type { PopularReelItem } from "@haetteum/contracts";

type PopularReelGridProps = {
  reels: readonly PopularReelItem[];
};

function ReelTile({
  reel,
  priority = false,
}: {
  reel: PopularReelItem;
  priority?: boolean;
}) {
  return (
    <li className="relative aspect-[9/16] overflow-hidden rounded-lg">
      <Image
        src={reel.thumbnailUrl}
        alt=""
        fill
        sizes="(max-width: 479px) 48vw, 216px"
        className="object-cover"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
      />
      <Link
        href={`/reels/place/${reel.placeId}?v=${reel.videoId}`}
        scroll={false}
        prefetch={false}
        aria-label={`${reel.placeTitle} 릴스 미리보기`}
        className="absolute inset-0 z-10 outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
      />
    </li>
  );
}

function PopularReelGrid({ reels }: PopularReelGridProps) {
  return (
    <ul
      aria-label="릴스형 인기 관광지 목록"
      className="mt-3 grid grid-cols-2 gap-2"
    >
      {reels.map((reel, index) => (
        <ReelTile
          key={`${reel.placeId}-${reel.videoId}`}
          reel={reel}
          priority={index < 2}
        />
      ))}
    </ul>
  );
}

export { PopularReelGrid, type PopularReelGridProps };
