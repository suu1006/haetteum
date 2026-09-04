"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { PopularReelItem } from "@haetteum/contracts";

type PopularReelGridProps = {
  reels: readonly PopularReelItem[];
};

function reelKey(reel: PopularReelItem): string {
  return `${reel.placeId}-${reel.videoId}`;
}

function embedSrc(embedUrl: string): string {
  const url = new URL(embedUrl);
  // Autoplay is requested explicitly via the JS API once a tile becomes the
  // active (centered) one — not via this URL param — so that only one tile
  // downloads video at a time instead of every mounted tile racing to
  // autoplay concurrently.
  url.searchParams.set("autoplay", "0");
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
const YOUTUBE_STATE_PAUSED = 2;

// Mount once a tile is this close to the viewport; unmount again only once
// it's much farther away. The gap between the two gives hysteresis so a tile
// sitting near one boundary doesn't mount/unmount on every small scroll
// wobble — recreating the iframe re-runs the whole ready→play→buffer
// handshake, which should only happen when a tile is genuinely far from view.
const MOUNT_ROOT_MARGIN = "40% 0px";
const UNMOUNT_ROOT_MARGIN = "80% 0px";

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

function ReelTile({
  reel,
  active,
  priority = false,
  registerNode,
}: {
  reel: PopularReelItem;
  active: boolean;
  priority?: boolean;
  registerNode: (tileKey: string, node: HTMLLIElement | null) => void;
}) {
  const tileRef = useRef<HTMLLIElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isFramePlaying, setIsFramePlaying] = useState(false);
  const reduceMotion = usePrefersReducedMotion();
  const activeRef = useRef(active);
  const key = reelKey(reel);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const setRefs = useCallback(
    (node: HTMLLIElement | null) => {
      tileRef.current = node;
      registerNode(key, node);
    },
    [key, registerNode],
  );

  // Mount shortly before the tile is actually visible, and unmount again once
  // it's scrolled far away. Without this, an infinite-scroll feed keeps
  // piling up YouTube iframes forever — each one holds a WebGL context, and
  // once the browser's context limit is hit it starts evicting the oldest
  // ones ("Too many active WebGL contexts"). Mounting only warms up the
  // connection — see the `active`-gated effect below for what actually
  // starts playback.
  useEffect(() => {
    const node = tileRef.current;
    if (!node) return;

    const mountObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setHasEnteredView(true);
      },
      { rootMargin: MOUNT_ROOT_MARGIN, threshold: 0 },
    );
    const unmountObserver = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) setHasEnteredView(false);
      },
      { rootMargin: UNMOUNT_ROOT_MARGIN, threshold: 0 },
    );
    mountObserver.observe(node);
    unmountObserver.observe(node);
    return () => {
      mountObserver.disconnect();
      unmountObserver.disconnect();
    };
  }, []);

  const shouldMount = hasEnteredView && !reduceMotion;

  // Handshake with the embedded player once it's mounted, purely to learn
  // when it's ready — playback itself is requested by the effect below, and
  // only for whichever tile is currently `active`. This is what keeps every
  // mounted-but-inactive tile from downloading video at the same time.
  useEffect(() => {
    if (!shouldMount) return;
    let isReadyLocal = false;
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

    function handleMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return;
      let data: { event?: string; info?: { playerState?: number } };
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (
        !isReadyLocal &&
        (data.event === "onReady" ||
          data.event === "initialDelivery" ||
          data.event === "alreadyInitialized")
      ) {
        isReadyLocal = true;
        setIsReady(true);
      }
      if (data.event !== "infoDelivery") return;
      const playerState = data.info?.playerState;
      if (playerState === YOUTUBE_STATE_PLAYING) setIsFramePlaying(true);
      if (playerState === YOUTUBE_STATE_PAUSED) setIsFramePlaying(false);
      if (playerState === YOUTUBE_STATE_ENDED && activeRef.current) {
        restartVideo(frameRef.current);
      }
    }
    window.addEventListener("message", handleMessage);

    return () => {
      window.clearInterval(handshakeInterval);
      window.removeEventListener("message", handleMessage);
      // The iframe itself is being unmounted (tile scrolled far away) or is
      // about to be replaced — a fresh one needs its own ready confirmation
      // rather than inheriting this one's.
      setIsReady(false);
      setIsFramePlaying(false);
    };
  }, [shouldMount, reel.videoId]);

  // The one place playback is actually requested: only when this tile is
  // both ready and the active (most-centered) one. Leaving the active band —
  // even briefly, e.g. scrolling past a row — pauses it; the resulting
  // YOUTUBE_STATE_PAUSED message above is what drops the frame back to the
  // static thumbnail. At most one row's worth of tiles ever streams video at
  // once instead of every mounted tile racing to buffer together.
  useEffect(() => {
    if (!isReady) return;
    if (active) {
      playVideo(frameRef.current);
    } else {
      pauseVideo(frameRef.current);
    }
  }, [isReady, active]);

  return (
    <li
      ref={setRefs}
      className="relative aspect-[9/16] overflow-hidden rounded-lg"
    >
      <Image
        src={reel.thumbnailUrl}
        alt=""
        fill
        sizes="(max-width: 479px) 48vw, 216px"
        className="object-cover"
        priority={priority}
      />
      {shouldMount ? (
        <iframe
          ref={frameRef}
          src={embedSrc(reel.embedUrl)}
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
        href={`/reels/place/${reel.placeId}?v=${reel.videoId}`}
        scroll={false}
        aria-label={`${reel.placeTitle} 릴스 미리보기`}
        className="absolute inset-0 z-10 outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
      />
    </li>
  );
}

function PopularReelGrid({ reels }: PopularReelGridProps) {
  const [activeKeys, setActiveKeys] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [nodeByKey] = useState(() => new Map<string, HTMLLIElement>());

  const registerNode = useCallback(
    (tileKey: string, node: HTMLLIElement | null) => {
      if (node) {
        nodeByKey.set(tileKey, node);
      } else {
        nodeByKey.delete(tileKey);
      }
    },
    [nodeByKey],
  );

  // Only the tile(s) crossing this thin band near the viewport's vertical
  // center count as "active" — normally just one grid row (up to two tiles),
  // instead of every tile within a wide preload margin. This is what bounds
  // concurrent video playback so tiles stop competing for bandwidth.
  useEffect(() => {
    const keyByNode = new Map<Element, string>();
    for (const [tileKey, node] of nodeByKey) keyByNode.set(node, tileKey);

    const observer = new IntersectionObserver(
      (entries) => {
        setActiveKeys((prev) => {
          const next = new Set(prev);
          let changed = false;
          for (const entry of entries) {
            const tileKey = keyByNode.get(entry.target);
            if (!tileKey) continue;
            if (entry.isIntersecting && !next.has(tileKey)) {
              next.add(tileKey);
              changed = true;
            } else if (!entry.isIntersecting && next.has(tileKey)) {
              next.delete(tileKey);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      },
      { rootMargin: "-35% 0px -35% 0px", threshold: 0 },
    );

    for (const node of nodeByKey.values()) observer.observe(node);
    return () => observer.disconnect();
  }, [reels, nodeByKey]);

  return (
    <ul
      aria-label="릴스형 인기 관광지 목록"
      className="mt-3 grid grid-cols-2 gap-2"
    >
      {reels.map((reel, index) => {
        const key = reelKey(reel);
        return (
          <ReelTile
            key={key}
            reel={reel}
            active={activeKeys.has(key)}
            priority={index < 2}
            registerNode={registerNode}
          />
        );
      })}
    </ul>
  );
}

export { PopularReelGrid, type PopularReelGridProps };
