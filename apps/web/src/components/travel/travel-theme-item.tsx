import Image from "next/image";
import { Grid2X2Icon } from "lucide-react";

import type {
  TravelThemeItem as TravelThemeItemData,
} from "@/features/discovery/discovery-model";

type TravelThemeItemProps = {
  theme: TravelThemeItemData;
};

function TravelThemeItem({ theme }: TravelThemeItemProps) {
  return (
    <figure className="w-13 shrink-0 text-center">
      <div className="relative mx-auto size-12 overflow-hidden rounded-full border-2 border-primary bg-primary-subtle p-0.5">
        <Image
          src={theme.image.src}
          alt={theme.image.alt}
          fill
          sizes="48px"
          loading="eager"
          className="rounded-full object-cover p-0.5"
        />
      </div>
      <figcaption className="type-caption mt-1.5 font-medium text-foreground">
        {theme.label}
      </figcaption>
    </figure>
  );
}

function TravelThemeMoreItem() {
  return (
    <figure className="w-13 shrink-0 text-center">
      <div className="mx-auto inline-flex size-12 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-card">
        <Grid2X2Icon aria-hidden="true" className="size-5" />
      </div>
      <figcaption className="type-caption mt-1.5 font-medium text-foreground">
        더보기
      </figcaption>
    </figure>
  );
}

export {
  TravelThemeItem,
  TravelThemeMoreItem,
  type TravelThemeItemProps,
};
