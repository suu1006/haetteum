# Haetteum 실데이터 관광지 상세 1차 설계

**상태:** 사용자 검토 요청
**작성일:** 2026-08-26
**대상:** 세대별 인기관광지에서 진입하는 실데이터 장소 상세
**승인된 방향:** 소개 기본 탭, 실제 빈 후기, TourAPI 상세·공식 이미지, Kakao 주변 검색

## 1. 배경

세대별 인기관광지 순위는 한국관광 데이터랩 공식 CSV를 PostgreSQL에 적재해
`GET /api/v1/place-rankings`로 제공한다. 순위 행은 기존 TourAPI `Place`와 보수적으로
매칭되며, 매칭된 행에는 Haetteum 내부 UUID `placeId`가 존재한다.

현재 순위 카드는 상세 링크를 만들지 않는다. 기존 `/places/[placeId]` route가 로컬
mock slug만 조회하고 PostgreSQL UUID를 처리하지 않기 때문이다. 기존 TourAPI
동기화는 장소 목록과 `detailCommon2`의 `overview`, `homepage`만 지원하며, 다중 이미지,
관광지별 소개 정보, 반복 정보와 실데이터 상세 endpoint는 없다. 주변 장소 검색 역시
코스 편집 화면의 로컬 mock에 한정돼 있다.

이 설계는 매칭된 순위 장소에 실제 상세 진입을 제공하는 첫 단계다. 한국관광 데이터랩은
순위 근거로만 유지하고, 상세 본문은 TourAPI, 주변 검색은 Kakao Local로 분리한다.

## 2. 목표

- `placeId`가 있는 세대별 순위 카드를 `/places/{uuid}` 상세 페이지에 연결한다.
- TourAPI `detailCommon2`, `detailIntro2`, `detailInfo2`, `detailImage2`를 검증·정규화해
  PostgreSQL에 원자적으로 반영한다.
- 순위에 매칭된 고유 관광지만 일괄 상세 보강하는 수동 명령을 제공한다.
- `GET /api/v1/places/:placeId`가 외부 provider를 호출하지 않고 DB 상세를 반환한다.
- `GET /api/v1/places/:placeId/nearby`가 서버에서 Kakao Local을 호출해 주변 관광지,
  문화시설, 음식점과 카페를 반환한다.
- 실데이터 상세 기본 탭을 `소개`로 두고, 후기 탭은 실제 빈 상태로 제공한다.
- 기존 mock slug 상세, 코스 준비 상태, 순위 미매칭 카드와 사용자 작업을 보존한다.

## 3. 비목표

- Kakao Map 화면, Kakao Mobility 자동차·도보·대중교통 시간 계산
- Kakao, Naver, Google 후기 수집 또는 화면 scraping
- 외부 평점, 후기 수, 점수 분포, 좋아요 수를 생성하거나 추정하는 기능
- Kakao Local 응답의 장기 DB 저장 또는 별도 scheduler
- 사용자 후기 작성·저장, 찜 영속화, AI 코스 생성·저장
- 데이터랩 ID와 TourAPI 또는 Kakao ID를 같은 식별자로 취급하는 자동 연결
- 매칭되지 않은 123개 순위 행을 fuzzy matching으로 자동 연결
- 전체 4,605개 표출 관광지의 상세 일괄 보강
- Git stage, commit, branch, worktree 또는 push

## 4. 선택한 접근

### 4.1 TourAPI 상세은 PostgreSQL에 영속화

TourAPI 상세은 provider 응답을 사용자 요청마다 호출하지 않는다. 수동 보강 command가
외부 응답 전체를 먼저 검증한 뒤 한 관광지 단위 transaction으로 `Place`, `PlaceImage`,
`PlaceDetailInfo`를 교체한다. 상세 조회는 마지막 성공 DB 스냅샷만 사용한다.

### 4.2 Kakao 주변 검색은 서버 측 실시간 조회

