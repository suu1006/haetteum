# Haetteum 인기 관광지 탭 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or `superpowers:executing-plans`
> to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking. Do not dispatch subagents unless the user explicitly chooses the
> subagent-driven option.

**Goal:** 기존 메인 탐색 화면의 `tab=places` 콘텐츠를 재사용 가능한 숏폼 관광지,
여행 테마, 영상 코스 UI로 구현한다.

**Architecture:** URL query와 필터링은 기존 feature 계층에 남기고,
`PopularPlacesTab` pattern이 세 콘텐츠 구역을 조합한다. 각 카드는 명시적인 표시
props만 받는 travel 컴포넌트로 만들며, 상호작용이 필요한 shadcn Carousel만 좁은
Client Component 경계로 둔다.

**Tech Stack:** Next.js 16.3.1 App Router, React 19.2.8, TypeScript strict,
Tailwind CSS 4, shadcn 4.18.0 Base UI/Rhea, Embla Carousel, Vitest,
React Testing Library, axe-core

**Spec:** `docs/superpowers/specs/2026-08-22-popular-places-tab-design.md`

## Global Constraints

- Node.js는 `24.19.0`, 패키지 매니저는 `pnpm@10.33.0`을 사용한다.
- 구현 전에 `apps/web/node_modules/next/dist/docs/`의 Server/Client Component,
  Image, Vitest 가이드를 다시 확인한다.
- Server Component가 기본이며 브라우저 상태가 필요한 Carousel에만
  `"use client"`를 둔다.
- 기존 hero, 검색, 상단 탭, 지역 필터와 하단 내비게이션을 변경하지 않는다.
- `추천`, `관광 축제`, `AI 코스` 탭의 현재 동작을 유지한다.
- 상단 탭을 shadcn `Tabs`로 교체하지 않고 URL query 기반 `Link`를 유지한다.
- 실제 동영상, API, 신규 route, React Query, Zustand와 데이터베이스를 추가하지
  않는다.
- 현재 `apps/web/public/images/discovery` 자산만 사용하고 새 임시 대체 이미지 또는
  외부 이미지 URL을 추가하지 않는다.
- UI icon은 `lucide-react`를 사용하고 inline SVG, CSS 그림과 emoji 대체물을 만들지
  않는다.
- 새 색상 hex, 임의 shadow와 별도 디자인 시스템 계층을 추가하지 않는다.
- 44×44px 최소 touch target, semantic token, safe area와 WCAG 2.2 AA 기준을
  유지한다.
- 기존 미커밋 변경을 덮어쓰거나 관련 없는 파일을 정리하지 않는다.
- 브랜치, worktree, commit, push와 PR은 별도 사용자 승인 없이 수행하지 않는다.

## File Map

### Create

- `apps/web/src/components/ui/badge.tsx`: shadcn Base UI badge primitive.
- `apps/web/src/components/ui/carousel.tsx`: Embla 기반 shadcn Carousel Client
  Component와 44px 이동 control.
- `apps/web/src/components/travel/popular-video-card.tsx`: 세로형 숏폼 관광지 카드.
- `apps/web/src/components/travel/travel-theme-item.tsx`: 원형 여행 테마 항목.
- `apps/web/src/components/travel/video-course-card.tsx`: 가로형 영상 코스 카드.
- `apps/web/src/components/patterns/popular-places-tab.tsx`: 세 섹션 조합과 빈 상태.

### Modify

- `apps/web/package.json`: `embla-carousel-react` runtime dependency.
- `pnpm-lock.yaml`: pnpm이 계산한 Embla dependency 잠금.
- `apps/web/tests/setup.ts`: jsdom Carousel observer stub.
- `apps/web/src/features/discovery/discovery-model.ts`: 인기 콘텐츠 표시 타입,
  visibility와 필터링.
- `apps/web/src/features/discovery/main-discovery.mock.ts`: Haetteum 이미지로 구성한
  read-only 인기 콘텐츠 mock.
- `apps/web/src/components/patterns/main-discovery.tsx`: `tab=places` pattern 분기.
- `apps/web/tests/unit/features/discovery/discovery-model.test.ts`: query/region 및
  visibility 단위 테스트.
- `apps/web/tests/unit/components/travel/discovery-components.test.tsx`: 새 travel 카드
  semantic 테스트.
- `apps/web/tests/unit/components/patterns/main-discovery.test.tsx`: 새 pattern 순서,
  빈 상태와 기존 추천 탭 회귀 테스트.
- `apps/web/tests/unit/features/discovery/discovery-content.test.tsx`: URL query에서
  인기 관광지 탭을 조립하는 feature 테스트.
- `DESIGN.md`: 새 컴포넌트와 pattern을 구현 상태로 전환.
- `docs/superpowers/specs/2026-08-22-popular-places-tab-design.md`: 구현 및 검증
  결과 상태 반영.

---

### Task 1: 표시 모델과 mock 데이터 확장

**Files:**

- Modify: `apps/web/tests/unit/features/discovery/discovery-model.test.ts`
- Modify: `apps/web/src/features/discovery/discovery-model.ts`
- Modify: `apps/web/src/features/discovery/main-discovery.mock.ts`

**Interfaces:**

- Consumes: 기존 `DiscoveryImage`, `DiscoveryQuery`, `RegionId`,
  `selectDiscoveryView()`.
- Produces: `PopularVideoItem`, `TravelThemeItem`, `VideoCourseItem`,
  `PopularPlacesData`, 확장된 `MainDiscoveryData`, 확장된 `DiscoveryView`.

