import { LocateFixedIcon } from "lucide-react";
import Image from "next/image";

import type { DiscoveryImage } from "@/features/discovery/discovery-model";
import { cn } from "@/lib/utils";

type CourseRouteMapProps = {
  image: DiscoveryImage;
  compact?: boolean;
  showCurrentLocation?: boolean;
};

function CourseRouteMap({
  image,
  compact = false,
  showCurrentLocation = true,
}: CourseRouteMapProps) {
  return (
    <figure
      className={cn(
        "relative w-full overflow-hidden bg-secondary",
        compact ? "aspect-[4/3] rounded-xl" : "aspect-[3/2]",
      )}
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        priority
        sizes={compact ? "128px" : "(max-width: 480px) 100vw, 480px"}
        className="object-cover"
      />
      {showCurrentLocation ? (
        <figcaption className="type-caption absolute right-3 bottom-3 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border/80 bg-card/95 px-3 text-foreground shadow-card backdrop-blur-sm">
          <LocateFixedIcon className="size-4 text-current-location" aria-hidden="true" />
          내 위치
        </figcaption>
      ) : null}
    </figure>
  );
}

export { CourseRouteMap, type CourseRouteMapProps };
