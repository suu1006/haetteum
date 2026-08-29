/// 주변 장소 검색 결과를 재사용하는 시간(ms).
/// 같은 관광지를 여러 사용자가 잇달아 조회해도 이 시간 동안은 카카오 API를 다시 부르지 않는다.
export const NEARBY_CACHE_TTL_MS = 10 * 60_000;

/// 즉석 생성 코스(관광지→명소→카페→밥집) 결과를 재사용하는 시간(ms)
export const GENERATED_COURSE_CACHE_TTL_MS = 10 * 60_000;
/// 코스 슬롯 하나당 후보로 가져오는 개수 — 기준 관광지 자기 자신을 걸러내고도
/// 채택할 후보가 남도록 여유를 둔다
export const GENERATED_COURSE_CANDIDATE_SIZE = 5;
/// 후보가 기준 관광지 자기 자신인지 판단하는 거리 임계값(m)
export const GENERATED_COURSE_SELF_MATCH_RADIUS_METERS = 50;
