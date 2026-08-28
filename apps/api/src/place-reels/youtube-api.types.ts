/// YouTube에서 확정한 릴스 1건 (필터·정렬 완료 상태)
export type YouTubeShort = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSeconds: number;
  viewCount: number | null;
  publishedAt: Date;
};

export type YouTubeSearchInput = {
  /// 검색 질의어 (관광지명 + 지역명 등)
  query: string;
  /// 저장 상한. 필터 후 이 개수까지만 반환한다.
  maxResults: number;
};

export interface YouTubeApiPort {
  searchPlaceShorts(
    input: YouTubeSearchInput,
  ): Promise<readonly YouTubeShort[]>;
}

export type YouTubeApiFetch = (
  input: URL,
  init?: RequestInit,
) => Promise<Response>;

export type YouTubeApiSleep = (milliseconds: number) => Promise<void>;
