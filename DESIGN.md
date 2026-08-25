# Haetteum Design System

## Source of truth

- Status: Active
- Last refreshed: 2026-08-24
- Primary product surfaces: 모바일 웰컴, 여행 탐색 메인, 통합 후기, 여행 경로 및 일정
- Evidence reviewed:
  - ChatGPT 대화 `디자인 시스템 구성계획`에서 승인된 기술 및 시각 기준
  - `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/globals.css`
  - `apps/web/package.json`의 Next.js 16.3.1, React 19.2.8, Tailwind CSS 4 구성
  - `apps/web/src/components`의 Foundation 및 여행 표현 컴포넌트
  - `apps/web/public/icons`의 브라우저, Apple touch 및 PWA 아이콘 구성
  - 2026-08-21 사용자 제공 모바일 메인 페이지 참고 이미지와 승인된 5개 영역 구성
  - 저장소에 포함된 Next.js 16 전역 CSS 및 폰트 가이드
  - shadcn/ui의 Base UI, Rhea 및 현재 컴포넌트 문서

이 문서는 Haetteum의 UI/UX 및 프런트엔드 구현 판단을 위한 단일 기준이다. 구현 중 새로운 시각 규칙이나 예외가 필요하면 화면에서 임의 값을 추가하기 전에 이 문서를 먼저 갱신한다.

## Brand

- Personality: 여행의 설렘은 느껴지되 정보 탐색을 방해하지 않는, 밝고 친절하며 정돈된 모바일 서비스
- Trust signals: 명확한 후기 출처, 일관된 평점 표시, 예측 가능한 선택 상태, 읽기 쉬운 일정과 이동 경로
- Avoid:
  - 기본 shadcn 컴포넌트를 그대로 조합한 SaaS 또는 관리자 화면 인상
  - 보라색을 의미 없이 넓은 면적의 장식에 반복 사용하는 방식
  - 과도한 글래스모피즘, 강한 그림자, 무의미한 그라디언트
  - 화면마다 다른 radius, 간격, 버튼 높이를 임의로 추가하는 방식
  - 모바일 화면에 데스크톱용 hover 동작을 핵심 피드백으로 사용하는 방식

## Product goals

- Goals:
  - 4개 핵심 화면을 같은 토큰과 컴포넌트 규칙으로 구성한다.
  - 여행지, 후기, 지도, 일정을 빠르게 훑고 다음 행동을 쉽게 선택하게 한다.
  - 화면을 추가해도 색상, 간격, 타이포그래피와 상태 표현이 자연스럽게 확장되게 한다.
- Non-goals:
  - 1차에서는 다크 모드와 멀티 브랜드를 만들지 않으며, 데스크톱 전용 정보구조는 웰컴 화면의 승인된 2열 히어로에 한정한다.
  - 디자인 시스템을 별도 npm 패키지로 분리하거나 외부 배포하지 않는다.
  - 모든 shadcn 컴포넌트를 미리 설치하지 않는다.
  - 지도 SDK, 일정 드래그 정렬, 실제 데이터 연동은 Foundation 범위에 포함하지 않는다.
- Success signals:
  - 제품 코드에서 직접 색상 코드가 사용되지 않는다.
  - 반복되는 높이, 간격, radius는 토큰 또는 컴포넌트 variant로 수렴한다.
  - 선택, 비활성, 로딩, 오류 상태를 색상 하나에만 의존하지 않는다.
  - 키보드와 터치 환경에서 같은 기능을 완료할 수 있다.

## Personas and jobs

- Primary personas: 모바일에서 여행지를 탐색하고 후기와 이동 동선을 비교해 일정을 만드는 국내 여행 사용자
- User jobs:
  - 추천 여행지와 축제를 빠르게 훑는다.
  - 여러 출처의 후기와 평점을 한곳에서 비교한다.
  - 여행 경로와 시간순 일정을 이해하고 수정한다.
  - 현재 위치와 다음 방문 지점을 혼동 없이 구분한다.
- Key contexts of use:
  - 한 손으로 조작하는 모바일 환경
  - 이동 중 짧은 시간에 정보를 훑는 상황
  - 네트워크 속도가 일정하지 않은 상황

## Information architecture

- Primary navigation: 모바일 고정형 하단 내비게이션을 사용한다. 메뉴는 `홈`, `탐색`, `내 일정`, `내 후기`, `마이페이지`의 5개로 고정하고 웹사이트용 `NavigationMenu`는 사용하지 않는다.
- Core routes/screens:
  - 웰컴: 서비스 가치와 핵심 기능 진입
  - 메인: 지역 탐색, 관광지 순위, 축제, AI 코스 진입
  - 장소 상세 `/places/[placeId]`: 통합 평점, 출처 필터, 후기 피드. 소개,
    코스 추천과 정보 탭은 준비 중 상태
  - 관광지 릴스 `/reels/[videoId]`: 선택 영상부터 시작하는 세로형 전체 화면
    미리보기, 반응과 공유
  - 여행 경로: 지도, 현재 위치, 경로, 일정 타임라인, 수정 진입
