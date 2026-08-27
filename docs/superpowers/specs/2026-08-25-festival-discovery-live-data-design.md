# Haetteum 축제 탐색 실데이터 전환 설계

**상태:** 구현 및 검증 완료  
**작성일:** 2026-08-25  
**범위:** PostgreSQL 축제 조회 API, 공유 계약, 축제 탭 서버 로딩, 실데이터 UI,
브라우저 검증

## 1. 목표

메인 화면의 `관광 축제` 탭에서 사용 중인 `festivalDiscovery` mock을 제거하고,
TourAPI에서 동기화한 PostgreSQL `festivals` 데이터를 NestJS API를 통해 표시한다.

축제 순위는 외부 인기점수로 오해될 수 있는 값을 만들지 않는다. 서비스가 보유한
실제 행사 기간만 사용해 현재 방문 가능한 축제와 곧 시작하는 축제를 결정론적으로
정렬한다.

다른 추천·관광지·테마 탭과 축제 상세 페이지의 mock은 이번 범위에서 유지한다.

## 2. 선택한 접근

하나의 축제 탐색 endpoint가 선택 지역의 순위와 목록을 함께 반환한다.

```text
Next.js DiscoveryContent
  → GET /api/v1/festivals/discovery?region=all&page=1&pageSize=20
  → FestivalsController
  → FestivalsService
  → Prisma Festival
  → PostgreSQL
```

대안으로 순위·목록 endpoint를 분리하면 같은 날짜·지역 조건을 두 번 호출하고 일관성
처리가 늘어난다. Next.js가 DB를 직접 조회하는 방식은 기존
`Next.js → NestJS → Prisma → PostgreSQL` 경계를 위반하므로 사용하지 않는다.

## 3. 공유 HTTP 계약

`packages/contracts/src/festivals.ts`에 다음 계약을 추가한다.

### 요청

```http
GET /api/v1/festivals/discovery?region=all&page=1&pageSize=20
```

- `region`: `all | jeju | seoul | busan | gangwon | gyeongju | jeonju`
- `page`: 기본 1, 양의 정수
- `pageSize`: 기본 20, 1~40

### 응답

```json
{
  "asOfDate": "2026-08-25",
  "region": "all",
  "ranking": [
    {
      "id": "internal-uuid",
      "externalId": "141268",
      "rank": 1,
      "title": "서천 홍원항 자연산 전어 꽃게 축제",
      "status": "ONGOING",
      "eventStartDate": "2026-08-22",
      "eventEndDate": "2026-09-06",
      "address": "충청남도 서천군 홍원길 88",
      "categoryLabel": "지역특산물축제",
      "primaryImageUrl": "https://tong.visitkorea.or.kr/..."
    }
  ],
  "items": [],
  "page": 1,
  "pageSize": 20,
  "totalCount": 0
}
```

`ranking`은 최대 3건이며 선택 지역과 같은 조건을 사용한다. `items`는 페이지네이션된
목록이다. 이미지와 주소는 provider에 없을 수 있으므로 nullable이다.

응답은 Zod schema로 API와 Next.js 양쪽에서 검증한다. provider 원본 DTO나 Prisma
타입을 공유 패키지에 노출하지 않는다.

## 4. 날짜와 정렬 규칙

조회 기준일은 API 서버의 `Asia/Seoul` 달력 날짜다. DB의 `eventStartDate`와
`eventEndDate`는 날짜 전용 컬럼이며 다음 조건을 적용한다.

- 종료된 축제 제외: `eventEndDate < asOfDate`
- 진행 중: `eventStartDate <= asOfDate <= eventEndDate`
- 예정: `eventStartDate > asOfDate`

결정론적 정렬은 다음과 같다.

1. 진행 중 축제
2. 진행 중에서는 `eventEndDate ASC`
3. 예정 축제
4. 예정에서는 `eventStartDate ASC`
5. 같은 날짜에서는 `externalId ASC`

Prisma에서 진행 중과 예정 축제를 각각 날짜순으로 조회한 뒤 service에서 두 결과를
이어 붙인다. 인기·저장·후기 점수는 계산하지 않는다.

