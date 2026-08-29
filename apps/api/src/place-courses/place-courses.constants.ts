/// tour_courses.source 및 응답 source 값
export const TOUR_API_SOURCE = "TOUR_API" as const;

/// areaBasedList2 여행코스 목록의 페이지당 요청 수
export const COURSE_PAGE_SIZE = 100;
/// 동기화가 훑는 최대 페이지 수(전국 여행코스는 1,100건 남짓이다)
export const MAX_COURSE_PAGES = 50;
/// 코스 1건을 상세 조회할 때 호출 사이 간격(ms)
export const COURSE_DETAIL_THROTTLE_MS = 120;
/// 상세 화면 코스추천 탭에 노출하는 최대 코스 수
export const MAX_COURSES_PER_PLACE = 5;
