# Haetteum Main Discovery Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 승인된 모바일 메인 구조를 Haetteum 디자인 시스템과 mock 데이터로 구현해 `/`에서 검색, 필터, 관광지 순위, AI 배너, 축제와 5개 하단 메뉴를 제공한다.

**Architecture:** `app/page.tsx`는 Next.js 16의 `searchParams` promise를 Suspense 아래 feature adapter에 전달하고, feature 계층은 URL query를 검증해 읽기 전용 mock 데이터를 화면 모델로 변환한다. `components/patterns`는 화면 섹션을 조합하고, `components/travel`은 API와 라우팅을 모르는 여행 표현 컴포넌트를 소유하며, 범용 입력은 `components/ui`에 둔다.

**Tech Stack:** Next.js 16.3.1 App Router, React 19.2.8, TypeScript strict mode, Tailwind CSS 4 CSS-first, shadcn Base UI Rhea conventions, Lucide, Vitest 4, React Testing Library, axe-core

**Spec:** `docs/superpowers/specs/2026-08-20-main-welcome-routes-design.md`

## Global Constraints

- Node.js는 `24.19.0`, pnpm은 `10.33.0`을 사용한다.
- 코드를 쓰기 전에 `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md`, `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md`, `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/02-components/image.md`를 읽는다.
- Tailwind CSS 4는 `tailwind.config` 없이 `apps/web/src/styles/tokens.css`의 semantic token과 `@theme inline`을 사용한다. 컴포넌트에 hex 색상을 추가하지 않는다.
- Server Component를 기본으로 하고 브라우저 상태가 필요한 `AiCourseBanner`에만 작은 Client Component 경계를 둔다.
- 데이터는 `apps/web/src/features/discovery/main-discovery.mock.ts`의 읽기 전용 mock만 사용한다. API, TanStack Query, Zustand, Zod 계약이나 영속 상태를 추가하지 않는다.
- `/welcome`과 `/design-system`의 기존 책임과 동작을 유지한다.
- 하단 메뉴는 `홈`, `탐색`, `내 일정`, `내 후기`, `마이페이지`를 표시한다. `홈`만 `/` 링크와 `aria-current="page"`를 사용하고, 나머지는 `준비 중`인 비대화형 항목으로 제공한다. 새 route를 만들지 않는다.
- 참고 이미지의 상태바, 휴대폰 frame, 문구와 캐릭터를 복제하지 않는다. 실제 UI 이미지는 로컬 제품 자산을 사용하고 CSS 그림이나 placeholder를 사용하지 않는다.
- 기존 dirty worktree의 관련 없는 변경을 보존한다. 별도 승인 전 `git add`, `git commit`, branch, push를 실행하지 않는다.
- 각 작업의 Git checkpoint는 제안 메시지만 기록하며 실제 Git 명령은 실행하지 않는다.

---

### Task 1: Discovery model, query parser, and mock data

**Files:**
- Create: `apps/web/src/features/discovery/discovery-model.ts`
- Create: `apps/web/src/features/discovery/main-discovery.mock.ts`
- Test: `apps/web/tests/unit/features/discovery/discovery-model.test.ts`

**Interfaces:**
- Produces: `DiscoveryTabId`, `RegionId`, `DiscoveryQuery`, `defaultDiscoveryQuery`, `PlaceRankingItem`, `FestivalItem`, `MainDiscoveryData`, `DiscoveryView`, `parseDiscoveryQuery(searchParams)`, `selectDiscoveryView(data, query)`, `buildDiscoveryHref(query, changes, fragment)`
- Consumes: local image paths defined in Task 3 as plain strings; files do not import React or Next.js.

- [ ] **Step 1: Write the failing model tests**