Kakao Local 응답은 첫 범위에서 DB에 장기 보존하지 않는다. 상세 정보 탭이 주변 정보를
요청할 때 NestJS가 `KAKAO_REST_API_KEY`를 서버에서만 사용한다. Kakao 장애나 설정 누락은
장소 상세 전체를 실패시키지 않고 주변 응답만 `unavailable`로 반환한다.

### 4.3 mock slug와 UUID 실데이터를 분리

- UUID route param: Haetteum API에서 실데이터 상세 조회
- 기존 문자열 slug: 기존 `place-detail.mock.ts` 조회 유지

한 상세 응답에서 mock과 실데이터를 섞지 않는다. 순위 카드가 UUID를 가지고 있을 때만
실데이터 상세 링크를 만든다.

## 5. 데이터 흐름

```text
한국관광 데이터랩 CSV
  → PlaceRanking.placeId nullable match
  → placeId 있음
      → TourAPI contentid 확인
      → detailCommon2
      → detailIntro2
      → detailInfo2
      → detailImage2
      → 전체 응답 검증
      → Place + PlaceImage + PlaceDetailInfo transaction 교체
      → GET /api/v1/places/:placeId
      → Next.js /places/[placeId]?tab=introduction

정보 탭 주변 영역
  → GET /api/v1/places/:placeId/nearby?category=...
  → DB에서 기준 위경도 확인
  → Kakao Local category search
  → typed response 검증
  → 직선거리 기준 주변 목록
```

## 6. Prisma 데이터 모델

### 6.1 Place 상세 소개 필드

기존 `Place`에 TourAPI 관광지 소개정보 중 현재 화면에서 사실 그대로 표현할 수 있는
문자열 필드를 nullable로 추가한다.

```prisma
infoCenter         String? @map("info_center") @db.Text
restDate           String? @map("rest_date") @db.Text
useSeason          String? @map("use_season") @db.Text
useTime            String? @map("use_time") @db.Text
parking            String? @db.Text
experienceAgeRange String? @map("experience_age_range") @db.Text
experienceGuide    String? @map("experience_guide") @db.Text
babyCarriage       String? @map("baby_carriage") @db.Text
creditCard         String? @map("credit_card") @db.Text
pet                 String? @db.Text
detailSyncedAt      DateTime? @map("detail_synced_at") @db.Timestamptz(3)
```

빈 문자열과 provider literal `null`은 `null`로 정규화한다. 필드를 임의 문장으로
재작성하지 않는다.

### 6.2 PlaceImage

```prisma
model PlaceImage {
  id             String   @id @default(uuid()) @db.Uuid
  placeId        String   @map("place_id") @db.Uuid
  source         String   @db.VarChar(32)
  serialNumber   String   @map("serial_number") @db.VarChar(64)
  name           String?  @db.VarChar(500)
  originalUrl    String   @map("original_url") @db.Text
  thumbnailUrl   String?  @map("thumbnail_url") @db.Text
  copyrightType  String?  @map("copyright_type") @db.VarChar(20)
  displayOrder   Int      @map("display_order")
  createdAt      DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt      DateTime @updatedAt @map("updated_at") @db.Timestamptz(3)

  place Place @relation(fields: [placeId], references: [id], onDelete: Cascade)

  @@unique([placeId, source, serialNumber])
  @@index([placeId, displayOrder])
  @@map("place_images")
}
```

이미지 URL은 공식 `tong.visitkorea.or.kr`의 HTTP 또는 HTTPS만 허용하고 저장 시 HTTPS로
정규화한다. `originalUrl` 중복은 순서를 유지한 채 제거한다.

### 6.3 PlaceDetailInfo

`detailInfo2`의 반복정보는 이름과 본문을 잃지 않도록 별도 모델로 저장한다.

