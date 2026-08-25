"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  HeartIcon,
  MapPinIcon,
  MessageCircleIcon,
  MoreHorizontalIcon,
  Music2Icon,
  PlayIcon,
  SendIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { PopularVideoItem } from "@/features/discovery/discovery-model";

type ReelsViewerProps = {
  videos: readonly PopularVideoItem[];
  returnHref: string;
};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function ReelsViewer({ videos, returnHref }: ReelsViewerProps) {
  const router = useRouter();
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [documentVisible, setDocumentVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState !== "hidden",
  );
  const [shouldReduceMotion, setShouldReduceMotion] = useState(
    prefersReducedMotion,
  );
  const [manualPaused, setManualPaused] = useState(false);
  const [mutedVideoIds, setMutedVideoIds] = useState(
    () => new Set(videos.map((video) => video.id)),
  );
  const [likedVideoIds, setLikedVideoIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [shareStatus, setShareStatus] = useState("");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => {
      setShouldReduceMotion(mediaQuery.matches);
    };

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    const updateVisibility = () => {
      setDocumentVisible(document.visibilityState !== "hidden");
    };

    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (!mostVisible) return;
        const nextIndex = Number(
          (mostVisible.target as HTMLElement).dataset.reelIndex,
        );
        if (!Number.isInteger(nextIndex)) return;
        setActiveIndex(nextIndex);
        setManualPaused(false);
      },
      { threshold: [0.6, 0.8] },
    );

    for (const slide of slideRefs.current) {
      if (slide) observer.observe(slide);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    videoRefs.current.forEach((media, index) => {
      if (!media) return;

      const video = videos[index];
      const shouldPlay =
        index === activeIndex &&
        documentVisible &&
        !shouldReduceMotion &&
        !manualPaused;

      if (!shouldPlay) {
        media.pause();
        if (index !== activeIndex) media.currentTime = 0;
        return;
      }

      media.muted = video ? mutedVideoIds.has(video.id) : true;
      void media.play().catch(() => {
        // The visible poster remains usable when browser autoplay is blocked.
      });
    });
  }, [
    activeIndex,
    documentVisible,
    manualPaused,
    mutedVideoIds,
    shouldReduceMotion,
    videos,
  ]);

  const navigateBack = () => {
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(returnHref);
  };

  const toggleLike = (videoId: string) => {
    setLikedVideoIds((current) => {
      const next = new Set(current);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  };

  const toggleSound = (videoId: string) => {
    setMutedVideoIds((current) => {
      const next = new Set(current);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  };

  const shareVideo = async (video: PopularVideoItem) => {
    const shareData = {
      title: `${video.title} | 해뜸`,
      text: video.description,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus("공유 화면을 열었어요.");
      } else {
        await navigator.clipboard.writeText(shareData.url);
        setShareStatus("링크를 복사했어요.");
      }
    } catch {
      setShareStatus("공유하지 못했어요. 다시 시도해 주세요.");
    }
  };

  const moveToAdjacentSlide = (direction: -1 | 1) => {
    const targetIndex = Math.min(
      Math.max(activeIndex + direction, 0),
      videos.length - 1,
    );
    if (targetIndex === activeIndex) return;

    slideRefs.current[targetIndex]?.scrollIntoView({
      behavior: shouldReduceMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <main
      aria-label="인기 관광지 릴스"
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          moveToAdjacentSlide(1);
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          moveToAdjacentSlide(-1);
        }
      }}
      className="scrollbar-none fixed inset-0 z-50 mx-auto h-dvh w-full max-w-[30rem] snap-y snap-mandatory overflow-y-auto overscroll-y-contain bg-black text-white"
    >
      <button
        type="button"
        onClick={navigateBack}
        aria-label="인기 관광지로 돌아가기"
        className="safe-area-top fixed top-3 left-[max(0.75rem,calc((100vw-30rem)/2+0.75rem))] z-30 flex size-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md outline-none transition-transform active:scale-95 focus-visible:ring-3 focus-visible:ring-white/65"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-6" />
      </button>

      {videos.map((video, index) => {
        const liked = likedVideoIds.has(video.id);
        const muted = mutedVideoIds.has(video.id);
        const isActive = activeIndex === index;

        return (
          <section
            key={video.id}
            ref={(node) => {
              slideRefs.current[index] = node;
            }}
            role="group"
            aria-label={`${video.title} 릴스 ${index + 1} / ${videos.length}`}
            data-reel-index={index}
            data-active={isActive ? "true" : "false"}
            className="relative h-dvh snap-start snap-always overflow-hidden bg-black"
          >
            <button
              type="button"
              aria-label={`${video.title} ${manualPaused && isActive ? "재생" : "일시정지"}`}
              onClick={() => {
                if (isActive) setManualPaused((current) => !current);
              }}
              className="absolute inset-0 z-0 size-full outline-none focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-white/60"
            >
              <video
                ref={(node) => {
                  videoRefs.current[index] = node;
                }}
                src={video.video.src}
                poster={video.video.posterSrc}
                muted={muted}
                playsInline
                loop
                preload={index <= activeIndex + 1 ? "metadata" : "none"}
                aria-hidden="true"
                className="size-full object-cover"
              />
              <span aria-hidden="true" className="absolute inset-0 bg-black/20" />
              {manualPaused && isActive ? (
                <span className="absolute top-1/2 left-1/2 flex size-16 -translate-1/2 items-center justify-center rounded-full bg-black/35 backdrop-blur-md">
                  <PlayIcon aria-hidden="true" className="ml-1 size-9 fill-current" />
                </span>
              ) : null}
            </button>

            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-5 pt-[max(4.5rem,var(--safe-area-top))] text-white">
              <p className="type-label flex items-center gap-1.5">
                <MapPinIcon aria-hidden="true" className="size-4" />
                {video.location}
              </p>
              <p className="mt-1 text-[0.6875rem] leading-4 text-white/80">
                {video.address}
              </p>
            </div>

            <aside
              aria-label={`${video.title} 반응`}
              className="absolute right-3 bottom-[calc(7.5rem+var(--safe-area-bottom))] z-20 flex w-14 flex-col items-center gap-3 text-white"
            >
              <button
                type="button"
                aria-label={`${video.title} 좋아요 ${video.likeCountLabel}`}
                aria-pressed={liked}
                onClick={() => toggleLike(video.id)}
                className="flex min-h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full outline-none transition-transform active:scale-90 focus-visible:bg-black/20 focus-visible:ring-3 focus-visible:ring-white/65"
              >
                <HeartIcon
                  aria-hidden="true"
                  className={`size-7 ${liked ? "fill-white" : ""}`}
                />
                <span className="text-[0.6875rem] leading-3">
                  {video.likeCountLabel}
                </span>
              </button>
              <span
                aria-label={`${video.title} 댓글 ${video.commentCountLabel}, 준비 중`}
                className="flex min-h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full"
              >
                <MessageCircleIcon aria-hidden="true" className="size-7" />
                <span className="text-[0.6875rem] leading-3">
                  {video.commentCountLabel}
                </span>
                <span className="sr-only">준비 중</span>
              </span>
              <button
                type="button"
                aria-label={`${video.title} 공유 ${video.shareCountLabel}`}
                onClick={() => void shareVideo(video)}
                className="flex min-h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-full outline-none transition-transform active:scale-90 focus-visible:bg-black/20 focus-visible:ring-3 focus-visible:ring-white/65"
              >
                <SendIcon aria-hidden="true" className="size-7" />
                <span className="text-[0.6875rem] leading-3">
                  {video.shareCountLabel}
                </span>
              </button>
              <span
                aria-label={`${video.title} 더보기, 준비 중`}
                className="flex size-11 items-center justify-center rounded-full bg-black/20"
              >
                <MoreHorizontalIcon aria-hidden="true" className="size-7" />
                <span className="sr-only">준비 중</span>
              </span>
            </aside>

            <div className="safe-area-bottom absolute inset-x-0 bottom-0 z-10 bg-black/35 px-5 pt-5 pr-20 pb-5 text-white backdrop-blur-[2px]">
              <div className="flex items-center gap-2.5">
                <span className="relative size-9 shrink-0 overflow-hidden rounded-full border border-white/60">
                  <Image
                    src={video.image.src}
                    alt=""
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </span>
                <h1 className="type-label min-w-0 truncate text-white">
                  {video.title}
                </h1>
                <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[0.625rem] font-semibold text-primary-foreground">
                  {video.badgeLabel}
                </span>
              </div>
              <p className="mt-3 line-clamp-2 text-[0.75rem] leading-5 text-white/90">
                {video.description}
              </p>
              <div className="mt-3 flex min-h-8 items-center gap-2 text-[0.6875rem] text-white/85">
                <Music2Icon aria-hidden="true" className="size-4" />
                <span>{video.soundLabel}</span>
                {video.video.hasAudio ? (
                  <button
                    type="button"
                    aria-label={muted ? "소리 켜기" : "소리 끄기"}
                    aria-pressed={!muted}
                    onClick={() => toggleSound(video.id)}
                    className="ml-auto flex size-11 items-center justify-center rounded-full bg-black/25 outline-none focus-visible:ring-3 focus-visible:ring-white/65"
                  >
                    {muted ? (
                      <VolumeXIcon aria-hidden="true" className="size-5" />
                    ) : (
                      <Volume2Icon aria-hidden="true" className="size-5" />
                    )}
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        );
      })}

      <p role="status" aria-live="polite" className="sr-only">
        {shareStatus}
      </p>
    </main>
  );
}

export { ReelsViewer, type ReelsViewerProps };