```ts
import { describe, expect, it } from "vitest";

import {
  buildDiscoveryHref,
  parseDiscoveryQuery,
  selectDiscoveryView,
} from "@/features/discovery/discovery-model";
import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";

describe("parseDiscoveryQuery", () => {
  it("uses the approved recommendation and Jeju defaults", () => {
    expect(parseDiscoveryQuery({})).toEqual({
      q: "",
      region: "jeju",
      tab: "recommended",
    });
  });

  it("rejects unknown tab and region values", () => {
    expect(parseDiscoveryQuery({ tab: "unknown", region: "mars" })).toEqual({
      q: "",
      region: "jeju",
      tab: "recommended",
    });
  });
});

describe("selectDiscoveryView", () => {
  it("filters the place ranking with a trimmed Korean query", () => {
    const view = selectDiscoveryView(mainDiscoveryMock, {
      q: "  성산  ",
      region: "jeju",
      tab: "places",
    });

    expect(view.places.map((place) => place.title)).toEqual(["성산일출봉"]);
    expect(view.showPlaces).toBe(true);
    expect(view.showFestivals).toBe(false);
  });

  it("shows all approved sections for the recommendation tab", () => {
    const view = selectDiscoveryView(mainDiscoveryMock, {
      q: "",
      region: "jeju",
      tab: "recommended",
    });

    expect(view.showPlaces).toBe(true);
    expect(view.showAiCourse).toBe(true);
    expect(view.showFestivals).toBe(true);
  });
});

it("builds a complete filter URL without dropping the active query", () => {
  expect(
    buildDiscoveryHref(
      { q: "바다", region: "jeju", tab: "recommended" },
      { tab: "festivals" },
      "festivals",
    ),
  ).toBe("/?q=%EB%B0%94%EB%8B%A4&region=jeju&tab=festivals#festivals");
});
```

- [ ] **Step 2: Run the focused tests and confirm the missing-module failure**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/features/discovery/discovery-model.test.ts`

Expected: FAIL because `discovery-model.ts` and `main-discovery.mock.ts` do not exist.

- [ ] **Step 3: Add the exact discovery types and pure selection functions**

```ts
export const discoveryTabIds = [
  "recommended",
  "places",
  "festivals",
  "ai-course",
] as const;
export const regionIds = ["seoul", "gyeonggi", "gangwon", "busan", "jeju"] as const;

export type DiscoveryTabId = (typeof discoveryTabIds)[number];
export type RegionId = (typeof regionIds)[number];
export type SearchParamValue = string | string[] | undefined;
export type DiscoverySearchParams = Record<string, SearchParamValue>;

export type DiscoveryQuery = {
  q: string;
  region: RegionId;
  tab: DiscoveryTabId;
};

export const defaultDiscoveryQuery: DiscoveryQuery = {
  q: "",
  region: "jeju",
  tab: "recommended",
};

export type DiscoveryImage = { src: string; alt: string };
export type PlaceRankingItem = {
  id: string;
  rank: 1 | 2 | 3;
  title: string;
  region: RegionId;
  location: string;
  rating: number;
  reviewCount: number;
  image: DiscoveryImage;
};
export type FestivalItem = {
  id: string;
  title: string;
  dateLabel: string;
  region: RegionId;
  location: string;
  image: DiscoveryImage;
};
export type MainDiscoveryData = {
  hero: DiscoveryImage;
  aiCourse: DiscoveryImage;
  regions: ReadonlyArray<{ id: RegionId; label: string }>;
  places: readonly PlaceRankingItem[];
  festivals: readonly FestivalItem[];
};
export type DiscoveryView = {
  places: readonly PlaceRankingItem[];
  festivals: readonly FestivalItem[];
  showPlaces: boolean;
  showAiCourse: boolean;
  showFestivals: boolean;
};

function firstValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseDiscoveryQuery(
  searchParams: DiscoverySearchParams,
): DiscoveryQuery {
  const tab = firstValue(searchParams.tab);
  const region = firstValue(searchParams.region);

  return {
    q: (firstValue(searchParams.q) ?? "").trim(),
    region: regionIds.includes(region as RegionId)
      ? (region as RegionId)
      : defaultDiscoveryQuery.region,
    tab: discoveryTabIds.includes(tab as DiscoveryTabId)
      ? (tab as DiscoveryTabId)
      : defaultDiscoveryQuery.tab,
  };
}

