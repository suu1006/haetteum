import Link from "next/link";
import type { PlaceRankingItem } from "@haetteum/contracts";

import { RankingCardPhoto } from "./ranking-card-photo";

type PlaceRankingCardProps = {
  place: PlaceRankingItem;
  priority?: boolean;
  hideImage?: boolean;
  onImageError?: () => void;
};

function PlaceRankingCard({
  place,
  priority = false,
  hideImage,
  onImageError,
}: PlaceRankingCardProps) {
  const rankLabel = `${place.rank}위`;

  const card = (
    <article
      aria-label={`${rankLabel} ${place.title}`}
      className="grid min-w-0 gap-2"
    >
      <div className="grid min-h-11 gap-2">
        <RankingCardPhoto
          source={place.primaryImageUrl}
          title={place.title}
          rank={place.rank}
          priority={priority}
          hideImage={hideImage}
          onImageError={onImageError}
        />

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
  ) : (
    card
  );
}

export { PlaceRankingCard, type PlaceRankingCardProps };
