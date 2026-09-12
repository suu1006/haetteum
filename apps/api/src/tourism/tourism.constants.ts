export const TOUR_API_PORT = Symbol("TOUR_API_PORT");
export const FESTIVAL_API_PORT = Symbol("FESTIVAL_API_PORT");
export const COURSE_API_PORT = Symbol("COURSE_API_PORT");
export const TOUR_API_FETCH = Symbol("TOUR_API_FETCH");
export const TOUR_API_SLEEP = Symbol("TOUR_API_SLEEP");

export const TOUR_API_SOURCE = "TOUR_API";
// Nationwide ingestion uses legal district codes, not legacy search areaCode values.
export const TOURISM_REGION_CODES = [
  "11",
  "41",
  "51",
  "26",
  "50",
  "27",
  "28",
  "29",
  "30",
  "31",
  "36",
  "43",
  "44",
  "52",
  "46",
  "47",
  "48",
] as const;

/**
 * 서비스 지역(서울·경기·강원·부산·제주)의 TourAPI 레거시 areaCode.
 * 키워드 검색은 지역을 좁혀야 브랜드 매장 같은 동명 잡음이 걷힌다 —
 * 예: "코엑스"는 전국 검색에서 코엑스몰 입점 매장이 앞을 채운다.
 */
export const TOURISM_SEARCH_AREA_CODES = ["1", "31", "32", "6", "39"] as const;

/**
 * 축제 전체 동기화가 훑는 고정 기간(TourAPI searchFestival2 eventStartDate/eventEndDate).
 * 수동 명령과 일 배치가 같은 범위를 봐야 비표출 전환(deactivateMissing) 기준이 흔들리지 않는다.
 */
export const FESTIVAL_SYNC_RANGE = {
  eventStartDate: "20260101",
  eventEndDate: "20271231",
} as const;