export function buildDiscoveryHref(
  current: DiscoveryQuery,
  changes: Partial<DiscoveryQuery>,
  fragment?: "places" | "ai-course" | "festivals",
) {
  const next = { ...current, ...changes };
  const params = new URLSearchParams();
  if (next.q) params.set("q", next.q);
  params.set("region", next.region);
  params.set("tab", next.tab);
  return `/?${params.toString()}${fragment ? `#${fragment}` : ""}`;
}

function matchesQuery(values: readonly string[], query: string) {
  return values.some((value) => value.toLocaleLowerCase("ko-KR").includes(query));
}

export function selectDiscoveryView(
  data: MainDiscoveryData,
  query: DiscoveryQuery,
): DiscoveryView {
  const normalizedQuery = query.q.toLocaleLowerCase("ko-KR");
  const places = data.places.filter(
    (place) =>
      place.region === query.region &&
      (!normalizedQuery || matchesQuery([place.title, place.location], normalizedQuery)),
  );
  const festivals = data.festivals.filter(
    (festival) =>
      festival.region === query.region &&
      (!normalizedQuery ||
        matchesQuery([festival.title, festival.location], normalizedQuery)),
  );

  return {
    places,
    festivals,
    showPlaces: query.tab === "recommended" || query.tab === "places",
    showAiCourse: query.tab === "recommended" || query.tab === "ai-course",
    showFestivals: query.tab === "recommended" || query.tab === "festivals",
  };
}
```

Keep every selector pure and return new filtered arrays without mutating `MainDiscoveryData`.

- [ ] **Step 4: Add deterministic mock data**

`mainDiscoveryMock` must include the five approved region labels, the Jeju default, exactly three ranked places (`성산일출봉`, `협재해수욕장`, `비자림`), and at least one festival. Every image field must point to one of the Task 3 local files under `/images/discovery/`; dates and review counts remain explicitly mock values.

```ts
import type { MainDiscoveryData } from "@/features/discovery/discovery-model";

export const mainDiscoveryMock = {
  hero: {
    src: "/images/discovery/main-hero-jeju.png",
    alt: "아침 햇살이 비치는 제주 해안 풍경",
  },
  aiCourse: {
    src: "/images/discovery/ai-course-guide.png",
    alt: "여행 코스를 안내하는 해뜸 도우미",
  },
  regions: [
    { id: "seoul", label: "서울" },
    { id: "gyeonggi", label: "경기" },
    { id: "gangwon", label: "강원" },
    { id: "busan", label: "부산" },
    { id: "jeju", label: "제주" },
  ],
  places: [
    {
      id: "seongsan-ilchulbong",
      rank: 1,
      title: "성산일출봉",
      region: "jeju",
      location: "제주 서귀포시",
      rating: 4.8,
      reviewCount: 1284,
      image: {
        src: "/images/discovery/place-seongsan.png",
        alt: "바다에서 바라본 성산일출봉",
      },
    },
    {
      id: "hyeopjae-beach",
      rank: 2,
      title: "협재해수욕장",
      region: "jeju",
      location: "제주 제주시",
      rating: 4.7,
      reviewCount: 986,
      image: {
        src: "/images/discovery/place-hyeopjae.png",
        alt: "맑은 물빛의 협재해수욕장",
      },
    },
    {
      id: "bijarim-forest",
      rank: 3,
      title: "비자림",
      region: "jeju",
      location: "제주 제주시",
      rating: 4.6,
      reviewCount: 742,
      image: {
        src: "/images/discovery/place-bijarim.png",
        alt: "초록빛이 이어지는 비자림 산책로",
      },
    },
  ],
  festivals: [
    {
      id: "jeju-summer-flower-festival",
      title: "제주 여름꽃 축제",
      dateLabel: "2026. 8. 22. – 8. 30.",
      region: "jeju",
      location: "제주 서귀포시",
      image: {
        src: "/images/discovery/festival-jeju.png",
        alt: "제주 들판에 핀 여름꽃",
      },
    },
  ],
} as const satisfies MainDiscoveryData;
```

- [ ] **Step 5: Run the focused tests**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/features/discovery/discovery-model.test.ts`

Expected: PASS.

- [ ] **Step 6: Record the Git checkpoint without executing it**

Suggested commit: `feat: 메인 탐색 mock 데이터 모델 추가`

---

### Task 2: Reusable design-system search input