- [ ] **Step 1: 인기 관광지 visibility와 검색 결과의 실패 테스트 작성**

`selectDiscoveryView` suite에 다음 두 테스트를 추가한다.

```ts
it("selects only the popular-place feed for the places tab", () => {
  const view = selectDiscoveryView(mainDiscoveryMock, {
    q: "  성산  ",
    region: "jeju",
    tab: "places",
  });

  expect(view.showRankedPlaces).toBe(false);
  expect(view.showPopularPlaces).toBe(true);
  expect(view.showAiCourse).toBe(false);
  expect(view.showFestivals).toBe(false);
  expect(view.popularVideos.map((item) => item.title)).toEqual([
    "성산일출봉 일출 미리보기",
  ]);
  expect(view.videoCourses.map((item) => item.title)).toEqual([
    "성산 일출 코스",
  ]);
  expect(view.travelThemes).toEqual(mainDiscoveryMock.popularPlaces.themes);
});

it("keeps the recommendation composition unchanged", () => {
  const view = selectDiscoveryView(mainDiscoveryMock, {
    q: "",
    region: "jeju",
    tab: "recommended",
  });

  expect(view.showRankedPlaces).toBe(true);
  expect(view.showPopularPlaces).toBe(false);
  expect(view.showAiCourse).toBe(true);
  expect(view.showFestivals).toBe(true);
});
```

기존 `showPlaces` assertion은 `showRankedPlaces`와 `showPopularPlaces` assertion으로
교체한다.

- [ ] **Step 2: focused model test가 예상대로 실패하는지 확인**

Run:

```bash
pnpm --filter @haetteum/web exec vitest run tests/unit/features/discovery/discovery-model.test.ts
```

Expected: `showRankedPlaces`, `showPopularPlaces`, `popularVideos`,
`videoCourses`, `travelThemes`가 아직 없어서 FAIL.

- [ ] **Step 3: 표시 타입과 view 계약 추가**

`DiscoveryImage` 아래에 다음 타입을 추가한다.

```ts
export type PopularVideoItem = {
  id: string;
  title: string;
  region: RegionId;
  location: string;
  badgeLabel: string;
  durationLabel: string;
  viewCountLabel: string;
  likeCountLabel: string;
  image: DiscoveryImage;
};

export type TravelThemeItem = {
  id: string;
  label: string;
  image: DiscoveryImage;
};

export type VideoCourseItem = {
  id: string;
  title: string;
  summary: string;
  region: RegionId;
  location: string;
  durationLabel: string;
  image: DiscoveryImage;
};

export type PopularPlacesData = {
  videos: readonly PopularVideoItem[];
  themes: readonly TravelThemeItem[];
  courses: readonly VideoCourseItem[];
};
```

`MainDiscoveryData`와 `DiscoveryView`를 다음 계약으로 확장한다.

```ts
export type MainDiscoveryData = {
  hero: DiscoveryImage;
  aiCourse: DiscoveryImage;
  regions: ReadonlyArray<{ id: RegionId; label: string }>;
  places: readonly PlaceRankingItem[];
  festivals: readonly FestivalItem[];
  popularPlaces: PopularPlacesData;
};

export type DiscoveryView = {
  places: readonly PlaceRankingItem[];
  festivals: readonly FestivalItem[];
  popularVideos: readonly PopularVideoItem[];
  travelThemes: readonly TravelThemeItem[];
  videoCourses: readonly VideoCourseItem[];
  showRankedPlaces: boolean;
  showPopularPlaces: boolean;
  showAiCourse: boolean;
  showFestivals: boolean;
};
```

- [ ] **Step 4: Haetteum 인기 콘텐츠 mock 추가**

`mainDiscoveryMock`에 아래 데이터 shape과 문구를 정확히 추가한다. 기존 6개 로컬
이미지를 다른 crop으로 재사용한다.

```ts
popularPlaces: {
  videos: [
    {
      id: "seongsan-sunrise-preview",
      title: "성산일출봉 일출 미리보기",
      region: "jeju",
      location: "서귀포",
      badgeLabel: "지금 인기 급상승",
      durationLabel: "0:18",
      viewCountLabel: "12.4만",
      likeCountLabel: "2,356",
      image: {
        src: "/images/discovery/place-seongsan.png",
        alt: "바다에서 바라본 성산일출봉",
      },
    },
    {
      id: "hyeopjae-sunset-highlight",
      title: "협재 노을 하이라이트",
      region: "jeju",
      location: "제주시",
      badgeLabel: "베스트 하이라이트",
      durationLabel: "0:27",
      viewCountLabel: "9.8만",
      likeCountLabel: "1,892",
      image: {
        src: "/images/discovery/place-hyeopjae.png",
        alt: "맑은 물빛의 협재해수욕장",
      },
    },
    {
      id: "bijarim-walk-preview",
      title: "비자림 숲길 미리보기",
      region: "jeju",
      location: "제주시",
      badgeLabel: "힐링 인기",
      durationLabel: "0:21",
      viewCountLabel: "7.2만",
      likeCountLabel: "1,105",
      image: {
        src: "/images/discovery/place-bijarim.png",
        alt: "초록빛이 이어지는 비자림 산책로",
      },
    },
  ],
  themes: [
    { id: "hot-place", label: "핫플", image: { src: "/images/discovery/main-hero-jeju.png", alt: "제주 해안의 인기 여행지" } },
    { id: "family", label: "가족여행", image: { src: "/images/discovery/place-seongsan.png", alt: "가족과 둘러보기 좋은 성산일출봉" } },
    { id: "healing", label: "힐링", image: { src: "/images/discovery/place-bijarim.png", alt: "마음이 편안해지는 비자림 숲길" } },
    { id: "day-trip", label: "당일치기", image: { src: "/images/discovery/place-hyeopjae.png", alt: "당일치기로 즐기는 협재 해변" } },
    { id: "festival", label: "축제", image: { src: "/images/discovery/festival-jeju.png", alt: "제주 들판에서 열리는 여름꽃 축제" } },
  ],
  courses: [
    {
      id: "jeju-coast-healing-course",
      title: "제주 해안 힐링 코스",
      summary: "바다와 카페를 천천히 즐겨요",
      region: "jeju",
      location: "제주시",
      durationLabel: "0:32",
      image: { src: "/images/discovery/place-hyeopjae.png", alt: "협재 해변의 맑은 바다" },
    },
    {
      id: "seongsan-sunrise-course",
      title: "성산 일출 코스",
      summary: "일출 명소를 따라 걷는 아침 여행",
      region: "jeju",
      location: "서귀포",
      durationLabel: "0:25",
      image: { src: "/images/discovery/place-seongsan.png", alt: "아침 햇살 아래 성산일출봉" },
    },
    {
      id: "bijarim-forest-course",
      title: "비자림 숲길 코스",
      summary: "초록빛 숲에서 쉬어 가는 시간",
      region: "jeju",
      location: "제주시",
      durationLabel: "0:21",
      image: { src: "/images/discovery/place-bijarim.png", alt: "비자림의 울창한 산책길" },
    },
  ],
},
```

