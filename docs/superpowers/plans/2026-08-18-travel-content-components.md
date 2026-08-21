# Haetteum Travel Content Components Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Haetteum의 장소, 평점, 후기, 일정 데이터를 재사용 가능한 표현 컴포넌트로 제공하고 개발 전용 디자인 시스템에서 실제 조합을 확인한다.

**Architecture:** `src/components/travel`은 명시적 props와 ReactNode slot만 소비하고 데이터 요청, 라우팅, API 타입을 소유하지 않는다. 기존 `components/ui`와 semantic Tailwind utilities를 합성하며 `/design-system`은 제품 화면이 아닌 상태 검증 surface로 유지한다.

**Tech Stack:** Next.js 16.3.1 App Router, React 19.2.8, TypeScript 5, Tailwind CSS 4, shadcn/ui Base UI + Rhea, Lucide, Vitest, React Testing Library, axe-core

**Spec:** `DESIGN.md`의 `Travel content implementation unit`

## Global Constraints

- primitive와 semantic token의 단일 원본은 `src/styles/tokens.css`다.
- `components/travel`에는 데이터 요청, 라우팅, API 응답 타입을 넣지 않는다.
- 원격 이미지 설정을 추가하지 않고 `media`, `providerIcon`, `avatar` ReactNode slot을 사용한다.
- 모든 저장 조작은 접근 가능한 이름과 44×44px 터치 영역을 가진다.
- 긴 텍스트는 320px에서 가로 overflow 없이 줄바꿈한다.
- 사용자가 요청하지 않은 commit, push, branch, worktree 생성은 하지 않는다.

## File Structure

- `src/components/travel/place-card.tsx`: 장소 핵심 정보와 controlled 저장 조작을 표현한다.
- `src/components/travel/rating-summary.tsx`: 평균, 후기 수와 선택적 점수 분포를 표현한다.
- `src/components/travel/provider-badge.tsx`: 후기 출처를 작은 text badge로 표현한다.
- `src/components/travel/review-card.tsx`: 작성자, 출처, 평점, 날짜와 본문을 표현한다.
- `src/components/travel/itinerary-item.tsx`: 일정 순서, 상태, 시간, 위치와 이동시간을 표현한다.
- `src/components/travel/travel-components.test.tsx`: 각 public contract와 상호작용을 실제 렌더로 검증한다.
- `src/components/design-system/design-system-preview.tsx`: Travel content 조합 예시를 추가한다.
- `src/components/design-system/design-system-preview.test.tsx`: 새 섹션과 전체 접근성을 검증한다.

---

### Task 1: Travel component public contracts

**Files:**
- Create: `src/components/travel/travel-components.test.tsx`
- Create: `src/components/travel/place-card.tsx`
- Create: `src/components/travel/rating-summary.tsx`
- Create: `src/components/travel/provider-badge.tsx`
- Create: `src/components/travel/review-card.tsx`
- Create: `src/components/travel/itinerary-item.tsx`

**Interfaces:**
- Produces: `PlaceCardProps`, `RatingSummaryProps`, `ProviderBadgeProps`, `ReviewCardProps`, `ItineraryItemProps`
- Consumes: `Card`, `Toggle`, semantic color/type utilities and Lucide icons

- [x] **Step 1: Write failing public-contract tests**

Create real renders that require these observable outcomes:

```tsx
render(
  <PlaceCard
    title="성산일출봉"
    location="제주 서귀포시"
    rating={4.8}
    reviewCount={1284}
    saved={false}
    onSavedChange={onSavedChange}
    media={<div aria-label="성산일출봉 풍경" />}
  />,
);
await user.click(screen.getByRole("button", { name: "성산일출봉 저장" }));
expect(onSavedChange).toHaveBeenCalledWith(true);

render(
  <RatingSummary
    value={4.8}
    reviewCount={1284}
    distribution={[{ score: 5, count: 900 }]}
  />,
);
expect(screen.getByRole("meter", { name: "5점 후기 비율" })).toHaveAttribute(
  "aria-valuenow",
  "70",
);

render(
  <ReviewCard
    author="여행자 민지"
    rating={5}
    date="2026. 8. 12."
    content="아침 일찍 가니 조용하게 일출을 볼 수 있었어요."
    provider="네이버 여행"
  />,
);
expect(screen.getByText("네이버 여행")).toBeInTheDocument();

render(
  <ol>
    <ItineraryItem
      order={2}
      time="14:30"
      title="해안 산책로"
      location="제주 제주시"
      status="current"
    />
  </ol>,
);
expect(screen.getByRole("listitem")).toHaveAttribute("data-status", "current");
```