**Files:**
- Create: `apps/web/src/components/ui/input.tsx`
- Modify: `apps/web/src/components/design-system/design-system-preview.tsx`
- Modify: `apps/web/tests/unit/components/ui/components.test.tsx`
- Modify: `apps/web/tests/unit/components/design-system/design-system-preview.test.tsx`

**Interfaces:**
- Produces: `Input(props: React.ComponentProps<"input">)` with `data-slot="input"` and a 44px default height.
- Consumes: `cn` from `@/lib/utils` and existing semantic tokens only.

- [ ] **Step 1: Add the failing input tests**

```tsx
import { Input } from "@/components/ui/input";

it("keeps search input at the 44px mobile control height", () => {
  render(<Input aria-label="여행지 검색" type="search" />);

  expect(screen.getByRole("searchbox", { name: "여행지 검색" })).toHaveClass(
    "h-11",
  );
});
```

Add `검색 입력` to the required section names in `design-system-preview.test.tsx`.

- [ ] **Step 2: Run both focused test files and confirm failure**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/ui/components.test.tsx tests/unit/components/design-system/design-system-preview.test.tsx`

Expected: FAIL because `Input` and the preview section are absent.

- [ ] **Step 3: Implement the reusable input**

```tsx
import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      type={type}
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3.5 text-base text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-45 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
```

- [ ] **Step 4: Add a `검색 입력` preview section**

Render a labelled search input with the approved placeholder `지역, 관광지, 축제 검색`. Do not add a page-specific variant to `Input`.

- [ ] **Step 5: Run focused tests and accessibility coverage**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/ui/components.test.tsx tests/unit/components/design-system/design-system-preview.test.tsx`

Expected: PASS, including the existing axe-core assertion.

- [ ] **Step 6: Record the Git checkpoint without executing it**

Suggested commit: `feat: 검색 입력 디자인 시스템 컴포넌트 추가`

---

### Task 3: Product-owned discovery image assets

**Files:**
- Create: `apps/web/public/images/discovery/main-hero-jeju.png`
- Create: `apps/web/public/images/discovery/place-seongsan.png`
- Create: `apps/web/public/images/discovery/place-hyeopjae.png`
- Create: `apps/web/public/images/discovery/place-bijarim.png`
- Create: `apps/web/public/images/discovery/festival-jeju.png`
- Create: `apps/web/public/images/discovery/ai-course-guide.png`

**Interfaces:**
- Produces: six local raster assets consumed by `mainDiscoveryMock`, `DiscoveryHero`, `PlaceRankingCard`, `FestivalListItem`, and `AiCourseBanner`.
- Consumes: the approved screenshot only for composition and visual density, not for copied content or characters.

- [ ] **Step 1: Generate the hero asset with the ImageGen skill**

Prompt direction: bright Korean domestic travel editorial photography, Jeju coast at sunrise, one clear focal point on the right, calm sky and darker lower-left area reserved for white Korean UI copy, natural color, no people, no logos, no text. Target landscape composition at least 1440×900.

- [ ] **Step 2: Generate the three place thumbnails**

Create separate 4:3 assets for Seongsan Ilchulbong, Hyeopjae Beach, and Bijarim. Keep the same daylight, saturation, camera height, and editorial travel-app art direction; no text, signs, logos, collages, or baked-in UI.

- [ ] **Step 3: Generate the festival and AI assets**

Generate one warm Jeju flower-festival thumbnail and one friendly original travel-planning assistant illustration. The assistant must not resemble the reference robot, must have no text or logo, and must leave clean space for UI copy and CTA.

- [ ] **Step 4: Inspect every output before placing it**

Use `view_image` on all six files. Reject assets with embedded text, broken anatomy, unrelated landmarks, inconsistent palette, or unusable crop space.

- [ ] **Step 5: Validate the files**

Run:

```bash
file apps/web/public/images/discovery/*.png
sips -g pixelWidth -g pixelHeight apps/web/public/images/discovery/*.png
```

Expected: all six files are valid PNGs; hero is landscape and place/festival images support a 4:3 crop without stretching.

- [ ] **Step 6: Record the Git checkpoint without executing it**

