import {
  CircleParkingIcon,
  LeafIcon,
  SoupIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

import type {
  FestivalPointIconId,
  FestivalRecommendationPoint,
} from "@/features/festivals/festival-detail-model";

const pointIcons = {
  leaf: LeafIcon,
  family: UsersIcon,
  food: SoupIcon,
  parking: CircleParkingIcon,
} satisfies Record<FestivalPointIconId, LucideIcon>;

type FestivalRecommendationPointsProps = {
  points: readonly FestivalRecommendationPoint[];
};

function FestivalRecommendationPoints({
  points,
}: FestivalRecommendationPointsProps) {
  return (
    <section aria-labelledby="festival-recommendation-points-title">
      <h2
        id="festival-recommendation-points-title"
        className="type-title-md text-foreground"
      >
        추천 포인트
      </h2>
      <ul className="-mx-1 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 min-[390px]:mx-0 min-[390px]:grid min-[390px]:grid-cols-2 min-[390px]:overflow-visible min-[390px]:px-0">
        {points.map((point) => {
          const Icon = pointIcons[point.icon];

          return (
            <li
              key={point.id}
              className="flex w-52 shrink-0 snap-start items-start gap-3 rounded-xl bg-primary-subtle p-3 min-[390px]:w-auto"
            >
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0 pt-0.5">
                <h3 className="type-label text-foreground">{point.title}</h3>
                <p className="type-caption mt-1 text-muted-foreground">
                  {point.description}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export {
  FestivalRecommendationPoints,
  type FestivalRecommendationPointsProps,
};
