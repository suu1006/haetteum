import {
  BikeIcon,
  CameraIcon,
  CoffeeIcon,
  SunriseIcon,
  type LucideIcon,
} from "lucide-react";

import { ThemeFeatureCard } from "@/components/travel/theme-feature-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import type { ThemeFeature } from "@/features/themes/theme-travel-model";

type ThemeFeatureCarouselProps = {
  features: readonly ThemeFeature[];
  onThemeSelect: (theme: ThemeFeature["id"]) => void;
};

const themeIcons: Record<ThemeFeature["id"], LucideIcon> = {
  healing: SunriseIcon,
  food: CoffeeIcon,
  culture: CameraIcon,
  activity: BikeIcon,
};

function ThemeFeatureCarousel({
  features,
  onThemeSelect,
}: ThemeFeatureCarouselProps) {
  return (
    <Carousel
      aria-label="여행 테마 카드"
      opts={{ align: "start", containScroll: "trimSnaps" }}
    >
      <CarouselContent role="list" className="-ml-3">
        {features.map((feature, index) => {
          const Icon = themeIcons[feature.id];

          return (
            <CarouselItem
              key={feature.id}
              role="listitem"
              className="basis-[8.5rem] pl-3"
            >
              <ThemeFeatureCard
                feature={feature}
                icon={<Icon aria-hidden="true" />}
                onSelect={onThemeSelect}
                eager={index === 0}
              />
            </CarouselItem>
          );
        })}
      </CarouselContent>
    </Carousel>
  );
}

export { ThemeFeatureCarousel, type ThemeFeatureCarouselProps };