Suggested commit: `chore: 메인 탐색 이미지 자산 추가`

---

### Task 4: Reusable travel presentation components

**Files:**
- Create: `apps/web/src/components/travel/place-ranking-card.tsx`
- Create: `apps/web/src/components/travel/festival-list-item.tsx`
- Create: `apps/web/src/components/travel/ai-course-banner.tsx`
- Create: `apps/web/src/components/travel/bottom-navigation.tsx`
- Test: `apps/web/tests/unit/components/travel/discovery-components.test.tsx`

**Interfaces:**
- Consumes: `PlaceRankingItem`, `FestivalItem`, existing `RatingSummary`, `Button`, `Card`, local image paths, and Lucide icons.
- Produces: `PlaceRankingCard({ place })`, `FestivalListItem({ festival })`, `AiCourseBanner({ imageSrc, imageAlt })`, `BottomNavigation({ items })`, `BottomNavigationItem`.

- [ ] **Step 1: Write failing semantic and interaction tests**

```tsx
it("renders rank, location and rating in a named place article", () => {
  render(<PlaceRankingCard place={mainDiscoveryMock.places[0]} />);

  expect(screen.getByRole("article", { name: "1위 성산일출봉" })).toBeVisible();
  expect(screen.getByText("제주 서귀포시")).toBeVisible();
  expect(screen.getByRole("group", { name: /평점 4\.8점/ })).toBeVisible();
});

it("reveals the mock AI recommendation result", async () => {
  const user = userEvent.setup();
  render(
    <AiCourseBanner
      imageAlt="여행 코스를 안내하는 해뜸 도우미"
      imageSrc="/images/discovery/ai-course-guide.png"
    />,
  );

  await user.click(screen.getByRole("button", { name: "코스 추천받기" }));
  expect(screen.getByRole("status")).toHaveTextContent(
    "제주 하루 코스 추천을 준비했어요.",
  );
});

it("marks home current and unavailable destinations as coming soon", () => {
  const navigationItems: BottomNavigationItem[] = [
    { id: "home", label: "홈", href: "/", current: true },
    { id: "explore", label: "탐색" },
    { id: "trips", label: "내 일정" },
    { id: "reviews", label: "내 후기" },
    { id: "profile", label: "마이페이지" },
  ];

  render(<BottomNavigation items={navigationItems} />);

  expect(screen.getByRole("link", { name: "홈" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByText("탐색").closest("[aria-disabled='true']")).toHaveAttribute(
    "aria-disabled",
    "true",
  );
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/discovery-components.test.tsx`

Expected: FAIL because the four travel components are absent.

- [ ] **Step 3: Implement the public component contracts**

```ts
export type BottomNavigationItem = {
  id: "home" | "explore" | "trips" | "reviews" | "profile";
  label: string;
  href?: string;
  current?: boolean;
};

export type PlaceRankingCardProps = { place: PlaceRankingItem };
export type FestivalListItemProps = { festival: FestivalItem };
export type AiCourseBannerProps = { imageSrc: string; imageAlt: string };
```

`PlaceRankingCard` uses `next/image` with a fixed 4:3 wrapper, rank badge, heading, location, and `RatingSummary size="compact"`. `FestivalListItem` uses an `article` with 112px 4:3 thumbnail and date/location text. `BottomNavigation` uses a labelled `nav`; items with `href` render `Link`, unavailable items render `span aria-disabled="true"` with visually hidden `준비 중` text.

- [ ] **Step 4: Implement the isolated AI banner interaction**

Add `"use client"` only to `ai-course-banner.tsx`. Use `useState(false)`, keep the button label stable, and show `제주 하루 코스 추천을 준비했어요.` in `role="status"` after activation. Do not create a route, API call, timer, or global store.

```tsx
const [recommended, setRecommended] = useState(false);

<Button type="button" onClick={() => setRecommended(true)}>
  코스 추천받기
</Button>
{recommended ? (
  <p role="status" className="type-caption text-primary">
    제주 하루 코스 추천을 준비했어요.
  </p>
) : null}
```

