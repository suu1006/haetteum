# Haetteum 사용자 후기 작성·수정 및 실제 저장 설계

**상태:** 방향 확정 · 미구현
**작성일:** 2026-08-26
**초기 사용자:** `TEST / test-user / 테스트 여행자`
**저장소:** PostgreSQL + Prisma
**API:** NestJS REST `/api/v1`

## 1. 목표

`내 후기` 화면의 헤더 `작성하기` 버튼을 제거하고, 하단 주요 내비게이션 위 오른쪽에
원형 `+` 플로팅 버튼을 제공한다. 사용자가 이 버튼으로 후기 작성 폼에 이동해 기존
관광지를 선택하고 별점과 내용을 제출하면, 후기가 PostgreSQL에 저장되고 `작성한 후기`
목록 최상단에 나타나야 한다.

초기에는 로그인 기능이 없으므로 고정 테스트 사용자 한 명을 사용한다. 데이터 모델은
처음부터 `User`와 `Review` 관계를 사용하여, 추후 카카오 로그인과 서버 세션이 완성되면
현재 사용자 확인 부분만 교체할 수 있게 한다.

## 2. 확인된 현재 상태

- `/reviews`는 `myReviewsMock`의 작성 후기와 북마크 후기를 모두 표시한다.
- `작성하기` 버튼은 실제 폼으로 이동하지 않고 “준비 중” 상태 메시지만 설정한다.
- 후기 작성·수정 route, 공유 HTTP 계약, NestJS API, Prisma `User`/`Review` 모델이 없다.
- 기존 `GET /api/v1/places`는 지역, 검색어, 페이지 조건으로 실제 `Place`를 조회한다.
- `Place`에는 제목, 지역·시군구 관계, 대표 이미지가 있어 후기 카드 표시 정보로
  재사용할 수 있다.
- 인증·세션은 아직 구현되지 않았다. 향후 방향은 카카오 단일 제공자와 서버 세션이다.

## 3. 범위

### 이번 구현에 포함

- 고정 테스트 사용자와 실제 후기 데이터 모델
- 테스트 사용자 기준 후기 작성·내 목록 조회·단건 조회·수정 API
- 한 사용자당 한 관광지에 후기 한 개만 허용하는 DB 제약
- `/reviews/new` 작성 폼
- `/reviews/{reviewId}/edit` 수정 폼
- `/reviews` 작성 목록의 DB 연동
- `내 후기` 우측 하단 원형 `+` 버튼
- 작성 후기 카드의 `수정` 링크
- 작성·수정 성공 후 목록 이동과 실패 상태 표시
- 공유 Zod 계약, API·웹 단위 테스트, DB E2E, 실제 브라우저 흐름 검증

### 이번 구현에서 제외

- 카카오 로그인, 세션, 로그아웃
- 테스트 사용자 이외의 다중 사용자 전환 UI
- 후기 삭제
- 사진 업로드와 파일 저장소
- 좋아요·댓글·북마크 저장 기능
- 장소 상세 화면 후기 피드의 DB 연동
- 후기 작성 이후 장소의 평균 평점·후기 수 집계 갱신

## 4. 승인된 사용자 흐름

```text
/reviews
  └─ 우측 하단 원형 + 버튼
       └─ /reviews/new
            ├─ 지역 선택
            ├─ 관광지 검색·선택
            ├─ 별점 1~5 선택
            ├─ 후기 내용 입력
            └─ 제출
                 ├─ 성공 → /reviews 작성한 후기 최상단
                 └─ 실패 → 현재 폼 유지 + 오류 메시지

/reviews 작성한 후기 카드
  └─ 수정
       └─ /reviews/{reviewId}/edit
            ├─ 관광지 정보 읽기 전용
            ├─ 별점 수정
            ├─ 후기 내용 수정
            └─ 저장
                 ├─ 성공 → /reviews 수정된 후기 최상단
                 └─ 실패 → 현재 폼 유지 + 오류 메시지
```

작성 폼의 관광지 후보에서는 테스트 사용자가 이미 후기를 작성한 관광지를 제외한다.
동시 요청이나 오래된 화면에서도 중복이 생기지 않도록 API와 DB unique 제약이 최종
방어선이 된다.

## 5. 데이터 모델

### User