```prisma
model PlaceDetailInfo {
  id            String   @id @default(uuid()) @db.Uuid
  placeId       String   @map("place_id") @db.Uuid
  source        String   @db.VarChar(32)
  serialNumber  String   @map("serial_number") @db.VarChar(64)
  fieldGroup    String?  @map("field_group") @db.VarChar(32)
  name          String   @db.VarChar(500)
  text          String   @db.Text
  displayOrder  Int      @map("display_order")
  createdAt     DateTime @default(now()) @map("created_at") @db.Timestamptz(3)
  updatedAt     DateTime @updatedAt @map("updated_at") @db.Timestamptz(3)

  place Place @relation(fields: [placeId], references: [id], onDelete: Cascade)

  @@unique([placeId, source, serialNumber])
  @@index([placeId, displayOrder])
  @@map("place_detail_infos")
}
```

빈 `name` 또는 `text`, 중복 `serialNumber`, 다른 `contentid`는 전체 상세 보강을
실패시킨다.

## 7. TourAPI 계약과 보강 규칙

### 7.1 Client port

```ts
interface TourApiPort {
  getPlaceCommonDetail(contentId: string): Promise<TourApiPlaceDetail>;
  getPlaceIntro(contentId: string): Promise<TourApiPlaceIntro>;
  getPlaceRepeatInfo(contentId: string): Promise<readonly TourApiPlaceInfo[]>;
  getPlaceImages(contentId: string): Promise<readonly TourApiPlaceImage[]>;
}
```

기존 `getPlaceDetail`은 `getPlaceCommonDetail`로 이름을 명확히 바꾸되 command와 테스트를
동시에 갱신한다. 네 operation은 기존 20초 timeout, 최대 2회 retry, JSON schema 검증과
비밀정보 제거 규칙을 그대로 사용한다.

### 7.2 호출 규칙

- 모든 operation은 `contentTypeId=12`를 사용한다.
- `detailImage2`는 실제 KorService2 검증 결과에 따라 `imageYN=Y`만 사용한다.
  `subImageYN`은 현재 gateway가 `INVALID_REQUEST_PARAMETER_ERROR`로 거부하므로 보내지 않는다.
- 한 관광지의 네 operation은 provider 초당 제한을 고려해 순차 호출한다.
- `contentid`가 요청 값과 다르면 실패한다.
- 공통·소개 응답은 정확히 1건이어야 한다.
- 반복정보와 이미지는 0건을 정상 상태로 허용한다.
- 네 호출 중 하나라도 실패하면 DB를 변경하지 않는다.

### 7.3 동기화 use case

```ts
enrichPlaceDetails(contentId: string): Promise<PlaceDetailEnrichmentResult>
enrichRankedPlaceDetails(): Promise<RankedPlaceDetailEnrichmentSummary>
```

`enrichPlaceDetails`는 한 관광지를 원자적으로 교체한다. `enrichRankedPlaceDetails`는
현재 순위 스냅샷에서 `placeId IS NOT NULL`인 고유 장소를 찾고 UUID 순으로 하나씩
처리한다. 장소 한 건 실패 시 다른 장소는 계속 처리하고, 최종 summary에 성공·실패 수를
남긴다. 실패한 장소의 기존 상세은 유지한다.

수동 명령은 다음을 제공한다.

```bash
pnpm tourism:enrich -- --content-id=<TourAPI contentid>
pnpm tourism:enrich-ranked
```

`tourism:enrich-ranked`는 `TourismSyncRun.jobType=DETAIL_RANKED` 실행 이력을 만들고
완전 성공은 `SUCCEEDED`, 한 건 이상 실패는 `FAILED`와 안전한 집계 오류 요약으로 남긴다.
서비스키, 전체 URL과 provider 원문은 출력하지 않는다.

## 8. 장소 상세 HTTP 계약

### 8.1 GET /api/v1/places/:placeId

UUID가 아니면 `400`, 존재하지 않거나 비표출 장소면 `404`를 반환한다.

