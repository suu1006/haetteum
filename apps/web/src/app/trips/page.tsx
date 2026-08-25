import type { Metadata } from "next";

import { MyTripsScreen } from "@/components/patterns/my-trips-screen";
import { tripScheduleMock } from "@/features/trips/trip-schedule.mock";

export const metadata: Metadata = {
  title: "내 일정 | 해뜸",
  description: "예정된 여행과 지난 여행 일정을 한눈에 확인해 보세요.",
};

export default function TripsPage() {
  return (
    <main className="min-h-screen bg-background">
      <MyTripsScreen trips={tripScheduleMock} />
    </main>
  );
}