| 필드 | 타입/규칙 | 설명 |
|---|---|---|
| `id` | UUID PK | 내부 사용자 식별자 |
| `provider` | `String(32)` | 초기값 `TEST`, 향후 `KAKAO` |
| `providerUserId` | `String(191)` | 제공자 내부 사용자 식별자 |
| `displayName` | `String(100)` | 화면 표시 이름 |
| `createdAt` | timestamptz | 생성 시각 |
| `updatedAt` | timestamptz | 수정 시각 |

제약과 관계:

```text
UNIQUE(provider, providerUserId)
User 1 ─ N Review
```

초기 migration은 고정 UUID를 가진 테스트 사용자를 `ON CONFLICT DO NOTHING`으로
생성한다.

```text
id: 00000000-0000-4000-8000-000000000001
provider: TEST
providerUserId: test-user
displayName: 테스트 여행자
```

인증 비밀정보나 비밀번호는 저장하지 않는다. 카카오 로그인 구현 시에는 실제 카카오
사용자를 `provider=KAKAO`로 생성하고, 현재 사용자 resolver가 세션의 `User.id`를
반환하도록 교체한다.

### Review

| 필드 | 타입/규칙 | 설명 |
|---|---|---|
| `id` | UUID PK | 후기 식별자 |
| `userId` | UUID FK | 후기 소유자 |
| `placeId` | UUID FK | 후기 대상 관광지 |
| `rating` | SmallInt, 1~5 | 정수 별점 |
| `content` | `String(500)` | trim 후 1~500자 |
| `createdAt` | timestamptz | 최초 작성 시각 |
| `updatedAt` | timestamptz | 최근 수정 시각 |

제약과 관계:

```text
UNIQUE(userId, placeId)
INDEX(userId, updatedAt)
INDEX(placeId)
Review N ─ 1 User
Review N ─ 1 Place
```

- 사용자 삭제 시 후기는 함께 삭제한다.
- 관광지는 공공데이터 동기화 대상이므로 후기에서 참조 중이면 물리 삭제를 제한한다.
- 목록은 `updatedAt DESC, id DESC`로 정렬하여 작성하거나 수정한 후기를 최상단에 둔다.

## 6. 현재 사용자 경계

`ReviewsService`가 테스트 사용자 상수를 직접 반복하지 않도록 후기 모듈 안에
`CurrentReviewUser` 경계를 둔다.

초기 구현:

```text
CurrentReviewUser.getUserId() → 00000000-0000-4000-8000-000000000001
```

향후 구현:

```text
CurrentReviewUser.getUserId() → 서버 세션의 User.id
```

Controller와 후기 CRUD 서비스의 입력·출력 계약은 이 교체로 변경하지 않는다. 이번
범위에서는 가짜 인증 header나 클라이언트가 보내는 `userId`를 신뢰하지 않는다.

## 7. 공유 HTTP 계약

`packages/contracts/src/reviews.ts`가 요청과 성공 응답을 소유한다. Prisma 타입은 외부로
노출하지 않는다.

### 작성 요청

```json
{
  "placeId": "uuid",
  "rating": 5,
  "content": "다시 방문하고 싶은 곳이에요."
}
```

- `placeId`: UUID
- `rating`: 정수 1~5
- `content`: trim 후 1~500자

### 수정 요청

```json
{
  "rating": 4,
  "content": "평일에 다시 방문해 보니 더 여유로웠어요."
}
```

관광지와 소유자는 수정할 수 없다.

### 후기 응답 항목

```json
{
  "id": "uuid",
  "placeId": "uuid",
  "placeTitle": "에버랜드",
  "location": "경기 용인",
  "rating": 5,
  "content": "다시 방문하고 싶은 곳이에요.",
  "primaryImageUrl": "https://...",
  "createdAt": "2026-08-26T03:00:00.000Z",
  "updatedAt": "2026-08-26T03:00:00.000Z"
}
```

대표 이미지가 없으면 `primaryImageUrl`은 `null`이다.

## 8. REST API

```http
GET   /api/v1/reviews/mine
GET   /api/v1/reviews/:reviewId
POST  /api/v1/reviews
PATCH /api/v1/reviews/:reviewId
```

### GET /reviews/mine

- 현재 테스트 사용자의 후기만 반환한다.
- `Place`, `TourismRegion`, `TourismDistrict`를 함께 조회해 카드 표시 정보를 만든다.
- `updatedAt DESC, id DESC` 최신순으로 반환한다.
- 후기가 없으면 `items: []` 성공 응답을 반환한다.

### GET /reviews/:reviewId

