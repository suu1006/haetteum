import Image from "next/image";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { FestivalFeature } from "@/features/discovery/discovery-model";

type FestivalFeatureBannerProps = {
  feature: FestivalFeature;
};

function FestivalFeatureBanner({ feature }: FestivalFeatureBannerProps) {
  return (
    <Card className="relative min-h-44 flex-row gap-0 bg-primary-subtle py-0">
      <CardContent className="relative z-10 flex min-h-44 w-[62%] flex-col justify-center gap-2 py-4 pr-0">
        <p className="type-label text-primary">{feature.eyebrow}</p>
        <div className="space-y-1">
          <h2 className="type-title-md break-keep text-foreground">
            {feature.title}
          </h2>
          <p className="type-caption line-clamp-2 text-muted-foreground">
            {feature.description}
          </p>
        </div>
        <p className="type-caption text-foreground">{feature.dateLabel}</p>
        <div className="flex flex-wrap gap-1">
          {feature.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="bg-card/85 font-normal">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>

      <div className="absolute inset-y-0 right-0 w-[42%] overflow-hidden">
        <Image
          src={feature.image.src}
          alt={feature.image.alt}
          fill
          sizes="(max-width: 480px) 42vw, 202px"
          className="object-cover object-center"
        />
      </div>
    </Card>
  );
}

export { FestivalFeatureBanner, type FestivalFeatureBannerProps };
