import type { ThemeTravelData } from "@/features/themes/theme-travel-model";

export const themeTravelMock = {
  features: [
    {
      id: "healing",
      title: "힐링 & 휴식",
      description: "바다와 자연 속\n여유로운 휴식 여행",
      courseCount: 128,
      image: {
        src: "/images/themes/theme-healing-beach.png",
        alt: "야자수 너머로 펼쳐진 푸른 바다와 해변",
      },
    },
    {
      id: "food",
      title: "미식 여행",
      description: "현지 맛집과\n특별한 미식 탐방",
      courseCount: 96,
      image: {
        src: "/images/themes/theme-food-cafe.png",
        alt: "창가에 차와 디저트가 놓인 아늑한 카페",
      },
    },
    {
      id: "culture",
      title: "문화 & 역사",
      description: "역사와 문화가 살아있는\n깊이 있는 여행",
      courseCount: 112,
      image: {
        src: "/images/themes/theme-culture-hanok.png",
        alt: "기와지붕과 산이 어우러진 전통 한옥 거리",
      },
    },
    {
      id: "activity",
      title: "액티비티",
      description: "즐길거리 가득한\n활동적인 여행",
      courseCount: 84,
      image: {
        src: "/images/themes/theme-activity-balloons.png",
        alt: "산악 풍경 위를 떠다니는 여러 대의 열기구",
      },
    },
  ],
  courses: [
    {
      id: "jeju-healing",
      theme: "healing",
      title: "제주 바다 힐링 코스",
      description: "푸른 바다와 숲길을 따라 떠나는 제주 힐링 여행",
      durationLabel: "2박 3일",
      locationLabel: "제주도",
      rating: 4.8,
      reviewCount: 128,
      popularity: 98,
      tags: ["바다", "자연", "힐링"],
      image: {
        src: "/images/themes/course-jeju-healing.png",
        alt: "바다를 내려다보는 제주 해안 산책로",
      },
    },
    {
      id: "jeonju-food",
      theme: "food",
      title: "전주 미식 탐방 코스",
      description: "전주의 숨은 맛집을 찾아 떠나는 미식 여행",
      durationLabel: "1박 2일",
      locationLabel: "전라북도 전주",
      rating: 4.7,
      reviewCount: 96,
      popularity: 94,
      tags: ["맛집", "전통시장", "한옥마을"],
      image: {
        src: "/images/themes/course-jeonju-food.png",
        alt: "여러 반찬과 전통 음식이 차려진 전주 한식 상차림",
      },
    },
    {
      id: "gyeongju-history",
      theme: "culture",
      title: "경주 역사 탐방 코스",
      description: "천년의 역사가 살아 숨 쉬는 경주 문화유산 여행",
      durationLabel: "1박 2일",
      locationLabel: "경상북도 경주",
      rating: 4.9,
      reviewCount: 112,
      popularity: 91,
      tags: ["문화유산", "역사", "산책"],
      image: {
        src: "/images/themes/course-gyeongju-history.png",
        alt: "단풍나무 곁에 자리한 경주의 전통 누각",
      },
    },
  ],
} as const satisfies ThemeTravelData;
