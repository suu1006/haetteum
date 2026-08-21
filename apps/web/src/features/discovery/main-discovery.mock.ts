import type { MainDiscoveryData } from "@/features/discovery/discovery-model";

export const mainDiscoveryMock = {
  hero: {
    src: "/images/discovery/main-hero-jeju.png",
    alt: "아침 햇살이 비치는 제주 해안 풍경",
  },
  aiCourse: {
    src: "/images/discovery/ai-course-guide.png",
    alt: "여행 코스를 안내하는 해뜸 도우미",
  },
  regions: [
    { id: "seoul", label: "서울" },
    { id: "gyeonggi", label: "경기" },
    { id: "gangwon", label: "강원" },
    { id: "busan", label: "부산" },
    { id: "jeju", label: "제주" },
  ],
  places: [
    {
      id: "seongsan-ilchulbong",
      rank: 1,
      title: "성산일출봉",
      region: "jeju",
      location: "제주 서귀포시",
      rating: 4.8,
      reviewCount: 1284,
      image: {
        src: "/images/discovery/place-seongsan.png",
        alt: "바다에서 바라본 성산일출봉",
      },
    },
    {
      id: "hyeopjae-beach",
      rank: 2,
      title: "협재해수욕장",
      region: "jeju",
      location: "제주 제주시",
      rating: 4.7,
      reviewCount: 986,
      image: {
        src: "/images/discovery/place-hyeopjae.png",
        alt: "맑은 물빛의 협재해수욕장",
      },
    },
    {
      id: "bijarim-forest",
      rank: 3,
      title: "비자림",
      region: "jeju",
      location: "제주 제주시",
      rating: 4.6,
      reviewCount: 742,
      image: {
        src: "/images/discovery/place-bijarim.png",
        alt: "초록빛이 이어지는 비자림 산책로",
      },
    },
  ],
  festivals: [
    {
      id: "jeju-summer-flower-festival",
      title: "제주 여름꽃 축제",
      dateLabel: "2026. 8. 22. – 8. 30.",
      region: "jeju",
      location: "제주 서귀포시",
      image: {
        src: "/images/discovery/festival-jeju.png",
        alt: "제주 들판에 핀 여름꽃",
      },
    },
  ],
} as const satisfies MainDiscoveryData;
