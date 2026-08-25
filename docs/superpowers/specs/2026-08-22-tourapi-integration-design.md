# Haetteum TourAPI 연동 설계

**상태:** 구현 및 검증 완료
**작성일:** 2026-08-22
**검증일:** 2026-08-24
**범위:** TourAPI JSON client, 관광지 전체·증분 동기화, 수동 실행, 일일 자동 실행, 지역별 관광지 조회 API

## 1. 배경

Haetteum API에는 `TourismRegion`, `TourismDistrict`, `Place`, `TourismSyncRun`
모델과 PostgreSQL migration, TourAPI client, 전체·증분 동기화, 일일 scheduler,
공개 관광지 조회 endpoint가 구현되어 있다. 사용자 조회는 provider를 직접
호출하지 않고 내부 PostgreSQL을 사용한다.

한국관광공사 국문 관광정보 서비스의 Base URL과 인증키는 로컬 `apps/api/.env`에
`END_POINT`, `SERVICE_KEY`로 설정되어 있다. 공식 v4.4 매뉴얼과 공공데이터포털
Swagger를 대조하고 실제 JSON smoke test를 수행한 결과 아래 네 API가 모두
`HTTP 200`, `application/json`, `resultCode=0000`을 반환했다.

| API | 확인 결과 |
|---|---|
| `ldongCode2` | 제주 시군구 2건 |
| `areaBasedList2` | 제주 관광지 563건 |
| `areaBasedSyncList2` | `showflag=1` 표출 563건 |
| `detailCommon2` | 목록의 `contentid`를 사용한 상세 1건, 개요·홈페이지 포함 |

## 2. 목표

- TourAPI 네 API를 JSON 방식으로 호출하는 typed client를 구현한다.
- 서울·경기·강원·부산·제주의 시군구와 `contentTypeId=12` 관광지를 내부 DB에
  전체 적재한다.
- 변경·비표출 관광지를 일일 증분 동기화한다.
- 수동 전체·증분 동기화와 매일 자동 동기화가 같은 use case를 사용하게 한다.
- 사용자 요청은 TourAPI를 직접 호출하지 않고 PostgreSQL에서 지역별 관광지를
  조회하게 한다.
- 실제 provider 호출을 기본 테스트와 분리한 opt-in smoke 명령을 제공한다.

## 3. 비목표

- 한국관광 데이터랩 인기순위 또는 평점·후기 수 적재
- 축제, 숙박, 음식점, 문화시설, 레포츠 동기화
- `PlaceImage`, `Festival`, `PlaceRanking` 모델 구현
- 브라우저에서 TourAPI 직접 호출
- `detailCommon2`를 모든 관광지에 일괄 호출
- Redis, queue, 별도 worker, 다중 인스턴스 분산 lock
- 메인 화면의 `인기 관광지 TOP 3` mock 제거
- Git stage, commit, branch, worktree 또는 push

지역별 실데이터 조회 API는 구현하지만 인기순위가 없으므로 현재 메인 화면의 TOP 3
표현에는 연결하지 않는다. 인기순위 출처와 UI 명칭을 별도 승인한 뒤 웹을 전환한다.

## 4. 환경변수 경계

실제 자격증명은 `apps/api/.env`가 소유한다. 루트 `.env`는 Docker Compose 전용으로
유지한다. 사용자는 값을 채팅·문서·Git으로 전달하지 않고 로컬에서 다음
환경변수 이름으로 관리한다.

- `END_POINT`
- `SERVICE_KEY`
- `TOURISM_SYNC_ENABLED`

- `END_POINT`는 HTTPS URL이며 경로가 `/B551011/KorService2`로 끝나야 한다.
- `SERVICE_KEY`는 비어 있지 않은 문자열로 검증하되 로그와 오류 응답에 넣지 않는다.
- `TOURISM_SYNC_ENABLED` 기본값은 `false`다.
- 자동 동기화를 활성화할 때만 API 부팅 시 provider 환경변수를 필수로 검증한다.
- 수동 sync/smoke 명령은 실행 시 provider 환경변수가 없으면 명확하게 실패한다.
- `.env.example`에는 실제 키 없이 변수명과 예시 Base URL만 추가한다.

## 5. API 선택과 역할

공통 요청 파라미터는 아래 값으로 고정한다.

```text
serviceKey = SERVICE_KEY
MobileOS   = ETC
MobileApp  = Haetteum
_type      = json
pageNo     = 1부터 증가
numOfRows  = 100
```

### `ldongCode2`