- Content hierarchy:
  1. 현재 화면의 목적과 사용자 위치
  2. 핵심 선택 또는 다음 행동
  3. 여행지, 후기, 일정의 주요 정보
  4. 출처, 거리, 날짜 등 보조 정보

## Design principles

### 1. 브랜드 색은 행동과 선택을 설명한다

Primary purple은 CTA, 선택된 탭과 필터, 활성 경로, 핵심 강조에만 사용한다. 장식 목적으로 반복하지 않는다.

### 2. 이미지가 감성을 만들고 UI는 정보를 정리한다

웰컴과 여행지 카드는 이미지가 분위기를 담당한다. 컨트롤과 정보 영역은 밝은 surface, 제한된 테두리, 조용한 그림자를 사용한다.

### 3. 모바일 피드백을 우선한다

최소 터치 영역 44×44px, `pressed`, `focus-visible`, `disabled` 상태를 우선 정의한다. hover는 보조 효과다.

### 4. 토큰은 실제 반복에서 성장한다

예상만으로 토큰과 variant를 늘리지 않는다. 같은 값 조합이 두 번 이상 반복되면 의미 토큰, variant 또는 도메인 컴포넌트로 승격할지 검토한다.

### Tradeoffs

- Rhea의 조밀한 기본 밀도를 사용하되, 핵심 CTA와 모바일 터치 영역은 제품 기준인 44px/52px을 우선한다.
- shadcn 코드를 프로젝트가 소유하므로 수정 자유도는 높지만, `components/ui`에는 여행 도메인 조건과 데이터 타입을 넣지 않는다.
- 1차는 라이트 모드만 구현하지만 모든 색상 사용은 semantic token을 통과시켜 향후 테마 확장 가능성은 막지 않는다.

## System architecture

```text
primitive token
색상 스케일, 간격, 크기, radius, shadow, motion
        ↓
semantic token
background, foreground, primary, border, rating, route
        ↓
components/ui
shadcn + Base UI 기반 범용 접근성 컴포넌트
        ↓
components/travel
여행지, 후기, 일정 데이터의 표현 컴포넌트
        ↓
components/patterns
웰컴 히어로, 통합 후기, 지도 경로, 일정 타임라인
        ↓
features / app routes
데이터 연결, 사용자 흐름, 페이지 조립
```

### Ownership rules

| 계층 | 책임 | 금지 사항 |
|---|---|---|
| `styles` | 토큰, 타이포그래피, safe area와 전역 기반 | 화면별 선택자와 도메인 조건 |
| `components/ui` | 범용 UI, 접근성, 공통 variant | 여행 API 타입, 화면별 조건문 |
| `components/travel` | 여행 데이터의 반복 표현 | 페이지 데이터 요청과 라우팅 흐름 |
| `components/patterns` | 여러 컴포넌트의 화면 단위 조합 | 전역 토큰 재정의 |
| `features` / `app` | 데이터와 사용자 흐름 연결 | 범용 UI의 복제 |
| `public/images`, `public/icons` | 제품이 소유하는 정적 이미지, 브랜드, 브라우저 및 PWA 아이콘 | React 컴포넌트와 런타임 외부 데이터 |
| `tests` | 프론트엔드 단위 테스트와 공통 테스트 설정 | 제품 런타임 코드 |

## Visual language

### Color

#### Primitive palette

| Token | Value | Role |
|---|---:|---|
| `--purple-50` | `#F7F3FF` | 선택 및 브랜드 subtle surface |
| `--purple-600` | `#6F3DE5` | 핵심 행동과 선택 |
| `--purple-700` | `#5D2FC5` | pressed 상태 |
| `--neutral-0` | `#FFFFFF` | 카드와 control surface |
| `--neutral-25` | `#FCFCFD` | page canvas |
| `--neutral-200` | `#E6E6EB` | border와 divider |
| `--neutral-600` | `#5C5E67` | 보조 텍스트 |
| `--neutral-950` | `#18191E` | 주요 텍스트 |
| `--amber-500` | `#FFB020` | 평점 |
| `--red-600` | `#E5484D` | error 상태와 아이콘 강조 |
| `--red-700` | `#D6363B` | 흰 글자를 사용하는 destructive control |
| `--blue-600` | `#2F80ED` | 현재 위치 |

실제 구현에서는 위 값을 OKLCH 기반 CSS 변수로 등록하고 hex 값은 문서 및 디자인 교환용 기준으로 유지한다.

#### Semantic mapping

```text
--background             → neutral-25
--foreground             → neutral-950
--card                   → neutral-0
--card-foreground        → neutral-950
--primary                → purple-600
--primary-foreground     → neutral-0
--primary-pressed        → purple-700
--primary-subtle         → purple-50
--muted                  → neutral-25
--muted-foreground       → neutral-600
--border / --input       → neutral-200
--ring                   → purple-600
--destructive            → red-700
--rating                 → amber-500
--current-location       → blue-600
--route-line             → purple-600
--image-foreground       → neutral-0
--image-foreground-muted → neutral-0 / 86%
--image-scrim            → black / 34%
```

