"use client";

import { useState } from "react";
import type {
  PlaceRankingItem,
  HotPlaceRankingItem,
} from "@haetteum/contracts";
import { resolvePlacePhotoSource } from "@/lib/official-image";
import { PlaceRankingCard } from "./place-ranking-card";
import { HotPlaceRankingCard } from "./hot-place-ranking-card";

type Props = { label: string } & (
  | { kind: "popular"; items: readonly PlaceRankingItem[] }
  | { kind: "hot"; items: readonly HotPlaceRankingItem[] }
);
export function PhotoPriorityRankingList(props: Props) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(() => new Set());
  const hasPhoto = (place: PlaceRankingItem | HotPlaceRankingItem) => {
    const src = resolvePlacePhotoSource(place.primaryImageUrl);
    return src !== null && !failed.has(src);
  };
  const items = [...props.items].sort(
    (a, b) => Number(hasPhoto(b)) - Number(hasPhoto(a)) || a.rank - b.rank,
  );
  return (
    <>
      <p className="type-caption mt-3 text-muted-foreground">
        사진 있는 장소 먼저 · 순위는 데이터랩 기준
      </p>
      <ol
        aria-label={props.label}
        className="scrollbar-none mt-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain pb-2"
      >
        {items.map((place, index) => {
          const src = resolvePlacePhotoSource(place.primaryImageUrl);
          const onImageError = () => {
            if (src) setFailed((current) => new Set([...current, src]));
          };
          const shared = {
            priority: index === 0,
            hideImage: !hasPhoto(place),
            onImageError,
          };
          return (
            <li
              key={place.sourcePlaceId}
              value={place.rank}
              className="w-40 shrink-0 snap-start sm:w-44"
            >
              {"sharePercent" in place ? (
                <PlaceRankingCard place={place} {...shared} />
              ) : (
                <HotPlaceRankingCard place={place} {...shared} />
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
