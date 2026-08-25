# 테마 여행 UI 설계

## 상태

- 승인된 시각 기준: 사용자가 제공한 997×1577 모바일 참고 이미지
- 데이터 범위: 타입이 지정된 로컬 mock 데이터만 사용
- 제품 위치: 메인 탐색 화면의 `테마 여행` 탭 (`/?tab=ai-course`)
- 제외 범위: API, DB, React Query, Zustand 전역 저장, 인증, 신규 제품 라우트

## 목표

참고 이미지의 테마 카드 레일과 추천 코스 목록을 Haetteum의 기존 모바일 탐색 화면 안에 충실하게 구현한다. shadcn을 범용 접근성 기반으로 사용하고, 여행 도메인 표현과 화면 조립을 분리해 이후 실제 데이터 연결 시 UI 컴포넌트를 다시 작성하지 않도록 한다.

## 선택한 접근

기존 `MainDiscovery`의 공통 헤더, 검색, 상단 탭, 하단 내비게이션을 유지하고 `tab=ai-course` 콘텐츠만 `ThemeTravelSection`으로 교체한다.

새 `/themes` 라우트를 만들면 공통 탐색 shell과 query 상태를 중복하게 된다. 반대로 `MainDiscovery` 안에 모든 마크업과 상태를 직접 넣으면 재사용성과 테스트 격리가 나빠진다. 따라서 기존 탭 계약을 유지하면서 `ui → travel → patterns → features` 경계를 확장한다.

## 화면 구조

```text
MainDiscovery
├─ DiscoveryAppHeader
├─ DiscoverySearchPanel
├─ ThemeTravelSection
│  ├─ ThemeFeatureCarousel
│  │  └─ ThemeFeatureCard × 4
│  └─ ThemeCourseExplorer
│     ├─ ThemeFilter
│     ├─ ThemeSort
│     └─ ThemeCourseCard × N
└─ BottomNavigation
```

`ThemeTravelSection`의 정보 순서는 참고 이미지와 동일하게 유지한다.

1. `테마로 떠나는 여행` 제목, 설명, `테마 전체보기`
2. 힐링·미식·문화·액티비티 세로형 카드 가로 레일
3. `테마별 추천 여행` 제목과 정렬
4. 전체·힐링·미식·문화·액티비티·가족 필터
5. 추천 여행 코스 세로 목록

## 컴포넌트 소유권

### `components/ui`

- 기존 `Button`, `Badge`, `Card`, `Carousel`, `ToggleGroup`을 재사용한다.
- 정렬 메뉴에 필요한 shadcn `Select`만 필요 시 추가한다.
- 여행 테마 타입, mock 데이터, 이미지 비율을 넣지 않는다.

### `components/travel`

- `ThemeFeatureCard`: 이미지, 아이콘 slot, 제목, 설명, 코스 수, 선택 행동을 표시한다.
- `ThemeCourseCard`: 썸네일, 테마 배지, 제목, 설명, 일정, 지역, 태그, 평점, 후기 수, 저장 상태를 표시한다.
- 두 컴포넌트 모두 명시적 props만 받고 필터링, 정렬, API 요청, 라우트 판정은 소유하지 않는다.

### `components/patterns`

- `ThemeFeatureCarousel`: 테마 카드의 순서, 크기, 가로 overflow와 다음 카드 peek를 소유한다.
- `ThemeTravelSection`: 제목 영역, 레일, 추천 목록의 화면 순서를 조립한다.

### `features/themes`

- `theme-travel-model.ts`: 테마 ID, 카드와 코스 타입, 필터 및 정렬 순수 함수를 소유한다.
- `theme-travel.mock.ts`: 화면에 필요한 테마 카드 4개와 추천 코스를 소유한다.
- `theme-course-explorer.tsx`: 선택 테마, 정렬, 화면 내 북마크 상태를 소유하는 작은 Client Component다.

### `features/discovery`와 `MainDiscovery`

- 기존 `ai-course` query 값과 상단 탭 URL 계약을 유지한다.
- `tab=ai-course`일 때 기존 단일 AI 배너 대신 `ThemeTravelSection`을 렌더링한다.
- 다른 추천, 인기 관광지, 축제 탭의 데이터와 화면은 변경하지 않는다.

## Mock 데이터 계약

```ts
type ThemeId = "all" | "healing" | "food" | "culture" | "activity" | "family";
type ThemeSort = "popular" | "rating";

type ThemeFeature = {
  id: Exclude<ThemeId, "all" | "family">;
  title: string;
  description: string;
  courseCount: number;
  image: { src: string; alt: string };
};

type ThemeCourse = {
  id: string;
  theme: Exclude<ThemeId, "all">;
  title: string;
  description: string;
  durationLabel: string;
  locationLabel: string;
  rating: number;
  reviewCount: number;
  popularity: number;
  tags: readonly string[];
  image: { src: string; alt: string };
};
```