- [ ] **Step 5: 인기 콘텐츠 필터와 visibility 구현**

`selectDiscoveryView()`에 다음 계산을 추가하고 기존 `showPlaces`를 분리한다.

```ts
const popularVideos = data.popularPlaces.videos.filter(
  (video) =>
    video.region === query.region &&
    (!normalizedQuery ||
      matchesQuery([video.title, video.location], normalizedQuery)),
);
const videoCourses = data.popularPlaces.courses.filter(
  (course) =>
    course.region === query.region &&
    (!normalizedQuery ||
      matchesQuery(
        [course.title, course.summary, course.location],
        normalizedQuery,
      )),
);

return {
  places,
  festivals,
  popularVideos,
  travelThemes: data.popularPlaces.themes,
  videoCourses,
  showRankedPlaces: query.tab === "recommended",
  showPopularPlaces: query.tab === "places",
  showAiCourse: query.tab === "recommended" || query.tab === "ai-course",
  showFestivals: query.tab === "recommended" || query.tab === "festivals",
};
```

- [ ] **Step 6: focused model test 통과 확인**

Run:

```bash
pnpm --filter @haetteum/web exec vitest run tests/unit/features/discovery/discovery-model.test.ts
```

Expected: 새 테스트와 기존 query URL 테스트 모두 PASS.

- [ ] **Step 7: 변경 검토 checkpoint**

Run:

```bash
git diff --check
git diff -- apps/web/src/features/discovery/discovery-model.ts apps/web/src/features/discovery/main-discovery.mock.ts apps/web/tests/unit/features/discovery/discovery-model.test.ts
```

Expected: whitespace 오류가 없고 Task 1 파일 외 관련 없는 변경이 새로 생기지 않음.
별도 승인 전 commit하지 않는다.

---

### Task 2: shadcn Badge와 Carousel Foundation 추가

**Files:**

- Create: `apps/web/src/components/ui/badge.tsx`
- Create: `apps/web/src/components/ui/carousel.tsx`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `apps/web/tests/setup.ts`
- Modify: `apps/web/tests/unit/components/ui/components.test.tsx`

**Interfaces:**

- Consumes: 기존 `Button`, `buttonVariants`, `cn`, semantic color/radius
  utilities.
- Produces: `Badge`, `badgeVariants`, `Carousel`, `CarouselContent`,
  `CarouselItem`, `CarouselPrevious`, `CarouselNext`, `CarouselApi`,
  `useCarousel`.

- [ ] **Step 1: Badge의 실패 테스트 작성**

`components.test.tsx`에 다음 테스트를 추가한다.

```tsx
import { Badge } from "@/components/ui/badge";

it("renders the shadcn badge with the selected variant", () => {
  render(<Badge variant="secondary">지금 인기 급상승</Badge>);

  expect(screen.getByText("지금 인기 급상승")).toHaveAttribute(
    "data-slot",
    "badge",
  );
});
```

- [ ] **Step 2: UI focused test가 import 실패하는지 확인**

Run:

```bash
pnpm --filter @haetteum/web exec vitest run tests/unit/components/ui/components.test.tsx
```

Expected: `@/components/ui/badge`를 찾을 수 없어 FAIL.

- [ ] **Step 3: Badge를 현재 Base UI preset으로 생성**

Run:

```bash
pnpm --dir apps/web exec shadcn add badge --yes
```

생성된 `badge.tsx`가 `@base-ui/react/merge-props`,
`@base-ui/react/use-render`, `class-variance-authority`, `cn`을 사용하는지 확인한다.
라이트 모드 전용 제품 계약에 맞춰 생성 코드의 `dark:` utility만 제거하고 나머지
variant API는 유지한다.

- [ ] **Step 4: Carousel registry 변경 범위 확인**

Run:

```bash
pnpm --dir apps/web exec shadcn add carousel --dry-run
pnpm --dir apps/web exec shadcn add carousel --view
```

Expected: `carousel.tsx`와 `embla-carousel-react` 외에 기존
`components/ui/button.tsx` overwrite가 표시됨. `--overwrite`는 사용하지 않는다.

