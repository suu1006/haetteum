"use client";

import { useEffect, useRef, useState } from "react";

import { PopularVideoCard } from "@/components/travel/popular-video-card";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import type { PopularVideoItem } from "@/features/discovery/discovery-model";

type PopularVideoRailProps = {
  videos: readonly PopularVideoItem[];
};

type ReturnSnapshot = {
  href: string;
  scrollY: number;
  selectedVideoId: string;
};

const returnSnapshotKey = "haetteum:popular-reels:return";

function PopularVideoRail({ videos }: PopularVideoRailProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isInViewport, setIsInViewport] = useState(true);

  useEffect(() => {
    if (!api) return;

    const updateSelection = () => {
      setSelectedIndex(api.selectedScrollSnap());
    };

    updateSelection();
    api.on("select", updateSelection);
    api.on("reInit", updateSelection);

    return () => {
      api.off("select", updateSelection);
      api.off("reInit", updateSelection);
    };
  }, [api]);

  useEffect(() => {
    if (!api) return;

    try {
      const rawSnapshot = window.sessionStorage.getItem(returnSnapshotKey);
      if (!rawSnapshot) return;

      const snapshot = JSON.parse(rawSnapshot) as Partial<ReturnSnapshot>;
      const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (
        snapshot.href !== currentHref ||
        typeof snapshot.scrollY !== "number" ||
        typeof snapshot.selectedVideoId !== "string"
      ) {
        return;
      }

      const restoredIndex = videos.findIndex(
        (video) => video.id === snapshot.selectedVideoId,
      );
      if (restoredIndex < 0) return;

      window.sessionStorage.removeItem(returnSnapshotKey);
      api.scrollTo(restoredIndex, true);
      window.requestAnimationFrame(() => {
        window.scrollTo(0, snapshot.scrollY as number);
      });
    } catch {
      // Invalid or unavailable storage must not block the carousel.
    }
  }, [api, videos]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry?.isIntersecting === true);
      },
      { threshold: 0.2 },
    );
    observer.observe(root);

    return () => observer.disconnect();
  }, []);

  const rememberReturnPosition = (selectedVideoId: string) => {
    try {
      const href = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      window.sessionStorage.setItem(
        returnSnapshotKey,
        JSON.stringify({
          href,
          scrollY: window.scrollY,
          selectedVideoId,
        }),
      );
    } catch {
      // Navigation remains available when storage is unavailable.
    }
  };

  return (
    <div ref={rootRef}>
      <Carousel
        aria-label="인기 숏폼 관광지 목록"
        opts={{ align: "start", containScroll: "trimSnaps" }}
        setApi={setApi}
        className="mt-2.5"
      >
        <CarouselContent role="list" className="-ml-3">
          {videos.map((video, index) => (
            <CarouselItem
              key={video.id}
              role="listitem"
              className="basis-[46%] pl-3"
            >
              <PopularVideoCard
                video={video}
                active={isInViewport && selectedIndex === index}
                eager={index === 0}
                onNavigate={rememberReturnPosition}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}

export { PopularVideoRail, returnSnapshotKey, type PopularVideoRailProps };
