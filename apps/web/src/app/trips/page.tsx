import type { Metadata } from "next";
import { connection } from "next/server";

import { MyTripsScreen } from "@/components/patterns/my-trips-screen";
import { requireCurrentUser } from "@/features/auth/auth-server";
import { AuthUserHydrator } from "@/features/auth/auth-user-hydrator";
import type { TripScheduleCollection } from "@/features/trips/trip-schedule-model";

export const metadata: Metadata = {
  title: "내 일정 | 해뜸",
  description: "예정된 여행과 지난 여행 일정을 한눈에 확인해 보세요.",
};

const emptyTrips: TripScheduleCollection = { scheduled: [], past: [] };

export default async function TripsPage() {
  await connection();
  const user = await requireCurrentUser("/trips");

  return (
    <>
      <AuthUserHydrator user={user} />
      <main className="min-h-screen bg-background">
        <MyTripsScreen trips={emptyTrips} />
      </main>
    </>
  );
}