- [ ] **Step 5: Embla dependency만 설치**

Run:

```bash
pnpm --filter @haetteum/web add embla-carousel-react
```

Expected: `apps/web/package.json`과 `pnpm-lock.yaml`만 package metadata로 변경됨.

- [ ] **Step 6: 공식 registry Carousel을 기존 Button 계약에 맞춰 추가**

`--view`에서 확인한 Base UI Carousel source를
`apps/web/src/components/ui/carousel.tsx`로 추가하되 다음 네 차이만 적용한다.

```ts
"use client";

// registry와 동일한 public types
type CarouselApi = UseEmblaCarouselType[1];
type CarouselProps = {
  opts?: CarouselOptions;
  plugins?: CarouselPlugin;
  orientation?: "horizontal" | "vertical";
  setApi?: (api: CarouselApi) => void;
};

// Haetteum Button의 44px size를 사용한다.
function CarouselPrevious({
  className,
  variant = "outline",
  size = "icon",
  ...props
}: React.ComponentProps<typeof Button>) {
  // registry의 useCarousel(), disabled, onClick 동작을 그대로 사용한다.
  // visible icon은 ChevronLeftIcon, sr-only 문구는 "이전 슬라이드"다.
}

function CarouselNext({
  className,
  variant = "outline",
  size = "icon",
  ...props
}: React.ComponentProps<typeof Button>) {
  // registry의 useCarousel(), disabled, onClick 동작을 그대로 사용한다.
  // visible icon은 ChevronRightIcon, sr-only 문구는 "다음 슬라이드"다.
}
```

나머지 `Carousel`, `CarouselContent`, `CarouselItem`, keyboard arrow 처리,
`reInit`/`select` listener cleanup과 export 목록은 registry source를 그대로 유지한다.
기존 `button.tsx`는 수정하지 않는다.

- [ ] **Step 7: jsdom observer를 고정된 test double로 제공**

`tests/setup.ts`에 아래 내용을 추가한다.

```ts
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

class IntersectionObserverMock {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  writable: true,
  value: ResizeObserverMock,
});
Object.defineProperty(globalThis, "IntersectionObserver", {
  configurable: true,
  writable: true,
  value: IntersectionObserverMock,
});
```

- [ ] **Step 8: UI focused test와 lint 통과 확인**

Run:

```bash
pnpm --filter @haetteum/web exec vitest run tests/unit/components/ui/components.test.tsx
pnpm --filter @haetteum/web exec eslint src/components/ui/badge.tsx src/components/ui/carousel.tsx tests/setup.ts
```

Expected: PASS. 생성기가 기존 Button을 바꾸지 않았는지 다음 명령으로 확인한다.

```bash
git diff -- apps/web/src/components/ui/button.tsx
```

Expected: Task 2에서 새 diff 없음.

- [ ] **Step 9: 변경 검토 checkpoint**

Run:

```bash
git diff --check
git diff -- apps/web/package.json pnpm-lock.yaml apps/web/src/components/ui apps/web/tests/setup.ts apps/web/tests/unit/components/ui/components.test.tsx
```

Expected: Badge, Carousel, Embla와 test setup 변경만 새로 보임. 별도 승인 전
commit하지 않는다.

---

### Task 3: 재사용 가능한 travel 카드 구현

**Files:**

- Create: `apps/web/src/components/travel/popular-video-card.tsx`
- Create: `apps/web/src/components/travel/travel-theme-item.tsx`
- Create: `apps/web/src/components/travel/video-course-card.tsx`
- Modify: `apps/web/tests/unit/components/travel/discovery-components.test.tsx`

**Interfaces:**

- Consumes: `PopularVideoItem`, `TravelThemeItem`, `VideoCourseItem`, `Badge`,
  `Card`, `next/image`, Lucide `PlayIcon`, `EyeIcon`, `HeartIcon`,
  `MapPinIcon`.
- Produces: `PopularVideoCard({ video })`, `TravelThemeItem({ theme })`,
  `VideoCourseCard({ course })`.

- [ ] **Step 1: 세 카드의 semantic 실패 테스트 작성**

`discovery-components.test.tsx`에 다음 suite를 추가한다.

```tsx
describe("popular-place travel cards", () => {
  it("renders a named short-video preview with its metadata", () => {
    render(
      <PopularVideoCard video={mainDiscoveryMock.popularPlaces.videos[0]} />,
    );

    const card = screen.getByRole("article", {
      name: "성산일출봉 일출 미리보기",
    });
    expect(card).toHaveTextContent("지금 인기 급상승");
    expect(card).toHaveTextContent("0:18");
    expect(card).toHaveTextContent("12.4만");
    expect(card).toHaveTextContent("2,356");
    expect(card).toHaveTextContent("서귀포");
  });

  it("renders a non-interactive travel theme", () => {
    render(
      <TravelThemeItem theme={mainDiscoveryMock.popularPlaces.themes[0]} />,
    );

    expect(screen.getByText("핫플")).toBeVisible();
    expect(screen.queryByRole("button", { name: "핫플" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "핫플" })).not.toBeInTheDocument();
  });

  it("renders a named video course with summary and location", () => {
    render(
      <VideoCourseCard course={mainDiscoveryMock.popularPlaces.courses[0]} />,
    );

    const card = screen.getByRole("article", {
      name: "제주 해안 힐링 코스",
    });
    expect(card).toHaveTextContent("바다와 카페를 천천히 즐겨요");
    expect(card).toHaveTextContent("제주시");
    expect(card).toHaveTextContent("0:32");
  });
});
```

import는 실제 component 이름에 맞춰 다음처럼 고정한다.

