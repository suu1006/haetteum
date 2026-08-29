import type {
  PlaceDetailResponse,
  PlaceReviewsResponse,
} from "@haetteum/contracts";

import { LiveCourseContent } from "@/components/patterns/live-place-course-content";
import { LiveGeneratedCourseContent } from "@/components/patterns/live-generated-course-content";
import { LiveInformationContent } from "@/components/patterns/live-place-information-content";
import { LivePlaceReviewList } from "@/components/travel/live-place-review-list";
import { LoadFailureNotice } from "@/components/travel/load-failure-notice";
import { PlaceDetailHeader } from "@/components/travel/place-detail-header";
import { PlaceDetailTabs } from "@/components/travel/place-detail-tabs";
import { PlaceImageGallery } from "@/components/travel/place-image-gallery";
import type { PlaceDetailQuery } from "@/features/places/place-detail-model";
import { resolveOfficialImageSource } from "@/lib/official-image";

function LiveIntroduction({ place }: { place: PlaceDetailResponse }) {
  const guides = [
    ["운영 시간", place.introduction.useTime],
    ["휴무일", place.introduction.restDate],
    ["이용 계절", place.introduction.useSeason],
    ["주차", place.introduction.parking],
    ["안내센터", place.introduction.infoCenter],
    ["체험 연령", place.introduction.experienceAgeRange],
    ["체험 안내", place.introduction.experienceGuide],
    ["유모차", place.introduction.babyCarriage],
    ["신용카드", place.introduction.creditCard],
    ["반려동물", place.introduction.pet],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  return (
    <section aria-label={`${place.title} 소개`}>
      <PlaceImageGallery
        title={place.title}
        images={place.images.map((image) => ({
          src: resolveOfficialImageSource(image.url),
          alt: image.alt,
        }))}
      />
      <div className="space-y-4 bg-card px-5 py-5">
        <h2 className="type-title-lg text-foreground">{place.title}</h2>
        {place.address ? <p className="type-body-md text-muted-foreground">{place.address}</p> : null}
        {place.overview ? <p className="type-body-md leading-6 text-foreground">{place.overview}</p> : null}
        {place.images.some((image) => image.copyrightType) ? (
          <p className="type-caption text-muted-foreground">
            이미지 저작권 {place.images.find((image) => image.copyrightType)?.copyrightType}
          </p>
        ) : null}
      </div>
      {guides.length > 0 ? (
        <dl className="mx-3 my-4 divide-y divide-border rounded-2xl border border-border bg-card px-4">
          {guides.map(([label, value]) => (
            <div key={label} className="grid grid-cols-[5rem_1fr] gap-3 py-3">
              <dt className="type-label text-muted-foreground">{label}</dt>
              <dd className="type-body-md text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

export function LivePlaceDetailScreen({
  place,
  query,
  reviews,
}: {
  place: PlaceDetailResponse;
  query: PlaceDetailQuery;
  reviews?: PlaceReviewsResponse | null;
}) {
  return (
    <div className="mx-auto min-h-screen w-full max-w-[30rem] bg-background pb-[calc(7rem+var(--safe-area-bottom))]">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
        <PlaceDetailHeader title={place.title} />
        <PlaceDetailTabs placeId={place.id} currentTab={query.tab} />
      </div>
      {query.tab === "introduction" ? <LiveIntroduction place={place} /> : null}
      {query.tab === "information" ? (
        <LiveInformationContent place={place} />
      ) : null}
      {query.tab === "reviews" ? (
        reviews == null ? (
          <LoadFailureNotice label="후기" />
        ) : (
          <LivePlaceReviewList reviews={reviews} />
        )
      ) : null}
      {query.tab === "course" ? (
        <>
          <LiveGeneratedCourseContent placeId={place.id} />
          <LiveCourseContent placeId={place.id} />
        </>
      ) : null}
    </div>
  );
}
