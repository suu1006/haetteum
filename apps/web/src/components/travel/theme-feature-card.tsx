import Image from "next/image";
import { ArrowRightIcon } from "lucide-react";
import type { ReactNode } from "react";

import type { ThemeFeature } from "@/features/themes/theme-travel-model";
import { cn } from "@/lib/utils";

type ThemeFeatureCardProps = {
  feature: ThemeFeature;
  icon: ReactNode;
  onSelect: (theme: ThemeFeature["id"]) => void;
  eager?: boolean;
};

const themeIconClasses: Record<ThemeFeature["id"], string> = {
  healing: "text-theme-healing",
  food: "text-theme-food",
  culture: "text-theme-culture",
  activity: "text-theme-activity",
};

function ThemeFeatureCard({
  feature,
  icon,
  onSelect,
  eager = false,
}: ThemeFeatureCardProps) {
  return (
    <article aria-label={feature.title}>
      <button
        type="button"
        onClick={() => onSelect(feature.id)}
        className="group relative block aspect-[3/5] w-full overflow-hidden rounded-xl text-left text-image-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
      >
        <Image
          src={feature.image.src}
          alt={feature.image.alt}
          fill
          sizes="136px"
          loading={eager ? "eager" : "lazy"}
          className="object-cover transition-transform duration-300 group-hover:scale-[1.02] group-active:scale-100 motion-reduce:transition-none"
        />
        <span className="absolute inset-0 bg-image-scrim/80" aria-hidden="true" />

        <span
          className={cn(
            "absolute top-3 left-3 inline-flex size-11 items-center justify-center rounded-full bg-card/90 shadow-card [&_svg]:size-5",
            themeIconClasses[feature.id],
          )}
          aria-hidden="true"
        >
          {icon}
        </span>

        <span className="absolute inset-x-3 bottom-3 flex flex-col">
          <strong className="type-label font-semibold text-image-foreground">
            {feature.title}
          </strong>
          <span className="type-caption mt-1 whitespace-pre-line text-image-foreground-muted">
            {feature.description}
          </span>
          <span className="mt-2 flex items-center justify-between gap-1.5">
            <span className="type-caption font-semibold text-image-foreground">
              {feature.courseCount}개 코스
            </span>
            <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-card text-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none">
              <ArrowRightIcon className="size-3.5" aria-hidden="true" />
            </span>
          </span>
        </span>
      </button>
    </article>
  );
}

export { ThemeFeatureCard, type ThemeFeatureCardProps };