```ts
import { PopularVideoCard } from "@/components/travel/popular-video-card";
import { TravelThemeItem } from "@/components/travel/travel-theme-item";
import { VideoCourseCard } from "@/components/travel/video-course-card";
```

- [ ] **Step 2: travel focused test의 import 실패 확인**

Run:

```bash
pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/discovery-components.test.tsx
```

Expected: 세 component module을 찾지 못해 FAIL.

- [ ] **Step 3: `PopularVideoCard` 구현**

다음 public API와 semantic 구조를 사용한다.

```tsx
type PopularVideoCardProps = {
  video: PopularVideoItem;
};

function PopularVideoCard({ video }: PopularVideoCardProps) {
  return (
    <article aria-label={video.title} className="h-full">
      <Card className="relative h-full gap-0 overflow-hidden border-0 py-0">
        <div className="relative aspect-[3/4] min-h-80 overflow-hidden bg-primary-subtle">
          <Image
            src={video.image.src}
            alt={video.image.alt}
            fill
            sizes="(max-width: 479px) 76vw, 320px"
            className="object-cover"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-image-scrim" />
          <Badge className="absolute top-3 left-3">{video.badgeLabel}</Badge>
          <span className="type-caption absolute top-3 right-3 font-semibold text-image-foreground">
            {video.durationLabel}
          </span>
          <PlayIcon
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 size-12 -translate-1/2 fill-image-foreground text-image-foreground"
          />
          <div className="absolute inset-x-0 bottom-0 p-4 text-image-foreground">
            <h3 className="type-title-md text-image-foreground">{video.title}</h3>
            <dl className="type-caption mt-3 flex flex-wrap gap-x-3 gap-y-1 text-image-foreground-muted">
              {/* Eye, Heart, MapPin icons are aria-hidden; dt uses sr-only labels. */}
            </dl>
          </div>
        </div>
      </Card>
    </article>
  );
}
```

`dl`은 `조회수`, `좋아요`, `위치`를 각각 `dt.sr-only + dd` 쌍으로 제공하고 각
`dd` 앞의 Lucide icon은 `aria-hidden="true"`로 둔다.

- [ ] **Step 4: `TravelThemeItem` 구현**

표시 타입과 component 이름의 충돌을 피하기 위해 다음 type alias import를 사용한다.

```ts
import type {
  TravelThemeItem as TravelThemeItemData,
} from "@/features/discovery/discovery-model";
```

```tsx
type TravelThemeItemProps = {
  theme: TravelThemeItemData;
};

function TravelThemeItem({ theme }: TravelThemeItemProps) {
  return (
    <figure className="w-20 shrink-0 text-center">
      <div className="relative mx-auto size-18 overflow-hidden rounded-full border-2 border-primary bg-primary-subtle p-0.5">
        <Image
          src={theme.image.src}
          alt={theme.image.alt}
          fill
          sizes="72px"
          className="rounded-full object-cover p-0.5"
        />
      </div>
      <figcaption className="type-label mt-2 text-foreground">
        {theme.label}
      </figcaption>
    </figure>
  );
}
```

- [ ] **Step 5: `VideoCourseCard` 구현**

```tsx
type VideoCourseCardProps = {
  course: VideoCourseItem;
};

function VideoCourseCard({ course }: VideoCourseCardProps) {
  return (
    <article aria-label={course.title} className="h-full">
      <Card className="h-full gap-0 py-0">
        <div className="relative aspect-[16/10] overflow-hidden bg-primary-subtle">
          <Image
            src={course.image.src}
            alt={course.image.alt}
            fill
            sizes="(max-width: 479px) 68vw, 288px"
            className="object-cover"
          />
          <span className="type-caption absolute top-2 right-2 rounded-full bg-foreground/70 px-2 py-1 font-semibold text-image-foreground">
            {course.durationLabel}
          </span>
          <PlayIcon
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 size-9 -translate-1/2 fill-image-foreground text-image-foreground"
          />
        </div>
        <CardContent className="space-y-1 py-3">
          <h3 className="type-label text-foreground">{course.title}</h3>
          <p className="type-caption text-muted-foreground">{course.summary}</p>
          <p className="type-caption flex items-center gap-1 text-muted-foreground">
            <MapPinIcon aria-hidden="true" className="size-4" />
            {course.location}
          </p>
        </CardContent>
      </Card>
    </article>
  );
}
```

- [ ] **Step 6: travel focused test와 lint 통과 확인**

Run:

```bash
pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/discovery-components.test.tsx
pnpm --filter @haetteum/web exec eslint src/components/travel/popular-video-card.tsx src/components/travel/travel-theme-item.tsx src/components/travel/video-course-card.tsx tests/unit/components/travel/discovery-components.test.tsx
```

Expected: PASS. `next/image` warning, nested interactive element와 접근성 role 오류가
없음.

- [ ] **Step 7: 변경 검토 checkpoint**

Run `git diff --check`와 세 새 travel file 및 test diff를 검토한다. 기존 travel
component에는 새 diff가 없어야 하며 별도 승인 전 commit하지 않는다.

---

### Task 4: `PopularPlacesTab` pattern 조합

**Files:**

- Create: `apps/web/src/components/patterns/popular-places-tab.tsx`
- Modify: `apps/web/tests/unit/components/patterns/main-discovery.test.tsx`

**Interfaces:**

- Consumes: `PopularVideoItem[]`, `TravelThemeItem[]`, `VideoCourseItem[]`,
  `DiscoveryQuery`, `buildDiscoveryHref`, 세 travel 카드, shadcn Carousel.