목록 페이지와 순위가 같은 전체 정렬을 공유하도록 service의 순수 정렬·페이지 함수로
검증한다. `page`가 뒤쪽이어도 `ranking`은 전체 조건의 첫 3건으로 유지한다.

## 5. 지역 필터

UI 지역 식별자를 TourAPI 법정동 코드에 다음처럼 매핑한다.

| UI | 조건 |
|---|---|
| `all` | 지역 조건 없음 |
| `jeju` | `providerRegionCode=50` |
| `seoul` | `providerRegionCode=11` |
| `busan` | `providerRegionCode=26` |
| `gangwon` | `providerRegionCode=51` |
| `gyeongju` | `providerRegionCode=47 AND providerDistrictCode=130` |
| `jeonju` | `providerRegionCode=52 AND providerDistrictCode IN (111, 113)` |

매핑은 `FestivalsService`의 명시적 상수로 관리하며 주소 문자열 검색에 의존하지 않는다.
현재 DB 실데이터에서 경주는 `47/130`, 전주는 `52/111·113`으로 확인됐다.

## 6. 표시 데이터

### 순위 영역

- 제목: `지금 만날 수 있는 축제`
- rank, 축제명, 실제 기간, 진행 상태, 주소, 대표 이미지 표시
- 기존 Embla 순환·스와이프·3초 autoplay와 reduced-motion 동작 유지
- `인기 %`, 저장 수, 후기 수, 임시 하트 버튼 제거
- mock 축제 상세로 연결되는 `축제 보기` 제거
- CTA 공간에는 `진행 중` 또는 `곧 시작` 상태와 날짜를 표시

### 지역별 목록

- 실제 축제명, 기간, 상태, 주소, 대표 이미지, TourAPI 분류 표시
- 임의 설명, 저장 수, 임의 태그 제거
- 선택한 모든 지역에서 실데이터 목록 또는 명시적 빈 상태 표시
- 종료된 축제는 API 단계에서 제외하므로 카드에 `종료` 상태를 만들지 않는다.

`category3`은 다음 공식 분류 표시명으로 변환한다.

- `EV010100`: 문화관광축제
- `EV010200`: 문화예술축제
- `EV010300`: 지역특산물축제
- `EV010400`: 전통역사축제
- `EV010500`: 생태자연축제
- `EV010600`: 기타축제
- 그 외 또는 null: `축제`

주소는 provider 원문을 사용하며, 없으면 `지역 정보 없음`으로 표시한다.

## 7. Next.js 데이터 로딩

`DiscoveryContent`는 `query.tab === "festivals"`일 때만 NestJS endpoint를 호출한다.
기존 `NEXT_PUBLIC_API_BASE_URL`을 server-side fetch의 base URL로 사용하고,
실시간 축제 상태가 오래 캐시되지 않도록 현재 Next.js 16 공식 문서에 맞는
비캐시 요청을 사용한다.

응답은 `FestivalDiscoveryResponseSchema`로 검증한 뒤 웹 표시 모델로 변환한다.
`mainDiscoveryMock` 전체를 삭제하지 않고 `festivalDiscovery` 필드만 실데이터 결과로
교체한다. 다른 탭에서는 축제 API를 호출하지 않는다.

API 설정 누락, HTTP 실패, 응답 schema 실패 시 축제 mock으로 대체하지 않는다.
지역 필터는 유지하고 다음 오류 상태를 표시한다.

```text
축제 정보를 불러오지 못했어요.
잠시 후 다시 시도해 주세요.
```

실제 결과가 0건이면 오류와 구분해 `선택한 지역에 예정된 축제가 없어요.`를 표시한다.

## 8. 이미지

현재 적재 데이터 410건 중 409건의 대표 이미지는
`https://tong.visitkorea.or.kr`에서 제공된다. `next.config.ts`에 HTTPS
`remotePatterns`를 이 hostname으로만 제한해 추가한다.

`primaryImageUrl=null`이거나 로딩에 실패한 경우 외부 URL을 임의 이미지로 대체하지
않고 색상 면과 축제 아이콘으로 구성된 중립 placeholder를 표시한다. 이미지 alt는
`{축제명} 대표 이미지`로 생성한다.

