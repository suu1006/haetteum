import type { TourApiPlace } from "./tour-api.types.js";

/**
 * DataLab 랭킹 명칭을 TourAPI 키워드 검색에 넣기 위한 후보들을 만든다.
 * 원본 → 괄호 제거 → "제N전시장/관" 류 접미 제거 → "N호점/지점/점" 접미 제거 순으로
 * 점점 더 느슨한 후보를 시도한다(중복 제거, 원본 포함).
 */
export function buildSearchKeywords(placeName: string): string[] {
  const trimmed = placeName.normalize("NFC").trim();
  const keywords = new Set<string>([trimmed]);

  const withoutParenthetical = trimmed.replace(/\s*\([^)]*\)\s*$/u, "").trim();
  if (withoutParenthetical) keywords.add(withoutParenthetical);

  const withoutOrdinalFacility = withoutParenthetical.replace(
    /제?\d+(전시장|공연장|경기장|주차장|터미널|관)$/u,
    "",
  );
  if (withoutOrdinalFacility) keywords.add(withoutOrdinalFacility);

  const withoutBranchSuffix = withoutOrdinalFacility.replace(
    /\d*(호점|지점|점)$/u,
    "",
  );
  if (withoutBranchSuffix.length >= 2) keywords.add(withoutBranchSuffix);

  return [...keywords].filter((keyword) => keyword.length > 0);
}

const NOISE_CONTENT_TYPE_IDS = new Set(["38", "39"]);

function normalizeForMatch(value: string): string {
  return value.normalize("NFC").replace(/\s+/gu, "").toLowerCase();
}

function hasImage(place: TourApiPlace): boolean {
  return (place.firstimage ?? "") !== "" || (place.firstimage2 ?? "") !== "";
}

export type PickCandidateOptions = {
  /**
   * 이미지 없는 후보를 배제할지 여부. 대표 이미지를 고를 때는 필수(기본값)지만,
   * 상세 화면으로 보낼 관광지를 고를 때는 이미지가 없어도 정당한 매칭이다.
   */
  requireImage?: boolean;
  /**
   * 이름이 정확히 같은 후보만 받을지 여부. 상세 화면으로 보낼 관광지는 이 조건이
   * 필요하다 — "킨텍스제2전시장"이 이름을 확장한 "킨텍스 바이 케이트리"(숙박)로
   * 이어지면 사용자를 엉뚱한 장소로 보내게 된다. 대표 이미지 선정은 느슨해도
   * 충분하므로 기본값은 false다.
   */
  requireExactTitle?: boolean;
};

/**
 * 검색 결과 중 검색에 사용한 키워드와 실제로 관련 있어 보이는 항목을 고른다.
 * `searchedKeyword`는 `buildSearchKeywords`가 만든 후보 중 이번에 검색을 돌린 것이어야
 * 한다 — 접미사를 뗀 완화 키워드일 수 있으므로, 원본 전체명이 아니라 이 키워드와
 * 비교해야 TourAPI의 짧은 공식 명칭도 정당하게 매칭된다.
 * 쇼핑/음식점 콘텐츠 타입은 브랜드 매장이 섞여 들어오므로 제외하고,
 * 정규화한 제목이 검색 키워드와 한쪽을 포함하는 관계일 때만(2자 이상) 채택한다.
 * TourAPI 검색은 제목순으로 돌아오므로 이름이 정확히 같은 후보를 먼저 훑는다 —
 * 그러지 않으면 "코엑스"가 "코엑스 아쿠아리움"에 밀린다.
 * 못 찾으면 null — 틀린 곳에 연결하는 것보다 비워두는 쪽을 택한다.
 */
export function pickRelevantCandidate(
  candidates: readonly TourApiPlace[],
  searchedKeyword: string,
  options: PickCandidateOptions = {},
): TourApiPlace | null {
  const requireImage = options.requireImage ?? true;
  const target = normalizeForMatch(searchedKeyword);

  if (target.length < 2) return null;

  const eligible = candidates.filter((candidate) => {
    if (NOISE_CONTENT_TYPE_IDS.has(candidate.contenttypeid)) return false;
    if (requireImage && !hasImage(candidate)) return false;

    return normalizeForMatch(candidate.title).length >= 2;
  });

  const exact = eligible.find(
    (candidate) => normalizeForMatch(candidate.title) === target,
  );

  if (exact !== undefined) return exact;
  if (options.requireExactTitle === true) return null;

  return (
    eligible.find((candidate) => {
      const title = normalizeForMatch(candidate.title);
      return title.startsWith(target) || target.startsWith(title);
    }) ?? null
  );
}