- Produces: `PopularPlacesTab({ videos, themes, courses, query })`.

- [ ] **Step 1: pattern 순서와 빈 상태 실패 테스트 작성**

다음 import와 테스트를 추가한다.

```tsx
import { PopularPlacesTab } from "@/components/patterns/popular-places-tab";

it("renders the popular-place sections in the approved order", () => {
  render(
    <PopularPlacesTab
      videos={mainDiscoveryMock.popularPlaces.videos}
      themes={mainDiscoveryMock.popularPlaces.themes}
      courses={mainDiscoveryMock.popularPlaces.courses}
      query={{ q: "", region: "jeju", tab: "places" }}
    />,
  );

  expect(
    screen.getAllByTestId("popular-place-section").map((node) =>
      node.getAttribute("data-section"),
    ),
  ).toEqual(["popular-videos", "travel-themes", "video-courses"]);
  expect(
    screen.getByRole("heading", { name: "인기 숏폼 관광지" }),
  ).toBeVisible();
  expect(screen.getByRole("heading", { name: "여행 테마" })).toBeVisible();
  expect(
    screen.getByRole("heading", { name: "지금 뜨는 영상 코스" }),
  ).toBeVisible();
});

it("offers a reset action while keeping travel themes visible", () => {
  render(
    <PopularPlacesTab
      videos={[]}
      themes={mainDiscoveryMock.popularPlaces.themes}
      courses={[]}
      query={{ q: "해당없음", region: "busan", tab: "places" }}
    />,
  );

  expect(screen.getByText("조건에 맞는 인기 관광지를 찾지 못했어요.")).toBeVisible();
  expect(screen.getByRole("link", { name: "검색어 지우기" })).toHaveAttribute(
    "href",
    "/?region=busan&tab=places#places",
  );
  expect(screen.getByRole("heading", { name: "여행 테마" })).toBeVisible();
});
```

- [ ] **Step 2: pattern focused test가 import 실패하는지 확인**

Run:

```bash
pnpm --filter @haetteum/web exec vitest run tests/unit/components/patterns/main-discovery.test.tsx
```

Expected: `popular-places-tab` module을 찾지 못해 FAIL.

- [ ] **Step 3: section heading helper와 empty state 구현**

pattern 파일 안의 비공개 helper만 사용한다. 별도 범용 component를 만들지 않는다.

```tsx
type PopularPlacesTabProps = {
  videos: readonly PopularVideoItem[];
  themes: readonly TravelThemeItem[];
  courses: readonly VideoCourseItem[];
  query: DiscoveryQuery;
};

function SectionHeading({ id, title, description }: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 id={id} className="type-title-md text-foreground">{title}</h2>
      <p className="type-body-md mt-1 text-muted-foreground">{description}</p>
    </div>
  );
}
```

videos가 비어 있으면 다음 empty state를 videos section 안에 한 번만 표시한다.
courses가 비어 있으면 reset link 없이 `조건에 맞는 영상 코스가 없어요.` 문구만
표시한다. 따라서 같은 이름의 reset link를 중복 렌더링하지 않는다.

```tsx
<div className="rounded-lg border border-dashed border-border bg-muted/45 p-4">
  <p className="type-body-md text-muted-foreground">
    조건에 맞는 인기 관광지를 찾지 못했어요.
  </p>
  <Link
    href={buildDiscoveryHref(query, { q: "" }, "places")}
    className="type-label mt-3 inline-flex text-primary underline-offset-4 hover:underline"
  >
    검색어 지우기
  </Link>
</div>
```

- [ ] **Step 4: 세 섹션과 Carousel 구성 구현**

root는 `id="places"`, `aria-label="인기 관광지"`를 가진다. 각 section에는
`data-testid="popular-place-section"`과 아래 `data-section` 값을 사용한다.

```tsx
<div id="places" aria-label="인기 관광지" className="space-y-8 pt-6">
  <section
    aria-labelledby="popular-videos-title"
    data-testid="popular-place-section"
    data-section="popular-videos"
    className="px-4"
  >
    <SectionHeading
      id="popular-videos-title"
      title="인기 숏폼 관광지"
      description="짧은 미리보기로 여행지를 만나보세요."
    />
    {videos.length > 0 ? (
      <Carousel
        aria-label="인기 숏폼 관광지 목록"
        opts={{ align: "start", containScroll: "trimSnaps" }}
        className="mt-4"
      >
        <CarouselContent role="list" className="-ml-3">
          {videos.map((video) => (
            <CarouselItem
              key={video.id}
              role="listitem"
              className="basis-[76%] pl-3"
            >
              <PopularVideoCard video={video} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>
    ) : (
      <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/45 p-4">
        <p className="type-body-md text-muted-foreground">
          조건에 맞는 인기 관광지를 찾지 못했어요.
        </p>
        <Link
          href={buildDiscoveryHref(query, { q: "" }, "places")}
          className="type-label mt-3 inline-flex text-primary underline-offset-4 hover:underline"
        >
          검색어 지우기
        </Link>
      </div>
    )}
  </section>

  <section
    aria-labelledby="travel-themes-title"
    data-testid="popular-place-section"
    data-section="travel-themes"
    className="px-4"
  >
    <SectionHeading
      id="travel-themes-title"
      title="여행 테마"
      description="지금 끌리는 여행 분위기를 골라보세요."
    />
    <ul aria-label="여행 테마" className="mt-4 flex gap-3 overflow-x-auto pb-2">
      {themes.map((theme) => (
        <li key={theme.id}><TravelThemeItem theme={theme} /></li>
      ))}
    </ul>
  </section>

  <section
    aria-labelledby="video-courses-title"
    data-testid="popular-place-section"
    data-section="video-courses"
    className="px-4"
  >
    <SectionHeading
      id="video-courses-title"
      title="지금 뜨는 영상 코스"
      description="짧은 영상처럼 빠르게 코스를 살펴보세요."
    />
    {courses.length > 0 ? (
      <Carousel
        aria-label="지금 뜨는 영상 코스 목록"
        opts={{ align: "start", containScroll: "trimSnaps" }}
        className="mt-4"
      >
        <CarouselContent role="list" className="-ml-3">
          {courses.map((course) => (
            <CarouselItem
              key={course.id}
              role="listitem"
              className="basis-[68%] pl-3"
            >
              <VideoCourseCard course={course} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>
    ) : (
      <p className="type-body-md mt-4 text-muted-foreground">
        조건에 맞는 영상 코스가 없어요.
      </p>
    )}
  </section>
</div>
```