- [ ] **Step 5: Run the focused travel component tests**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/discovery-components.test.tsx`

Expected: PASS.

- [ ] **Step 6: Record the Git checkpoint without executing it**

Suggested commit: `feat: 메인 탐색 여행 컴포넌트 추가`

---

### Task 5: Main discovery patterns and responsive composition

**Files:**
- Create: `apps/web/src/components/patterns/discovery-hero.tsx`
- Create: `apps/web/src/components/patterns/discovery-search-panel.tsx`
- Create: `apps/web/src/components/patterns/ranked-place-section.tsx`
- Create: `apps/web/src/components/patterns/festival-section.tsx`
- Create: `apps/web/src/components/patterns/main-discovery.tsx`
- Test: `apps/web/tests/unit/components/patterns/main-discovery.test.tsx`

**Interfaces:**
- Consumes: `MainDiscoveryData`, `DiscoveryQuery`, `DiscoveryView`, `buildDiscoveryHref`, `Input`, Task 4 travel components, existing token utilities.
- Produces: `MainDiscovery({ data, query, view })`, `DiscoveryHero({ image })`, `DiscoverySearchPanel({ query, regions })`, `RankedPlaceSection({ places })`, `FestivalSection({ festivals })`.

- [ ] **Step 1: Write the failing composition tests**

```tsx
it("renders the five approved main-page regions in order", () => {
  const view = selectDiscoveryView(mainDiscoveryMock, defaultDiscoveryQuery);
  render(
    <MainDiscovery
      data={mainDiscoveryMock}
      query={defaultDiscoveryQuery}
      view={view}
    />,
  );

  const landmarks = screen.getAllByTestId("main-region");
  expect(landmarks.map((node) => node.dataset.region)).toEqual([
    "hero",
    "search",
    "list",
    "banner",
    "navigation",
  ]);
  expect(screen.getByRole("heading", { name: "지역별 인기 관광지 TOP 3" })).toBeVisible();
  expect(screen.getByRole("navigation", { name: "주요 메뉴" })).toBeVisible();
});

