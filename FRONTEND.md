# Haetteum Frontend

## 문서의 역할

이 문서는 `apps/web`(Next.js 웹 애플리케이션)의 구현 구조를 정리한 프론트엔드
전용 참고 문서다. 시스템 전체 아키텍처와 데이터 흐름은 [ARCHITECTURE.md](./ARCHITECTURE.md),
UI/UX 원칙과 디자인 토큰은 [DESIGN.md](./DESIGN.md)를 기준으로 하며, 이 문서는
그 위에서 실제 코드가 어떻게 조직되어 있는지(라우트, 컴포넌트 계층, 상태 관리,
feature adapter 패턴)를 정리한다.

- **상태:** Active
- **마지막 갱신:** 2026-09-12
- **기준:** 현재 작업 트리의 `apps/web` 코드

## 1. 기술 스택

- Next.js 16.3.1 (App Router), React 19.2.8, TypeScript strict mode
- Tailwind CSS 4 (CSS-first 구성), shadcn/ui + Base UI + Rhea 스타일
- `@tanstack/react-query` 5: 서버 상태
- `zustand` 5: 제한적 브라우저 UI 상태 (현재는 인증 표시용 in-memory store)
- `zod` 4: `@haetteum/contracts` 스키마 기반 응답 검증
- `@dnd-kit/*`: 코스 편집 화면의 드래그 정렬
- `embla-carousel-react`, `react-kakao-maps-sdk`, `react-markdown`, `lucide-react`,
  `react-icons`
- Vitest 4 + React Testing Library + `@testing-library/user-event` + `axe-core`
  (접근성 검사)

## 2. 디렉토리 구조

```text
apps/web/src/
├── app/            # App Router route와 layout (URL 경계, 화면 조립)
├── components/
│   ├── ui/         # 도메인을 모르는 범용 UI (shadcn 기반)
│   ├── travel/     # 여행지·후기·평점·일정 표현 컴포넌트
│   ├── patterns/   # 화면 단위 조합 컴포넌트
│   └── design-system/  # /design-system preview 전용
├── features/       # API adapter, 기능별 화면 상태, React Query hook
├── lib/            # 공통 유틸리티 (이미지 URL, 포맷 등)
└── styles/         # primitive/semantic token, typography, safe area
```

테스트는 `apps/web/tests/unit`에 `app`, `components`, `features`, `lib` 미러
구조로 존재하며 Vitest로 실행한다(`pnpm --filter @haetteum/web test` 또는
루트 `pnpm test`).

## 3. 컴포넌트 계층 (단방향 의존)

```text
styles (token)
  ↓
components/ui        도메인 모르는 범용 UI/접근성 primitive
  ↓
components/travel     여행지, 후기, 평점, 일정의 표현 컴포넌트
  ↓
components/patterns   여러 컴포넌트의 화면 단위 조합
  ↓
features / app        API 연결, 브라우저 상태, 사용자 흐름, 페이지 조립
```

- `components/ui`: `Button`, `Card`, `Badge`, `Carousel`, `Input`, `Select`,
  `Switch`, `Toggle`, `ToggleGroup`. 여행 도메인 조건이나 API 데이터 타입을
  넣지 않는다.
- `components/travel`: 예) `PlaceCard`, `RatingSummary`, `ProviderBadge`,
  `ItineraryItem`, `PlaceRankingCard`, `FestivalGallery`, `CourseTimeline`,
  `ReelsViewer`, `RandomCourseBanner`. API 요청을 직접 소유하지 않고 명시적
  props로 받은 값만 렌더링한다.
- `components/patterns`: 예) `MainDiscovery`, `PlaceDetailScreen`,
  `FestivalDetailScreen`, `CourseEditScreen`, `MyPageScreen`,
  `LoginScreen`/`auth/*` (회원가입 단계별 스텝), `WelcomeHero` 등 화면 단위
  조합.

## 4. `features/` — API adapter와 화면 상태

`features`는 기능(도메인) 단위 디렉토리로 나뉘며, 각 디렉토리는 보통
`*-api.ts`(fetch + contracts 검증), `*-query.ts`(React Query hook),
`*-model.ts`(화면 상태/파생 로직), 필요 시 `*.mock.ts`(로컬 mock)로 구성된다.

| 디렉토리     | 책임                                                             |
| ------------ | ---------------------------------------------------------------- |
| `auth`       | Kakao 로그인 부트스트랩, 서버/클라이언트 인증 조회, Zustand store |
| `chat`       | AI 챗봇 스트리밍 응답 읽기와 타이핑 효과                          |
| `courses`    | 코스 편집기, 대안 코스, 드래그 정렬(dnd-kit), 저장된 코스         |
| `discovery`  | 메인 홈 세대별 순위, 핫플레이스, 릴스 피드 API/쿼리               |
| `explore`    | 탐색 탭 화면 상태                                                 |
| `festivals`  | 축제 discovery 목록/상세 API·쿼리                                 |
| `places`     | 관광지 상세, 즐겨찾기, 주변 검색, 랜덤 코스 추천, 생성 코스 조회   |
| `profile`    | 마이페이지 데이터, 내 후기, 프로필 사진/선호도                    |
| `query`      | React Query `QueryClient`/Provider (서버·클라이언트 공용)         |
| `reviews`    | 내 후기 목록 API                                                  |
| `trips`      | 저장된 코스/여행 일정 API·쿼리                                    |

