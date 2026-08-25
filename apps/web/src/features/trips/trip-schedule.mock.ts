import type { TripScheduleCollection } from "@/features/trips/trip-schedule-model";

const participants = {
  mina: {
    id: "mina",
    name: "민아",
    imageSrc: "/images/trips/avatar-mina.png",
  },
  jun: {
    id: "jun",
    name: "준호",
    imageSrc: "/images/trips/avatar-jun.png",
  },
  seo: {
    id: "seo",
    name: "서연",
    imageSrc: "/images/trips/avatar-seo.png",
  },
  hyun: {
    id: "hyun",
    name: "현우",
    imageSrc: "/images/trips/avatar-hyun.png",
  },
} as const;

const tripScheduleMock: TripScheduleCollection = {
  scheduled: [
    {
      id: "jeju-healing",
      dDay: "D-5",
      title: "제주도 힐링 여행",
      duration: "2박 3일",
      dateRange: "2025.08.28 ~ 08.30",
      imageSrc: "/images/trips/jeju-healing.png",
      imageAlt: "숲과 바다가 내려다보이는 제주 여행지",
      participantCount: 4,
      participants: [participants.mina, participants.jun, participants.seo],
    },
    {
      id: "busan-sea",
      dDay: "D-12",
      title: "부산 바다 여행",
      duration: "1박 2일",
      dateRange: "2025.09.04 ~ 09.05",
      imageSrc: "/images/trips/busan-sea.png",
      imageAlt: "푸른 바다와 마을이 보이는 부산 여행지",
      participantCount: 3,
      participants: [participants.hyun, participants.mina, participants.jun],
    },
    {
      id: "gyeongju-history",
      dDay: "D-20",
      title: "경주 역사 탐방",
      duration: "1박 2일",
      dateRange: "2025.09.12 ~ 09.13",
      imageSrc: "/images/trips/gyeongju-history.png",
      imageAlt: "전통 누각이 보이는 경주 여행지",
      participantCount: 2,
      participants: [participants.seo, participants.mina],
    },
  ],
  past: [
    {
      id: "jeonju-food",
      dDay: "완료",
      title: "전주 미식 여행",
      duration: "1박 2일",
      dateRange: "2025.07.12 ~ 07.13",
      imageSrc: "/images/themes/course-jeonju-food.png",
      imageAlt: "한옥과 골목이 어우러진 전주 여행지",
      participantCount: 2,
      participants: [participants.mina, participants.hyun],
    },
    {
      id: "jeju-spring",
      dDay: "완료",
      title: "제주 봄 산책",
      duration: "2박 3일",
      dateRange: "2025.04.18 ~ 04.20",
      imageSrc: "/images/themes/course-jeju-healing.png",
      imageAlt: "제주의 푸른 해안 산책길",
      participantCount: 3,
      participants: [participants.seo, participants.jun, participants.mina],
    },
  ],
};

export { tripScheduleMock };
