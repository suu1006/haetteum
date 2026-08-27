"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { TbBell, TbPlus } from "react-icons/tb";

import { AiTripScheduleBanner } from "@/components/travel/ai-trip-schedule-banner";
import { BottomNavigation } from "@/components/travel/bottom-navigation";
import { createMainNavigationItems } from "@/components/travel/main-navigation-items";
import { TripScheduleCard } from "@/components/travel/trip-schedule-card";
import {
  TripScheduleTabs,
  type TripScheduleTab,
} from "@/components/travel/trip-schedule-tabs";
import type {
  TripSchedule,
  TripScheduleCollection,
} from "@/features/trips/trip-schedule-model";

type MyTripsScreenProps = {
  trips: TripScheduleCollection;
};

const navigationItems = createMainNavigationItems("trips");

const screenStyle = {
  "--trips-navigation-height": "4.25rem",
  "--trips-navigation-reserve":
    "calc(var(--trips-navigation-height) + var(--safe-area-bottom) + 1.5rem)",
} as CSSProperties;

function MyTripsScreen({ trips }: MyTripsScreenProps) {
  const [activeTab, setActiveTab] = useState<TripScheduleTab>("scheduled");
  const [status, setStatus] = useState("");
  const activeTrips = trips[activeTab];
  const listLabel = activeTab === "scheduled" ? "예정된 일정" : "지난 일정";

  function openTrip(trip: TripSchedule) {
    setStatus(`${trip.title} 상세 화면을 준비하고 있어요.`);
  }

  return (
    <div
      className="mx-auto min-h-screen w-full max-w-[30rem] bg-background pb-[var(--trips-navigation-reserve)]"
      style={screenStyle}
    >
      <header className="flex items-center justify-between px-5 pt-[25px] pb-4">
        <h1 className="text-[1.55rem] font-bold leading-9 tracking-[-0.03em] text-foreground">
          내 일정
        </h1>
        <button
          type="button"
          aria-label="알림"
          disabled
          className="flex size-11 items-center justify-center rounded-full bg-muted text-foreground disabled:opacity-100"
        >
          <TbBell aria-hidden="true" className="size-6" strokeWidth={1.7} />
        </button>
      </header>

      <main>
        <div className="px-5">
          <TripScheduleTabs activeTab={activeTab} onChange={setActiveTab} />
        </div>

        <section
          id={`${activeTab}-trip-panel`}
          role="tabpanel"
          aria-labelledby={`${activeTab}-trip-tab`}
          className="px-5 pt-3"
        >
          {activeTrips.length > 0 ? (
            <ul aria-label={`${listLabel} 목록`} className="grid gap-3">
              {activeTrips.map((trip) => (
                <li key={trip.id}>
                  <TripScheduleCard
                    trip={trip}
                    onOpen={openTrip}
                    eager
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-[1.15rem] bg-card px-5 py-10 text-center text-sm text-muted-foreground shadow-card">
              {listLabel}이 없어요.
            </p>
          )}
        </section>

        <div className="space-y-4 px-5 pt-4">
          <AiTripScheduleBanner
            onRecommend={() =>
              setStatus("AI 맞춤 일정 추천을 준비하고 있어요.")
            }
          />
          <button
            type="button"
            onClick={() => setStatus("새 일정 만들기를 준비하고 있어요.")}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-[1.05rem] bg-primary px-5 text-[1rem] font-semibold text-primary-foreground shadow-[0_8px_20px_oklch(0.5249_0.2351_289.26/0.2)] outline-none transition-colors hover:bg-primary-pressed focus-visible:ring-3 focus-visible:ring-ring/25"
          >
            <TbPlus aria-hidden="true" className="size-6" strokeWidth={1.5} />
            새 일정 만들기
          </button>
        </div>

        <p
          role="status"
          aria-label="일정 화면 상태"
          aria-live="polite"
          className="sr-only"
        >
          {status}
        </p>
      </main>

      <div className="safe-area-bottom fixed inset-x-0 bottom-0 z-30 mx-auto min-h-[var(--trips-navigation-height)] w-full max-w-[30rem] bg-card">
        <BottomNavigation items={navigationItems} />
      </div>
    </div>
  );
}

export { MyTripsScreen, type MyTripsScreenProps };
