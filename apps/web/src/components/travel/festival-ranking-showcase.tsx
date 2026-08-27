"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDaysIcon, MapPinIcon } from "lucide-react";

import { FestivalRemoteImage } from "@/components/travel/festival-remote-image";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import type { FestivalDiscoveryRankingItem } from "@/features/discovery/discovery-model";
import { cn } from "@/lib/utils";

type FestivalRankingShowcaseProps = {
  festivals: readonly FestivalDiscoveryRankingItem[];
};

type FestivalRankingActiveCardProps = {
  active: boolean;
  festival: FestivalDiscoveryRankingItem;
};

type FestivalRankingMotionState = {
  activeOpacity: number;
  activeScale: number;
  compactOpacity: number;
  compactPlacement: number;
  compactScale: number;
};

const AUTOPLAY_DELAY_MS = 3_000;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getFestivalRankingMotionState(
  distance: number,
  reducedMotion: boolean,
): FestivalRankingMotionState {
  const boundedDistance = clamp(distance, -1, 1);
  const activeProgress = 1 - Math.abs(boundedDistance);

  return {
    activeOpacity: activeProgress,
    activeScale: reducedMotion ? 1 : 0.86 + activeProgress * 0.14,
    compactOpacity: 1 - activeProgress,
    compactPlacement: boundedDistance < 0 ? 75 : 25,
    compactScale: reducedMotion ? 1 : 1 - activeProgress * 0.1,
  };
}

function getCircularDistance(
  index: number,
  selectedIndex: number,
  itemCount: number,
) {
  if (itemCount <= 1) return 0;

  const forwardDistance = (index - selectedIndex + itemCount) % itemCount;
  return forwardDistance <= itemCount / 2
    ? forwardDistance
    : forwardDistance - itemCount;
}

function applyFestivalRankingMotion(
  slide: HTMLElement,
  distance: number,
  reducedMotion: boolean,
) {
  const state = getFestivalRankingMotionState(distance, reducedMotion);
  const activeLayer = slide.querySelector<HTMLElement>(
    '[data-ranking-layer="active"]',
  );
  const compactLayer = slide.querySelector<HTMLElement>(
    '[data-ranking-layer="compact"]',
  );

  if (activeLayer) {
    activeLayer.style.opacity = String(state.activeOpacity);
    activeLayer.style.scale = "none";
    activeLayer.style.transform = `translateX(-50%) scale(${state.activeScale})`;
    activeLayer.style.translate = "none";
  }

  if (compactLayer) {
    compactLayer.style.left = `${state.compactPlacement}%`;
    compactLayer.style.opacity = String(state.compactOpacity);
    compactLayer.style.scale = "none";
    compactLayer.style.transform = `translateX(-50%) scale(${state.compactScale})`;
    compactLayer.style.translate = "none";
  }
}

function FestivalRankingActiveCard({
  active,
  festival,
}: FestivalRankingActiveCardProps) {
  return (
    <div
      aria-hidden={!active}
      data-ranking-layer="active"
      className={cn(
        "absolute inset-y-0 left-1/2 z-10 w-[96%] -translate-x-1/2 will-change-[opacity,transform] motion-reduce:will-change-[opacity]",
        active
          ? "pointer-events-auto scale-100 opacity-100"
          : "pointer-events-none scale-[0.86] opacity-0",
      )}
    >
      <article
        aria-current={active ? "true" : undefined}
        aria-label={`${festival.rank}위 ${festival.title}`}
        className="relative h-[14.125rem] overflow-hidden rounded-[1.125rem] bg-primary text-image-foreground shadow-floating"
      >
        <FestivalRemoteImage
          src={festival.image.src}
          alt={festival.image.alt}
          sizes="(max-width: 407px) 48vw, 196px"
          loading="eager"
          draggable={false}
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_top,oklch(0.31_0.17_294/0.98)_0%,oklch(0.33_0.17_294/0.86)_30%,transparent_66%)]"
        />

        <div className="absolute inset-x-0 bottom-0 px-3 pb-2.5">
          <p className="text-[2.8rem] leading-none font-bold tracking-[-0.08em]">
            {festival.rank}
          </p>
          <h2 className="mt-0.5 truncate text-[0.98rem] leading-5 font-semibold tracking-[-0.025em]">
            {festival.title}
          </h2>
          <p className="mt-1 flex items-center gap-1 truncate text-[0.68rem] leading-4 text-white/88">
            <MapPinIcon aria-hidden="true" className="size-3" />
            {festival.location}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 whitespace-nowrap text-[0.65rem] leading-4 text-white/88">
            <span className="rounded-full bg-white/18 px-2 py-0.5 font-semibold text-white backdrop-blur-sm">
              {festival.statusLabel}
            </span>
            <span aria-hidden="true">/</span>
            <span>{festival.categoryLabel}</span>
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[0.65rem] leading-4 text-white/88">
            <CalendarDaysIcon aria-hidden="true" className="size-3" />
            {festival.dateLabel}
          </p>
        </div>
      </article>
    </div>
  );
}

