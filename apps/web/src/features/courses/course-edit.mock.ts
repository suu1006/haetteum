import type {
  CourseEditFixture,
  CoursePlaceDetail,
} from "@/features/courses/course-edit-model";

const coursePlaceDetailMock = {
  "icheon-rice-breakfast": {
    rating: 4.8,
    reviewCount: 856,
    addressLabel: "경기 이천시 신둔면 경충대로 3134",
    hoursLabel: "10:30 - 20:00",
    description: "윤기 좋은 이천 쌀밥과 정갈한 한정식을 함께 맛보는 식당이에요.",
    highlights: ["이천쌀 한상", "가족 식사", "AI 추천 코스 포함"],
    recommendationReasons: [
      "여행을 든든하게 시작하기 좋은 이천 대표 한식 코스예요.",
      "첫 일정에서 테르메덴까지 이동 동선이 짧아요.",
    ],
    reviews: [
      { id: "rice-review-1", rating: 5, content: "반찬이 정갈하고 쌀밥이 정말 맛있어요." },
      { id: "rice-review-2", rating: 4.7, content: "가족과 편안하게 아침 식사를 했어요." },
    ],
  },
  "icheon-termeden": {
    rating: 4.6,
    reviewCount: 2_345,
    addressLabel: "경기 이천시 모가면 사실로 984",
    hoursLabel: "10:00 - 19:00",
    description: "자연 속에서 온천과 물놀이를 함께 즐기는 휴식형 테마파크예요.",
    highlights: ["평균 체류 180분", "가족 추천", "AI 추천 코스 포함"],
    recommendationReasons: [
      "다양한 온천탕과 실내외 스파 시설을 한 번에 즐길 수 있어요.",
      "이천의 대표 온천 명소로 여행 코스 만족도가 높아요.",
    ],
    reviews: [
      { id: "termeden-review-1", rating: 5, content: "온천탕이 다양하고 야외 스파가 정말 좋았어요." },
      { id: "termeden-review-2", rating: 4.5, content: "아이와 함께 가기 좋고 시설도 깨끗했어요." },
    ],
  },
  "seolbong-park": {
    rating: 4.7,
    reviewCount: 1_420,
    addressLabel: "경기 이천시 경충대로2709번길 128",
    hoursLabel: "24시간 이용",
    description: "호수와 설봉산 풍경을 따라 천천히 걷기 좋은 도심 속 산책 공원이에요.",
    highlights: ["평균 체류 90분", "산책 추천", "무료 이용"],
    recommendationReasons: [
      "온천 후 호숫가를 걸으며 여유롭게 쉬기 좋아요.",
      "박물관과 가까워 다음 일정으로 자연스럽게 이어져요.",
    ],
    reviews: [
      { id: "park-review-1", rating: 4.8, content: "호수 둘레길이 잘 정돈되어 걷기 편해요." },
      { id: "park-review-2", rating: 4.6, content: "노을이 아름답고 쉬어 갈 공간도 많아요." },
    ],
  },
  "icheon-city-museum": {
    rating: 4.6,
    reviewCount: 1_234,
    addressLabel: "경기 이천시 경충대로2697번길 172",
    hoursLabel: "09:00 - 18:00",
    description: "이천의 역사와 도자 문화를 차분하게 둘러볼 수 있는 지역 박물관이에요.",
    highlights: ["평균 관람 60분", "실내 관람", "가족 추천"],
    recommendationReasons: [
      "이천의 생활사와 도자 문화를 한 자리에서 살펴볼 수 있어요.",
      "설봉공원과 가까워 산책 뒤 방문하기 좋은 동선이에요.",
    ],
    reviews: [
      { id: "museum-review-1", rating: 4.7, content: "전시가 알차고 아이와 보기에도 좋았어요." },
      { id: "museum-review-2", rating: 4.5, content: "조용하게 이천의 역사를 알아보기 좋아요." },
    ],
  },
  "haeju-cold-noodles": {
    rating: 4.4,
    reviewCount: 1_102,
    addressLabel: "경기 이천시 영창로 300",
    hoursLabel: "11:00 - 20:30",
    description: "시원한 육수와 쫄깃한 면으로 여행의 마지막을 가볍게 마무리하는 맛집이에요.",
    highlights: ["지역 맛집", "저녁 추천", "대기 가능"],
    recommendationReasons: [
      "관람 일정을 마친 뒤 부담 없이 즐기기 좋은 저녁 메뉴예요.",
      "지역 방문자 후기가 꾸준한 이천 냉면 맛집이에요.",
    ],
    reviews: [
      { id: "noodle-review-1", rating: 4.5, content: "육수가 시원하고 면 식감이 독특해요." },
      { id: "noodle-review-2", rating: 4.3, content: "여행 마지막 식사로 깔끔하게 즐겼어요." },
    ],
  },
} as const satisfies Record<string, CoursePlaceDetail>;