adapter 패턴: `app` route(서버 컴포넌트)나 `patterns` 화면이 `features/*-query.ts`의
React Query hook을 호출 → hook은 `features/*-api.ts`에서 `fetch` 후
`@haetteum/contracts` 스키마로 검증 → 검증된 값만 `components/travel` 표현
컴포넌트에 props로 전달한다.

## 5. 라우트 (App Router)

| Route                       | 설명                                             |
| ---------------------------- | ------------------------------------------------ |
| `/`                          | 메인 탐색(추천 탭, 인기관광지 순위, 축제, 릴스)   |
| `/welcome`                   | 웰컴/온보딩 화면                                  |
| `/login`, `/signup`          | Kakao 로그인, 이메일 회원가입 단계별 화면         |
| `/explore`                   | 지역/카테고리 탐색                                |
| `/places/[placeId]`          | 관광지 상세 (정보, 후기, 코스 추천)               |
| `/festivals/[festivalId]`    | 축제 상세                                         |
| `/reels/[videoId]`           | 관광지 릴스(YouTube Shorts) 전체 화면 뷰어         |
| `/reels/place/[placeId]`     | 특정 장소 기준 릴스 피드                          |
| `/courses/[courseId]`        | 생성/저장된 코스 상세                             |
| `/courses/[courseId]/edit`   | 코스 편집(드래그 정렬)                            |
| `/trips`                     | 내 여행/저장된 코스 목록                          |
| `/reviews`                   | 보호 route: 내 후기 목록 (서버 세션 필요)         |
| `/reviews/new`               | 후기 작성                                         |
| `/reviews/[reviewId]/edit`   | 후기 수정                                         |
| `/mypage`                    | 보호 route: 마이페이지, 프로필, 로그아웃          |
| `/chat`                      | AI 챗봇 대화 화면                                 |
| `/design-system`             | 개발 환경 전용 토큰/컴포넌트 preview (production 404) |

보호 route(`/reviews`, `/mypage`)는 서버 세션이 없으면
`/login?returnTo=<원래 경로>`로 redirect한다.

## 6. 스타일과 디자인 토큰

- `styles/tokens.css`: primitive/semantic 색상, 간격, radius, shadow 토큰
- `styles/typography.css`: 타이포그래피 스케일
- `styles/safe-area.css`: 모바일 safe-area 대응
- 색상은 항상 semantic token을 통과시키며, 제품 코드에 직접 색상 코드를 쓰지
  않는다. 자세한 원칙과 컴포넌트 소유권 규칙은 [DESIGN.md](./DESIGN.md) 참고.

## 7. 이미지 처리

`next.config.ts`의 `images.remotePatterns`에 등록된 원격 이미지 출처만 Next.js
Image Optimization을 통과한다.

- `tong.visitkorea.or.kr` — TourAPI 공식 이미지
- `upload.wikimedia.org` — TourAPI에 없는 장소의 공공누리/CC 라이선스 대체 이미지
- `k.kakaocdn.net`, `**.kakaocdn.net` — Kakao 로그인 프로필 이미지
- `i.ytimg.com` — 릴스 썸네일
- `localhost:4000/uploads/**` — 로컬 개발용 후기 사진 업로드(임시, 프로덕션
  스토리지 마련 전)

`imageSizes`는 72px 프로필/80px 장소 썸네일의 2x 화면 기준으로 256px 이상
불필요하게 커지지 않도록 제한되어 있다.

## 8. 환경변수 (`apps/web/.env.local`)

| 변수                                    | 용도                                              |
| ---------------------------------------- | -------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`                | API base URL (예: `http://localhost:4000/api/v1`) |
| `NEXT_PUBLIC_KAKAO_JS_KEY`                | 장소 상세 지도(Kakao Maps JS SDK)용 공개 키. 비어 있으면 지도만 조용히 숨겨짐 |
| `NEXT_PUBLIC_WEEKLY_THUMBNAIL_BASE_URL`   | 주간 추천 썸네일 base URL                          |

`NEXT_PUBLIC_*` 값은 브라우저에 노출되므로 비밀정보(REST API 키, client
secret 등)를 넣지 않는다.

## 9. 테스트

- Vitest + jsdom 환경(`vitest.config.mts`), setup은 `tests/setup.ts`
- `@testing-library/react` + `@testing-library/user-event`로 컴포넌트/상호작용
  테스트
- `axe-core`로 접근성 회귀 검사
- 실행: `pnpm --filter @haetteum/web test` 또는 저장소 루트 `pnpm test`

## 10. 개발 명령어

```bash
pnpm dev:web     # 웹 개발 서버만 실행 (http://localhost:3000)
pnpm --filter @haetteum/web build
pnpm --filter @haetteum/web lint
pnpm --filter @haetteum/web test
```

전체 개발 환경 실행(`pnpm dev`), DB, API 관련 명령어는
[README.md](./README.md)를 참고한다.

## 11. 변경 규칙

다음이 바뀌면 같은 작업에서 이 문서를 함께 갱신한다.

- 새 route, 새 `features/*` 도메인 디렉토리를 추가·삭제할 때
- 컴포넌트 계층 소유권(`ui`/`travel`/`patterns`) 경계가 달라질 때
- 상태 관리 방식(React Query, Zustand 사용 범위)이 달라질 때
- 웹 환경변수나 허용 이미지 출처가 달라질 때

UI 토큰과 디자인 원칙은 [DESIGN.md](./DESIGN.md), 시스템 전체 구조와 API
계약은 [ARCHITECTURE.md](./ARCHITECTURE.md)에 반영한다.