type FestivalRankingCompactCardProps = {
  active: boolean;
  festival: FestivalDiscoveryRankingItem;
  onSelect: () => void;
  placement: "previous" | "next";
};

function FestivalRankingCompactCard({
  active,
  festival,
  onSelect,
  placement,
}: FestivalRankingCompactCardProps) {
  return (
    <div
      aria-hidden={active}
      data-ranking-layer="compact"
      className={cn(
        "absolute top-[1.125rem] w-1/2 -translate-x-1/2 will-change-[opacity,transform] motion-reduce:will-change-[opacity]",
        placement === "previous" ? "left-3/4" : "left-1/4",
        active
          ? "pointer-events-none scale-90 opacity-0"
          : "pointer-events-auto scale-100 opacity-100",
      )}
    >
      <button
        type="button"
        aria-label={`${festival.rank}위 ${festival.title} 선택`}
        tabIndex={active ? -1 : 0}
        onClick={onSelect}
        className="block w-full text-left outline-none focus-visible:rounded-xl focus-visible:ring-3 focus-visible:ring-primary/45"
      >
        <span className="relative block h-[7.9rem] overflow-hidden rounded-xl bg-primary-subtle">
          <FestivalRemoteImage
            src={festival.image.src}
            alt={festival.image.alt}
            sizes="(max-width: 407px) 25vw, 102px"
            loading="eager"
            draggable={false}
            className="object-cover"
          />
          <span className="absolute bottom-0.5 left-1.5 text-[2.9rem] leading-none font-bold tracking-[-0.08em] text-white drop-shadow-sm">
            {festival.rank}
          </span>
        </span>
        <span className="mt-1.5 block truncate text-[0.7rem] leading-4 font-semibold tracking-[-0.02em] text-foreground">
          {festival.title}
        </span>
        <span className="mt-0.5 flex items-center gap-0.5 truncate text-[0.58rem] leading-3 text-muted-foreground">
          <MapPinIcon aria-hidden="true" className="size-2.5 shrink-0" />
          {festival.location}
        </span>
        <span className="mt-1 flex items-center gap-1 whitespace-nowrap text-[0.58rem] leading-3 text-muted-foreground">
          <CalendarDaysIcon aria-hidden="true" className="size-2.5 text-primary" />
          {festival.dateLabel}
        </span>
      </button>
    </div>
  );
}

