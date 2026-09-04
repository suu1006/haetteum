import Image from "next/image";
import Link from "next/link";
import type { PlaceRankingItem } from "@haetteum/contracts";

import { resolveOfficialImageSource } from "@/lib/official-image";
import { cn } from "@/lib/utils";

type PlaceRankingCardProps = {
  place: PlaceRankingItem;
  priority?: boolean;
};

const rankBadgeClassNames: Record<number, string> = {
  1: "bg-rank-gold text-rank-gold-foreground",
  2: "bg-rank-silver text-rank-silver-foreground",
  3: "bg-rank-bronze text-rank-bronze-foreground",
};

function PlaceRankingCard({ place, priority = false }: PlaceRankingCardProps) {
  const rankLabel = `${place.rank}위`;
  const rankBadgeClassName =
    rankBadgeClassNames[place.rank] ?? "bg-primary text-primary-foreground";
  const imageSrc = resolveOfficialImageSource(place.primaryImageUrl);

  const card = (
    <article
      aria-label={`${rankLabel} ${place.title}`}
      className="grid min-w-0 gap-2"
    >
      <div className="grid min-h-11 gap-2">
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-primary-subtle">
          <Image
            src={imageSrc}
            alt={place.title}
            fill
            sizes="(max-width: 480px) 30vw, 144px"
            className="object-cover"
            priority={priority}
          />
          <span
            className={cn(
              "type-caption absolute top-1.5 left-1.5 rounded-full px-2 py-0.5 font-semibold",
              rankBadgeClassName,
            )}
          >
            {rankLabel}
          </span>
        </div>

        <div className="min-w-0 space-y-1">
          <h3 className="type-label truncate text-foreground">{place.title}</h3>
          <p className="type-caption truncate text-muted-foreground">
            {place.category}
          </p>
          <p className="type-caption text-muted-foreground">
            인기 비율 {place.sharePercent.toFixed(1)}%
          </p>
          {place.imageAttribution ? (
            <p className="type-caption truncate text-muted-foreground/70">
              사진 출처: {place.imageAttribution}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );

  return place.placeId ? (
    <Link
      href={`/places/${encodeURIComponent(place.placeId)}?tab=introduction`}
      aria-label={`${rankLabel} ${place.title} 상세 보기`}
      className="block rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
    >
      {card}
    </Link>
  ) : card;
}

export { PlaceRankingCard, type PlaceRankingCardProps };
