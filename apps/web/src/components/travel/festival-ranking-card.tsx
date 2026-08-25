import Image from "next/image";
import Link from "next/link";
import { MapPinIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FestivalItem } from "@/features/discovery/discovery-model";

type FestivalRankingCardProps = {
  festival: FestivalItem;
  href: string;
};

function FestivalRankingCard({ festival, href }: FestivalRankingCardProps) {
  const rankLabel = `${festival.rank}위`;
  const statusLabel = festival.status === "ongoing" ? "진행 중" : "예정";

  return (
    <article
      aria-label={`${rankLabel} ${festival.title}`}
      className="w-[9.75rem] shrink-0 snap-start"
    >
      <Link
        href={href}
        aria-label={`${rankLabel} ${festival.title}`}
        className="block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
      >
        <Card className="h-full gap-0 py-0 transition-transform active:translate-y-px">
          <div className="relative aspect-[4/5] overflow-hidden bg-primary-subtle">
            <Image
              src={festival.image.src}
              alt={festival.image.alt}
              fill
              sizes="156px"
              loading={festival.rank === 1 ? "eager" : "lazy"}
              className="object-cover"
            />
            <Badge className="absolute top-2 left-2 shadow-card">
              {rankLabel}
            </Badge>
            <Badge
              variant="secondary"
              className="absolute top-2 right-2 bg-primary-subtle text-primary shadow-card"
            >
              {statusLabel}
            </Badge>
          </div>

          <CardHeader className="min-w-0 pt-3">
            <CardTitle className="type-label line-clamp-2 break-keep">
              {festival.title}
            </CardTitle>
          </CardHeader>

          <CardContent className="mt-2 space-y-2 pb-3">
            <div className="space-y-1">
              <p className="type-caption text-muted-foreground">
                {festival.dateLabel}
              </p>
              <p className="type-caption flex min-w-0 items-start gap-1 text-muted-foreground">
                <MapPinIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                <span className="line-clamp-1">{festival.location}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-1">
              {festival.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="outline" className="font-normal">
                  {tag}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </Link>
    </article>
  );
}

export { FestivalRankingCard, type FestivalRankingCardProps };
