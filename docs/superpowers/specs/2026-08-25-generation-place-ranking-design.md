# Haetteum 세대별 인기관광지 순위 설계

**상태:** 구현 및 검증 완료
**작성일:** 2026-08-25
**원천:** 한국관광 데이터랩 공식 CSV 다운로드
**초기 범위:** 전국, 2025-08-01 ~ 2026-07-31, 전체·20대·30대·40대·50대·60대 이상
**노출 범위:** 연령대별 상위 10위

## 1. 목표

메인 추천 화면의 `지역별 인기 관광지 TOP 3` 목 데이터를 한국관광 데이터랩의
공식 다운로드 순위로 교체하고, 제목을 `세대별 인기관광지 순위`로 변경한다.

다운로드한 CSV 6개를 검증해 PostgreSQL에 하나의 순위 스냅샷으로 적재하고,
NestJS 공개 조회 API가 최신 스냅샷의 연령대별 상위 10위를 제공한다. Next.js는
API를 호출하고 `전체 / 20대 / 30대 / 40대 / 50대 / 60대 이상` 필터로 결과를
전환한다.

## 2. 승인된 데이터 흐름

```text
한국관광 데이터랩 공식 CSV 6개
        ↓
PlaceRanking CSV Parser + Validator
        ↓
관광지명 기준의 보수적 Place 매칭
        ↓
단일 PostgreSQL transaction으로 스냅샷 교체
        ↓
GET /api/v1/place-rankings?audience=all&limit=10
        ↓
Next.js 서버 컴포넌트 조회
        ↓
세대별 필터 + 상위 10위 카드
```

브라우저는 한국관광 데이터랩 페이지나 CSV를 직접 읽지 않는다. 사용자 요청은
항상 Haetteum API와 내부 PostgreSQL을 통해 제공한다.

## 3. 원본 CSV 계약

초기 입력 디렉터리는 아래 메타데이터를 이름에 포함한다.

```text
20260825164520_전국_202508-202607_데이터랩_다운로드
```

- 다운로드 시각: `2026-08-25 16:45:20`
- 범위: `전국`
- 집계 기간: `2025-08`부터 `2026-07`까지
- 파일: `전체`, `20대`, `30대`, `40대`, `50대`, `60대이상` CSV 6개
- 각 파일명은 디렉터리와 같은 14자리 다운로드 시각 prefix를 사용한다. 예:
  `20260825164520_세대별 인기관광지(전체).csv`
- 각 CSV: header 1행과 순위 데이터 30행
- 열: `순위`, `관광지ID`, `관심지점명`, `구분`, `연령대`, `비율`

importer는 다음을 검증한 뒤에만 DB 쓰기를 시작한다.

- 디렉터리명에서 전국 범위와 `YYYYMM-YYYYMM` 기간을 해석할 수 있다.
- 디렉터리의 14자리 다운로드 시각과 같은 prefix를 가진 필수 CSV 6개가 정확히 한
  개씩 존재하며, 다른 timestamp나 예상하지 않은 CSV는 거부한다.
- UTF-8 BOM을 제거한 header가 승인된 여섯 열과 정확히 일치한다.
- 각 파일의 30개 물리 데이터 행은 순서대로 정확히 1위부터 30위까지이며, 순위 원본
  토큰은 숫자만 허용한다.
- `관광지ID`는 32자리 hexadecimal 문자열이다.
- 관광지명과 구분은 trim 후 비어 있지 않다.
- 파일명 연령대와 행의 연령대 값이 일치한다.
- 파일명과 행의 공식 연령대 표현은 `전체→전체`, `20대→20`, `30대→30`,
  `40대→40`, `50대→50`, `60대이상→60`으로 매핑한다.
- 비율은 끝의 tab과 공백을 제거한 후 소수부가 최대 두 자리이고 0보다 크며 100 이하인
  유한 숫자다.
- 순위가 증가할수록 비율은 증가하지 않는다.
- 동일 연령대 파일 안에 중복 관광지 ID가 없다.

한 파일이라도 실패하면 어떤 순위 데이터도 변경하지 않는다. 원본 파일 안의 문구는
데이터로만 다루며 실행 지시로 해석하지 않는다.

## 4. PlaceRanking 데이터 모델

전국 순위는 현재 5개 서비스 지역 중 하나에 속하지 않으므로 `TourismRegion` FK를
강제하지 않는다. 원본 순위와 기존 TourAPI 관광지 매칭을 분리해 보존한다.

