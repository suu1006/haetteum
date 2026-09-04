"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TbBell, TbPlus } from "react-icons/tb";
import { useQuery } from "@tanstack/react-query";

import type { SavedCourseItem } from "@haetteum/contracts";

import { AiTripScheduleBanner } from "@/components/travel/ai-trip-schedule-banner";
import { BottomNavigation } from "@/components/travel/bottom-navigation";
import { createMainNavigationItems } from "@/components/travel/main-navigation-items";
import { SavedCourseCard } from "@/components/travel/saved-course-card";
import { TripScheduleCard } from "@/components/travel/trip-schedule-card";
import {
  TripScheduleTabs,
  type TripScheduleTab,
} from "@/components/travel/trip-schedule-tabs";
import {
  blankCourseMock,
  courseEditMock,
} from "@/features/courses/course-edit.mock";
import type {
  TripSchedule,
  TripScheduleCollection,
} from "@/features/trips/trip-schedule-model";
import {
  savedCoursesQueryOptions,
  useRemoveSavedCourse,
} from "@/features/trips/saved-course-query";

type MyTripsScreenProps = {
  trips: TripScheduleCollection;
  initialSavedCourses?: SavedCourseItem[];
};

const navigationItems = createMainNavigationItems("trips");

const screenStyle = {
  "--trips-navigation-height": "4.25rem",
  "--trips-navigation-reserve":
    "calc(var(--trips-navigation-height) + var(--safe-area-bottom) + 1.5rem)",
} as CSSProperties;

function MyTripsScreen({ trips, initialSavedCourses }: MyTripsScreenProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TripScheduleTab>("scheduled");
  const [status, setStatus] = useState("");
  const activeTrips = trips[activeTab];
  const listLabel = activeTab === "scheduled" ? "예정된 일정" : "지난 일정";

  const { data: savedCoursesData } = useQuery({
    ...savedCoursesQueryOptions(),
    ...(initialSavedCourses ? { initialData: { items: initialSavedCourses } } : {}),
  });
  const savedCourses = savedCoursesData?.items ?? [];
  const removeSavedCourse = useRemoveSavedCourse();
  const showSavedCourses = activeTab === "scheduled" && savedCourses.length > 0;

  function openTrip(trip: TripSchedule) {
    setStatus(`${trip.title} 상세 화면을 준비하고 있어요.`);
  }

  function removeCourse(id: string) {
    removeSavedCourse.mutate(id, {
      onSuccess: () => setStatus("저장한 코스를 삭제했어요."),
    });
  }

  function editCourse(id: string) {
    router.push(`/courses/${id}/edit`);
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
          {showSavedCourses ? (
            <ul aria-label="저장한 코스 목록" className="grid gap-3 pb-3">
              {savedCourses.map((course) => (
                <li key={course.id}>
                  <SavedCourseCard
                    course={course}
                    onRemove={removeCourse}
                    onEdit={editCourse}
                    removing={
                      removeSavedCourse.isPending &&
                      removeSavedCourse.variables === course.id
                    }
                  />
                </li>
              ))}
            </ul>
          ) : null}

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
          ) : !showSavedCourses ? (
            <p className="rounded-[1.15rem] bg-card px-5 py-10 text-center text-sm text-muted-foreground shadow-card">
              {listLabel}이 없어요.
            </p>
          ) : null}
        </section>

        <div className="px-5 pt-4">
          <AiTripScheduleBanner
            onRecommend={() => router.push(`/courses/${courseEditMock.id}/edit`)}
          />
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

      <div className="pointer-events-none fixed inset-x-0 bottom-[var(--trips-navigation-reserve)] z-40 mx-auto flex w-full max-w-[30rem] justify-end px-5 pb-1">
        <button
          type="button"
          onClick={() => router.push(`/courses/${blankCourseMock.id}/edit`)}
          aria-label="새 일정 만들기"
          className="pointer-events-auto flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-floating outline-none transition-colors hover:bg-primary-pressed focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <TbPlus aria-hidden="true" className="size-7" strokeWidth={1.5} />
        </button>
      </div>

      <div className="safe-area-bottom fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-[30rem] bg-card">
        <BottomNavigation items={navigationItems} />
      </div>
    </div>
  );
}

export { MyTripsScreen, type MyTripsScreenProps };