```ts
type PlaceDetailResponse = {
  id: string;
  title: string;
  category: {
    primary: string | null;
    secondary: string | null;
    tertiary: string | null;
  };
  region: string;
  district: string | null;
  address: string | null;
  longitude: number | null;
  latitude: number | null;
  telephone: string | null;
  homepage: string | null;
  overview: string | null;
  images: readonly {
    url: string;
    thumbnailUrl: string | null;
    alt: string;
    copyrightType: string | null;
  }[];
  introduction: {
    infoCenter: string | null;
    restDate: string | null;
    useSeason: string | null;
    useTime: string | null;
    parking: string | null;
    experienceAgeRange: string | null;
    experienceGuide: string | null;
    babyCarriage: string | null;
    creditCard: string | null;
    pet: string | null;
  };
  information: readonly {
    id: string;
    name: string;
    text: string;
  }[];
  detailSyncedAt: string | null;
};
```

`images`는 `PlaceImage`를 우선하고, 없으면 기존 대표 이미지를 최대 한 장으로 반환한다.
alt는 provider 이미지명이 있으면 사용하고 없으면 `${title} 관광지 이미지`로 생성한다.
평점, 후기 수, 추천 포인트, 이동시간과 요금을 응답에 만들지 않는다.

## 9. Kakao Local 주변 검색

### 9.1 환경변수

```text
KAKAO_REST_API_KEY=
```

키는 optional이다. 없을 때 API 부팅은 성공하고 주변 endpoint만 `status=unavailable`을
반환한다. 키는 브라우저, 로그, 오류, 테스트 fixture와 Git에 노출하지 않는다.

### 9.2 Client 경계

`KakaoLocalClient`는 NestJS 내부 provider이며 Node 기본 `fetch`를 사용한다.

- base URL은 `https://dapi.kakao.com/v2/local`로 고정한다.
- timeout은 5초다.
- 네트워크 오류, 429와 5xx만 최대 1회 재시도한다.
- `Authorization: KakaoAK {key}` header를 사용한다.
- 응답은 Zod로 `id`, `place_name`, `category_name`, `phone`, 주소, 위경도,
  `place_url`, `distance`만 허용·정규화한다.

### 9.3 GET /api/v1/places/:placeId/nearby

```text
category=attraction | restaurant | cafe
limit=1..15, 기본 10
```

- 기준 장소가 없거나 비표출이면 `404`
- 기준 위경도가 없으면 `status=unavailable`, `reason=coordinates_missing`
- Kakao 키가 없으면 `status=unavailable`, `reason=provider_not_configured`
- provider 실패면 `status=unavailable`, `reason=provider_unavailable`
- 정상 결과면 `status=ready`

카테고리 매핑:

```text
attraction → AT4와 CT1을 각각 조회한 뒤 Kakao place ID로 중복 제거
restaurant → FD6
cafe       → CE7
```

`attraction` 결과는 두 요청 중 하나만 성공해도 성공한 결과를 제공하되 provider 일부 실패를
숨기지 않도록 `partial=true`를 반환한다. 결과는 Kakao `distance` 숫자 오름차순, place ID
오름차순으로 안정 정렬한 뒤 limit을 적용한다.

```ts
type NearbyPlacesResponse =
  | {
      status: "ready";
      category: "attraction" | "restaurant" | "cafe";
      partial: boolean;
      items: readonly {
        provider: "KAKAO_LOCAL";
        providerPlaceId: string;
        title: string;
        categoryLabel: string;
        telephone: string | null;
        address: string | null;
        roadAddress: string | null;
        longitude: number;
        latitude: number;
        distanceMeters: number | null;
        placeUrl: string;
      }[];
    }
  | {
      status: "unavailable";
      reason:
        | "coordinates_missing"
        | "provider_not_configured"
        | "provider_unavailable";
    };
```

평점, 후기 수, 사진, 자동차 이동시간은 포함하지 않는다.

## 10. Next.js 상세 화면

### 10.1 순위 카드

