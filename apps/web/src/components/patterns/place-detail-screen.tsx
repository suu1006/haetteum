import Link from "next/link";

import { PlaceDetailActions } from "@/components/travel/place-detail-actions";
import { PlaceDetailHeader } from "@/components/travel/place-detail-header";
import { PlaceIntroduction } from "@/components/travel/place-introduction";
import { PlaceInformation } from "@/components/travel/place-information";
import { PlaceDetailPreparation } from "@/components/travel/place-detail-preparation";
import { PlaceDetailTabs } from "@/components/travel/place-detail-tabs";
import { PlaceReviewOverview } from "@/components/travel/place-review-overview";
import { ReviewCard } from "@/components/travel/review-card";
import { ReviewProviderMark } from "@/components/travel/review-provider-mark";
import { ReviewSourceFilter } from "@/components/travel/review-source-filter";
import { PlaceCourseRecommendation } from "@/components/patterns/place-course-recommendation";
import {
  buildPlaceDetailHref,
  selectPlaceReviews,
  type PlaceDetailQuery,
  type ResolvedPlaceDetail,
  type ReviewProviderId,
} from "@/features/places/place-detail-model";

type PlaceDetailScreenProps = {
  place: ResolvedPlaceDetail;
  query: PlaceDetailQuery;
};

const providerLabels: Record<ReviewProviderId, string> = {
  kakao: "카카오맵",
  google: "구글맵",
  naver: "네이버 블로그",
};

function PlaceDetailScreen({ place, query }: PlaceDetailScreenProps) {
  const reviews = selectPlaceReviews(place.reviews, query.source);

  return (
    <div className="mx-auto min-h-screen w-full max-w-[30rem] bg-background pb-[calc(7rem+var(--safe-area-bottom))]">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
        <div
          data-testid="place-detail-region"
          data-region="header"
        >
          <PlaceDetailHeader
            title={place.title}
            placeId={place.id}
            location={place.location}
            primaryImageUrl={place.image.src}
          />
        </div>
        <div data-testid="place-detail-region" data-region="tabs">
          <PlaceDetailTabs placeId={place.id} currentTab={query.tab} />
        </div>
      </div>

      {query.tab === "reviews" ? (
        <div className="space-y-5 px-4 py-6">
          <div
            data-testid="place-detail-region"
            data-region="review-heading"
          >
            <PlaceReviewOverview place={place} part="heading" />
          </div>
          <div data-testid="place-detail-region" data-region="filters">
            <ReviewSourceFilter
              placeId={place.id}
              currentSource={query.source}
            />
          </div>
          <div data-testid="place-detail-region" data-region="rating">
            <PlaceReviewOverview place={place} part="rating" />
          </div>
          <div
            data-testid="place-detail-region"
            data-region="feed"
            className="space-y-3"
          >
            {reviews.length > 0 ? (
              reviews.map((review, index) => (
                <div
                  key={review.id}
                  id={review.id}
                  className="scroll-mt-32 rounded-xl target:ring-3 target:ring-ring/25"
                >
                  <ReviewCard
                    variant="feed"
                    author={review.author}
                    rating={review.rating}
                    date={review.date}
                    content={review.content}
                    provider={providerLabels[review.provider]}
                    providerIcon={
                      <ReviewProviderMark provider={review.provider} compact />
                    }
                    images={review.images}
                    likeCount={review.likeCount}
                    eagerImages={index === 0}
                  />
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-border bg-card p-5 text-center">
                <p className="type-label text-foreground">
                  선택한 출처에는 아직 후기가 없어요
                </p>
                <p className="type-body-md mt-1 text-muted-foreground">
                  다른 출처의 후기를 확인해 보세요.
                </p>
                <Link
                  href={buildPlaceDetailHref(place.id)}
                  className="type-label mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
                >
                  전체 후기 보기
                </Link>
              </div>
            )}
          </div>
          <div data-testid="place-detail-region" data-region="action">
            <PlaceDetailActions />
          </div>
        </div>
      ) : query.tab === "introduction" ? (
        <div data-testid="place-detail-region" data-region="introduction">
          <PlaceIntroduction place={place} />
        </div>
      ) : query.tab === "course" && place.course ? (
        <div data-testid="place-detail-region" data-region="course">
          <PlaceCourseRecommendation course={place.course} />
        </div>
      ) : query.tab === "information" ? (
        <div data-testid="place-detail-region" data-region="information">
          <PlaceInformation place={place} />
        </div>
      ) : (
        <PlaceDetailPreparation placeId={place.id} tab={query.tab} />
      )}
    </div>
  );
}

export { PlaceDetailScreen, type PlaceDetailScreenProps };