외부 후기 출처 색상은 `--provider-kakao`, `--provider-google`, `--provider-naver`로 격리하고, 일반 상태나 버튼 색으로 재사용하지 않는다.

이미지 위 텍스트와 제한된 scrim은 `--image-foreground`,
`--image-foreground-muted`, `--image-scrim`으로만 표현한다. 이 토큰은 히어로와
이미지 카드의 가독성 보정용이며 일반 surface, 버튼 또는 상태 색상으로 재사용하지
않는다.

웰컴 기능 카드의 아이콘 surface는 `--welcome-ranking`, `--welcome-course`,
`--welcome-reviews`로 격리하고, 반투명 카드 surface는 `--welcome-glass`를 사용한다.
이 색상은 웰컴 기능 구분 외의 일반 상태 표현에는 재사용하지 않는다.

### Typography

- Primary family: `"Pretendard Variable"`, `Pretendard`
- Fallback: `-apple-system`, `BlinkMacSystemFont`, `"Apple SD Gothic Neo"`, `system-ui`, sans-serif
- Delivery: `pretendard` npm 패키지의 variable dynamic subset을 self-host한다. 외부 CDN을 런타임 의존성으로 사용하지 않는다.
- Weight policy: 400 본문, 500 보조 강조, 600 제목과 선택, 700 핵심 display로 제한한다.

| Role | Size / Line height | Weight | Usage |
|---|---|---:|---|
| `display` | 32 / 40 | 700 | 웰컴 핵심 문구 |
| `display-desktop` | 56 / 64 | 700 | 1024px 이상 웰컴 핵심 문구 |
| `title-lg` | 24 / 32 | 700 | 페이지 제목 |
| `title-md` | 20 / 28 | 600 | 섹션 제목 |
| `body-lg` | 16 / 24 | 400 | 주요 본문과 큰 컨트롤 |
| `body-md` | 14 / 21 | 400 | 일반 설명과 카드 본문 |
| `label` | 14 / 20 | 600 | 버튼, 탭, 필터 |
| `caption` | 12 / 18 | 400 | 날짜, 거리, 후기 출처 |

숫자와 영문에 별도 폰트를 섞지 않는다. 본문은 자간을 임의로 좁히지 않고, 큰 제목에만 제한적으로 음수 tracking을 적용한다.

### Spacing/layout rhythm

- Base unit: 4px
- Allowed spacing: 4, 8, 12, 16, 20, 24, 32, 40px
- Screen inline padding: 16px
- Card internal padding: 16px
- Card/list gap: 12px
- Section gap: 24px
- Major section gap: 32px
- Content max width: 모바일은 100%, 태블릿은 480px 앱 surface를 사용한다. 1024px 이상 웰컴 화면은 2열로 전환하고, 1280px 이상에서는 내부 콘텐츠를 화면의 약 83%로 제한하며 최대 폭은 1388px이다.

### Shape/radius/elevation

- Small element: 8px
- Control: 12px
- Card: 16px
- Dialog: 20px
- Drawer top corners: 24px
- Pill: 999px
- Default cards: 밝은 surface + 얇은 border
- Shadow: 지도 위 패널, floating control, dialog/drawer에만 사용
- Glass: 웰컴 히어로의 제한된 기능 카드에만 사용

### Motion

- Press feedback: 100–150ms
- Tab/filter state: 150–200ms
- Dialog/drawer: 200–300ms
- Easing: 빠른 진입과 부드러운 정지를 우선한다.
- 데스크톱 웰컴은 오른쪽 패널에서 채팅을 800ms 간격으로 하나씩 노출한 뒤 `로딩 → AI 코스·CTA`로 직접 전환하고 마지막 상태에서 멈춘다. 채팅은 560ms의 짧은 상승·opacity, 최종 패널은 48px 이동·opacity를 900ms 동안 적용한다.
- 웰컴 자동 재생은 탭이 숨겨지면 멈추고, `prefers-reduced-motion: reduce`에서는 마지막 CTA 상태를 즉시 표시한다.
- `prefers-reduced-motion: reduce`에서는 이동과 확대를 제거하고 opacity 전환도 최소화한다.
- 장식용 반복 애니메이션은 사용하지 않는다.

### Imagery/iconography

- Icon: Lucide, 기본 20px, 주요 내비게이션 24px, 보조 16px
- 아이콘 stroke와 텍스트 무게의 균형을 유지하고 한 화면에서 임의의 stroke width를 섞지 않는다.
- 여행지 이미지는 컴포넌트별 aspect ratio를 고정해 데이터에 따른 레이아웃 흔들림을 막는다.
- 장식 아이콘보다 실제 사진, 위치, 평점, 출처 정보가 우선한다.
- 제품이 소유하는 정적 이미지는 `apps/web/public/images`, 브랜드 및 PWA 아이콘은 `apps/web/public/icons`에서 관리한다.
- 웰컴 배경은 모바일 세로 이미지와 데스크톱 가로 이미지를 art direction으로 분리해 각 화면비에서 풍선과 산의 주요 구도가 잘리지 않게 한다.
- favicon과 Apple touch icon도 `apps/web/public/icons`에서 관리하고, `apps/web/src/app/layout.tsx`의 `metadata.icons`로 명시적으로 연결한다.
- UI 아이콘은 정적 파일로 복제하지 않고 `lucide-react` 컴포넌트를 사용한다.