- `place.placeId !== null`: 전체 카드를 `/places/{placeId}?tab=introduction` 링크로 렌더링
- `place.placeId === null`: 현재 article 유지
- 링크와 비링크 카드의 시각 크기·순위·텍스트는 동일하게 유지
- 링크 카드만 focus-visible 상태와 `상세 보기` 접근 가능 설명 제공

### 10.2 route 데이터 선택

`/places/[placeId]/page.tsx`는 UUID 여부로 데이터 소스를 선택한다.

- UUID: server-side adapter로 `GET /api/v1/places/:placeId` 호출 후 Zod 검증
- slug: 기존 mock 조회
- API `404`: route `notFound()`
- API 오류·계약 불일치: 상세 전용 오류 상태와 다시 시도 링크

### 10.3 기본 탭

search param에 `tab`이 없으면 실데이터와 mock 모두 `introduction`을 기본값으로 사용한다.
기존 명시적 `?tab=reviews`, `?tab=course`, `?tab=information` 링크는 유지한다.

### 10.4 실데이터 탭 표시

소개:

- 공식 이미지 gallery
- 장소명, 주소, overview
- 이용시간·휴무일·주차·안내센터 등 값이 있는 항목만 표시
- 이미지 저작권 유형 표시
- 대표 시설, 추천 포인트, 이용요금은 실제 응답이 없으므로 숨김

정보:

- 주소, 전화, 홈페이지
- `PlaceDetailInfo` 반복정보
- 주변 관광지·맛집·카페는 category별로 요청
- Kakao 결과는 카테고리별 로컬 fallback 이미지와 직선거리만 표시
- unavailable은 전체 탭 오류가 아닌 주변 영역 안내로 표시

후기:

- `아직 등록된 후기가 없어요`
- 외부 평점, mock 후기, 0점 분포를 만들지 않음
- 후기 작성 CTA는 기존 준비 중 안내 유지

코스:

- 기존 준비 상태 또는 실제 mock course가 있는 slug의 기존 화면 유지

## 11. 오류·보안·데이터 정직성

- 사용자 조회 중 TourAPI를 호출하지 않는다.
- TourAPI 상세 보강은 장소 한 건 단위 atomic write다.
- Kakao 실패는 주변 영역에만 격리한다.
- provider 비밀키, 전체 요청 URL과 원문 오류 body를 기록하지 않는다.
- HTML provider text는 문자열 데이터로 저장하고 React에서 HTML로 직접 삽입하지 않는다.
- 공식 이미지 hostname과 protocol을 validation boundary에서 제한한다.
- 데이터랩 순위 비율을 평점·후기·추천 근거로 재사용하지 않는다.
- Kakao 직선거리를 자동차 이동시간처럼 표현하지 않는다.
- `source`, provider ID, 저작권과 동기화 시각을 보존한다.

## 12. 예상 변경 파일

```text
packages/contracts/src/places.ts
packages/contracts/src/contracts.test.ts
packages/contracts/src/index.ts

apps/api/prisma/schema.prisma
apps/api/prisma/migrations/20260826150000_add_place_details/migration.sql
apps/api/src/config/environment.ts
apps/api/src/tourism/tour-api.types.ts
apps/api/src/tourism/tour-api.schemas.ts
apps/api/src/tourism/tour-api.mapper.ts
apps/api/src/tourism/tour-api.client.ts
apps/api/src/tourism/tourism-sync.service.ts
apps/api/src/tourism/tourism-sync.command.ts
apps/api/src/tourism/*.spec.ts
apps/api/src/places/kakao-local.client.ts
apps/api/src/places/kakao-local.schemas.ts
apps/api/src/places/places.controller.ts
apps/api/src/places/places.service.ts
apps/api/src/places/places.module.ts
apps/api/src/places/*.spec.ts
apps/api/test/app.e2e-spec.ts
apps/api/test/tourism-database.e2e-spec.ts

apps/web/src/features/places/place-detail-api.ts
apps/web/src/features/places/place-detail-model.ts
apps/web/src/app/places/[placeId]/page.tsx
apps/web/src/components/patterns/place-detail-screen.tsx
apps/web/src/components/patterns/ranked-place-section.tsx
apps/web/src/components/travel/place-ranking-card.tsx
apps/web/src/components/travel/place-introduction.tsx
apps/web/src/components/travel/place-information.tsx
apps/web/tests/unit/**/place-detail*.test.tsx
apps/web/tests/unit/**/discovery-components.test.tsx

README.md
ARCHITECTURE.md
docs/ERD.md
```