- 각 승인 지역의 `lDongRegnCd`와 `lDongListYn=Y`로 시군구를 조회한다.
- `lDongRegnCd`로 `TourismRegion`을 찾고 `(regionId, lDongSignguCd)` 복합 기준으로
  `TourismDistrict`를 upsert한다. 시군구 코드는 시도 내부에서만 고유하다.
- 응답에서 더 이상 보이지 않는 시군구를 물리 삭제하지 않고 `isActive=false`로
  전환한다.

### `areaBasedList2`

- 전체 적재에 사용한다.
- `contentTypeId=12`, 승인 지역 `lDongRegnCd`, `arrange=C`로 페이지를 순회한다.
- `Q` 정렬은 이미지 없는 관광지를 제외하므로 전체 적재에 사용하지 않는다.
- 응답을 `Place`로 정규화하고 `(source, externalId)` 기준 upsert한다.

### `areaBasedSyncList2`

- 일일 증분 적재에 사용한다.
- 각 날짜·지역에 대해 `showflag=1`과 `showflag=0`을 모두 조회한다.
- `showflag=1`은 upsert, `showflag=0`은 `isVisible=false`로 반영한다.
- `oldContentid`가 있으면 이전 `externalId`를 먼저 찾아 새 ID로 전환한다.
- `modifiedtime`은 “이후 전체”로 가정하지 않고 `YYYYMMDD` 변경일 필터로 다룬다.

### `detailCommon2`

- `contentId` 한 건의 `overview`, `homepage`를 보강한다.
- 전체 관광지 일괄 동기화에서는 호출하지 않는다.
- 수동 상세 보강 use case와 opt-in smoke에서만 사용한다.
- 사용자 상세 조회 요청 중 외부 provider를 직접 호출하지 않는다.

## 6. 모듈과 파일 경계

```text
apps/api/src/tourism/
├── tourism.module.ts
├── tour-api.client.ts
├── tour-api.client.spec.ts
├── tour-api.schemas.ts
├── tour-api.mapper.ts
├── tour-api.mapper.spec.ts
├── tourism-sync.service.ts
├── tourism-sync.service.spec.ts
├── tourism-sync.scheduler.ts
├── tourism-sync.scheduler.spec.ts
├── tourism-sync.command.ts
└── tourism-smoke.command.ts

apps/api/src/places/
├── places.module.ts
├── places.controller.ts
├── places.controller.spec.ts
├── places.service.ts
└── places.service.spec.ts

packages/contracts/src/
└── places.ts
```

- `TourApiClient`: HTTP, timeout, retry, JSON/XML 오류 판별과 pagination 응답을 소유한다.
- `tour-api.schemas.ts`: 외부 응답 Zod schema를 소유하며 공유 계약으로 노출하지 않는다.
- `tour-api.mapper.ts`: 외부 문자열 필드를 Prisma 저장 값으로 정규화한다.
- `TourismSyncService`: 전체·증분·상세 보강 use case와 실행 이력을 소유한다.
- `TourismSyncScheduler`: cron trigger만 소유하며 동기화 규칙을 중복 구현하지 않는다.
- `places`: 내부 PostgreSQL 조회와 공개 HTTP 계약만 소유한다.
- Repository 추상화는 추가하지 않고 service/use case가 `PrismaService`를 직접 사용한다.

## 7. TourAPI client 규칙

- Node.js 기본 `fetch`를 사용하고 별도 HTTP client 의존성을 추가하지 않는다.
- 요청 timeout은 20초다.
- 네트워크 오류, timeout, HTTP 429와 5xx만 최대 2회 재시도한다.
- 재시도 간격은 250ms, 750ms로 제한한다.
- HTTP 200이어도 `response.header.resultCode !== "0000"`이면 실패로 처리한다.
- `_type=json` 요청이 XML gateway 오류를 반환할 수 있으므로 JSON parse 실패 시 XML
  오류 형태를 감지하고 provider error로 변환한다.
- 오류에는 operation, HTTP status와 provider code만 남기고 서비스키·전체 URL·원본
  응답 body는 기록하지 않는다.
- `items`가 객체·배열·빈 문자열로 달라지는 응답을 빈 배열 또는 배열로 정규화한다.
- pagination은 실제 수신 item 누적 수가 첫 `totalCount`와 같아질 때 종료한다.
  중간 `totalCount` 변경, 예상보다 빠른 빈 page, 누적 초과는 안전하게 실패한다.

## 8. 데이터 매핑