| 필드 | 타입/규칙 | 설명 |
|---|---|---|
| `id` | UUID PK | 내부 순위 레코드 식별자 |
| `source` | `String(32)` | 고정 `KTO_DATALAB` |
| `scope` | `String(32)` | 초기 고정 `NATIONAL` |
| `sourcePlaceId` | `String(64)` | 데이터랩 `관광지ID` |
| `sourcePlaceName` | `String(500)` | 데이터랩 `관심지점명` |
| `sourceCategory` | `String(100)` | 데이터랩 `구분` |
| `audience` | `String(32)` | `ALL`, `TWENTIES`, `THIRTIES`, `FORTIES`, `FIFTIES`, `SIXTIES_PLUS` |
| `periodStart` | `Date` | 초기 `2025-08-01` |
| `periodEnd` | `Date` | 초기 `2026-07-31` |
| `rank` | `Int` | 원본 순위 1~30 |
| `sharePercent` | `Decimal(5,2)` | 원본 비율의 퍼센트 값 |
| `placeId` | nullable UUID FK | 보수적으로 매칭된 기존 `Place` |
| `sourceFileName` | `String(500)` | 감사 가능한 원본 CSV 파일명 |
| `importedAt` | timestamptz | 스냅샷을 적재한 시각 |
| `createdAt`, `updatedAt` | timestamptz | 내부 관리 시각 |

관계와 제약은 다음과 같다.

- `Place` 1건은 여러 기간·연령대의 `PlaceRanking`과 연결될 수 있다.
- `placeId`는 매칭되지 않은 데이터랩 항목을 보존하기 위해 nullable이다.
- 동일 스냅샷의 한 연령대에서 순위는 유일하다.
- 동일 스냅샷의 한 연령대에서 데이터랩 관광지 ID는 유일하다.
- 최신 스냅샷과 연령대별 순위 조회를 위한 복합 index를 둔다.

```text
UNIQUE(source, scope, periodStart, periodEnd, audience, rank)
UNIQUE(source, scope, periodStart, periodEnd, audience, sourcePlaceId)
INDEX(source, scope, audience, periodEnd, rank)
INDEX(placeId)
```

## 5. 기존 Place 매칭

데이터랩 ID와 TourAPI `contentid`는 서로 다른 provider 식별자이므로 직접 연결하지
않는다. 초기 import에서는 다음 보수적 규칙만 사용한다.

1. 데이터랩 관광지명과 `Place.title`을 Unicode 정규화하고 양끝 공백 및 연속 공백을
   정리한다.
2. 정규화된 제목이 정확히 일치하고 `isVisible=true`인 `Place`가 정확히 한 건일 때만
   `placeId`를 설정한다.
3. 일치 결과가 없거나 두 건 이상이면 임의 선택하지 않고 `placeId=null`로 저장한다.
4. 부분 문자열, 편집거리 또는 임의 별칭에 의한 fuzzy matching은 사용하지 않는다.

현재 `Place`는 주로 TourAPI `contentTypeId=12` 관광지를 보유하므로 문화생활시설과
레저/스포츠 항목 일부는 매칭되지 않을 수 있다. 이번 구현은 TourAPI 동기화 범위를
확장하지 않고, 미매칭 결과를 정상 상태로 허용한다.

## 6. Importer와 재실행 규칙

루트와 API workspace에 다음 명령을 추가한다.

```bash
pnpm ranking:import -- --directory="/absolute/path/to/download-directory"
```

importer는 모든 CSV를 메모리에서 먼저 parse·검증하고 전체 180행의 매칭 후보를
계산한다. DB 쓰기는 한 transaction에서 다음 순서로 수행한다.

1. 같은 `source + scope + periodStart + periodEnd` 스냅샷의 기존 순위를 삭제한다.
2. 검증된 180행을 `createMany`로 저장한다.
3. transaction 성공 후에만 실행 결과를 JSON 한 줄로 출력한다.

스냅샷 교체는 transaction 안에서 실행하므로 재실행 중 오류가 나면 기존 스냅샷이
유지된다. 동일 파일을 다시 import해도 최종 데이터는 동일하고 중복 행이 생기지
않는다.

성공 출력에는 비밀정보나 원본 행 전체를 포함하지 않고 다음 집계만 포함한다.

