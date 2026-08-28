"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftIcon, MapPinIcon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type ReelViewerItem = {
  videoId: string;
  title: string;
  channelTitle: string;
  embedUrl: string;
  placeId?: string;
  placeTitle?: string;
  region?: string;
};

type YouTubeReelsViewerProps = {
  items: readonly ReelViewerItem[];
  returnHref: string;
};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function postCommand(
  frame: HTMLIFrameElement | null,
  func: "playVideo" | "pauseVideo" | "mute" | "unMute",
) {
  frame?.contentWindow?.postMessage(
    JSON.stringify({ event: "command", func, args: [] }),
    "*",
  );
}

function embedSrc(embedUrl: string): string {
  const url = new URL(embedUrl);
  url.searchParams.set("enablejsapi", "1");
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("rel", "0");
  url.searchParams.set("modestbranding", "1");
  url.searchParams.set("loop", "1");
  url.searchParams.set("mute", "1");
  if (typeof window !== "undefined") {
    url.searchParams.set("origin", window.location.origin);
  }
  return url.href;
}

function YouTubeReelsViewer({ items, returnHref }: YouTubeReelsViewerProps) {
  const router = useRouter();
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const frameRefs = useRef<Array<HTMLIFrameElement | null>>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(prefersReducedMotion);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (left, right) => right.intersectionRatio - left.intersectionRatio,
          )[0];
        if (!mostVisible) return;
        const nextIndex = Number(
          (mostVisible.target as HTMLElement).dataset.reelIndex,
        );
        if (Number.isInteger(nextIndex)) setActiveIndex(nextIndex);
      },
      { threshold: [0.6, 0.9] },
    );
    for (const slide of slideRefs.current) {
      if (slide) observer.observe(slide);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    frameRefs.current.forEach((frame, index) => {
      if (index === activeIndex && !reduceMotion) {
        postCommand(frame, "playVideo");
        postCommand(frame, muted ? "mute" : "unMute");
      } else {
        postCommand(frame, "pauseVideo");
      }
    });
  }, [activeIndex, muted, reduceMotion]);

  const navigateBack = () => {
    if (window.history.length > 1) router.back();
    else router.push(returnHref);
  };

  return (
    <main
      aria-label="인기 관광지 릴스"
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

      {items.map((reel, index) => (
        <section
          key={`${reel.placeId ?? "reel"}-${reel.videoId}`}
          ref={(node) => {
            slideRefs.current[index] = node;
          }}
          role="group"
          aria-label={`${reel.placeTitle ?? reel.title} 릴스 ${index + 1} / ${items.length}`}
          data-reel-index={index}
          data-active={activeIndex === index ? "true" : "false"}
          className="relative flex h-dvh snap-start snap-always items-center justify-center overflow-hidden bg-black"
        >
          <iframe
            ref={(node) => {
              frameRefs.current[index] = node;
            }}
            src={embedSrc(reel.embedUrl)}
            title={reel.title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            loading={index <= activeIndex + 1 ? "eager" : "lazy"}
            className="aspect-[9/16] h-full w-full border-0"
          />

          {reel.placeTitle ? (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-5 pt-[max(4.5rem,var(--safe-area-top))] text-white">
              <p className="type-label flex items-center gap-1.5">
                <MapPinIcon aria-hidden="true" className="size-4" />
                {reel.placeTitle}
              </p>
              {reel.region ? (
                <p className="mt-1 text-[0.6875rem] leading-4 text-white/80">
                  {reel.region}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="safe-area-bottom absolute inset-x-0 bottom-0 z-10 flex items-end justify-between gap-3 bg-gradient-to-t from-black/60 to-transparent px-5 pt-10 pb-5 text-white">
            <div className="min-w-0">
              <h1 className="type-label truncate text-white">{reel.title}</h1>
              <p className="mt-1 truncate text-[0.6875rem] text-white/80">
                {reel.channelTitle}
              </p>
            </div>
            <button
              type="button"
              aria-label={muted ? "소리 켜기" : "소리 끄기"}
              aria-pressed={!muted}
              onClick={() => setMuted((current) => !current)}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-black/35 outline-none focus-visible:ring-3 focus-visible:ring-white/65"
            >
              {muted ? (
                <VolumeXIcon aria-hidden="true" className="size-5" />
              ) : (
                <Volume2Icon aria-hidden="true" className="size-5" />
              )}
            </button>
          </div>
        </section>
      ))}
    </main>
  );
}

export { YouTubeReelsViewer, type YouTubeReelsViewerProps };