- [ ] **Step 5: pattern focused test와 axe 통과 확인**

기존 MainDiscovery axe 테스트가 새 pattern을 직접 포함하지 않으므로 새 조합에 대한
axe assertion을 추가한다.

```tsx
const { container } = render(
  <PopularPlacesTab
    videos={mainDiscoveryMock.popularPlaces.videos}
    themes={mainDiscoveryMock.popularPlaces.themes}
    courses={mainDiscoveryMock.popularPlaces.courses}
    query={{ q: "", region: "jeju", tab: "places" }}
  />,
);
expect((await axe.run(container, {
  rules: { "color-contrast": { enabled: false } },
})).violations).toEqual([]);
```

Run:

```bash
pnpm --filter @haetteum/web exec vitest run tests/unit/components/patterns/main-discovery.test.tsx
```

Expected: section 순서, empty reset 링크와 axe 테스트 PASS.

- [ ] **Step 6: 변경 검토 checkpoint**

Run `git diff --check`와 pattern/test diff를 검토한다. pattern이 API, store,
`useSearchParams` 또는 새로운 route를 import하지 않아야 한다. 별도 승인 전
commit하지 않는다.

---

### Task 5: `MainDiscovery`와 feature 조립

**Files:**

- Modify: `apps/web/src/components/patterns/main-discovery.tsx`
- Modify: `apps/web/tests/unit/components/patterns/main-discovery.test.tsx`
- Modify: `apps/web/tests/unit/features/discovery/discovery-content.test.tsx`

**Interfaces:**

- Consumes: Task 1의 `DiscoveryView`, Task 4의 `PopularPlacesTab`.
- Produces: URL query별 완성된 `MainDiscovery`와 `DiscoveryContent` 화면.

- [ ] **Step 1: 인기 관광지 조립과 추천 탭 회귀 실패 테스트 작성**

`MainDiscovery` suite에 다음 테스트를 추가한다.

```tsx
it("replaces the ranking feed only on the popular-place tab", () => {
  const query = { q: "", region: "jeju", tab: "places" } as const;
  const view = selectDiscoveryView(mainDiscoveryMock, query);

  render(<MainDiscovery data={mainDiscoveryMock} query={query} view={view} />);

  expect(screen.getByRole("heading", { name: "인기 숏폼 관광지" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "여행 테마" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "지금 뜨는 영상 코스" })).toBeVisible();
  expect(
    screen.queryByRole("heading", { name: "지역별 인기 관광지 TOP 3" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("heading", { name: "이번 주 인기 축제" }),
  ).not.toBeInTheDocument();
});
```

`DiscoveryContent` suite에는 query 전달 검증을 추가한다.

```tsx
it("assembles the popular-place tab from URL search params", async () => {
  render(
    await DiscoveryContent({
      searchParams: Promise.resolve({ tab: "places", region: "jeju" }),
    }),
  );

  expect(screen.getByRole("link", { name: "인기 관광지" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("heading", { name: "인기 숏폼 관광지" })).toBeVisible();
});
```

- [ ] **Step 2: integration focused tests가 새 heading을 찾지 못하는지 확인**

Run:

```bash
pnpm --filter @haetteum/web exec vitest run tests/unit/components/patterns/main-discovery.test.tsx tests/unit/features/discovery/discovery-content.test.tsx
```

Expected: 인기 관광지 heading을 찾지 못해 FAIL.

- [ ] **Step 3: `MainDiscovery`에 탭별 pattern 분기 추가**

`PopularPlacesTab`을 import하고 list region을 다음 순서로 바꾼다.

```tsx
{view.showRankedPlaces ? (
  <RankedPlaceSection places={view.places} query={query} />
) : null}

{view.showPopularPlaces ? (
  <PopularPlacesTab
    videos={view.popularVideos}
    themes={view.travelThemes}
    courses={view.videoCourses}
    query={query}
  />
) : null}

{view.showAiCourse ? (
  <div
    id="ai-course"
    data-testid="main-region"
    data-region="banner"
    className="px-4 pt-6"
  >
    <AiCourseBanner
      imageAlt={data.aiCourse.alt}
      imageSrc={data.aiCourse.src}
    />
  </div>
) : null}

{view.showFestivals ? (
  <FestivalSection festivals={view.festivals} query={query} />
) : null}
```

기존처럼 빈 `banner` wrapper를 모든 탭에 렌더링하지 않는다. 추천 탭의
`places → banner → festivals` 순서는 유지한다.

- [ ] **Step 4: focused integration tests 통과 확인**

Run:

```bash
pnpm --filter @haetteum/web exec vitest run tests/unit/components/patterns/main-discovery.test.tsx tests/unit/features/discovery/discovery-content.test.tsx
```