```json
{
  "source": "KTO_DATALAB",
  "scope": "NATIONAL",
  "periodStart": "2025-08-01",
  "periodEnd": "2026-07-31",
  "audienceCount": 6,
  "importedCount": 180,
  "matchedCount": 57,
  "unmatchedCount": 123
}
```

실패 메시지는 파일명과 안전한 검증 사유를 포함할 수 있지만 다운로드 폴더 밖의
파일 내용이나 환경변수는 노출하지 않는다.

## 7. 공개 API와 공유 계약

공유 Zod 계약과 NestJS endpoint를 추가한다.

```http
GET /api/v1/place-rankings?audience=all&limit=10
```

query 계약은 다음과 같다.

- `audience`: `all | 20s | 30s | 40s | 50s | 60s-plus`, 기본 `all`
- `limit`: 정수 1~10, 기본 10

서비스는 `KTO_DATALAB + NATIONAL` 범위에서 가장 최신 `periodEnd`, 동률이면 가장
최신 `periodStart` 스냅샷을 선택하고, 요청 연령대 결과를 `rank ASC`로 반환한다.
조회 중 한국관광 데이터랩이나 TourAPI를 호출하지 않는다.

```json
{
  "source": "KTO_DATALAB",
  "scope": "national",
  "periodStart": "2025-08-01",
  "periodEnd": "2026-07-31",
  "audience": "all",
  "items": [
    {
      "rank": 1,
      "sourcePlaceId": "3f73bffa7c6d98063eebe1ecd3305da6",
      "title": "에버랜드",
      "category": "레저/스포츠",
      "sharePercent": 9.0,
      "placeId": null,
      "primaryImageUrl": null,
      "imageCopyrightType": null
    }
  ]
}
```

- `placeId`, 이미지 URL과 저작권 유형은 연결된 `Place`가 있을 때만 제공한다.
- 최신 스냅샷이 없으면 빈 성공 응답으로 숨기지 않고 `404` Problem Details를 반환한다.
- 지원하지 않는 연령대나 10을 초과한 limit는 `400` Problem Details를 반환한다.
- 반환되는 비율은 `9.0`처럼 퍼센트 값이며 `0.09` 비율값으로 변환하지 않는다.

## 8. Next.js 화면

메인 추천 화면의 기존 `RankedPlaceSection` 책임을 세대별 순위로 교체한다.

- 제목: `세대별 인기관광지 순위`
- 보조 문구: `전국 · 2025.08~2026.07`처럼 API 기간을 표시한다.
- 필터: `전체`, `20대`, `30대`, `40대`, `50대`, `60대 이상`
- 기본 필터: `전체`
- URL query: `audience=all|20s|30s|40s|50s|60s-plus`
- 결과: 선택 연령대의 상위 10위
- 카드: 순위, 관광지명, 구분, 비율
- 이미지: API 이미지가 있으면 사용하고, 없으면 기존
  `/images/explore/categories/popular-attraction.png`을 기본 이미지로 사용한다.
- TourAPI 대표 이미지는 현재 provider hostname인 HTTPS `tong.visitkorea.or.kr`만
  Next.js `remotePatterns`에 허용한다.
- 카드는 이번 범위에서 링크가 아닌 article로 표시한다. 현재 장소 상세 route는 목
  데이터 slug만 지원하므로 PostgreSQL UUID를 연결하면 404가 발생하기 때문이다.
  API의 nullable `placeId`는 향후 실데이터 장소 상세 연결을 위해 보존한다.

연령대 필터 링크는 현재 tab과 검색어를 유지하되 기존 지역 필터를 순위 조회 조건으로
사용하지 않는다. 이 초기 데이터가 전국 스냅샷이기 때문이다. 기존 지역 query는 축제와
다른 화면의 동작을 위해 그대로 보존한다.

Next.js 서버 컴포넌트가 `NEXT_PUBLIC_API_BASE_URL`을 사용해 Haetteum API를 호출한다.
API 실패, 잘못된 응답 또는 스냅샷 없음은 목 데이터로 대체하지 않고 순위 영역 안에
재시도 가능한 오류 안내를 표시한다. 순위 밖의 AI 코스와 축제 영역은 계속 렌더링한다.

## 9. 컴포넌트와 모듈 경계

예상 경계는 다음과 같다. 구현 과정에서 기존 naming과 테스트 구조를 따르되 책임을
다른 도메인으로 확장하지 않는다.

