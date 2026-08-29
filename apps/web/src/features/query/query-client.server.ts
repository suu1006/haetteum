import { cache } from "react";

import { makeQueryClient } from "@/features/query/query-client";

/**
 * 한 요청 안에서 generateMetadata와 페이지 렌더가 같은 캐시를 공유한다.
 * 이게 없으면 축제 상세 한 번 여는 데 API 호출이 두 번(= TourAPI 호출 여섯 번) 나간다.
 */
export const getServerQueryClient = cache(makeQueryClient);
