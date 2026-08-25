import { RatingSummary } from "@/components/travel/rating-summary";
import type { ResolvedPlaceDetail } from "@/features/places/place-detail-model";

type PlaceReviewOverviewProps = {
  place: ResolvedPlaceDetail;
  part?: "all" | "heading" | "rating";
};

const reviewCountFormatter = new Intl.NumberFormat("ko-KR");

function PlaceReviewOverview({
  place,
  part = "all",
}: PlaceReviewOverviewProps) {
  const heading = (
    <h2
      id="place-review-title"
      className="type-title-md scroll-mt-32 text-foreground"
    >
      통합 후기{" "}
      <span className="type-body-lg font-normal text-muted-foreground">
        {reviewCountFormatter.format(place.reviewCount)}개
      </span>
    </h2>
  );
  const rating = (
    <RatingSummary
      value={place.rating}
      reviewCount={place.reviewCount}
      distribution={place.ratingDistribution}
      layout="split"
      tone="primary"
      distributionValue="count"
      className={part === "all" ? "mt-4" : undefined}
    />
  );

  if (part === "heading") return heading;
  if (part === "rating") return rating;

  return (
    <section aria-labelledby="place-review-title">
      {heading}
      {rating}
    </section>
  );
}

export { PlaceReviewOverview, type PlaceReviewOverviewProps };