## Components

### Foundation stack

- Framework: Next.js 16.3.1 App Router
- Language: TypeScript strict mode
- Styling: Tailwind CSS 4 + CSS variables
- UI distribution: shadcn/ui
- Component base: Base UI
- shadcn style: Rhea (`base-rhea`)
- Base color: neutral
- Icon library: Lucide
- Theme: light only

### Existing implemented components to reuse

- Foundation: Button, Input, Toggle, ToggleGroup, Card, Badge, Carousel, Select
- Travel: PlaceCard, PlaceRankingCard, FestivalListItem, AiCourseBanner,
  FestivalFilterGroup, FestivalRankingCard, FestivalFeatureBanner,
  FestivalCardRail, BottomNavigation, RatingSummary, ProviderBadge, ReviewCard,
  ReviewProviderMark, PlaceDetailHeader, PlaceDetailTabs, PlaceReviewOverview,
  ReviewSourceFilter, PlaceDetailPreparation, PlaceDetailActions, ItineraryItem,
  PopularVideoCard, TravelThemeItem, VideoCourseCard, CourseQuickSaveCard,
  ThemeFeatureCard, ThemeCourseCard, NearbyPlaceSelectCard
- Patterns: WelcomeHero, WelcomeFeatureCard, MainDiscovery, DiscoveryHero,
  DiscoverySearchPanel, RankedPlaceSection, FestivalSection, FestivalDiscovery,
  PopularPlacesTab, ThemeFeatureCarousel, ThemeTravelSection, PlaceDetailScreen,
  NearbyPlaceSearchScreen
- `apps/web/src/app/layout.tsx`의 한국어 문서 구조와 App Router 경계를 유지한다.
- `apps/web/src/app/globals.css`는 전역 진입점만 담당한다.

### First implementation unit

```text
apps/web/components.json
apps/web/src/app/globals.css
apps/web/src/styles/tokens.css
apps/web/src/styles/typography.css
apps/web/src/styles/safe-area.css
apps/web/src/lib/utils.ts
apps/web/src/components/ui/button.tsx
apps/web/src/components/ui/input.tsx
apps/web/src/components/ui/toggle.tsx
apps/web/src/components/ui/toggle-group.tsx
apps/web/src/components/ui/card.tsx
apps/web/src/components/ui/badge.tsx
```

Foundation 확인 화면은 제품 첫 화면과 섞지 않고 별도 `/design-system` route에
유지한다. `/`는 승인된 메인 여행 탐색 화면만 렌더링한다.

### shadcn components to add later, on demand

```text
input-group, tabs, separator, avatar, dialog, alert-dialog, drawer,
scroll-area, skeleton, spinner, sonner
```

### Implemented travel components

```text
bottom-navigation
place-card
place-ranking-card
festival-list-item
festival-filter-group
festival-ranking-card
festival-feature-banner
festival-card-rail
ai-course-banner
popular-video-card
travel-theme-item
video-course-card
course-quick-save-card
theme-feature-card
theme-course-card
rating-summary
review-card
provider-badge
review-provider-mark
place-detail-header
place-detail-tabs
place-review-overview
review-source-filter
place-detail-preparation
place-detail-actions
itinerary-item
nearby-place-select-card
```

### Travel components to add later, on demand

```text
app-bar
```

### Implemented popular-place tab and reels components

The implemented `tab=places` unit and `/reels/[videoId]` route use explicit
display props and narrow Client Component boundaries. They do not own API
requests or global state.

```text
popular-video-card
popular-video-rail
reels-viewer
travel-theme-item
video-course-card
course-quick-save-card
```

- `PopularVideoRail` owns Embla selection and ensures only the selected visible
  `PopularVideoCard` auto-plays. Hidden, background, reduced-motion and
  save-data states pause or skip playback.
- `PopularVideoCard` presents a muted local video with poster fallback,
  highlight badge, duration, title, view count, like count, and location. The
  whole card links to its reel route.
- `ReelsViewer` owns vertical scroll snap, one active video, local like state,
  Web Share/clipboard fallback and back-position restoration. Comment and more
  remain clearly labeled preparation states.
- `TravelThemeItem` presents a circular image and a short theme label.
- `TravelThemeMoreItem` reuses the same footprint for the visual-only
  `더보기` item.
- `VideoCourseCard` presents a landscape poster, duration, course title,
  summary, and location.
- `CourseQuickSaveCard` remains available as a standalone visual-only promotion,
  but the current popular-place tab no longer renders it in the video-course rail.
