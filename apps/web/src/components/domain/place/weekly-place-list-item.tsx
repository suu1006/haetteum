"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarDaysIcon, MapPinIcon } from "lucide-react";

import { FestivalRemoteImage } from "@/components/domain/festival/festival-remote-image";
import type { WeeklyPlaceItem } from "@haetteum/contracts";
import { resolveWeeklyThumbnail } from "@/lib/weekly-thumbnail";

type WeeklyPlaceListItemProps = {
  place: WeeklyPlaceItem;
  priority?: boolean;
};

function WeeklyPlaceListItem({ place, priority = false }: WeeklyPlaceListItemProps) {
  const cardRef = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(priority);
  useEffect(() => {
    if (visible) return;
    const node = cardRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "200px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <article ref={cardRef} aria-label={place.title} className="h-full min-w-0">
      <Link
        href={`/places/${place.id}?tab=introduction`}
        prefetch={false}
        className="block h-full rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
      >
        <div className="flex h-full flex-col overflow-hidden rounded-lg bg-card transition-transform active:translate-y-px">
          <div className="relative aspect-square w-full shrink-0 overflow-hidden bg-primary-subtle">
            <FestivalRemoteImage
              src={visible ? resolveWeeklyThumbnail(place.primaryImageUrl) : null}
              alt={`${place.title} 대표 이미지`}
              sizes="(max-width: 480px) 50vw, 240px"
              unoptimized
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              className="object-cover"
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col p-3">
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
