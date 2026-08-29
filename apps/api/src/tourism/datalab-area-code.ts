/**
 * 한국관광 데이터랩 시도명을 TourAPI(KorService2) 레거시 areaCode로 매핑한다.
 * 키워드 검색(searchKeyword2)의 지역 범위를 좁혀 오탐을 줄이는 용도이며,
 * 매칭되지 않으면 지역 조건 없이 검색한다.
 */
const AREA_CODE_BY_PREFIX: ReadonlyArray<readonly [string, string]> = [
  ["서울", "1"],
  ["인천", "2"],
  ["대전", "3"],
  ["대구", "4"],
  ["광주", "5"],
  ["부산", "6"],
  ["울산", "7"],
  ["세종", "8"],
  ["경기", "31"],
  ["강원", "32"],
  ["충청북", "33"],
  ["충북", "33"],
  ["충청남", "34"],
  ["충남", "34"],
  ["경상북", "35"],
  ["경북", "35"],
  ["경상남", "36"],
  ["경남", "36"],
  ["전라북", "37"],
  ["전북", "37"],
  ["전라남", "38"],
  ["전남", "38"],
  ["제주", "39"],
];

export function resolveDatalabAreaCode(
  provinceName: string,
): string | undefined {
  const normalized = provinceName.normalize("NFC").trim();

  for (const [prefix, areaCode] of AREA_CODE_BY_PREFIX) {
    if (normalized.startsWith(prefix)) {
      return areaCode;
    }
  }

  return undefined;
}