- Current video assets are approved 6-second silent motion previews generated
  from local posters. The `video.src` contract can later receive licensed real
  footage without changing component boundaries.

### Implemented theme-travel tab components

`tab=ai-course`는 기존 app header, 검색, 상단 콘텐츠 탭과 하단 내비게이션을
유지하면서 다음 mock 기반 테마 탐색 단위를 렌더링한다.

```text
ThemeCourseExplorer
└─ ThemeTravelSection
   ├─ ThemeFeatureCarousel → ThemeFeatureCard
   └─ ToggleGroup / Select → ThemeCourseCard list
```

- `ThemeFeatureCard`와 `ThemeCourseCard`는 명시적 props만 받으며 필터, 정렬,
  라우트 또는 데이터 요청을 소유하지 않는다.
- `ThemeCourseExplorer`만 작은 Client Component 경계로 동작하며 선택 테마,
  인기순·평점순, 화면 생명주기 동안의 저장 ID를 소유한다.
- 데이터는 `features/themes/theme-travel.mock.ts`에 한정한다. API, React Query,
  Zustand와 영속 저장은 연결하지 않는다.
- 테마 카드 이미지는 `Carousel`, 필터는 `ToggleGroup`, 정렬은 `Select`, 코스
  표면은 `Card`와 `Badge`를 재사용한다.

#### Travel content implementation unit

Phase 3의 첫 구현 단위는 데이터 요청이나 라우팅을 소유하지 않는 표현
컴포넌트로 한정한다. API 응답을 그대로 전달하지 않고 아래의 명시적 props로
화면에 필요한 값만 받는다.

| Component | Required data | Optional state / slot | Semantic root |
|---|---|---|---|
| `PlaceCard` | `title`, `location`, `rating`, `reviewCount` | `media`, `tags`, `saved`, `onSavedChange` | `article` |
| `RatingSummary` | `value`, `reviewCount` | `distribution`, `size`, `layout`, `tone`, `distributionValue` | labelled `section` |
| `ProviderBadge` | `provider` | `icon` | text badge |
| `ReviewCard` | `author`, `rating`, `date`, `content`, `provider` | `providerIcon`, `avatar`, `variant`, `images`, `likeCount` | `article` |
| `ItineraryItem` | `order`, `time`, `title`, `location`, `status` | `travelDuration`, `isLast` | `li` |

- `media`, `providerIcon`, `avatar`는 `ReactNode` slot이다. 원격 이미지 호스트나
  특정 CDN을 도메인 컴포넌트가 결정하지 않는다.
- `PlaceCard`의 저장 상태는 controlled/uncontrolled 혼합 상태를 만들지 않는다.
  `saved`를 화면 상태로 사용하고 사용자 입력은 `onSavedChange(nextSaved)`로
  상위 계층에 전달한다.
- `RatingSummary.distribution`은 5점부터 1점까지의 `score`와 `count`를 받으며,
  각 막대는 시각 비율과 동일한 접근성 값을 제공한다.
- `ItineraryItem.status`는 `upcoming | current | completed`로 제한한다. 현재
  위치는 파란색, 완료는 중립색, 예정은 primary 계열을 사용하고 텍스트를
  보조 신호로 제공한다.
- 긴 장소명과 후기 본문은 컨테이너 너비 안에서 줄바꿈한다. 카드 media는
  `aspect-[4/3]`, 미리보기 목록은 320px에서도 가로 overflow가 없어야 한다.
- 빈 데이터, loading, error와 실제 페이지 조합은 후속 pattern/feature 계층의
  책임으로 남긴다.

### Product patterns

Implemented:

```text
welcome-hero
welcome-feature-card
welcome-desktop-conversation
welcome-chat-message
welcome-desktop-showcase
welcome-chat-slide
welcome-course-slide
welcome-course-step-card
welcome-actions
ranked-place-section
main-discovery
discovery-hero
discovery-search-panel
festival-section
festival-discovery
popular-places-tab
place-detail-screen
nearby-place-search-screen
```

Add later, on demand:

```text
map-route-panel
itinerary-timeline
```

`PopularPlacesTab` composes the auto-playing popular-video rail, a six-item
theme row including `더보기`, and a four-course two-column grid. The
`영상으로 둘러보기` CTA opens the first filtered reel; `더보기` remains a
visual-only label because no destination is approved.

`NearbyPlaceSearchScreen`은 일정 수정 화면의 전체 화면 후속 단계로 검색 field,
category filter, 정렬, `NearbyPlaceSelectCard` 목록과 fixed 선택 CTA를 조합한다.
`CoursePlacePicker`만 검색어, filter, sort와 선택 ID의 비영속 mock 상태를 소유한다.
표현 컴포넌트는 mock, route와 코스 draft를 직접 참조하지 않으며 API, 새 route와
전역 store는 추가하지 않는다.

### Place review detail composition

`/places/[placeId]`는 메인의 모든 `PlaceRankingCard`가 공유하는 동적 장소 상세
route다. 현재 구현은 후기 탭만 완성하고 소개, 코스 추천과 정보 탭은 선택한 탭을
유지하는 준비 중 화면을 제공한다.

