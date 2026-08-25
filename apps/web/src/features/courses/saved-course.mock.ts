import type { SavedCourseFixture } from "@/features/courses/saved-course-model";

export const savedCourseMock = {
  id: "icheon-day-trip",
  title: "이천 테르메덴 중심 1일 코스",
  completionMessage: "이천 테르메덴 중심 1일 코스가 저장되었어요",
  recommendationLabel: "AI 추천",
  totalDurationLabel: "8시간 30분",
  totalDistanceLabel: "18.7km",
  estimatedCostLabel: "1인 약 45,000원",
  mapImage: {
    src: "/images/places/icheon-termeden/course/route-map.png",
    alt: "이천 테르메덴 1일 코스 경로 지도",
  },
  stops: [
    {
      id: "icheon-rice-breakfast",
      order: 1,
      time: "08:30",
      title: "임금님 쌀밥집",
      categoryLabel: "아침 식사",
      durationLabel: "60분",
      image: {
        src: "/images/themes/theme-food-cafe.png",
        alt: "정갈하게 차려진 이천 쌀밥 한상",
      },
      transfer: { distanceLabel: "0.8km", durationLabel: "차량 3분" },
    },
    {
      id: "icheon-termeden",
      order: 2,
      time: "09:30",
      title: "이천 테르메덴",
      categoryLabel: "온천·워터파크",
      durationLabel: "180분",
      image: {
        src: "/images/discovery/reference-main/icheon-termeden.png",
        alt: "온천 수영장이 있는 이천 테르메덴",
      },
      transfer: { distanceLabel: "0.5km", durationLabel: "차량 2분" },
    },
    {
      id: "icheon-city-museum",
      order: 3,
      time: "12:30",
      title: "이천 시립박물관",
      categoryLabel: "관람",
      durationLabel: "60분",
      image: {
        src: "/images/themes/theme-culture-hanok.png",
        alt: "전통 건축과 문화 전시 공간",
      },
      transfer: { distanceLabel: "3.1km", durationLabel: "차량 8분" },
    },
    {
      id: "haeju-cold-noodles",
      order: 4,
      time: "15:00",
      title: "해주냉면",
      categoryLabel: "저녁 식사",
      durationLabel: "60분",
      image: {
        src: "/images/festivals/icheon-rice-cultural-festival/food-experience.png",
        alt: "이천의 지역 식재료로 차린 저녁 식사",
      },
      transfer: { distanceLabel: "2.3km", durationLabel: "차량 7분" },
    },
    {
      id: "seolbong-park",
      order: 5,
      time: "17:00",
      title: "설봉공원",
      categoryLabel: "산책·휴식",
      durationLabel: "60분",
      image: {
        src: "/images/welcome-lake-desktop.png",
        alt: "호수와 산책로가 어우러진 설봉공원",
      },
    },
  ],
} as const satisfies SavedCourseFixture;

export function getSavedCourseById(courseId: string) {
  return courseId === savedCourseMock.id ? savedCourseMock : undefined;
}