Expected: 새 popular 탭 테스트와 기존 추천 순서, safe-area, 검색 panel 테스트 모두
PASS.

- [ ] **Step 5: 전체 web unit test 회귀 확인**

Run:

```bash
pnpm --filter @haetteum/web test
```

Expected: 모든 web Vitest file PASS. 실패가 이번 변경과 무관하면 실패 파일과 원인을
그대로 기록하고 관련 없는 코드를 수정하지 않는다.

- [ ] **Step 6: 변경 검토 checkpoint**

Run:

```bash
git diff --check
git diff -- apps/web/src/components/patterns/main-discovery.tsx apps/web/tests/unit/components/patterns/main-discovery.test.tsx apps/web/tests/unit/features/discovery/discovery-content.test.tsx
```

Expected: `tab=places` 분기와 해당 테스트만 추가되고 hero/search/navigation markup은
변경되지 않음. 별도 승인 전 commit하지 않는다.

---

### Task 6: 문서 상태, 정적 검증과 시각 QA

**Files:**

- Modify: `DESIGN.md`
- Modify: `docs/superpowers/specs/2026-08-22-popular-places-tab-design.md`
- Create during QA: `design-qa.md`

**Interfaces:**

- Consumes: 완성된 `/`의 `tab=places` 화면과 첨부 참고 이미지.
- Produces: 구현 상태가 정확한 디자인 문서, `final result: passed`인 시각 QA 기록.

- [ ] **Step 1: 디자인 문서를 구현 사실로 갱신**

`DESIGN.md`에서 다음 항목을 `Existing implemented components to reuse`와
`Implemented` pattern 목록으로 이동한다.

```text
Travel: PopularVideoCard, TravelThemeItem, VideoCourseCard
Pattern: PopularPlacesTab
Foundation: Badge, Carousel
```

spec 상태는 검증 전 `구현 완료, 검증 중`으로 바꾼다. 실제 검증이 끝나기 전
`검증 완료`나 `통과`로 쓰지 않는다.

- [ ] **Step 2: lint와 production build 실행**

Run:

```bash
pnpm --filter @haetteum/web lint
pnpm --filter @haetteum/web build
```

Expected: exit code 0. 실패하면 오류가 가리키는 이번 변경만 수정한 뒤 focused test,
lint와 build를 다시 실행한다.

- [ ] **Step 3: 검증용 dev server 실행**

다른 `next dev` 또는 `next build`가 같은 `apps/web/.next`를 사용 중이지 않은지
확인한 뒤 실행한다.

```bash
pnpm dev:web
```

server가 출력한 실제 local URL을 사용하고 임의로 port를 가정하지 않는다.

- [ ] **Step 4: in-app Browser로 세 viewport 확인**

`browser:control-in-app-browser` skill을 읽고 사용자가 지정한 in-app Browser에서
다음 URL을 연다.

```text
/?region=jeju&tab=places#places
```

다음 viewport를 각각 캡처하고 확인한다.

```text
320px: page-level horizontal overflow 없음, 44px controls, 다음 카드 일부 노출
390px: 참고 이미지와 섹션 위계·밀도·간격 비교
768px: 480px 앱 surface 중앙 정렬, 모바일 정보 구조 유지
```

상단 `인기 관광지` link의 `aria-current`, 지역 `제주` 선택, Carousel swipe/arrow
key/이전·다음 control, 하단 내비게이션 reserve를 직접 확인한다.

- [ ] **Step 5: Product Design visual comparison 수행**

첨부 참고 이미지와 390px 구현 screenshot을 같은 비교 입력으로 열고 다음 기준을
`design-qa.md`에 기록한다.

```text
P0: 화면 사용 불가, 탭/Carousel 동작 불가
P1: 세 섹션 누락, page overflow, nav가 콘텐츠를 가림
P2: 카드 비율, spacing, 이미지 crop, 글자 위계가 명확히 다름
P3: 미세한 간격 또는 polish 차이
```

P0/P1/P2를 수정하고 동일 viewport를 다시 캡처한다. P3는 후속 note로 남길 수
있지만 handoff 전에 `design-qa.md`의 마지막 상태가 정확히
`final result: passed`여야 한다.

- [ ] **Step 6: 최종 검증을 깨끗하게 재실행**

Run:

```bash
pnpm --filter @haetteum/web exec vitest run tests/unit/features/discovery/discovery-model.test.ts tests/unit/components/ui/components.test.tsx tests/unit/components/travel/discovery-components.test.tsx tests/unit/components/patterns/main-discovery.test.tsx tests/unit/features/discovery/discovery-content.test.tsx
pnpm --filter @haetteum/web test
pnpm --filter @haetteum/web lint
pnpm --filter @haetteum/web build
git diff --check
```

Expected: 모든 명령 exit code 0, `design-qa.md`는 `final result: passed`.

- [ ] **Step 7: spec 상태와 handoff 기록 확정**

검증 결과가 모두 성공한 경우에만 spec 상태를 `구현 및 검증 완료`로 바꾸고
실행한 명령의 실제 test file/test count와 시각 QA viewport를 문서에 기록한다.
관련 없는 기존 실패가 있으면 성공으로 바꾸지 않고 정확한 blocker를 기록한다.

- [ ] **Step 8: 최종 변경 검토 checkpoint**

Run:

```bash
git status --short
git diff --stat
git diff --check
```

원래 존재하던 미커밋 변경과 이번 계획의 변경을 구분해 사용자에게 보고한다.
commit, branch, push와 PR은 수행하지 않는다.