```text
PlaceDetailScreen
├─ PlaceDetailHeader
├─ PlaceDetailTabs
├─ reviews → PlaceReviewOverview / ReviewSourceFilter / ReviewCard feed
├─ introduction | course | information → PlaceDetailPreparation
└─ reviews → PlaceDetailActions
```

- 메인 장소 요약은 `mainDiscoveryMock.places`, 후기 분포와 피드는
  `features/places/place-detail.mock.ts`가 장소 ID로 확장한다.
- 탭과 후기 출처는 URL query로 표현하고, 알려지지 않은 값은 후기/전체로
  정규화한다. 존재하지 않는 장소 ID는 scoped 404로 처리한다.
- `RatingSummary`의 기존 stacked/rating 기본값은 유지한다. 장소 상세만
  `layout="split"`, `tone="primary"`, `distributionValue="count"`를 사용한다.
- `ReviewCard`의 기존 default variant는 유지한다. 장소 상세만 provider,
  이미지 rail, 작성자 metadata와 좋아요 수를 갖는 `feed` variant를 사용한다.
- 뒤로가기, 찜과 공유는 `PlaceDetailHeader`, 후기 작성 준비 중 안내는
  `PlaceDetailActions`의 작은 Client Component 경계에 한정한다.
- 후기 작성, 실제 찜 저장, API 연동과 세 준비 중 탭의 실제 콘텐츠는 구현된
  기능으로 간주하지 않는다.

### Main discovery composition

`/` 메인 화면은 승인된 참고 이미지의 정보 구조를 Haetteum 디자인 시스템으로
재해석하고 다음 다섯 영역을 고정된 순서로 조합한다.

```text
MainDiscovery
├─ DiscoveryHero
├─ DiscoverySearchPanel
├─ recommended → RankedPlaceSection / AiCourseBanner / FestivalSection
├─ places → PopularPlacesTab
├─ festivals → FestivalDiscovery
├─ ai-course → ThemeCourseExplorer / ThemeTravelSection
└─ BottomNavigation
```

- `DiscoveryHero`는 여행 이미지, 인사말과 메인 질문만 소유한다.
- `DiscoverySearchPanel`은 검색 필드, 콘텐츠 탭과 지역 필터를 조합한다.
- `RankedPlaceSection`은 `PlaceRankingCard`의 순서와 가로 스크롤만 소유한다.
- `PopularPlacesTab`은 `릴스형 인기 관광지 → 테마 원형 목록 → 지금 뜨는 영상 코스`의
  순서를 소유한다. 릴스는 시각 화살표 없는 swipe Carousel, 영상 코스는
  두 열 grid를 사용한다.
- 릴스 Carousel은 선택된 카드 하나만 muted·inline·loop 재생하고 나머지는
  정지한다. 카드와 `영상으로 둘러보기`는 선택된 `/reels/[videoId]`로 이동한다.
- 320px에서는 릴스 카드의 좋아요·위치 값을 시각적으로 숨기되 스크린리더 정보는
  유지한다. 영상 코스는 설명과 위치를 한 줄로 제한해 2열 구조를 유지한다.
- `FestivalDiscovery`는 URL 기반 축제 필터, 순위 카드 레일, 이달의 축제와
  AI 축제 코스를 조합한다. `더 많은 축제 보기` 상태만 작은 Client Component인
  `FestivalCardRail`이 소유한다.
- `AiCourseBanner`, `FestivalListItem`, `BottomNavigation`은 명시적 props를 받는
  여행 표현 컴포넌트로 만들고 라우트 파일이나 API를 직접 참조하지 않는다.
- `인기 관광지` 탭은 기존 app header, 검색, 콘텐츠 탭과 하단
  내비게이션을 그대로 사용한다. 추천 탭의 기존 TOP 3, AI 코스, 축제 구성은
  변경하지 않는다.
- `관광 축제` 탭도 공통 hero, 검색, 지역 필터와 하단 내비게이션을 유지한다.
  `진행 중`, `이번 주`, `무료`, `가족` 필터는 검색어와 지역을 보존한 URL
  query로 표현하며 링크 안에 Toggle 버튼을 중첩하지 않는다.
- `테마 여행` 탭은 카드 선택과 `테마 전체보기`에서 추천 목록으로 이동하고,
  테마 필터, 인기순·평점순 정렬, 비영속 저장 토글을 mock 데이터로 처리한다.
- 숏폼 관광지와 영상 코스는 선택 지역과 검색어를 적용한다. 여행 테마는
  지역과 무관한 탐색 카테고리이므로 항상 노출한다.
- Foundation은 기존 `Card`, `Carousel`, `Badge`를 재사용한다. 인기 탭의 visual
  CTA는 기능이 승인되지 않았으므로 button/link semantics를 만들지 않는다. URL query를
  소유하는 상단
  탭은 로컬 상태 기반 `Tabs`로 교체하지 않는다.
