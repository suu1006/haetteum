import Image from "next/image";
import { TbChevronRight } from "react-icons/tb";

import { TripParticipantAvatars } from "@/components/travel/trip-participant-avatars";
import type { TripSchedule } from "@/features/trips/trip-schedule-model";

type TripScheduleCardProps = {
  trip: TripSchedule;
  onOpen: (trip: TripSchedule) => void;
  eager?: boolean;
};

function TripScheduleCard({ trip, onOpen, eager = false }: TripScheduleCardProps) {
  return (
    <article
      aria-label={`${trip.dDay} ${trip.title}`}
      className="overflow-hidden rounded-[1.15rem] bg-card shadow-[0_4px_18px_oklch(0.2146_0.0099_276.58/0.07)]"
    >
      <button
        type="button"
        aria-label={`${trip.title} 상세 보기`}
        onClick={() => onOpen(trip)}
        className="grid min-h-[7.45rem] w-full grid-cols-[5.75rem_minmax(0,1fr)_1.25rem] items-center gap-4 p-3 text-left outline-none transition-colors hover:bg-primary-subtle/35 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/25 max-[370px]:grid-cols-[5rem_minmax(0,1fr)_1rem] max-[370px]:gap-3"
      >
        <span className="relative h-[6.15rem] w-[5.75rem] overflow-hidden rounded-[1rem] max-[370px]:h-[5.6rem] max-[370px]:w-20">
          <Image
            src={trip.imageSrc}
            alt={trip.imageAlt}
            fill
            sizes="92px"
            loading={eager ? "eager" : "lazy"}
            className="object-cover"
          />
          <span className="absolute top-0 left-1/2 z-10 min-w-[3.4rem] -translate-x-1/2 rounded-b-[0.75rem] bg-primary px-2 py-1 text-center text-[0.95rem] font-semibold text-primary-foreground shadow-sm">
            {trip.dDay}
          </span>
        </span>

        <span className="min-w-0 self-stretch py-1">
          <span className="block truncate text-[1.08rem] font-bold leading-6 tracking-[-0.02em] text-foreground">
            {trip.title}
          </span>
          <span className="mt-1.5 block truncate text-[0.82rem] leading-5 text-muted-foreground">
            {trip.duration} · {trip.dateRange}
          </span>
          <span className="mt-2.5 block">
            <TripParticipantAvatars
              participants={trip.participants}
              totalCount={trip.participantCount}
            />
          </span>
        </span>

        <TbChevronRight
          aria-hidden="true"
          className="size-5 text-muted-foreground"
          strokeWidth={1.8}
        />
      </button>
    </article>
  );
}

export { TripScheduleCard, type TripScheduleCardProps };
