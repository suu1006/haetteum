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
  // The requested preview starts after the player handshake.
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

function ReelTile({
  reel,
  active,
  onToggle,
  priority = false,
  registerNode,
}: {
  reel: PopularReelItem;
  active: boolean;
  onToggle: () => void;
  priority?: boolean;
  registerNode: (tileKey: string, node: HTMLLIElement | null) => void;
}) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isFramePlaying, setIsFramePlaying] = useState(false);
  const activeRef = useRef(active);
  const key = reelKey(reel);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const setRefs = useCallback(
    (node: HTMLLIElement | null) => {
      registerNode(key, node);
    },
    [key, registerNode],
  );

  // Inactive tiles remain thumbnails: even a paused iframe downloads its player.
  const shouldMount = active;

  // Wait for the requested player to be ready before sending playVideo.
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

  // Only the explicitly requested preview can play.
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
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
      />
      {shouldMount ? (
        <iframe
          ref={frameRef}
          src={embedSrc(reel.embedUrl)}
          onLoad={() => postToFrame(frameRef.current, { event: "listening", id: reel.videoId })}
          title={`${reel.placeTitle} 릴스 미리보기`}
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
        prefetch={false}
        aria-label={`${reel.placeTitle} 릴스 미리보기`}
        className="absolute inset-0 z-10 outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
      />
      <button
        type="button"
        onClick={onToggle}
        aria-label={`${reel.placeTitle} 미리보기 ${active ? "정지" : "재생"}`}
        className="absolute inset-x-2 bottom-2 z-20 min-h-11 rounded-lg bg-black/80 px-3 py-2 text-sm font-semibold text-white outline-none focus-visible:ring-3 focus-visible:ring-white"
      >
        미리보기 {active ? "정지" : "재생"}
      </button>
    </li>
  );
}

function PopularReelGrid({ reels }: PopularReelGridProps) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
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

  // Release a requested preview when it leaves the viewport; never warm hidden players.
  useEffect(() => {
    const keyByNode = new Map<Element, string>();
    for (const [tileKey, node] of nodeByKey) keyByNode.set(node, tileKey);

    const observer = new IntersectionObserver(
      (entries) => {
        setActiveKey((previous) => {
          const leftViewport = entries.some(entry => !entry.isIntersecting && keyByNode.get(entry.target) === previous);
          return leftViewport ? null : previous;
        });
      },
      { threshold: 0 },
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
            active={activeKey === key}
            onToggle={() => setActiveKey(previous => previous === key ? null : key)}
            priority={index < 2}
            registerNode={registerNode}
          />
        );
      })}
    </ul>
  );
}

export { PopularReelGrid, type PopularReelGridProps };