| TourAPI | 내부 저장 |
|---|---|
| `contentid` | `Place.externalId` |
| 고정값 `TOUR_API` | `Place.source` |
| `contenttypeid` | `Place.contentTypeId` |
| `lDongRegnCd` | `TourismRegion.providerCode` 조회 |
| `lDongSignguCd` | `TourismDistrict.providerCode` 조회 |
| `title` | `Place.title` |
| `addr1`, `addr2`, `zipcode` | 주소 컬럼 |
| `mapx`, `mapy`, `mlevel` | 좌표·지도 레벨 |
| `lclsSystm1~3` | `category1~3` |
| `tel` | `telephone` |
| `firstimage`, `firstimage2` | 대표 이미지 URL |
| `cpyrhtDivCd` | `imageCopyrightType` |
| `createdtime`, `modifiedtime` | provider 시각 |
| `showflag` | `isVisible` |
| `overview`, `homepage` | 상세 보강 컬럼 |

- 숫자·날짜 문자열이 잘못됐으면 해당 항목을 실패 처리하고 임의 기본값을 넣지 않는다.
- TourAPI가 좌표에 내려주는 literal `"null"`은 실제 `null`로 정규화하되, 그 외
  잘못된 좌표는 실패한다.
- 알 수 없는 지역 코드는 다른 지역에 넣지 않는다.
- 시군구 코드가 없으면 `districtId=null`을 허용한다.

## 9. 동기화 실행

### 수동 명령

```bash
pnpm tourism:sync -- --mode=full
pnpm tourism:sync -- --mode=incremental
pnpm tourism:enrich -- --content-id=2704412
pnpm tourism:smoke
```

- `full`: 시군구와 5개 지역의 현재 표출 관광지를 전체 적재한다.
- `incremental`: 마지막 성공 실행 다음 날짜부터 현재 KST 날짜까지 변경일을 순회한다.
- 동기화 공백이 30일을 초과하면 날짜별 호출 대신 full 실행을 요구하고 중단한다.
- `enrich`: 한 관광지의 공통 상세정보만 갱신한다.
- `smoke`: 네 provider operation을 1건씩 호출하고 DB는 변경하지 않는다.

### 일일 자동 실행

- `@nestjs/schedule` `6.1.3`을 고정해 사용한다.
- 기본 cron은 매일 `03:30 Asia/Seoul`이다.
- cron은 고정된 schedule로 등록하되 `TOURISM_SYNC_ENABLED=false`이면 provider를
  호출하지 않고 즉시 종료한다.
- `waitForCompletion=true`로 같은 프로세스의 중복 실행을 막는다.
- 첫 MVP는 단일 API 인스턴스를 전제로 하며 다중 인스턴스 lock은 후속 운영 설계로
  남긴다.
- 애플리케이션 시작 시 자동 full sync를 실행하지 않는다.

## 10. 트랜잭션과 실행 이력

- 외부 페이지 호출 중 PostgreSQL transaction을 열어 두지 않는다.
- 한 페이지를 전부 검증·정규화한 뒤 해당 페이지의 DB 변경만 transaction으로 묶는다.
- 실행 시작 시 `TourismSyncRun.status=RUNNING`을 저장한다.
- 모든 페이지가 성공하면 `SUCCEEDED`, 한 항목이라도 실패하면 `FAILED`다.
- 실패 실행은 마지막 성공 날짜를 전진시키지 않는다.
- 이미 성공 반영된 페이지는 idempotent upsert 결과로 유지하고 다음 실행이 같은 날짜를
  재처리한다.
- fetched/inserted/updated/deactivated/failed count를 실행 이력에 저장한다.

## 11. 공개 조회 API와 공유 계약

### 목록

```http
GET /api/v1/places?region=jeju&page=1&pageSize=20&q=
```

