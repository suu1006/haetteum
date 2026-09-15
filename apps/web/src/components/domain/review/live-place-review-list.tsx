"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ReviewModerationActions } from "@/components/domain/review/review-moderation-actions";
import Image from "next/image";

import type { PlaceReviewsResponse } from "@haetteum/contracts";

import { RatingSummary } from "@/components/domain/review/rating-summary";
import { ReviewCard } from "@/components/domain/review/review-card";

type LivePlaceReviewListProps = {
  reviews: PlaceReviewsResponse;
};

const reviewDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "Asia/Seoul",
});

function LivePlaceReviewList({ reviews }: LivePlaceReviewListProps) {
  const router = useRouter();
  const [hidden, setHidden] = useState<string[]>([]);
  if (reviews.reviewCount === 0 || reviews.averageRating === null) {
    return (
      <section className="px-4 py-16 text-center">
        <h2 className="type-title-md text-foreground">
          아직 등록된 후기가 없어요
        </h2>
        <p className="type-body-md mt-2 text-muted-foreground">
          해뜸의 첫 후기를 기다리고 있어요.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="place-review-title" className="px-3 py-4">
      <h2 id="place-review-title" className="type-title-md px-1 text-foreground">
        해뜸 후기{" "}
        <span className="type-body-lg font-normal text-muted-foreground">
          {reviews.reviewCount.toLocaleString("ko-KR")}개
        </span>
      </h2>

      <RatingSummary
        value={reviews.averageRating}
        reviewCount={reviews.reviewCount}
        distribution={reviews.ratingDistribution}
        layout="split"
        tone="primary"
        distributionValue="count"
        className="mt-4"
      />

      {hidden.length > 0 && <p role="status" className="mt-3 type-body-md text-muted-foreground">작성자를 차단했어요. 마이페이지에서 해제할 수 있어요.</p>}
      <ul className="mt-4 space-y-3">
        {reviews.items.filter(review => !hidden.includes(review.id)).map((review) => (
          <li key={review.id}>
            <ReviewModerationActions
              review={review}
              placeId={reviews.placeId}
              onBlocked={() => {
                setHidden((ids) => [...ids, review.id]);
                router.refresh();
              }}
            >
              {({ menu, panel }) => (
                <>
                  <ReviewCard
                    author={review.author.displayName}
                    rating={review.rating}
                    date={reviewDateFormatter.format(new Date(review.createdAt))}
                    content={review.content}
                    provider="해뜸"
                    avatar={
                      review.author.profileImageUrl ? (
                        <Image
                          unoptimized
                          src={review.author.profileImageUrl}
                          alt=""
                          width={44}
                          height={44}
                          className="size-full object-cover"
                        />
                      ) : undefined
                    }
                    menu={menu}
                  />
                  {panel}
                </>
              )}
            </ReviewModerationActions>
          </li>
        ))}
      </ul>
    </section>
  );
}

export { LivePlaceReviewList, type LivePlaceReviewListProps };