- 현재 테스트 사용자가 소유한 후기만 반환한다.
- 존재하지 않거나 다른 사용자의 후기이면 동일하게 `404`를 반환해 소유권 정보를
  노출하지 않는다.

### POST /reviews

- 대상 `Place`가 존재하고 `isVisible=true`인지 확인한다.
- 고정 테스트 사용자로 후기를 생성한다.
- 같은 사용자와 장소 조합이 이미 있으면 `409 REVIEW_ALREADY_EXISTS`를 반환한다.
- 성공 시 생성한 후기 응답 항목을 반환한다.

### PATCH /reviews/:reviewId

- 현재 테스트 사용자의 후기만 수정한다.
- 별점과 내용만 변경한다.
- 성공 시 수정된 후기 응답 항목을 반환한다.

### 오류

- 계약 검증 실패: `400 BAD_REQUEST`
- 존재하지 않거나 비표출 장소: `404 PLACE_NOT_FOUND`
- 존재하지 않거나 소유하지 않은 후기: `404 REVIEW_NOT_FOUND`
- 사용자·장소 중복 후기: `409 REVIEW_ALREADY_EXISTS`
- 예상하지 못한 오류: 기존 Problem Details filter의 안전한 `500`

성공 응답은 데이터를 직접 반환하고, 오류만 기존 Problem Details 형식을 사용한다.

## 9. Next.js 데이터 흐름

### /reviews

- Server Component가 `GET /reviews/mine`을 호출한다.
- `written`은 API의 실제 DB 후기만 사용한다.
- `bookmarked`는 이번 범위에서 기존 목 데이터를 유지한다.
- API 실패를 목 작성 후기로 숨기지 않고 작성 탭 안에 재시도 안내를 표시한다.
- DB 후기 응답은 기존 `MyReviewItem` 표현 모델로 변환한다.
  - `date`: `updatedAt`을 `YYYY.MM.DD`로 표시
  - `likeCount`: `0`
  - `commentCount`: `0`
  - `bookmarked`: `false`
  - 이미지 없음: `/images/explore/categories/popular-attraction.png`

### 플로팅 + 버튼

- 헤더의 `작성하기` 버튼과 준비 중 상태 로직을 제거한다.
- 하단 주요 내비게이션과 safe area 위에 고정한다.
- 최대 너비 `30rem` 화면 안에서 오른쪽 20px inset을 유지한다.
- 원형 버튼 안에는 시각적 `+` 문자를 사용한다.
- 접근성 이름은 `후기 작성하기`이고 `/reviews/new`로 이동한다.

### /reviews/new

- 지역을 먼저 선택한다.
- 기존 `GET /api/v1/places`를 이용해 해당 지역의 장소를 검색·선택한다.
- 내 후기 목록의 `placeId`를 이용해 이미 작성한 장소는 후보에서 제외한다.
- 별점은 키보드로 조작 가능한 1~5 버튼 그룹을 사용한다.
- 내용은 500자 제한과 남은 글자 수를 표시한다.
- 제출 중에는 중복 제출을 막는다.
- 성공 시 `router.replace('/reviews')` 후 새 목록을 새로 가져온다.
- 실패 시 사용자가 입력한 지역·장소·별점·내용을 유지하고 오류를 표시한다.

### /reviews/{reviewId}/edit

- Server Component가 단건 API로 현재 사용자의 후기를 조회한다.
- 관광지명과 지역은 읽기 전용으로 표시한다.
- 별점과 내용만 편집한다.
- 저장 성공 시 `router.replace('/reviews')` 후 수정된 후기 목록을 새로 가져온다.
- `404`는 route의 not-found 상태로 처리한다.

### 작성 후기 카드

- 작성 탭 카드에만 `수정` 링크를 노출한다.
- 북마크 카드에는 수정 링크를 노출하지 않는다.
- 링크는 `/reviews/{reviewId}/edit`을 사용한다.

## 10. 모듈 경계

```text
apps/api/prisma/schema.prisma
apps/api/prisma/migrations/<timestamp>_add_users_and_reviews/

apps/api/src/reviews/
├── current-review-user.service.ts
├── reviews.controller.ts
├── reviews.service.ts
├── reviews.module.ts
└── *.spec.ts

packages/contracts/src/
└── reviews.ts

apps/web/src/app/reviews/
├── page.tsx
├── new/page.tsx
└── [reviewId]/edit/page.tsx

apps/web/src/components/patterns/
├── my-reviews-screen.tsx
└── review-editor-screen.tsx

apps/web/src/components/travel/
├── my-review-card.tsx
└── review-editor-form.tsx

apps/web/src/features/profile/
├── my-reviews-api.ts
├── my-reviews-model.ts
└── my-reviews.mock.ts
```

