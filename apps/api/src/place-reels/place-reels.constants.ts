export const YOUTUBE_API_PORT = Symbol("YOUTUBE_API_PORT");
export const YOUTUBE_API_FETCH = Symbol("YOUTUBE_API_FETCH");
export const YOUTUBE_API_SLEEP = Symbol("YOUTUBE_API_SLEEP");

/// place_reels.provider 및 응답 source 값
export const YOUTUBE_SOURCE = "YOUTUBE" as const;
/// 인기관광지 순위 원본(한국관광 데이터랩)
export const DATALAB_SOURCE = "KTO_DATALAB" as const;
export const NATIONAL_SCOPE = "NATIONAL" as const;

/// 릴스로 인정하는 최대 영상 길이(초)
export const SHORT_MAX_SECONDS = 60;
/// 관광지 1곳에 저장하는 릴스 최대 개수
export const MAX_REELS_PER_PLACE = 10;
/// search.list 한 번에 요청하는 후보 수
export const SEARCH_CANDIDATE_COUNT = 20;
/// 배치가 한 번에 처리하는 상위 관광지 기본 수
export const DEFAULT_RANKED_PLACE_LIMIT = 20;
/// 배치에서 관광지 간 호출 간격(ms)
export const REFRESH_THROTTLE_MS = 300;

/// 개인정보 보호 임베드 호스트
export const YOUTUBE_EMBED_ORIGIN = "https://www.youtube-nocookie.com";

export function youtubeEmbedUrl(videoId: string): string {
  return `${YOUTUBE_EMBED_ORIGIN}/embed/${videoId}`;
}
