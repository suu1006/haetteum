import Image from "next/image";
import Link from "next/link";

import type { ExploreDestination } from "@/features/explore/explore-model";
import { cn } from "@/lib/utils";

type ExploreDestinationCardProps = {
  destination: ExploreDestination;
  variant: "trending" | "regional";
};

function ExploreDestinationCard({
  destination,
  variant,
}: ExploreDestinationCardProps) {
  const rankLabel = destination.rank ? `${destination.rank}위 ` : "";

  return (
    <article aria-label={`${rankLabel}${destination.title}`} className="min-w-0">
      <Link
        href={destination.href}
        className="group grid min-h-11 gap-2 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-xl bg-muted",
            variant === "trending" ? "aspect-[4/3]" : "aspect-square",
          )}
        >
          <Image
            src={destination.image.src}
            alt={destination.image.alt}
            fill
            loading="eager"
            sizes="(max-width: 480px) 29vw, 136px"
            className="object-cover transition-transform duration-180 group-hover:scale-[1.025]"
          />
          {destination.rank ? (
            <span className="type-label absolute top-1 left-1 inline-flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-card">
              {destination.rank}
            </span>
          ) : null}
        </div>

        <div className="min-w-0">
          <h3 className="type-label truncate text-foreground">
            {destination.title}
          </h3>
          {destination.location ? (
            <p className="type-caption mt-0.5 truncate text-muted-foreground">
              {destination.location}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}

export { ExploreDestinationCard, type ExploreDestinationCardProps };
