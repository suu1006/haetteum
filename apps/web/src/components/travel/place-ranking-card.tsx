import Image from "next/image";
import Link from "next/link";

import { RatingSummary } from "@/components/travel/rating-summary";
import type { PlaceRankingItem } from "@/features/discovery/discovery-model";
import { cn } from "@/lib/utils";

type PlaceRankingCardProps = {
  place: PlaceRankingItem;
  href: string;
};

const rankBadgeClassNames: Record<number, string> = {
  1: "bg-rank-gold text-rank-gold-foreground",
  2: "bg-rank-silver text-rank-silver-foreground",
  3: "bg-rank-bronze text-rank-bronze-foreground",
};

function PlaceRankingCard({ place, href }: PlaceRankingCardProps) {
  const rankLabel = `${place.rank}위`;
  const rankBadgeClassName =
    rankBadgeClassNames[place.rank] ?? "bg-primary text-primary-foreground";

  return (
    <article
      aria-label={`${rankLabel} ${place.title}`}
      className="grid min-w-0 gap-2"
    >
      <Link
        href={href}
        className="grid min-h-11 gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-primary-subtle">
          <Image
            src={place.image.src}
            alt={place.image.alt}
            fill
            sizes="(max-width: 480px) 30vw, 144px"
            className="object-cover"
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
            {place.location}
          </p>
          <RatingSummary
            value={place.rating}
            reviewCount={place.reviewCount}
            size="compact"
            countVariant="parenthetical"
          />
        </div>
      </Link>
    </article>
  );
}

export { PlaceRankingCard, type PlaceRankingCardProps };
