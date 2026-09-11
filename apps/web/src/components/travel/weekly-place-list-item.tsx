import Link from "next/link";
import { CalendarDaysIcon, MapPinIcon } from "lucide-react";

import { FestivalRemoteImage } from "@/components/travel/festival-remote-image";
import type { PlaceListItem } from "@haetteum/contracts";
import { resolveOfficialImageSource } from "@/lib/official-image";

type WeeklyPlaceListItemProps = {
  place: PlaceListItem;
};

function WeeklyPlaceListItem({ place }: WeeklyPlaceListItemProps) {
  return (
    <article aria-label={place.title} className="min-w-0">
      <Link
        href={`/places/${place.id}?tab=introduction`}
        aria-label={place.title}
        className="block h-full rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
      >
        <div className="flex gap-3 rounded-lg bg-card p-2 transition-transform active:translate-y-px">
          <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-md bg-primary-subtle">
            <FestivalRemoteImage
              src={resolveOfficialImageSource(place.primaryImageUrl)}
              alt={`${place.title} 대표 이미지`}
              sizes="80px"
              className="object-cover"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h3 className="type-label break-words text-foreground">
              {place.title}
            </h3>
            <div className="mt-2 space-y-1.5">
              <p className="type-caption flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <CalendarDaysIcon
                  className="size-4 shrink-0"
                  aria-hidden="true"
                />
                <span className="min-w-0 break-words">이번 주 추천</span>
              </p>
              <p className="type-caption flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">{place.address ?? place.district ?? "주소 정보가 없어요."}</span>
              </p>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

export { WeeklyPlaceListItem, type WeeklyPlaceListItemProps };
