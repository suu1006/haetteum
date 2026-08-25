type TripParticipant = {
  id: string;
  name: string;
  imageSrc: string;
};

type TripSchedule = {
  id: string;
  dDay: string;
  title: string;
  duration: string;
  dateRange: string;
  imageSrc: string;
  imageAlt: string;
  participantCount: number;
  participants: readonly TripParticipant[];
};

type TripScheduleCollection = {
  scheduled: readonly TripSchedule[];
  past: readonly TripSchedule[];
};

export type { TripParticipant, TripSchedule, TripScheduleCollection };