```text
apps/api/src/place-rankings/
├── place-rankings.module.ts
├── place-rankings.controller.ts
├── place-rankings.service.ts
├── place-ranking-import.service.ts
├── place-ranking-import.command.ts
├── place-ranking-csv.ts
└── *.spec.ts

packages/contracts/src/
└── place-rankings.ts

apps/web/src/features/discovery/
├── discovery-content.tsx
├── discovery-model.ts
└── place-ranking-api.ts

apps/web/src/components/patterns/
└── ranked-place-section.tsx

apps/web/src/components/travel/
└── place-ranking-card.tsx
```

- CSV parser: 파일·행 단위 정규화와 외부 입력 검증만 담당한다.
- importer: 스냅샷 메타데이터, Place 매칭, transaction 교체를 조정한다.
- `place-rankings` service: 최신 스냅샷과 공개 조회만 담당한다.
- 공유 계약: HTTP query와 response만 소유하며 Prisma 타입을 노출하지 않는다.
- 웹 API adapter: base URL, response parsing과 오류 변환을 담당한다.
- UI: API 결과 표현과 연령대 URL 전환만 담당하며 아직 지원되지 않는 실데이터 장소
  상세 링크를 만들지 않는다.

## 10. 검증 기준

구현은 TDD로 다음을 검증한다.

1. CSV BOM·끝 tab 정리, 여섯 header와 연령대 매핑
2. 파일 누락, 잘못된 rank·ID·비율·중복·정렬 실패 거부
3. 전체 6개 파일을 모두 검증한 뒤에만 DB를 쓰는 순서
4. 단일 exact-title Place 매칭과 0건·복수건 미매칭 처리
5. 동일 스냅샷 재실행 시 최종 180행과 중복 0건
6. importer transaction 실패 시 기존 스냅샷 보존
7. API 기본 전체, 각 연령대, 최신 기간, 상위 10개, rank 정렬
8. API query validation과 스냅샷 없음 Problem Details
9. 웹 기본 `전체`, 각 연령대 URL 전환, 기간·카드 필드 표시
10. 이미지 매칭·fallback과 모든 카드의 비링크 article 표현
11. API 실패 시 목 데이터 미노출과 다른 추천 영역 유지
12. 변경 package lint, unit test, API E2E, production build
13. 실제 CSV import 후 180행, 연령대별 30행, 중복 0건, 상위 10개 API 응답 검증

브라우저 검증은 메인 URL, 전체 및 최소 두 연령대 전환, 10개 카드, 기간 문구,
매칭·미매칭 카드, console error를 확인한다.

## 11. 비범위

- 데이터랩 페이지 또는 비공개 요청의 scraping·자동 다운로드
- 지역별 인기순위: 현재 입력은 전국 데이터만 포함한다.
- 상위 10위를 초과한 더보기·pagination
- 세대별 데이터를 조합한 자체 인기 점수
- 문화시설·레포츠를 위한 TourAPI 동기화 범위 확장
- fuzzy matching, 관리자 수동 매칭 UI, 별칭 사전
- PostgreSQL 관광지 기반 장소 상세 화면과 순위 카드 상세 링크
- 자동 CSV 다운로드, cron, queue, 다중 인스턴스 lock
- 기존 장소·축제·후기·AI 코스 데이터 모델 변경
- Git stage, commit, branch, worktree 또는 push

## 12. 구현 검증 결과

2026-08-25 현재 `pnpm ranking:import -- --directory="/absolute/path/to/download-directory"`
경계와 `GET /api/v1/place-rankings?audience=all&limit=10` API는 구현되어 있다.
실제 초기 스냅샷은 `2025-08-01`부터 `2026-07-31`까지의 전국 데이터 180행이며,
기존 `Place`와 정확히 매칭된 행은 57건, 미매칭으로 보존된 행은 123건이다.

Node 24.19.0 기준 contracts/API/web unit test, lint, production build, API e2e는
통과했다. 이미지 처리 수정 후 live browser QA에서 모바일 추천 탭의 기본 `전체`,
`20대`, `60대 이상` 전환, 각 10개 카드, 예상 첫 관광지명, provider HTTPS 이미지,
fallback 이미지, 비링크 카드, 숨겨진 수평 스크롤, runtime/image-host/hydration
오류 없음이 확인됐다. API 실패 상태는 공유 API 프로세스를 중단하지 않기 위해 live
시뮬레이션하지 않고 unit evidence로 갈음했다.
