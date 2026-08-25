# Haetteum TourAPI 축제 동기화 설계

**상태:** 구현 및 검증 완료
**작성일:** 2026-08-25
**초기 적재 범위:** 2026-01-01 ~ 2027-12-31
**범위:** `searchFestival2` 전체 페이지 조회, 검증, 정규화, PostgreSQL UPSERT,
동기화 실행 이력 기록

## 1. 목표

한국관광공사 TourAPI `KorService2/searchFestival2`에서 2026-01-01부터
2027-12-31까지 기간이 겹치는 전국 축제를 조회해 내부 PostgreSQL에 반복 실행
가능한 방식으로 적재한다.

이번 단계는 축제 데이터 적재까지만 구현한다. 공개 축제 조회 HTTP API와 Next.js
화면의 mock 제거는 포함하지 않는다.

## 2. 승인된 데이터 흐름

```text
TourAPI searchFestival2
        ↓
Festival API Client
        ↓
응답 Schema 검증
        ↓
Festival Mapper
        ↓
페이지 전체 순회
        ↓
FestivalRepository
        ↓
(source, externalId) UPSERT
        ↓
PostgreSQL
        ↓
TourismSyncRun 적재 결과 기록
```

각 계층은 다음 책임만 가진다.

- `TourApiClient`: URL 생성, 인증, timeout, retry, provider 오류 판별
- `tour-api.schemas.ts`: `searchFestival2` 공통 응답과 축제 item의 Zod 검증
- `tour-api.mapper.ts`: 외부 문자열을 DB 저장 타입으로 변환
- `FestivalSyncService`: 날짜 범위와 페이지 순회, 실행 상태 전이
- `FestivalRepository`: 축제 UPSERT와 `TourismSyncRun` 생성·완료 처리
- Prisma/PostgreSQL: `(source, externalId)` 유일성과 영속성 보장

## 3. Provider 요청 계약

요청 operation은 `searchFestival2`이며 공통 파라미터는 기존 TourAPI client 규칙을
재사용한다.

```text
serviceKey       = SERVICE_KEY
MobileOS         = ETC
MobileApp        = Haetteum
_type            = json
pageNo           = 1부터 증가
numOfRows        = 100
arrange          = C
eventStartDate   = 20260101
eventEndDate     = 20271231
lclsSystm1       = EV
lclsSystm2       = EV01
```

응답의 첫 `totalCount`를 기준으로 실제 수신 item 수가 같아질 때까지 모든 페이지를
순회한다. 중간 빈 페이지, 누적 건수 초과, `totalCount` 변경은 불완전 적재를 막기
위해 실패 처리한다.

## 4. 응답 검증과 정규화

축제 item에서 다음 값을 검증한다.

- 필수: `contentid`, `contenttypeid`, `title`, `eventstartdate`, `eventenddate`,
  `modifiedtime`
- 선택: 주소, 우편번호, 좌표, 지도 레벨, 전화번호, 대표 이미지, 저작권 유형,
  법정동 지역·시군구 코드, 신분류 코드, provider 생성 시각
- `contenttypeid`는 행사·공연·축제 유형인 `15`만 허용한다.
- `lclsSystm1=EV`, `lclsSystm2=EV01`이 아닌 item은 적재하지 않고 검증 실패로 본다.
- 날짜는 `YYYYMMDD`, provider 시각은 `YYYYMMDDHHmmss` 형식으로 엄격히 변환한다.
- 잘못된 숫자·좌표·날짜에 임의 기본값을 넣지 않는다.
- 오류 메시지에 `SERVICE_KEY`, 전체 요청 URL, 원본 응답 body를 포함하지 않는다.

## 5. Festival 데이터 모델

`Festival`은 장소와 다른 시작일·종료일 수명주기를 가지므로 `Place`에
`contentTypeId=15`로 섞지 않고 독립 모델로 저장한다.

| 필드 | 타입/규칙 | 원천 |
|---|---|---|
| `id` | UUID PK | 내부 생성 |
| `source` | `String(32)` | 고정 `TOUR_API` |
| `externalId` | `String(64)` | `contentid` |
| `contentTypeId` | `Int` | `contenttypeid`, 값 `15` |
| `title` | `String(500)` | `title` |
| `eventStartDate` | `Date` | `eventstartdate` |
| `eventEndDate` | `Date` | `eventenddate` |
| `providerRegionCode` | nullable `String(10)` | `lDongRegnCd` |
| `providerDistrictCode` | nullable `String(10)` | `lDongSignguCd` |
| `address1`, `address2` | nullable `String(500)` | `addr1`, `addr2` |
| `zipcode` | nullable `String(20)` | `zipcode` |
| `longitude`, `latitude` | nullable Decimal | `mapx`, `mapy` |
| `mapLevel` | nullable Int | `mlevel` |
| `category1~3` | nullable `String(20)` | `lclsSystm1~3` |
| `telephone` | nullable `String(100)` | `tel` |
| `primaryImageUrl` | nullable Text | `firstimage` |
| `primaryThumbnailUrl` | nullable Text | `firstimage2` |
| `imageCopyrightType` | nullable `String(20)` | `cpyrhtDivCd` |
| `providerCreatedAt` | nullable timestamptz | `createdtime` |
| `providerModifiedAt` | timestamptz | `modifiedtime` |
| `lastSyncedAt` | timestamptz | 적재 시각 |
| `createdAt`, `updatedAt` | timestamptz | 내부 관리 |