- `CurrentReviewUser`: 이번 테스트 사용자와 향후 세션 사용자 사이의 교체 경계
- `ReviewsService`: 소유권, 장소 유효성, unique 충돌 변환, Prisma 조회·쓰기
- 공유 계약: HTTP 요청·응답 검증
- 웹 API adapter: base URL, fetch, Zod 응답 검증, 오류 분류
- form: 사용자 입력 상태와 제출만 담당
- screen: 화면 배치와 성공 후 route 이동 담당

복잡한 외부 저장 규칙이 없으므로 별도 Repository 추상화는 추가하지 않는다.

## 11. TDD와 검증 기준

### 공유 계약

- 작성 요청은 UUID 장소, 정수 1~5 별점, trim 된 1~500자 내용을 허용한다.
- 잘못된 UUID, 소수 별점, 빈 내용, 500자 초과를 거부한다.
- 수정 요청은 `placeId`나 `userId`를 허용하지 않는다.
- 후기 응답과 목록 응답을 검증한다.

### API 단위 테스트

- 테스트 사용자의 후기만 최신 수정순으로 조회한다.
- 후기 생성 시 현재 테스트 사용자와 실제 장소를 연결한다.
- 없는·비표출 장소를 거부한다.
- 같은 사용자·장소의 unique 충돌을 `409`로 변환한다.
- 다른 사용자 후기 단건 조회·수정을 `404`로 처리한다.
- 수정에서 관광지와 소유자가 바뀌지 않는다.

### DB/E2E

- migration이 테스트 사용자를 정확히 한 명 생성한다.
- 동일 migration 또는 초기화 흐름에서 테스트 사용자가 중복되지 않는다.
- `POST → GET mine → PATCH → GET mine`이 실제 PostgreSQL에서 동작한다.
- 동일 사용자·장소 두 번째 `POST`가 `409`이며 행이 하나만 남는다.
- 잘못된 요청은 기존 Problem Details 형식으로 반환된다.

### 웹 단위 테스트

- `/reviews` 작성 탭은 API 후기만 표시하고 북마크 탭은 기존 목을 유지한다.
- API 실패 시 목 작성 후기를 표시하지 않는다.
- 플로팅 원형 `+` 링크가 `/reviews/new`로 이동한다.
- 작성 폼은 필수 입력, 별점, 500자 제한, 중복 제출 방지를 검증한다.
- 이미 작성한 장소는 새 후기 후보에서 제외한다.
- 수정 폼은 관광지를 읽기 전용으로 유지하고 별점·내용만 PATCH한다.
- 작성 카드에만 수정 링크가 있다.

### 실제 브라우저

```text
/reviews
→ + 버튼
→ 지역 선택
→ 관광지 검색·선택
→ 별점·내용 입력
→ 제출
→ /reviews 새 후기 최상단 확인
→ 수정
→ 별점·내용 변경
→ 저장
→ /reviews 수정 후기 최상단 확인
```

검증은 390px과 480px에서 수행한다.

- 플로팅 버튼이 하단 내비게이션이나 safe area와 겹치지 않는다.
- 작성·수정 폼의 입력과 오류가 화면 밖으로 넘치지 않는다.
- URL과 최종 화면을 확인한다.
- 브라우저 콘솔 오류·경고가 없다.
- API 재조회 결과와 PostgreSQL 행이 일치한다.

## 12. 구현 완료 조건

- 고정 테스트 사용자가 migration으로 존재한다.
- 사용자는 한 관광지에 후기를 한 번만 작성할 수 있다.
- 사용자는 본인의 후기 별점과 내용을 수정할 수 있다.
- 새 후기 또는 수정 후기 결과가 목 데이터가 아니라 PostgreSQL에서 다시 조회된다.
- 작성 목록에는 DB 후기만, 북마크 목록에는 승인된 기존 목만 표시된다.
- 모든 공유 계약·API·DB·웹 테스트가 통과한다.
- 실제 모바일 폭의 작성·수정 전체 흐름과 콘솔 상태가 검증된다.
- 이번 범위와 무관한 관광·축제·순위 작업 트리 변경은 보존된다.
