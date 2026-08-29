import { isServer, QueryClient } from "@tanstack/react-query";

/**
 * 서버에서 채워 넣은 캐시가 하이드레이션 직후 곧바로 다시 조회되지 않도록
 * 전역 staleTime을 둔다. 0이면 브라우저가 마운트하자마자 같은 요청을 한 번 더 보낸다.
 */
const DEFAULT_STALE_TIME_MS = 60_000;

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * 브라우저에서는 하나의 캐시를 계속 재사용해야 페이지를 오갈 때 캐시가 살아남는다.
 * 서버 렌더링 중에는 요청마다 새 캐시를 만들어 사용자 간 데이터 혼입을 막는다.
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();

  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