export const courseEditMock = {
  id: "icheon-day-trip",
  title: "이천 하루 코스",
  courses: {
    ai: {
      source: "ai",
      slots: [
        { id: "ai-slot-1", time: "08:30" },
        { id: "ai-slot-2", time: "09:30" },
        { id: "ai-slot-3", time: "12:30" },
        { id: "ai-slot-4", time: "15:00" },
        { id: "ai-slot-5", time: "16:30" },
      ],
      places: [
        {
          id: "icheon-rice-breakfast",
          title: "임금님 쌀밥집",
          category: "아침 식사",
          image: {
            src: "/images/themes/theme-food-cafe.png",
            alt: "정갈하게 차려진 이천 쌀밥 한상",
          },
          latitude: 37.279,
          longitude: 127.485,
          detail: coursePlaceDetailMock["icheon-rice-breakfast"],
        },
        {
          id: "icheon-termeden",
          title: "이천 테르메덴",
          category: "온천/워터파크",
          image: {
            src: "/images/discovery/reference-main/icheon-termeden.png",
            alt: "온천 수영장이 있는 이천 테르메덴",
          },
          latitude: 37.276,
          longitude: 127.442,
          detail: coursePlaceDetailMock["icheon-termeden"],
        },
        {
          id: "seolbong-park",
          title: "설봉공원",
          category: "산책/휴식",
          image: {
            src: "/images/welcome-lake-desktop.png",
            alt: "호수와 산책로가 어우러진 설봉공원",
          },
          latitude: 37.281,
          longitude: 127.435,
          detail: coursePlaceDetailMock["seolbong-park"],
        },
        {
          id: "icheon-city-museum",
          title: "이천 시립박물관",
          category: "관람",
          image: {
            src: "/images/themes/theme-culture-hanok.png",
            alt: "전통 건축과 문화 전시 공간",
          },
          latitude: 37.279,
          longitude: 127.434,
          detail: coursePlaceDetailMock["icheon-city-museum"],
        },
        {
          id: "haeju-cold-noodles",
          title: "해주냉면",
          category: "저녁 식사",
          image: {
            src: "/images/festivals/icheon-rice-cultural-festival/food-experience.png",
            alt: "이천의 지역 식재료로 차린 저녁 식사",
          },
          latitude: 37.272,
          longitude: 127.44,
          detail: coursePlaceDetailMock["haeju-cold-noodles"],
        },
      ],
      recommendedOrder: [
        "icheon-rice-breakfast",
        "icheon-termeden",
        "seolbong-park",
        "icheon-city-museum",
        "haeju-cold-noodles",
        "icheon-ceramic-village",
      ],
    },
    custom: {
      source: "custom",
      slots: [
        { id: "custom-slot-1", time: "09:00" },
        { id: "custom-slot-2", time: "11:00" },
        { id: "custom-slot-3", time: "13:00" },
        { id: "custom-slot-4", time: "15:30" },
        { id: "custom-slot-5", time: "18:00" },
      ],
      places: [
        {
          id: "seolbong-park",
          title: "설봉공원",
          category: "아침 산책",
          image: {
            src: "/images/welcome-lake-desktop.png",
            alt: "호수와 산책로가 어우러진 설봉공원",
          },
          latitude: 37.281,
          longitude: 127.435,
          detail: coursePlaceDetailMock["seolbong-park"],
        },
        {
          id: "icheon-city-museum",
          title: "이천 시립박물관",
          category: "전시 관람",
          image: {
            src: "/images/themes/theme-culture-hanok.png",
            alt: "전통 건축과 문화 전시 공간",
          },
          latitude: 37.279,
          longitude: 127.434,
          detail: coursePlaceDetailMock["icheon-city-museum"],
        },
        {
          id: "icheon-rice-breakfast",
          title: "임금님 쌀밥집",
          category: "점심 식사",
          image: {
            src: "/images/themes/theme-food-cafe.png",
            alt: "정갈하게 차려진 이천 쌀밥 한상",
          },
          latitude: 37.279,
          longitude: 127.485,
          detail: coursePlaceDetailMock["icheon-rice-breakfast"],
        },
        {
          id: "icheon-termeden",
          title: "이천 테르메덴",
          category: "온천/워터파크",
          image: {
            src: "/images/discovery/reference-main/icheon-termeden.png",
            alt: "온천 수영장이 있는 이천 테르메덴",
          },
          latitude: 37.276,
          longitude: 127.442,
          detail: coursePlaceDetailMock["icheon-termeden"],
        },
        {
          id: "haeju-cold-noodles",
          title: "해주냉면",
          category: "저녁 식사",
          image: {
            src: "/images/festivals/icheon-rice-cultural-festival/food-experience.png",
            alt: "이천의 지역 식재료로 차린 저녁 식사",
          },
          latitude: 37.272,
          longitude: 127.44,
          detail: coursePlaceDetailMock["haeju-cold-noodles"],
        },
      ],
      recommendedOrder: [
        "icheon-rice-breakfast",
        "icheon-termeden",
        "seolbong-park",
        "icheon-city-museum",
        "haeju-cold-noodles",
        "icheon-rice-festival",
      ],
    },
  },
} as const satisfies CourseEditFixture;

export const blankCourseMock = {
  id: "new",
  title: "새 일정",
  courses: {
    ai: { source: "ai", slots: [], places: [], recommendedOrder: [] },
    custom: { source: "custom", slots: [], places: [], recommendedOrder: [] },
  },
} as const satisfies CourseEditFixture;

export function getEditableCourseById(courseId: string) {
  if (courseId === courseEditMock.id) return courseEditMock;
  if (courseId === blankCourseMock.id) return blankCourseMock;
  return undefined;
}