전국 축제를 손실 없이 저장하기 위해 현재 5개 서비스 지역만 가진
`TourismRegion`/`TourismDistrict` FK를 강제하지 않는다. 원본 법정동 코드를 보존하고,
향후 공개 조회 API 설계에서 서비스 지역과의 매핑을 별도로 추가한다.

제약과 인덱스는 다음과 같다.

- `@@unique([source, externalId])`
- `@@index([eventStartDate, eventEndDate])`
- `@@index([providerRegionCode, eventStartDate])`
- `@@index([providerModifiedAt])`

## 6. Repository와 트랜잭션

`FestivalRepository`는 Prisma를 감싸는 실제 persistence 경계다. 공개 HTTP
repository나 범용 추상화로 확대하지 않는다.

- `createSyncRun(range)`: `provider=TOUR_API`, `jobType=FESTIVAL_FULL`,
  `status=RUNNING` 생성
- `upsertPage(festivals, syncedAt)`: 한 provider 페이지를 한 DB transaction에서
  `(source, externalId)` 기준 UPSERT
- `completeSyncRun(id, counts)`: 모든 페이지 성공 후 `SUCCEEDED`와 건수 기록
- `failSyncRun(id, counts, safeError)`: 실패 시 `FAILED`, 종료 시각, 비밀정보 없는
  오류 요약 기록

외부 API 요청 중에는 DB transaction을 열지 않는다. 한 페이지를 모두 검증·매핑한
후 해당 페이지의 쓰기만 transaction으로 묶는다. 이전 페이지의 성공 UPSERT는
재실행 가능한 상태로 남고, 실패한 전체 실행은 `FAILED`로 기록한다.

초기 구현은 물리 삭제나 누락 데이터 비표출 전환을 하지 않는다. `searchFestival2`는
변경·삭제 전용 feed가 아니므로, 이번 목표인 안전한 적재와 재실행 가능성에 집중한다.

현재 공용 `TourismSyncRun`에는 종료 범위 컬럼이 없으므로 `requestedFrom`에는
`FESTIVAL_FULL`의 하한인 2026-01-01만 저장한다. 상한 2027-12-31은 고정 command
계약과 실행 출력에 기록하며, 별도 `requestedTo` 컬럼은 실행 범위를 가변화하는 후속
요구가 생길 때 추가한다.

## 7. 수동 명령과 실행 결과

루트와 API workspace에 다음 명령을 추가한다.

```bash
pnpm festival:sync
```

명령은 승인된 초기 범위 `2026-01-01~2027-12-31`을 사용한다. 성공 시 비밀정보 없이
아래 항목을 JSON 한 줄로 출력한다.

```json
{
  "jobType": "FESTIVAL_FULL",
  "status": "SUCCEEDED",
  "rangeStart": "2026-01-01",
  "rangeEnd": "2027-12-31",
  "fetchedCount": 0,
  "insertedCount": 0,
  "updatedCount": 0,
  "failedCount": 0
}
```

`insertedCount`와 `updatedCount`는 페이지 쓰기 전 기존 external ID를 조회해 구분한다.
동일 데이터를 재실행하면 새 중복 행은 생기지 않고 기존 행이 갱신된다.

## 8. 검증 기준

구현은 다음 순서의 TDD와 실데이터 검증을 통과해야 한다.

1. `searchFestival2` URL·페이지 응답·provider 오류 client 단위 테스트
2. 필수 필드, 분류, 날짜·좌표 변환 mapper 단위 테스트
3. 전체 페이지 순회와 pagination 불일치 service 단위 테스트
4. repository UPSERT 재실행 및 sync run 성공·실패 DB E2E
5. Prisma migration 적용과 API 패키지 lint/test/build
6. 실제 `pnpm festival:sync` 실행
7. DB에서 전체 건수, 날짜 최소·최대, 중복 external ID 0건, 최근
   `FESTIVAL_FULL/SUCCEEDED` 실행 이력 확인

실제 적재 전후의 기존 관광지 4,602건은 변경되지 않아야 한다.

## 9. 비범위

- `/api/v1/festivals` 공개 조회 endpoint
- 프론트엔드 축제 mock 교체
- 축제 상세 `detailCommon2`, 반복 이미지, 소개·프로그램 적재
- 자동 cron, queue, 분산 lock
- 인기순위, 저장 수, 후기 수 생성
- 기존 `Place` 또는 관광지 동기화 규칙 변경
- Git stage, commit, branch, worktree, push

## 10. 2026-08-25 구현 검증 결과

- migration `20260825000000_add_festivals` 적용 완료
- 1차 실적재: 조회 410건, 신규 410건, 갱신 0건, 실패 0건
- 2차 실적재: 조회 410건, 신규 0건, 갱신 410건, 실패 0건
- 최종 `festivals` 410건, `(source, externalId)` 중복 0건
- 전체 410건이 승인 범위 `2026-01-01~2027-12-31`과 기간이 겹치고,
  `contentTypeId=15`, `EV/EV01` 분류 위반 0건
- provider가 반환한 실제 축제 기간: 2025-11-28~2027-01-31
- 기존 `places` 4,602건 유지
- API unit: 17 suites, 85 tests 통과
- API E2E: 4 suites, 23 tests 통과
- API lint, Nest build, Prisma migration status 통과
