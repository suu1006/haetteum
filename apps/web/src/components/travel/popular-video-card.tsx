"use client";

import Link from "next/link";
import {
  EyeIcon,
  HeartIcon,
  MapPinIcon,
  PlayIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { PopularVideoItem } from "@/features/discovery/discovery-model";

type PopularVideoCardProps = {
  video: PopularVideoItem;
  active?: boolean;
  eager?: boolean;
  onNavigate?: (videoId: string) => void;
};

type NavigatorWithConnection = Navigator & {
  connection?: { saveData?: boolean };
};

function shouldDisableAutoplay() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    (navigator as NavigatorWithConnection).connection?.saveData === true
  );
}

function PopularVideoCard({
  video,
  active = false,
  eager = false,
  onNavigate,
}: PopularVideoCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [documentVisible, setDocumentVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState !== "hidden",
  );
  const [shouldReduceMotion, setShouldReduceMotion] = useState(
    shouldDisableAutoplay,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      setShouldReduceMotion(shouldDisableAutoplay());
    };

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);

    return () => {
      mediaQuery.removeEventListener("change", updateMotionPreference);
    };
  }, []);

  useEffect(() => {
    const updateVisibility = () => {
      setDocumentVisible(document.visibilityState !== "hidden");
    };

    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);

    return () => {
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);

  useEffect(() => {
    const media = videoRef.current;
    if (!media) return;

    let cancelled = false;
    const canAutoplay = active && documentVisible && !shouldReduceMotion;

    if (!canAutoplay) {
      media.pause();
      media.currentTime = 0;
      return;
    }

    media.muted = true;
    media.currentTime = 0;
    void media.play().then(
      () => {
        if (!cancelled) setIsPlaying(true);
      },
      () => {
        if (!cancelled) {
          setIsPlaying(false);
          setProgress(0);
        }
      },
    );

    return () => {
      cancelled = true;
      media.pause();
    };
  }, [active, documentVisible, shouldReduceMotion]);

  const showPlaying =
    active && documentVisible && !shouldReduceMotion && isPlaying;

  return (
    <article aria-label={video.title} className="h-full">
      <Card className="relative h-full gap-0 overflow-hidden border-0 py-0">
        <Link
          href={`/reels/${video.id}`}
          scroll={false}
          onClick={() => onNavigate?.(video.id)}
          aria-label={`${video.title} 릴스 보기`}
          className="group relative block aspect-[3/4] overflow-hidden bg-primary-subtle outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/35 active:scale-[0.99]"
        >
          <video
            ref={videoRef}
            src={video.video.src}
            poster={video.video.posterSrc}
            muted
            playsInline
            loop
            preload={active || eager ? "metadata" : "none"}
            aria-hidden="true"
            onPlaying={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(event) => {
              const duration = event.currentTarget.duration;
              setProgress(
                Number.isFinite(duration) && duration > 0
                  ? event.currentTarget.currentTime / duration
                  : 0,
              );
            }}
            onError={() => {
              setIsPlaying(false);
              setProgress(0);
            }}
            className="absolute inset-0 size-full object-cover"
          />
          <span aria-hidden="true" className="absolute inset-0 bg-image-scrim" />
          <Badge className="absolute top-3 left-3 max-[359px]:top-2 max-[359px]:left-2">
            {video.badgeLabel}
          </Badge>
          <span className="type-caption absolute top-3 right-3 max-[359px]:top-10 max-[359px]:right-2 font-semibold text-image-foreground">
            {video.durationLabel}
          </span>
          {!showPlaying ? (
            <span
              aria-label={`${video.title} 영상 미리보기 재생`}
              className="absolute top-1/2 left-1/2 flex size-11 -translate-1/2 items-center justify-center rounded-full bg-black/25 text-image-foreground backdrop-blur-sm transition-transform group-active:scale-95"
            >
              <PlayIcon
                aria-hidden="true"
                className="ml-0.5 size-7 fill-current"
              />
            </span>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 p-3 text-image-foreground">
            <h3 className="type-label line-clamp-2 text-image-foreground">
              {video.title}
            </h3>
            <dl className="type-caption mt-2 flex flex-wrap gap-x-2 gap-y-1 text-image-foreground-muted">
              <dt className="sr-only">조회수</dt>
              <dd className="flex items-center gap-1">
                <EyeIcon aria-hidden="true" className="size-4" />
                {video.viewCountLabel}
              </dd>
              <dt className="sr-only">좋아요</dt>
              <dd className="flex items-center gap-1 max-[359px]:sr-only">
                <HeartIcon aria-hidden="true" className="size-4" />
                {video.likeCountLabel}
              </dd>
              <dt className="sr-only">위치</dt>
              <dd className="flex items-center gap-1 max-[359px]:sr-only">
                <MapPinIcon aria-hidden="true" className="size-4" />
                {video.location}
              </dd>
            </dl>
          </div>
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-0.5 bg-white/20"
          >
            <span
              className="block h-full bg-primary-foreground transition-[width] duration-100 ease-linear"
              style={{
                width: `${showPlaying ? Math.min(Math.max(progress, 0), 1) * 100 : 0}%`,
              }}
            />
          </span>
        </Link>
      </Card>
    </article>
  );
}

export { PopularVideoCard, type PopularVideoCardProps };