- 이번 구현은 `apps/web/src/features/discovery/main-discovery.mock.ts`의 읽기 전용
  mock 데이터를 사용한다. 검색어, 콘텐츠 탭과 지역 필터는
  URL query를 통해 mock 목록에 반영하고 실제 API, 전역 store 또는 영속 상태를
  추가하지 않는다.
- 하단 메뉴의 시각 계약은 `홈`, `탐색`, `내 일정`, `내 후기`, `마이페이지`이다.
  이번 범위에서 실제 route가 존재하는 `홈`만 현재 위치로 동작하고, 나머지 항목은
  새 route를 임의로 만들지 않고 `준비 중` 상태를 접근 가능하게 전달한다.

### Variants and states

#### Button

- Variants: `default`, `secondary`, `outline`, `ghost`, `destructive`, `glass`
- Sizes: `sm` 36px, `default` 44px, `lg` 52px, `icon` 44×44px, `icon-sm` 36×36px
- States: default, pressed, focus-visible, disabled, loading
- `glass`는 웰컴 히어로처럼 이미지 위에 놓이는 제한된 경우에만 사용한다.

#### Toggle / ToggleGroup

- Variants: `default`, `outline`
- Sizes: `sm`, `default`, `lg`
- Selected 상태는 배경색, 텍스트 굵기, border 중 최소 두 가지 신호를 함께 사용한다.
- 연결형 segmented control은 `spacing={0}`, 독립 필터 칩은 Rhea 기본 spacing을 사용한다.

#### Card

- Sizes: `default`, `sm`
- Default spacing variable은 16px이다.
- 범용 Card에는 여행지 이미지 비율이나 후기 데이터 구조를 넣지 않는다.
- 이미지와 도메인 slot은 `components/travel`에서 합성한다.

### Token/component ownership

- primitive와 semantic token의 단일 원본은 `apps/web/src/styles/tokens.css`다.
- Tailwind v4의 `@theme inline`은 semantic token을 utility로 노출하는 연결층이다.
- component variant는 `components/ui`의 CVA 정의가 소유한다.
- page 또는 feature에서 hex, 임의 radius, 반복되는 임의 `className` 조합을 추가하지 않는다.

## Accessibility

- Target standard: WCAG 2.2 AA
- Keyboard/focus behavior:
  - 모든 대화형 요소는 키보드로 도달하고 작동해야 한다.
  - focus ring은 배경과 충분히 구분되며 `:focus-visible`에서 표시한다.
  - Base UI의 포커스 관리와 키보드 동작을 wrapper 밖에서 우회하지 않는다.
- Contrast/readability:
  - 일반 텍스트는 최소 4.5:1, 큰 텍스트와 핵심 UI 경계는 최소 3:1을 목표로 한다.
  - 보라색 위 흰색 CTA 대비를 구현 시 자동 검사한다.
- Screen-reader semantics:
  - 아이콘 버튼에는 구체적인 `aria-label`을 제공한다.
  - 선택 상태는 `aria-pressed`, `aria-selected` 등 컴포넌트 의미와 일치시킨다.
  - 지도 경로에는 시각 지도와 별도로 읽을 수 있는 일정 순서를 제공한다.
- Reduced motion and sensory considerations:
  - 색상만으로 상태를 구분하지 않는다.
  - reduced motion에서 필수 정보가 사라지지 않는다.

## Responsive behavior

- Supported breakpoints/devices: 320px 이상 모바일을 1차 기준으로 하고 최신 주요 브라우저를 지원한다.
- Layout adaptations:
  - 320–767px: 기본 모바일 layout
  - 768–1023px: 콘텐츠 폭을 480px로 제한하고 중앙 정렬하며 모바일 정보 구조를 유지
  - 1024px 이상 웰컴: 가로 배경 위 왼쪽 제목·설명·구분선을 고정하고, 오른쪽에 자동 재생 여행 추천 슬라이드를 배치하는 2열 layout
  - 1280px 이상 웰컴: 배경은 화면 전체를 유지하고 내부 2열 콘텐츠를 화면의 약 83%, 최대 1388px로 제한
  - 웰컴 외 제품 화면의 데스크톱 전용 다단 정보 구조는 별도 승인 전 도입하지 않는다.
- Touch/hover differences:
  - 터치 target은 최소 44×44px이다.
  - hover는 색 또는 elevation의 미세한 보조 변화만 제공한다.
  - hover 없이도 상태와 기능을 모두 이해할 수 있어야 한다.
- Safe area:
  - 상단 고정 UI는 `env(safe-area-inset-top)`을 반영한다.
  - 하단 내비게이션과 sticky action은 `env(safe-area-inset-bottom)`을 반영한다.

## Interaction states

- Loading: 콘텐츠 형태를 유지하는 skeleton을 우선하고, 짧은 control 작업에는 spinner를 사용한다.
- Empty: 비어 있는 이유와 사용자가 할 수 있는 다음 행동을 함께 제시한다.
- Error: 실패한 대상과 복구 행동을 구체적으로 제시한다. 색상과 아이콘만으로 끝내지 않는다.
- Success: 사용자가 수행한 행동과 같은 동사를 사용해 결과를 알린다.
- Disabled: opacity뿐 아니라 cursor, ARIA/HTML disabled 상태를 함께 적용한다.
- Offline/slow network: 이전 콘텐츠를 무조건 지우지 않고, 새 데이터가 지연 중임을 표시한다.

