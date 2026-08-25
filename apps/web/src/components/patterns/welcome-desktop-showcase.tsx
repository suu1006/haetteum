"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { WelcomeChatSlide } from "@/components/patterns/welcome-chat-slide";
import { WelcomeCourseSlide } from "@/components/patterns/welcome-course-slide";

const CHAT_MESSAGE_COUNT = 5;
const CHAT_MESSAGE_DELAY = 800;
const LOADING_REVEAL_DELAY = 900;
const COURSE_REVEAL_DELAY = 2000;
const DESKTOP_QUERY = "(min-width: 1024px)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToDesktop(onChange: () => void) {
  const mediaQuery = window.matchMedia(DESKTOP_QUERY);

  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getDesktopSnapshot() {
  return window.matchMedia(DESKTOP_QUERY).matches;
}

function subscribeToReducedMotion(onChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);

  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getServerMediaSnapshot() {
  return false;
}

function WelcomeDesktopShowcase() {
  const [visibleMessageCount, setVisibleMessageCount] = useState(1);
  const [showLoading, setShowLoading] = useState(false);
  const [showCourse, setShowCourse] = useState(false);
  const desktop = useSyncExternalStore(
    subscribeToDesktop,
    getDesktopSnapshot,
    getServerMediaSnapshot,
  );
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerMediaSnapshot,
  );
  const displayCourse = desktop && (reducedMotion || showCourse);

  useEffect(() => {
    if (!desktop || reducedMotion || showCourse) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (document.visibilityState === "hidden") return;

      if (visibleMessageCount < CHAT_MESSAGE_COUNT) {
        timer = setTimeout(
          () => setVisibleMessageCount((current) => current + 1),
          CHAT_MESSAGE_DELAY,
        );
        return;
      }

      if (!showLoading) {
        timer = setTimeout(() => setShowLoading(true), LOADING_REVEAL_DELAY);
        return;
      }

      timer = setTimeout(() => setShowCourse(true), COURSE_REVEAL_DELAY);
    };
    const handleVisibilityChange = () => {
      if (timer) clearTimeout(timer);
      if (document.visibilityState === "visible") schedule();
    };
    schedule();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [desktop, reducedMotion, showCourse, showLoading, visibleMessageCount]);

  return (
    <section
      aria-label="해뜸 여행 추천 소개"
      className="hidden min-h-[34rem] lg:block"
    >
      <div
        key={displayCourse ? "course" : "chat"}
        className="animate-[welcome-slide-in_var(--motion-welcome-slide)_var(--ease-standard)_both] motion-reduce:animate-none"
      >
        {displayCourse ? (
          <WelcomeCourseSlide />
        ) : (
          <WelcomeChatSlide
            showLoading={showLoading}
            visibleMessageCount={visibleMessageCount}
          />
        )}
      </div>
    </section>
  );
}

export { WelcomeDesktopShowcase };
