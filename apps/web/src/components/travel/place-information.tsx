import {
  BusIcon,
  CarIcon,
  TrainFrontIcon,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { PlaceInformationBasics } from "@/components/travel/place-information-basics";
import type {
  PlaceNearbyItem,
  PlaceTransportationIconId,
  ResolvedPlaceDetail,
} from "@/features/places/place-detail-model";

type PlaceInformationProps = {
  place: ResolvedPlaceDetail;
};

const transportationIcons: Record<PlaceTransportationIconId, LucideIcon> = {
  car: CarIcon,
  bus: BusIcon,
  train: TrainFrontIcon,
};

function InformationCard({ title, children }: { title: string; children: ReactNode }) {
  const id = `place-information-${title.replaceAll(" ", "-")}`;

  return (
    <section
      aria-labelledby={id}
      className="rounded-2xl border border-border bg-card p-4 shadow-card"
    >
      <h2 id={id} className="type-title-md text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function NearbyList({ items }: { items: readonly PlaceNearbyItem[] }) {
  return (
    <ul className="mt-4 divide-y divide-border">
      {items.map((item) => {
        const content = (
          <>
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
              <Image
                src={item.image.src}
                alt={item.image.alt}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="type-label truncate text-foreground">{item.title}</p>
              <p className="type-caption mt-1 text-muted-foreground">
                {item.travelTimeLabel}
              </p>
            </div>
            <span className="type-caption shrink-0 rounded-full border border-border px-2.5 py-1 text-muted-foreground">
              {item.categoryLabel}
            </span>
          </>
        );

        return (
          <li key={item.id}>
            {item.href ? (
              <Link
                href={item.href}
                className="flex min-h-20 items-center gap-3 rounded-lg py-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
              >
                {content}
              </Link>
            ) : (
              <div className="flex min-h-20 items-center gap-3 py-3">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PlaceInformation({ place }: PlaceInformationProps) {
  const { information } = place;

  return (
    <section aria-label={`${place.title} 정보`} className="space-y-3 px-3 py-4">
      <PlaceInformationBasics
        addressLabel={information.addressLabel}
        contactLabel={information.contactLabel}
        homepageUrl={information.homepageUrl}
        facilitySummary={information.facilitySummary}
        parkingLabel={information.parkingLabel}
      />

      <InformationCard title="찾아가는 길">
        <ul className="mt-4 divide-y divide-border">
          {information.transportation.map((item) => {
            const Icon = transportationIcons[item.icon];

            return (
              <li key={item.id} className="grid grid-cols-[2rem_4rem_minmax(0,1fr)] items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary-subtle text-primary">
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <span className="type-label text-foreground">{item.label}</span>
                <span className="type-body-md text-muted-foreground">
                  {item.description}
                </span>
              </li>
            );
          })}
        </ul>
      </InformationCard>

      <InformationCard title="이용 안내">
        <ul className="type-body-md mt-4 list-disc space-y-2 pl-5 text-foreground marker:text-primary">
          {information.usageGuides.map((guide) => (
            <li key={guide} className="pl-1">{guide}</li>
          ))}
        </ul>
      </InformationCard>

      {information.nearbyAttractions?.length ? (
        <InformationCard title="주변 관광지">
          <NearbyList items={information.nearbyAttractions} />
        </InformationCard>
      ) : null}

      {information.nearbyRestaurants?.length ? (
        <InformationCard title="주변 맛집">
          <NearbyList items={information.nearbyRestaurants} />
        </InformationCard>
      ) : null}
    </section>
  );
}

export { PlaceInformation, type PlaceInformationProps };
