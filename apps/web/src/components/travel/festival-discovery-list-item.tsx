import Link from "next/link";
import { MapPinIcon } from "lucide-react";

import { FestivalRemoteImage } from "@/components/travel/festival-remote-image";
import type { FestivalDiscoveryListItem as FestivalDiscoveryListItemData } from "@/features/discovery/discovery-model";
import { buildFestivalDetailHref } from "@/features/festivals/festival-detail-model";
import { cn } from "@/lib/utils";

type FestivalDiscoveryListItemProps = {
  festival: FestivalDiscoveryListItemData;
  eager?: boolean;
  highPriority?: boolean;
};

function FestivalDiscoveryListItem({
  festival,
  eager = false,
  highPriority = false,
}: FestivalDiscoveryListItemProps) {
  return (
    <article aria-label={festival.title} className="h-full">
      <Link
        href={buildFestivalDetailHref(festival.id)}
        className="block h-full overflow-hidden rounded-xl border border-border/70 bg-card shadow-card outline-none transition-transform active:translate-y-px focus-visible:ring-3 focus-visible:ring-ring/25"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-primary-subtle">
          <FestivalRemoteImage
            src={festival.image.src}
            alt={festival.image.alt}
            sizes="(max-width: 480px) calc((100vw - 3.5rem) / 2), 210px"
            loading={eager ? "eager" : "lazy"}
            fetchPriority={highPriority ? "high" : "auto"}
            className="object-cover"
          />
          <span
            className={cn(
              "absolute top-2 left-2 rounded-md px-2.5 py-1 text-[0.65rem] leading-4 font-semibold shadow-sm",
              festival.status === "ongoing"
                ? "bg-primary text-primary-foreground"
                : "bg-card/92 text-primary backdrop-blur-sm",
            )}
          >
            {festival.statusLabel}
          </span>
        </div>

        <div className="flex min-w-0 flex-col px-3 py-2.5">
          <h3 className="line-clamp-2 text-[0.82rem] leading-[1.15rem] font-semibold tracking-[-0.025em] text-foreground">
            {festival.title}
          </h3>
          <p className="mt-2 text-[0.65rem] leading-4 tracking-[-0.025em] whitespace-nowrap text-muted-foreground">
            {festival.dateLabel}
          </p>
          <p className="mt-1 flex min-w-0 items-center gap-1 text-[0.68rem] leading-4 text-muted-foreground">
            <MapPinIcon aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">{festival.location}</span>
          </p>
          <p className="mt-1.5 w-fit rounded-full bg-primary-subtle px-2 py-0.5 text-[0.62rem] leading-4 font-medium text-primary">
            {festival.categoryLabel}
          </p>
        </div>
      </Link>
    </article>
  );
}

export {
  FestivalDiscoveryListItem,
  type FestivalDiscoveryListItemProps,
};