기본 정렬은 `title ASC`, 동률이면 `id ASC`다. 인기순으로 표기하지 않는다.

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "성산일출봉",
      "region": "jeju",
      "district": "서귀포시",
      "address": "제주특별자치도 ...",
      "longitude": 126.0,
      "latitude": 33.0,
      "primaryImageUrl": "https://...",
      "imageCopyrightType": "Type1"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 563
}
```

- `region`은 승인된 slug만 허용한다.
- `page` 기본값 1, `pageSize` 기본값 20, 최대 100이다.
- `q`는 trim 후 관광지명과 주소에 적용한다.
- `isVisible=true`, `TourismRegion.isActive=true`만 반환한다.
- 성공 응답은 공통 data envelope 없이 직접 반환한다.
- 잘못된 query는 기존 Problem Details 형식으로 400을 반환한다.

## 12. 테스트 전략

- client 단위 테스트는 완전한 JSON fixture와 fake fetch를 사용한다.
- 네 operation의 정상 JSON, 빈 `items`, 단일 객체/배열, provider 오류, XML gateway
  오류, timeout, retry와 pagination을 검증한다.
- mapper 단위 테스트는 날짜, 좌표, nullable 코드와 잘못된 필드를 검증한다.
- sync service는 fake provider와 실제 테스트 PostgreSQL로 upsert, 비표출, ID 변경,
  실행 count와 실패 watermark를 검증한다.
- scheduler는 disabled/enabled와 중복 실행 방지만 검증하고 실제 cron 시간을 기다리지
  않는다.
- places controller/service는 공유 Zod 계약, pagination, visible filter와 안정 정렬을
  검증한다.
- `tourism:smoke`만 실제 서비스키와 provider를 사용하며 기본 `pnpm test`에는 포함하지
  않는다.
- 서비스키가 테스트 출력, snapshot, Problem Details와 log에 없는지 검증한다.

## 13. 오류 처리와 운영 경계

- provider 장애 시 기존 관광지 데이터를 삭제하거나 비우지 않는다.
- API 목록 조회는 마지막 정상 DB 데이터를 계속 제공한다.
- sync 실패는 구조화된 내부 log와 `TourismSyncRun.errorSummary`에 남기되 비밀정보를
  제거한다.
- 개발계정 quota를 고려해 `detailCommon2` 전체 보강을 금지한다.
- 이미지의 `cpyrhtDivCd`를 보존하고 Type1·Type3 이용조건을 UI에서 표시할 수 있게
  한다.

## 14. 구현 순서

1. 환경변수 계약과 TourAPI client JSON/error/pagination 테스트
2. 네 operation client와 mapper
3. full/incremental/enrich sync service와 DB 통합 테스트
4. 수동 command와 opt-in smoke
5. scheduler와 설정
6. 공유 places 계약과 Nest 조회 API
7. 전체 lint, unit, build, e2e와 실 provider smoke
8. `ARCHITECTURE.md`, `README.md`, `docs/ERD.md`의 구현 상태 갱신

## 15. 수용 기준

- 네 TourAPI operation이 JSON client로 구현되고 opt-in smoke가 통과한다.
- 전체 sync가 다섯 지역의 시군구와 관광지를 DB에 idempotent하게 적재한다.
- 증분 sync가 표출·비표출과 실패 watermark를 정확히 처리한다.
- 수동 명령과 일일 scheduler가 같은 service를 사용한다.
- 지역별 조회 API가 외부 provider를 호출하지 않고 DB에서 응답한다.
- 인기순위·평점·후기 수를 TourAPI 데이터처럼 반환하지 않는다.
- 서비스키가 코드, 로그, 응답, 테스트 산출물과 Git diff에 노출되지 않는다.
- 기존 health, CORS, Problem Details와 관광 DB 제약 테스트가 유지된다.
- 전체 repository 검증이 통과한다.

## 16. 실 provider·DB 검증 결과

2026-08-24 기준으로 `tourism:smoke`에서 네 operation이 모두 HTTP 200,
JSON, `resultCode=0000`을 반환했다. 출력에는 서비스키·복호화된 키 조각·전체
요청 URL이 없었다.

| 검증 | 결과 |
|---|---|
| 첫 성공 full | 조회 4,718, 신규 3,264, 갱신 1,454, 비표출 0, 실패 0 |
| 두 번째 full | 조회 4,718, 신규 0, 갱신 4,718, 비표출 0, 실패 0 |
| 같은 KST 날짜 incremental | 조회·신규·갱신·비표출·실패 모두 0, 직전 성공 시각 watermark 일치 |
| DB 실데이터 | 지역 5, 시군구 116, 표출 관광지 4,602 |
| 불변식 | `(source, externalId)` 중복 0, 잘못된 지역 FK 0, 교차 지역 시군구 FK 0, `contentTypeId != 12` 0, 빈 제목 0 |

두 번째 full 전후 관광지 4,602건의 `(id, externalId)` 해시가 일치해 UUID 보존과
idempotence를 확인했다. 공개 `GET /api/v1/places`는 실 provider 호출 없이 위 DB
데이터만 조회한다. 인기 관광지·핫플레이스 순위 적재는 여전히 별도 범위다.