it("keeps the selected tab and region in accessible link state", () => {
  render(
    <DiscoverySearchPanel
      query={{ q: "", region: "jeju", tab: "places" }}
      regions={mainDiscoveryMock.regions}
    />,
  );

  expect(screen.getByRole("link", { name: "인기 관광지" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("link", { name: "제주" })).toHaveAttribute(
    "aria-current",
    "true",
  );
});
```

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/patterns/main-discovery.test.tsx`

Expected: FAIL because the pattern components are absent.

- [ ] **Step 3: Implement the hero and search surface**

`DiscoveryHero` renders a 220–260px `next/image` hero with one scrim, the greeting `여행자님, 반가워요`, and heading `오늘은 어디로 떠나볼까요?`. `DiscoverySearchPanel` overlaps the hero with a negative top margin, renders a native GET search form with `name="q"`, preserves `tab` and `region` through hidden inputs, and uses semantic `Link` controls for the four tabs and five regions.

Build tab/filter URLs with a local pure helper that always preserves `q`, `tab`, and `region` and appends the relevant section fragment. Never use `href="#"`.

```tsx
<form action="" method="get" role="search">
  <input name="tab" type="hidden" value={query.tab} />
  <input name="region" type="hidden" value={query.region} />
  <Input
    aria-label="여행지 검색"
    defaultValue={query.q}
    name="q"
    placeholder="지역, 관광지, 축제 검색"
    type="search"
  />
  <Button size="icon" type="submit" aria-label="검색">
    <SearchIcon aria-hidden="true" />
  </Button>
</form>
```

- [ ] **Step 4: Implement ranked and festival sections**

`RankedPlaceSection` uses `section`, `h2`, and `ol`; each `li` contains one `PlaceRankingCard`. The list uses horizontal overflow and scroll snap on mobile without hiding the browser scrollbar from assistive technology. When `places` is empty, render `선택한 지역에서 조건에 맞는 관광지를 찾지 못했어요.` and a link that resets `q` while preserving the selected region.

`FestivalSection` uses a labelled `ul` and renders the mock festival items. Empty festival search uses the parallel message `조건에 맞는 축제를 찾지 못했어요.`.

- [ ] **Step 5: Compose `MainDiscovery`**

```tsx
export type MainDiscoveryProps = {
  data: MainDiscoveryData;
  query: DiscoveryQuery;
  view: DiscoveryView;
};
```

Render the five approved `data-region` wrappers in document order. The `list` wrapper contains `RankedPlaceSection`, the nested `banner` wrapper with `AiCourseBanner`, and then `FestivalSection`, so the banner remains between both list types without duplicating the list region. `BottomNavigation` is last. Add bottom padding equal to the fixed navigation height plus safe area.

```tsx
const navigationItems: BottomNavigationItem[] = [
  { id: "home", label: "홈", href: "/", current: true },
  { id: "explore", label: "탐색" },
  { id: "trips", label: "내 일정" },
  { id: "reviews", label: "내 후기" },
  { id: "profile", label: "마이페이지" },
];

<div className="mx-auto min-h-screen w-full max-w-[30rem] bg-background pb-24">
  <div data-testid="main-region" data-region="hero">
    <DiscoveryHero image={data.hero} />
  </div>
  <div data-testid="main-region" data-region="search">
    <DiscoverySearchPanel query={query} regions={data.regions} />
  </div>
  <div data-testid="main-region" data-region="list">
    {view.showPlaces ? <RankedPlaceSection places={view.places} /> : null}
    <div data-testid="main-region" data-region="banner">
      {view.showAiCourse ? (
        <AiCourseBanner
          imageAlt={data.aiCourse.alt}
          imageSrc={data.aiCourse.src}
        />
      ) : null}
    </div>
    {view.showFestivals ? <FestivalSection festivals={view.festivals} /> : null}
  </div>
  <div data-testid="main-region" data-region="navigation">
    <BottomNavigation items={navigationItems} />
  </div>
</div>
```

- [ ] **Step 6: Run the focused composition tests**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/patterns/main-discovery.test.tsx`

Expected: PASS.

- [ ] **Step 7: Record the Git checkpoint without executing it**

Suggested commit: `feat: 메인 탐색 화면 패턴 구성`

---

### Task 6: Next.js 16 route adapter and page wiring

**Files:**
- Create: `apps/web/src/features/discovery/discovery-content.tsx`
- Modify: `apps/web/src/app/page.tsx`
- Create: `apps/web/tests/unit/features/discovery/discovery-content.test.tsx`
- Create: `apps/web/tests/unit/app/main-page.test.tsx`

**Interfaces:**
- Consumes: `Promise<DiscoverySearchParams>`, `parseDiscoveryQuery`, `selectDiscoveryView`, `mainDiscoveryMock`, `MainDiscovery`.
- Produces: `DiscoveryContent({ searchParams })` async Server Component and the `/` route shell.

- [ ] **Step 1: Read the required local Next.js 16 docs**

Read the three files listed in Global Constraints and confirm these current-version rules before coding: `searchParams` is a promise, URL-dependent content belongs below Suspense, and local `next/image` assets need stable dimensions or `fill` within a sized wrapper.

- [ ] **Step 2: Write failing route adapter tests**

```tsx
it("renders the approved Jeju mock view from default search params", async () => {
  render(await DiscoveryContent({ searchParams: Promise.resolve({}) }));

  expect(screen.getByRole("heading", { name: "오늘은 어디로 떠나볼까요?" })).toBeVisible();
  expect(screen.getByRole("article", { name: "1위 성산일출봉" })).toBeVisible();
});

it("uses page metadata for the discovery surface", () => {
  expect(metadata).toMatchObject({
    title: "여행 탐색 | 해뜸",
  });
});
```

- [ ] **Step 3: Run focused tests and confirm failure**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/features/discovery/discovery-content.test.tsx tests/unit/app/main-page.test.tsx`

Expected: FAIL because `DiscoveryContent` is absent and `/` still renders the starter screen.

- [ ] **Step 4: Implement the async feature adapter**

```tsx
type DiscoveryContentProps = {
  searchParams: Promise<DiscoverySearchParams>;
};

async function DiscoveryContent({ searchParams }: DiscoveryContentProps) {
  const query = parseDiscoveryQuery(await searchParams);
  const view = selectDiscoveryView(mainDiscoveryMock, query);

  return <MainDiscovery data={mainDiscoveryMock} query={query} view={view} />;
}

export { DiscoveryContent, type DiscoveryContentProps };
```

- [ ] **Step 5: Replace the starter route with a Suspense shell**

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";

import { DiscoveryContent } from "@/features/discovery/discovery-content";
import type { DiscoverySearchParams } from "@/features/discovery/discovery-model";

export const metadata: Metadata = {
  title: "여행 탐색 | 해뜸",
  description: "인기 관광지와 축제를 살펴보고 AI 여행 코스를 추천받아 보세요.",
};

export default function Home({
  searchParams,
}: {
  searchParams: Promise<DiscoverySearchParams>;
}) {
  return (
    <main className="min-h-screen bg-background">
      <Suspense fallback={<p className="sr-only">여행 정보를 불러오는 중</p>}>
        <DiscoveryContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
```

- [ ] **Step 6: Run route tests, all web tests, lint, and build**

Run:

```bash
pnpm --filter @haetteum/web exec vitest run tests/unit/features/discovery/discovery-content.test.tsx tests/unit/app/main-page.test.tsx
pnpm --filter @haetteum/web test
pnpm --filter @haetteum/web lint
pnpm --filter @haetteum/web build
```

Expected: all commands PASS; production build includes `/`, `/welcome`, and the development-gated `/design-system` behavior without a Next.js blocking-prerender error.

- [ ] **Step 7: Record the Git checkpoint without executing it**

Suggested commit: `feat: 메인 페이지 mock 탐색 연결`

---

### Task 7: Browser, accessibility, and visual design QA

**Files:**
- Create: `design-qa.md`
- Modify only when a verified defect requires it: files created or modified in Tasks 1–6

**Interfaces:**
- Consumes: approved reference image, running `/` route, all automated checks.
- Produces: a reproducible `design-qa.md` with `final result: passed` or an honest blocking reason.

- [ ] **Step 1: Run the complete repository checks relevant to this change**

Run:

```bash
pnpm --filter @haetteum/web test
pnpm --filter @haetteum/web lint
pnpm --filter @haetteum/web build
```

Expected: PASS. Record exact unrelated failures without changing unrelated user files.

- [ ] **Step 2: Start the local app without overlapping build and dev**

Run: `pnpm --filter @haetteum/web dev --hostname 127.0.0.1 --port 3000`

Expected: the Next.js server reports ready on port 3000. Keep the process running for browser verification only after `next build` has finished.

- [ ] **Step 3: Verify the core flow in the Codex in-app Browser**

Open `http://127.0.0.1:3000/`. Test search submission, all four content tabs, all five region filters, the AI CTA success message, current Home navigation semantics, and the four `준비 중` items. Inspect the browser console for runtime, hydration, image, and accessibility errors.

- [ ] **Step 4: Capture matching responsive states**

Capture `/` at 320px, 390px, and 768px widths with the default `제주` recommendation state. Confirm no horizontal page overflow, the next ranking card remains discoverable, hero/search overlap is intact, images are not stretched, the bottom navigation does not cover content, and safe-area padding is present.

- [ ] **Step 5: Run blocking design comparison**

Open the approved reference image and the latest 390px implementation capture together. Compare structure and density, not copied text or character identity. Fix P0/P1/P2 findings for hierarchy, crop, spacing, typography, border, radius, and fixed navigation; recapture after every fix round.

- [ ] **Step 6: Write the design QA report**

`design-qa.md` must include the compared viewport/state, automated command results, interaction results, remaining P3 polish notes, and one exact final line: `final result: passed`. If the browser, source image, or comparison cannot be inspected, use `final result: blocked` and state the evidence gap.

- [ ] **Step 7: Re-run focused checks after visual fixes**

Run the nearest affected test file first, followed by:

```bash
pnpm --filter @haetteum/web test
pnpm --filter @haetteum/web lint
pnpm --filter @haetteum/web build
```

Expected: PASS with `design-qa.md` ending in `final result: passed`.

- [ ] **Step 8: Record the Git checkpoint without executing it**

Suggested commit: `test: 메인 페이지 시각 및 접근성 검증`