초기 코스 데이터는 참고 이미지의 제주 바다 힐링 코스, 전주 미식 탐방 코스, 경주 역사 탐방 코스를 포함한다. 목록의 필터와 정렬은 이 배열을 입력으로 받는 순수 함수로 처리한다. mock 모듈 밖에서 데이터 형태를 임의로 조립하지 않는다.

## 상호작용

- 테마 카드를 누르면 같은 테마 필터를 선택하고 추천 목록으로 스크롤한다.
- `테마 전체보기`는 `전체` 필터를 선택하고 추천 목록으로 스크롤한다.
- 필터는 `ToggleGroup`의 선택 상태, 텍스트 굵기, 배경과 border로 함께 표현한다.
- 정렬은 인기순과 평점순을 지원한다.
- 저장 버튼은 화면 생명주기 동안 로컬 상태로 토글되며 API나 영속 저장을 호출하지 않는다.
- 빈 필터 결과는 이유와 `전체 코스 보기` 복구 행동을 표시한다.
- mock 데이터이므로 네트워크 loading/error 상태는 만들지 않는다.

## 시각 기준

- 모바일 앱 surface 최대 폭 480px, 320px 이상 지원
- 화면 좌우 여백 16px, 섹션 간격은 기존 24/32px 리듬 사용
- 테마 카드는 고정 비율의 세로 이미지와 image scrim을 사용한다.
- 가로 레일은 320–480px에서 다음 카드가 일부 보이도록 item basis를 정한다.
- 코스 카드는 흰 surface, 얇은 border, 16px radius를 사용하고 강한 shadow를 추가하지 않는다.
- Primary purple은 선택, CTA, 평점 강조 중 브랜드 행동에만 제한한다.
- Pretendard와 기존 타입 scale, safe-area, 하단 내비게이션 reserve를 유지한다.
- 768px 이상에서도 480px 중앙 정렬 모바일 정보 구조를 유지하며 별도 다단 layout은 만들지 않는다.

## 이미지와 아이콘

필요한 이미지 자산은 다음 일곱 종류다.

- 열대 해변과 야자수
- 차와 디저트가 있는 카페
- 전통 한옥 거리
- 열기구와 산악 풍경
- 제주 해안 산책로
- 전주 한식 상차림
- 경주 역사 유적

기존 제품 자산이 참고 이미지의 피사체와 crop에 충분히 맞는 경우 재사용하고, 맞지 않는 자산은 같은 사진 톤으로 새로 생성한다. 자산은 `apps/web/public/images/themes`에 저장한다. UI 아이콘은 Lucide를 사용하고 inline SVG, emoji, CSS 그림을 만들지 않는다.

## 접근성

- 모든 버튼과 필터는 최소 44×44px 터치 영역을 제공한다.
- 테마 레일과 코스 목록은 각각 접근 가능한 제목과 list semantics를 갖는다.
- 이미지 alt는 장식 설명이 아니라 여행지와 피사체를 구체적으로 설명한다.
- 아이콘 전용 저장 버튼에는 코스명을 포함한 `aria-label`과 `aria-pressed`를 제공한다.
- 선택 상태는 색만이 아니라 글자 굵기, border 또는 아이콘 상태를 함께 사용한다.
- 키보드 focus-visible과 reduced-motion 기준을 유지한다.

## 테스트와 시각 검증

- 필터·인기순·평점순 순수 함수 단위 테스트
- `ThemeFeatureCard`, `ThemeCourseCard`의 콘텐츠와 접근성 상태 테스트
- 필터, 정렬, 저장 토글, 빈 결과 복구의 사용자 상호작용 테스트
- `tab=ai-course`에서만 테마 여행 화면이 노출되는 조립 테스트
- 핵심 패턴 axe 접근성 검사
- `pnpm --filter @haetteum/web lint`
- `pnpm --filter @haetteum/web test`
- `pnpm --filter @haetteum/web build`
- 원본과 동일한 모바일 viewport 및 초기 상태로 브라우저 캡처 후 디자인 QA

## 변경 안전성

현재 작업 트리의 기존 변경은 사용자 작업으로 간주한다. 테마 여행에 필요한 파일만 추가·수정하고, 추천·인기 관광지·축제·상세 화면과 백엔드 변경을 되돌리거나 재정렬하지 않는다. Git stage, commit, branch, push는 별도 승인 없이 수행하지 않는다.

## 완료 기준

- 첨부 이미지의 두 핵심 섹션과 모바일 밀도가 구현되어 있다.
- 상단 공통 shell과 다른 탭의 동작이 유지된다.
- 필터, 정렬, 저장, 카드 선택이 mock 데이터로 동작한다.
- shadcn 기반 범용 요소와 여행 도메인 요소의 책임이 분리되어 있다.
- 테스트, lint, build와 디자인 QA가 통과한다.