## 9. 파일 경계

### Backend / contracts

- 생성: `packages/contracts/src/festivals.ts`
- 수정: `packages/contracts/src/index.ts`, `contracts.test.ts`
- 생성: `apps/api/src/festivals/festivals.module.ts`
- 생성: `apps/api/src/festivals/festivals.controller.ts`
- 생성: `apps/api/src/festivals/festivals.service.ts`
- 생성: 각 controller/service spec
- 수정: `apps/api/src/app.module.ts`
- 수정: API E2E에 축제 endpoint 계약 추가

### Web

- 생성: `apps/web/src/features/festivals/festival-discovery-api.ts`
- 생성: API loader/mapper unit test
- 수정: `discovery-content.tsx`, `discovery-model.ts`
- 수정: `festival-discovery.tsx`
- 수정: `festival-ranking-showcase.tsx`
- 수정: `festival-discovery-list-item.tsx`
- 수정: 관련 component/model/page tests
- 수정: `apps/web/next.config.ts`

기존 carousel motion 수학과 autoplay timer는 실데이터 모델에 필요한 최소 props 변경
외에는 수정하지 않는다.

## 10. 검증

1. 공유 계약 query/response Zod 테스트
2. API service 날짜·상태·정렬·지역·페이지 단위 테스트
3. controller validation/위임 테스트
4. PostgreSQL E2E에서 실제 Festival row 기반 endpoint 응답 검증
5. 웹 loader의 성공, HTTP 오류, schema 오류 테스트
6. 축제 순위·목록 component에서 허위 지표가 사라지고 실데이터가 표시되는지 테스트
7. carousel swipe/autoplay/reduced-motion 기존 테스트 유지
8. API/web lint, unit, build와 focused E2E
9. 실제 브라우저에서 `/?tab=festivals&region=all`, 제주, 서울, 부산, 강원, 경주,
   전주 전환 검증
10. 각 URL의 화면, 실제 API 응답, 이미지/placeholder, 스크롤 보존, 브라우저 console
    error 0건 확인

## 11. 비범위

- 사용자 조회·저장·후기 기반 인기순위
- 축제 저장 persistence와 인증
- 축제 상세 실데이터 endpoint와 상세 화면 전환
- TourAPI 동기화 범위·scheduler 변경
- 데이터랩 ranking import
- 다른 discovery 탭의 mock 제거
- Git stage, commit, branch, worktree, push

## 12. 2026-08-25 구현 검증 결과

- 공유 계약: 1 suite, 13 tests 통과 및 TypeScript build 통과
- 축제 API unit: 2 suites, 6 tests 통과
- API 전체 실행 중 축제 포함 19 suites, 92 tests 통과
- 축제 endpoint 포함 `app.e2e-spec.ts`: 9 tests 통과
- API build 및 변경 파일 targeted lint 통과
- Web 축제 focused: 6 suites, 64 tests 통과
- Web lint 및 Next.js production build 통과
- 실 API 지역별 응답:
  - 전체 139건, 제주 1건, 서울 14건, 부산 6건
  - 강원 14건, 경주 1건, 전주 1건
- 브라우저에서 7개 지역 URL·상위 실데이터 제목·목록 건수 확인
- `/?tab=festivals` 직접 접근 시 `all`로 정규화되고 전체 필터가 선택됨을 확인
- fresh browser tab console error/warning 0건
- mock 축제명, 인기도, 저장 수, 후기 수, mock 상세 CTA 0건 확인
- 원격 TourAPI 이미지가 Next Image optimizer를 통해 표시됨을 확인
- carousel active rank가 3초 후 변경됨을 확인

전체 suite의 범위 밖 기존 실패는 별도로 분리했다.

- API E2E: 기존 `place_rankings` migration 미적용으로
  `tourism-database.e2e-spec.ts` 6건 실패
- API unit: 작업 중인 `place-ranking-csv.spec.ts`의 구현 파일 부재로 1 suite 실패
- Web full: 기존 `theme-travel-section.test.tsx`의 Base UI select option 탐색이
  간헐적으로 실패했으며 축제 focused 48건은 모두 통과
