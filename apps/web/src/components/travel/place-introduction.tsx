import {
  BathIcon,
  CircleCheckIcon,
  FerrisWheelIcon,
  HouseIcon,
  MapPinIcon,
  TreesIcon,
  UtensilsIcon,
  WavesIcon,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";

import { PlaceImageGallery } from "@/components/travel/place-image-gallery";
import type {
  PlaceFacilityIconId,
  ResolvedPlaceDetail,
} from "@/features/places/place-detail-model";

type PlaceIntroductionProps = {
  place: ResolvedPlaceDetail;
};

const facilityIcons: Record<PlaceFacilityIconId, LucideIcon> = {
  spa: BathIcon,
  "water-park": WavesIcon,
  sauna: HouseIcon,
  restaurant: UtensilsIcon,
  attraction: FerrisWheelIcon,
  nature: TreesIcon,
};

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const id = `place-introduction-${title.replaceAll(" ", "-")}`;

  return (
    <section
      aria-labelledby={id}
      className="rounded-2xl border border-border bg-card p-4 shadow-card"
    >
      <h3 id={id} className="type-title-md text-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function PlaceIntroduction({ place }: PlaceIntroductionProps) {
  const { introduction } = place;

  return (
    <section aria-labelledby={`${place.id}-introduction-title`}>
      <PlaceImageGallery title={place.title} images={introduction.heroImages} />

      <div className="bg-card px-5 py-5">
        <h2
          id={`${place.id}-introduction-title`}
          aria-label={`${place.title} 소개`}
          className="type-title-lg text-foreground"
        >
          {place.title}
        </h2>
        <p className="type-body-md mt-3 flex items-start gap-2 text-muted-foreground">
          <MapPinIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          {introduction.addressLabel}
        </p>
        <p className="type-body-md mt-5 leading-6 text-muted-foreground">
          {introduction.description}
        </p>
      </div>

      <div className="space-y-3 px-3 py-4">
        <section
          aria-label="대표 시설"
          className="rounded-2xl border border-border bg-card p-3.5 shadow-card"
        >
          <ul aria-label="대표 시설" className="grid grid-cols-4 gap-2">
            {introduction.facilities.map((facility) => {
              const Icon = facilityIcons[facility.icon];

              return (
                <li key={facility.id} className="min-w-0 text-center">
                  <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-primary-subtle text-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="type-caption mt-2 block break-keep font-medium text-foreground">
                    {facility.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <DetailCard title="추천 포인트">
          <ul className="mt-4 space-y-2">
            {introduction.recommendationPoints.map((point) => (
              <li key={point} className="type-body-md flex items-start gap-3 text-foreground">
                <CircleCheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 fill-primary text-primary-foreground" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </DetailCard>

        {introduction.facilityPreviews?.length ? (
          <DetailCard title="시설 미리보기">
            <ul
              aria-label="시설 미리보기"
              className="scrollbar-none -mr-4 mt-4 flex snap-x gap-3 overflow-x-auto pr-4"
            >
              {introduction.facilityPreviews.map((preview) => (
                <li key={preview.label} className="w-32 shrink-0 snap-start">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
                    <Image
                      src={preview.image.src}
                      alt={preview.image.alt}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  </div>
                  <p className="type-caption mt-2 text-center font-medium text-foreground">
                    {preview.label}
                  </p>
                </li>
              ))}
            </ul>
          </DetailCard>
        ) : null}

        {introduction.operatingHours?.length ? (
          <DetailCard title="운영 시간">
            <dl className="mt-4 space-y-4">
              {introduction.operatingHours.map((item) => {
                const Icon = facilityIcons[item.icon];

                return (
                  <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <dt className="type-body-md flex min-w-0 items-center gap-3 text-foreground">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                        <Icon aria-hidden="true" className="size-4" />
                      </span>
                      {item.label}
                    </dt>
                    <dd className="type-body-md text-right text-muted-foreground">
                      {item.value}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </DetailCard>
        ) : null}

        {introduction.prices?.length ? (
          <DetailCard title="이용 요금">
            <dl className="mt-4 space-y-3">
              {introduction.prices.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4">
                  <dt className="type-body-md text-muted-foreground">{item.label}</dt>
                  <dd className="type-body-md font-medium text-foreground">{item.value}</dd>
                </div>
              ))}
            </dl>
            {introduction.priceNotice ? (
              <p className="type-caption mt-4 text-muted-foreground">
                * {introduction.priceNotice}
              </p>
            ) : null}
          </DetailCard>
        ) : null}
      </div>
    </section>
  );
}

export { PlaceIntroduction, type PlaceIntroductionProps };
