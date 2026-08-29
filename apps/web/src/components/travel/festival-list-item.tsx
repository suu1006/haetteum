import Link from "next/link";
import { CalendarDaysIcon, MapPinIcon } from "lucide-react";

import { FestivalRemoteImage } from "@/components/travel/festival-remote-image";
import type { FestivalDiscoveryListItem } from "@/features/discovery/discovery-model";

type FestivalListItemProps = {
  festival: FestivalDiscoveryListItem;
  href: string;
};

function FestivalListItem({ festival, href }: FestivalListItemProps) {
  return (
    <article aria-label={festival.title} className="min-w-0">
      <Link
        href={href}
        aria-label={festival.title}
        className="block h-full rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
      >
        <div className="flex gap-3 rounded-lg bg-card p-2 transition-transform active:translate-y-px">
          <div className="relative aspect-square w-20 shrink-0 overflow-hidden rounded-md bg-primary-subtle">
            <FestivalRemoteImage
              src={festival.image.src}
              alt={festival.image.alt}
              sizes="80px"
              className="object-cover"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            <h3 className="type-label break-words text-foreground">
              {festival.title}
            </h3>
            <div className="mt-2 space-y-1.5">
              <p className="type-caption flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <CalendarDaysIcon
                  className="size-4 shrink-0"
                  aria-hidden="true"
                />
                <span className="min-w-0 break-words">{festival.dateLabel}</span>
              </p>
              <p className="type-caption flex min-w-0 items-center gap-1.5 text-muted-foreground">
                <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">{festival.location}</span>
              </p>
            </div>
          </div>
        </div>
      </Link>
    </article>
  );
}

export { FestivalListItem, type FestivalListItemProps };
