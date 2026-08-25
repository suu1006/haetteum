import Image from "next/image";

import type { TripParticipant } from "@/features/trips/trip-schedule-model";

type TripParticipantAvatarsProps = {
  participants: readonly TripParticipant[];
  totalCount: number;
};

function TripParticipantAvatars({
  participants,
  totalCount,
}: TripParticipantAvatarsProps) {
  return (
    <div
      role="group"
      aria-label={`여행 인원 ${totalCount}명`}
      className="flex min-w-0 items-center"
    >
      <div className="flex -space-x-2">
        {participants.slice(0, 3).map((participant) => (
          <Image
            key={participant.id}
            src={participant.imageSrc}
            alt={participant.name}
            width={32}
            height={32}
            className="size-8 rounded-full border-2 border-card object-cover"
          />
        ))}
      </div>
      <span className="ml-3 text-sm font-medium text-muted-foreground">
        {totalCount}명
      </span>
    </div>
  );
}

export { TripParticipantAvatars, type TripParticipantAvatarsProps };
