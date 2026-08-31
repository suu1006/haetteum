"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { PopularReelItem } from "@haetteum/contracts";

type PopularReelGridProps = {
  reels: readonly PopularReelItem[];
};

function autoplayEmbedSrc(embedUrl: string): string {
  const url = new URL(embedUrl);
  url.searchParams.set("autoplay", "1");
  url.searchParams.set("mute", "1");
  url.searchParams.set("controls", "0");
  url.searchParams.set("playsinline", "1");
  url.searchParams.set("rel", "0");
  url.searchParams.set("modestbranding", "1");
  url.searchParams.set("disablekb", "1");
  url.searchParams.set("iv_load_policy", "3");
  url.searchParams.set("enablejsapi", "1");
  if (typeof window !== "undefined") {
    url.searchParams.set("origin", window.location.origin);
  }
  return url.href;
}

const YOUTUBE_STATE_ENDED = 0;
const YOUTUBE_STATE_PLAYING = 1;

function postToFrame(
  frame: HTMLIFrameElement | null,
  payload: Record<string, unknown>,
) {
  frame?.contentWindow?.postMessage(JSON.stringify(payload), "*");
}

function playVideo(frame: HTMLIFrameElement | null) {
  postToFrame(frame, { event: "command", func: "playVideo", args: [] });
}

function pauseVideo(frame: HTMLIFrameElement | null) {
  postToFrame(frame, { event: "command", func: "pauseVideo", args: [] });
}

function restartVideo(frame: HTMLIFrameElement | null) {
  postToFrame(frame, { event: "command", func: "seekTo", args: [0, true] });
  playVideo(frame);
}

function usePrefersReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return reduceMotion;
}

function ReelTile({ reel }: { reel: PopularReelItem }) {
  const tileRef = useRef<HTMLLIElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isFramePlaying, setIsFramePlaying] = useState(false);
  const reduceMotion = usePrefersReducedMotion();

  // Mount well before the tile is actually visible, and never unmount again:
  // recreating the iframe on every scroll re-runs the whole ready→play→buffer
  // handshake, which is what made playback look like it stalls on each pass.
  useEffect(() => {
    const node = tileRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setHasEnteredView(true);
      },
      { rootMargin: "100% 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = tileRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry?.isIntersecting ?? false),
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const shouldMount = hasEnteredView && !reduceMotion;
  const shouldPlay = isVisible && !reduceMotion;

  useEffect(() => {
    if (!shouldMount) return;
    let hasRequestedPlay = false;
    const HANDSHAKE_RETRY_LIMIT = 6;
    let handshakeAttempts = 0;

    function sendListeningHandshake() {
      handshakeAttempts += 1;
      postToFrame(frameRef.current, { event: "listening", id: reel.videoId });
      if (handshakeAttempts >= HANDSHAKE_RETRY_LIMIT) {
        window.clearInterval(handshakeInterval);
      }
    }
    sendListeningHandshake();
    const handshakeInterval = window.setInterval(sendListeningHandshake, 300);

    // Autoplay via the `autoplay=1` URL param isn't reliable once the frame is
    // driven through the postMessage API, so explicitly request playback once
    // the embedded player confirms it's ready.
    function handleMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return;
      let data: { event?: string; info?: { playerState?: number } };
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (
        !hasRequestedPlay &&
        (data.event === "onReady" ||
          data.event === "initialDelivery" ||
          data.event === "alreadyInitialized")
      ) {
        hasRequestedPlay = true;
        playVideo(frameRef.current);
      }
      if (data.event !== "infoDelivery") return;
      const playerState = data.info?.playerState;
      if (playerState === YOUTUBE_STATE_PLAYING) setIsFramePlaying(true);
      if (playerState === YOUTUBE_STATE_ENDED) restartVideo(frameRef.current);
    }
    window.addEventListener("message", handleMessage);

    // Safety net: if the player never reports back (blocked autoplay, a
    // slow network, protocol changes), reveal the frame anyway so the tile
    // doesn't stay stuck on the thumbnail forever.
    const fallbackReveal = window.setTimeout(
      () => setIsFramePlaying(true),
      2500,
    );

    return () => {
      window.clearInterval(handshakeInterval);
      window.clearTimeout(fallbackReveal);
      window.removeEventListener("message", handleMessage);
    };
  }, [shouldMount, reel.videoId]);

  // Once mounted, toggle actual playback with play/pause commands instead of
  // tearing the iframe down — the player stays warm across scroll passes.
  useEffect(() => {
    if (!shouldMount) return;
    if (shouldPlay) {
      playVideo(frameRef.current);
    } else {
      pauseVideo(frameRef.current);
    }
  }, [shouldMount, shouldPlay]);

  return (
    <li
      ref={tileRef}
      className="relative aspect-[9/16] overflow-hidden rounded-lg"
    >
      <Image
        src={reel.thumbnailUrl}
        alt=""
        fill
        sizes="(max-width: 479px) 48vw, 216px"
        className="object-cover"
      />
      {shouldMount ? (
        <iframe
          ref={frameRef}
          src={autoplayEmbedSrc(reel.embedUrl)}
          title={`${reel.placeTitle} 릴스 자동재생`}
          allow="autoplay; encrypted-media"
          loading="lazy"
          tabIndex={-1}
          className={`pointer-events-none absolute inset-0 size-full border-0 transition-opacity duration-300 ${
            isFramePlaying ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : null}
      <Link
        href={`/reels/place/${reel.placeId}`}
        scroll={false}
        aria-label={`${reel.placeTitle} 릴스 미리보기`}
        className="absolute inset-0 z-10 outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
      />
    </li>
  );
}

function PopularReelGrid({ reels }: PopularReelGridProps) {
  return (
    <ul
      aria-label="릴스형 인기 관광지 목록"
      className="mt-3 grid grid-cols-2 gap-2"
    >
      {reels.map((reel) => (
        <ReelTile key={`${reel.placeId}-${reel.videoId}`} reel={reel} />
      ))}
    </ul>
  );
}

export { PopularReelGrid, type PopularReelGridProps };