function FestivalRankingShowcase({
  festivals,
}: FestivalRankingShowcaseProps) {
  const initialIndex = Math.max(
    festivals.findIndex((festival) => festival.rank === 1),
    0,
  );
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  const updateRankingMotion = useCallback(
    (carouselApi: NonNullable<CarouselApi>, reducedMotion: boolean) => {
      const slides = carouselApi.slideNodes();
      const scrollSnaps = carouselApi.scrollSnapList();
      const uniqueScrollSnaps = new Set(scrollSnaps).size;

      if (
        scrollSnaps.length !== festivals.length ||
        uniqueScrollSnaps !== festivals.length
      ) {
        const currentIndex = carouselApi.selectedScrollSnap();
        slides.forEach((slide, index) => {
          applyFestivalRankingMotion(
            slide,
            getCircularDistance(index, currentIndex, festivals.length),
            reducedMotion,
          );
        });
        return;
      }

      const normalizedProgress =
        ((carouselApi.scrollProgress() % 1) + 1) % 1;

      scrollSnaps.forEach((snap, index) => {
        let snapDistance = snap - normalizedProgress;
        if (snapDistance > 0.5) snapDistance -= 1;
        if (snapDistance < -0.5) snapDistance += 1;

        const slide = slides[index];
        if (slide) {
          applyFestivalRankingMotion(
            slide,
            snapDistance * scrollSnaps.length,
            reducedMotion,
          );
        }
      });
    },
    [festivals.length],
  );

  useEffect(() => {
    if (!api) return;

    const reducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const updateMotion = () =>
      updateRankingMotion(api, reducedMotionQuery.matches);
    const updateSelection = () => {
      setSelectedIndex(api.selectedScrollSnap());
      updateMotion();
    };

    updateSelection();
    api.on("scroll", updateMotion);
    api.on("settle", updateMotion);
    api.on("select", updateSelection);
    api.on("reInit", updateSelection);
    reducedMotionQuery.addEventListener("change", updateMotion);

    return () => {
      api.off("scroll", updateMotion);
      api.off("settle", updateMotion);
      api.off("select", updateSelection);
      api.off("reInit", updateSelection);
      reducedMotionQuery.removeEventListener("change", updateMotion);
    };
  }, [api, updateRankingMotion]);

  useEffect(() => {
    if (!api || festivals.length <= 1) return;

    let autoplayTimer: ReturnType<typeof setTimeout> | undefined;
    let pointerIsDown = false;

    const stopAutoplay = () => {
      if (autoplayTimer !== undefined) {
        clearTimeout(autoplayTimer);
        autoplayTimer = undefined;
      }
    };
    const startAutoplay = () => {
      stopAutoplay();
      autoplayTimer = setTimeout(() => {
        api.scrollNext();
      }, AUTOPLAY_DELAY_MS);
    };
    const handlePointerDown = () => {
      pointerIsDown = true;
      stopAutoplay();
    };
    const handlePointerUp = () => {
      pointerIsDown = false;
      startAutoplay();
    };
    const handleSelect = () => {
      if (!pointerIsDown) startAutoplay();
    };

    startAutoplay();
    api.on("pointerDown", handlePointerDown);
    api.on("pointerUp", handlePointerUp);
    api.on("select", handleSelect);

    return () => {
      stopAutoplay();
      api.off("pointerDown", handlePointerDown);
      api.off("pointerUp", handlePointerUp);
      api.off("select", handleSelect);
    };
  }, [api, festivals.length]);

  function selectFestival(index: number) {
    setSelectedIndex(index);
    api?.scrollTo(index);
  }

  if (festivals.length === 0) {
    return <ol aria-label="지금 만날 수 있는 축제 순위" />;
  }

  const selectedFestival = festivals[selectedIndex] ?? festivals[initialIndex];

  return (
    <Carousel
      aria-label="지금 만날 수 있는 축제 순위"
      opts={{
        align: "center",
        containScroll: false,
        duration: 34,
        loop: festivals.length > 1,
        startIndex: initialIndex,
      }}
      setApi={setApi}
      className="outline-none"
    >
      <CarouselContent
        role="list"
        aria-label="지금 만날 수 있는 축제 순위"
        className="-ml-0 select-none touch-pan-y cursor-grab active:cursor-grabbing"
      >
        {festivals.map((festival, index) => {
          const active = index === selectedIndex;
          const relativeIndex =
            (index - selectedIndex + festivals.length) % festivals.length;

          return (
            <CarouselItem
              key={festival.id}
              role="listitem"
              aria-current={active ? "true" : undefined}
              className={cn(
                "basis-1/2 pl-0",
                active ? "z-10" : "z-0",
              )}
            >
              <div className="relative h-[14.125rem]">
                <FestivalRankingActiveCard
                  active={active}
                  festival={festival}
                />
                <FestivalRankingCompactCard
                  active={active}
                  festival={festival}
                  onSelect={() => selectFestival(index)}
                  placement={relativeIndex === 1 ? "next" : "previous"}
                />
              </div>
            </CarouselItem>
          );
        })}
      </CarouselContent>
      <p aria-live="polite" className="sr-only">
        {selectedFestival.rank}위 {selectedFestival.title}
      </p>
    </Carousel>
  );
}

export {
  FestivalRankingShowcase,
  type FestivalRankingShowcaseProps,
};