- [x] **Step 2: Run the focused test and verify RED**

Run: `pnpm test src/components/travel/travel-components.test.tsx`

Expected: the caught dynamic imports resolve to `null` and the explicit module-contract assertions fail because the five modules do not exist.

- [x] **Step 3: Implement the minimal five components**

Use these exact public shapes:

```ts
type PlaceCardProps = {
  title: string;
  location: string;
  rating: number;
  reviewCount: number;
  tags?: readonly string[];
  media?: ReactNode;
  saved?: boolean;
  onSavedChange?: (saved: boolean) => void;
};

type RatingDistribution = {
  score: 1 | 2 | 3 | 4 | 5;
  count: number;
};

type RatingSummaryProps = {
  value: number;
  reviewCount: number;
  distribution?: readonly RatingDistribution[];
  size?: "default" | "compact";
};

type ProviderBadgeProps = { provider: string; icon?: ReactNode };

type ReviewCardProps = {
  author: string;
  rating: number;
  date: string;
  content: string;
  provider: string;
  providerIcon?: ReactNode;
  avatar?: ReactNode;
};

type ItineraryItemProps = {
  order: number;
  time: string;
  title: string;
  location: string;
  status: "upcoming" | "current" | "completed";
  travelDuration?: string;
  isLast?: boolean;
};
```

`PlaceCard`만 controlled Toggle interaction 때문에 client component로 만든다. 평점 분포 백분율은 `Math.round((count / Math.max(reviewCount, 1)) * 100)`을 사용하고 0~100으로 제한한다.

- [x] **Step 4: Run the focused test and verify GREEN**

Run: `pnpm test src/components/travel/travel-components.test.tsx`

Expected: 저장 callback, rating meter, provider 표시와 itinerary status 검증이 모두 통과한다.

---

### Task 2: Travel content preview integration

**Files:**
- Modify: `src/components/design-system/design-system-preview.tsx`
- Modify: `src/components/design-system/design-system-preview.test.tsx`

**Interfaces:**
- Consumes: the five Travel content components from Task 1
- Produces: `/design-system`의 `여행 콘텐츠` section

- [x] **Step 1: Add a failing preview assertion**

Extend the hierarchy assertion with the new level-two heading and verify one representative component from each content type:

```tsx
expect(
  screen.getByRole("heading", { level: 2, name: "여행 콘텐츠" }),
).toBeInTheDocument();
expect(screen.getByRole("article", { name: "성산일출봉" })).toBeInTheDocument();
expect(screen.getByText("여행자 민지")).toBeInTheDocument();
expect(screen.getByRole("list", { name: "제주 하루 일정" })).toBeInTheDocument();
```

- [x] **Step 2: Run the preview test and verify RED**

Run: `pnpm test src/components/design-system/design-system-preview.test.tsx`

Expected: `여행 콘텐츠` heading is missing while the existing Foundation assertions continue to pass.

- [x] **Step 3: Add the responsive Travel content composition**

Add one full-width `PreviewSection` containing a `PlaceCard`, `RatingSummary`, `ReviewCard`, and a labelled `ol` with three `ItineraryItem`s. Use a CSS gradient/media placeholder with the existing semantic tokens, keep the main content single-column at narrow widths, and switch to two columns at `md`.

- [x] **Step 4: Run preview and full tests to GREEN**

Run:

```bash
pnpm test src/components/design-system/design-system-preview.test.tsx
pnpm test
```

Expected: all hierarchy, interaction and axe assertions pass without warnings.

---

### Task 3: Static, browser and scope verification

**Files:**
- Modify: `docs/superpowers/plans/2026-08-18-travel-content-components.md`

**Interfaces:**
- Consumes: complete Travel content implementation
- Produces: verified working tree with no Git publishing action

- [x] **Step 1: Run static and production verification**

Run:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
git diff --check
```

Expected: every command exits 0 and production `/design-system` remains a 404 response.

- [ ] **Step 2: Verify the development preview in the browser**

At 320px, 390px and 768px verify no horizontal overflow, readable long content, a 44px save target, visible keyboard focus, changing saved state when a controlled preview wrapper is used, and no console errors.

Current evidence: the in-app browser confirmed the composed desktop surface,
44px save target, controlled saved-state change, visible keyboard focus ring and
no console errors. Its current control API cannot resize the page viewport, so
the 320px, 390px and 768px passes remain unchecked for this implementation unit.

- [x] **Step 3: Review scope and finish the checklist**

Run `git status --short`, `git diff --check`, and search this plan for unchecked task items. Only approved design-system files and the five Travel content components/tests may be changed. Do not commit or push.