기존 dirty 변경과 같은 파일을 수정할 때 현재 내용을 기준으로 좁게 추가하며 기존 변경을
되돌리거나 파일 전체를 재작성하지 않는다.

## 13. 테스트와 검증

### 13.1 TDD 단위 테스트

- 공유 계약: UUID 상세, nullable 값, 이미지와 주변 ready/unavailable union
- TourAPI schema: object/array/empty normalization, content ID mismatch, intro/info/image 필드
- mapper: 빈 문자열, HTTPS 이미지, 중복 이미지, 안정 순서
- sync service: 네 응답 전체 검증 전 write 없음, transaction 교체, 실패 시 기존 데이터 유지
- ranked enrichment: 고유 장소만 처리, 장소 실패 격리, summary와 실행 이력
- Kakao schema/client: category, key header, timeout/retry, 비밀정보 제거
- places service: DB 상세, 비표출 404, 좌표/설정/provider unavailable, AT4+CT1 dedupe
- Web adapter: API 200/404/error, Zod contract rejection
- 카드: 매칭 링크와 미매칭 article
- 상세: 소개 기본, 실데이터 값만 표시, 후기 빈 상태, 주변 unavailable 격리

### 13.2 DB와 E2E

- Prisma generate와 migration deploy
- table/column/comment/foreign key/index 검증
- `GET /api/v1/places/:placeId` 성공·400·404
- nearby ready·unavailable·validation
- API E2E는 외부 네트워크를 mock하고 DB 경계를 실제 사용

### 13.3 실제 provider와 브라우저

- Node 24.19.0으로 TourAPI 네 operation opt-in smoke
- 테스트용 한 장소 `tourism:enrich` 실행 후 DB 필드·이미지 확인
- `tourism:enrich-ranked` summary에서 성공·실패 합계 확인
- Kakao key가 설정된 경우 keyword/category 실제 smoke; 현재 키가 없으면 미검증으로 명시
- 390px과 480px에서 매칭 순위 카드 클릭
- URL `/places/{uuid}?tab=introduction`, 소개 화면, 공식 이미지와 정보 확인
- 후기 탭 실제 빈 상태, 정보 탭 주변 영역, 미매칭 카드 URL 불변 확인
- 브라우저 console error/warning 확인

### 13.4 전체 검증

```bash
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
git diff --check
```

Prisma generate가 포함된 명령은 병렬 실행하지 않는다. focused test는 workspace script 인자
전달 대신 각 workspace의 직접 실행 형식을 사용한다.

## 14. 수용 기준

- 매칭된 순위 카드가 UUID 실데이터 상세 소개로 이동한다.
- 미매칭 카드는 링크처럼 동작하지 않는다.
- 실데이터 상세은 PostgreSQL만으로 장소명·주소·소개·공식 이미지를 렌더링한다.
- TourAPI 네 상세 operation이 typed client와 atomic sync에 포함된다.
- 이미지 저작권과 상세 동기화 시각이 보존된다.
- 후기 탭은 mock 없이 실제 빈 상태다.
- Kakao 주변 검색은 서버 키를 노출하지 않고 직선거리만 사실대로 표시한다.
- Kakao 장애·키 누락이 장소 상세 전체를 실패시키지 않는다.
- mock slug 상세과 기존 명시적 탭 링크가 유지된다.
- 신규 focused test, 전체 lint/test/build/E2E와 브라우저 검증 결과가 분리 보고된다.
- 관련 없는 dirty 변경이 보존되고 Git mutation은 수행되지 않는다.
