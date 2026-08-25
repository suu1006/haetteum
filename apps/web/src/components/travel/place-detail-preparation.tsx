import { CircleEllipsisIcon } from "lucide-react";
import Link from "next/link";

import { buildPlaceDetailHref } from "@/features/places/place-detail-model";
import type { PlaceDetailTabId } from "@/features/places/place-detail-model";

type PreparationTabId = Exclude<PlaceDetailTabId, "reviews">;

type PlaceDetailPreparationProps = {
  placeId: string;
  tab: PreparationTabId;
};

const preparationCopy: Record<PreparationTabId, string> = {
  introduction: "소개를 준비하고 있어요",
  course: "추천 코스를 준비하고 있어요",
  information: "상세 정보를 준비하고 있어요",
};

function PlaceDetailPreparation({
  placeId,
  tab,
}: PlaceDetailPreparationProps) {
  return (
    <section className="px-4 py-16 text-center" aria-labelledby="preparation-title">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-subtle text-primary">
        <CircleEllipsisIcon className="size-6" aria-hidden="true" />
      </span>
      <h2 id="preparation-title" className="type-title-md mt-5 text-foreground">
        {preparationCopy[tab]}
      </h2>
      <p className="type-body-md mt-2 text-muted-foreground">
        더 좋은 여행 정보를 보여드릴 수 있도록 준비 중입니다.
      </p>
      <Link
        href={buildPlaceDetailHref(placeId)}
        className="type-label mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
      >
        후기 먼저 보기
      </Link>
    </section>
  );
}

export { PlaceDetailPreparation, type PlaceDetailPreparationProps };