## Content voice

- Tone: 친절하고 짧으며 구체적인 한국어
- Terminology: 관광지, 후기, 여행 경로, 일정, 현재 위치 등 사용자가 인지하는 용어를 사용한다.
- Microcopy rules:
  - 버튼은 결과가 분명한 동사로 작성한다. 예: `코스 수정하기`, `후기 더 보기`
  - 기술 용어나 구현 상태를 사용자 문구에 노출하지 않는다.
  - 오류는 사과보다 원인과 해결 방법을 먼저 알린다.
  - 같은 행동은 진입 버튼, dialog 제목, 완료 메시지에서 같은 용어를 유지한다.

## Implementation constraints

- Framework/styling system:
  - Next.js 16의 저장소 내 문서를 먼저 확인하고 App Router 규칙을 따른다.
  - Tailwind CSS 4에서는 별도 `tailwind.config` 없이 CSS-first 설정을 사용한다.
  - shadcn은 Base UI + Rhea preset으로 초기화하고 생성된 코드를 프로젝트가 소유한다.
- Design-token constraints:
  - 컴포넌트에서 primitive color를 직접 사용하지 않고 semantic token을 사용한다.
  - spacing과 radius의 임의값 추가는 디자인 문서 갱신 또는 반복 근거가 있어야 한다.
  - dark mode 토큰은 1차 구현에 추가하지 않는다.
- Performance constraints:
  - Pretendard는 self-host하고 런타임 외부 CDN 요청을 만들지 않는다.
  - 사용하지 않는 shadcn 컴포넌트를 일괄 설치하지 않는다.
  - 이미지 컴포넌트는 고정 aspect ratio와 크기 정보를 가져야 한다.
- Compatibility constraints:
  - Server Component가 기본이며 브라우저 상태가 필요한 UI에만 `"use client"`를 둔다.
  - Base UI primitive를 feature/page에서 직접 import하지 않고 `@/components/ui`를 거친다.
- Test/screenshot expectations:
  - 프론트엔드 단위 테스트와 공통 설정은 제품 코드와 분리해 `apps/web/tests`에서 관리한다.
  - `tests/unit`은 `src/app`, `src/components`의 소유권 계층을 따라 구성한다.
  - Vitest + React Testing Library로 컴포넌트의 role, 상태, disabled, class variant를 검증한다.
  - axe 기반 접근성 검사를 핵심 컴포넌트 테스트에 포함한다.
  - ESLint, 테스트, TypeScript/production build를 모두 통과해야 한다.
  - `/design-system`에서 버튼, toggle, toggle group, card의 모든 1차 상태를 육안 확인한다.
  - 핵심 폭 320px, 390px, 768px, 1024px, 1440px에서 overflow, 이미지 art direction과 터치 영역을 확인한다.

## Delivery phases

### Phase 1. Foundation

- shadcn Base UI + Rhea 초기화
- primitive/semantic token, typography, safe-area 구축
- Button, Toggle, ToggleGroup, Card 설치 및 Haetteum variant 적용
- `/design-system` 확인 화면과 자동 테스트 구성

### Phase 2. Navigation and input

- Input/InputGroup, Tabs, Badge, Separator, Avatar
- AppBar, search field, filter chip group, bottom navigation, sticky action
- 메인 화면의 하단 메뉴명은 `홈`, `탐색`, `내 일정`, `내 후기`, `마이페이지`로 확정

### Phase 3. Travel content

- place/ranking/festival cards
- rating summary, provider badge, review card
- itinerary item 및 공통 loading/empty/error 상태

### Phase 4. Page patterns

- welcome hero와 제한된 glass surface
- ranked place section과 integrated review feed
- map route panel과 itinerary timeline
- 4개 핵심 화면 조립

### Phase 5. Visual and accessibility QA

- 승인된 원본 화면과 시각 비교
- 키보드, screen reader semantics, 대비, reduced motion 점검
- 320/390/768/1024/1440px responsive 점검
- 중복 utility와 예외 토큰 제거

## Open questions

- [ ] 원본 4개 화면 이미지와 로고/브랜드 자산을 저장소에 추가할지 결정 / 사용자 / Phase 3 이후 시각 정확도에 영향
- [x] 하단 내비게이션 메뉴명은 `홈`, `탐색`, `내 일정`, `내 후기`, `마이페이지`로 확정 / 사용자 승인 / 2026-08-21
- [ ] `탐색`, `내 일정`, `내 후기`, `마이페이지`의 실제 route와 화면 범위 확정 / 사용자 / 후속 화면 구현에 영향
- [x] `/design-system` 확인 route는 개발 환경에서만 노출 / 사용자 승인 / Phase 1 적용
