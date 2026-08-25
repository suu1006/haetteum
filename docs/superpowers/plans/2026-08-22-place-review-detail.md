# Place Review Detail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every discovery place card open a reusable `/places/[placeId]` detail page whose review tab faithfully recreates the supplied mobile reference while the other tabs show an honest preparation state.

**Architecture:** Keep the dynamic route, URL parsing and mock lookup in `app` and `features/places`, compose the page in `components/patterns`, and keep reusable travel presentation in `components/travel`. The route remains a Server Component; only back/save/share and the review-writing notice cross Client Component boundaries.

**Tech Stack:** Next.js 16.3.1 App Router, React 19.2.8, TypeScript strict mode, Tailwind CSS 4 CSS-first tokens, Base UI/shadcn-owned components, Lucide React, React Icons 5.7.0, Next Image, Vitest, Testing Library, axe-core, Product Design ImageGen and the in-app Browser.

**Spec:** `docs/superpowers/specs/2026-08-22-place-review-detail-design.md`

## Global Constraints

- Read and follow `AGENTS.md`; Next.js 16 differs from older training data.
- The relevant local Next.js guides are `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md`, `page.md`, `not-found.md`, and `04-functions/generate-metadata.md`.
- In Next.js 16, both `params` and `searchParams` are promises and must be awaited.
- Preserve the dirty worktree and never revert or overwrite unrelated discovery, festival, database, documentation, asset or QA work.
- Do not overwrite the existing root `design-qa.md`; write this feature's report to `artifacts/place-review-detail/design-qa.md`.
- Do not stage, commit, branch, push, tag or create a PR without separate user approval.
- Do not add Nest API, Prisma, authentication, persistence, a review form, map integration or real tab content beyond reviews.
- Keep `styles` for tokens, `components/ui` for generic Foundation, `components/travel` for travel presentation, `components/patterns` for screen composition, and `features/app` for data and routing.
- Use the existing Pretendard typography, semantic colors, 16px screen padding, 44×44px minimum controls, 480px maximum app surface and safe-area utilities.
- Keep the global `--rating` token unchanged; the reference-specific purple rating is an opt-in `primary` tone.
- Do not recreate the device frame or status bar from the reference.
- Do not crop the reference image, use emoji or text glyphs as icons, draw CSS/SVG icons, or leave placeholder images.
- Use `next/image` with a positioned parent, `fill`, meaningful `alt` and an accurate `sizes` value for review imagery.
- All current discovery place IDs must resolve to a detail extension; unknown IDs must call `notFound()`.
- The source reference is `/var/folders/18/zsywvwpj29jbnnlynpkv4qrc0000gn/T/codex-clipboard-b245c490-89e0-4bef-a666-f21daa2bd448.png`.
- Run focused tests with `pnpm --filter @haetteum/web exec vitest run <test-file>`.

---

## File Structure

### Create

- `apps/web/src/features/places/place-detail-model.ts` — route values, detail types, URL builders, parsers and pure review selection.
- `apps/web/src/features/places/place-detail.mock.ts` — one typed review extension for every current discovery place and lookup/static-param helpers.
- `apps/web/src/components/travel/review-provider-mark.tsx` — provider icon and visible provider-name mapping.
- `apps/web/src/components/travel/place-detail-header.tsx` — client back/save/share controls and accessible result feedback.
- `apps/web/src/components/travel/place-detail-tabs.tsx` — four URL-backed detail tabs.
- `apps/web/src/components/travel/place-review-overview.tsx` — review title plus split rating summary.
- `apps/web/src/components/travel/review-source-filter.tsx` — four URL-backed provider filters.
- `apps/web/src/components/travel/place-detail-preparation.tsx` — shared preparation state for the three unfinished tabs.
- `apps/web/src/components/travel/place-detail-actions.tsx` — floating safe-area review CTA and live preparation notice.
- `apps/web/src/components/patterns/place-detail-screen.tsx` — complete detail-page composition and bottom reserve.
- `apps/web/src/app/places/[placeId]/page.tsx` — dynamic route, static params, metadata, lookup and `notFound()`.
- `apps/web/src/app/places/[placeId]/not-found.tsx` — scoped Korean 404 and return link.
- `apps/web/tests/unit/features/places/place-detail-model.test.ts` — parsing, selection, catalog completeness and distribution invariants.
- `apps/web/tests/unit/components/travel/place-detail-components.test.tsx` — travel component rendering and client interactions.
- `apps/web/tests/unit/components/patterns/place-detail-screen.test.tsx` — section order, tab states, filtering, empty state and accessibility.
- `apps/web/tests/unit/app/place-detail-page.test.tsx` — route, metadata, static params and unknown ID tests.
- `apps/web/public/images/places/icheon-termeden/reviews/outdoor-pool.png` — wide thermal outdoor pool review photo.
- `apps/web/public/images/places/icheon-termeden/reviews/family-pool.png` — family water-play review photo.
- `apps/web/public/images/places/icheon-termeden/reviews/garden-spa.png` — landscaped spa pool review photo.
- `apps/web/public/images/places/icheon-termeden/reviews/indoor-bath.png` — bright indoor thermal bath review photo.
- `apps/web/public/images/places/icheon-termeden/reviews/stone-pool.png` — stone-lined pool review photo.
- `apps/web/public/images/places/icheon-termeden/reviews/pavilion-pool.png` — pavilion and pool review photo.
- `artifacts/place-review-detail/design-qa.md` — iterative same-state visual comparison and final verdict.

### Modify

- `apps/web/package.json` — add `react-icons` 5.7.0 for provider brand marks.
- `pnpm-lock.yaml` — record the dependency resolution.
- `apps/web/src/components/travel/place-ranking-card.tsx` — accept `href` and make the whole card one link.
- `apps/web/src/components/patterns/ranked-place-section.tsx` — build and pass each place detail href.
- `apps/web/src/components/travel/rating-summary.tsx` — add backward-compatible split layout, purple tone, five-star row and count labels.
- `apps/web/src/components/travel/review-card.tsx` — add a backward-compatible feed variant, review images and likes.
- `apps/web/tests/unit/components/travel/discovery-components.test.tsx` — update the place-card contract to require the detail link.
- `apps/web/tests/unit/components/travel/travel-components.test.tsx` — preserve existing defaults and test new review/rating variants.
- `DESIGN.md` — register the new place-detail pattern and only the repeated component variants added by implementation.

---

### Task 1: Establish the place detail route and mock-data contract

**Files:**
- Create: `apps/web/src/features/places/place-detail-model.ts`
- Create: `apps/web/src/features/places/place-detail.mock.ts`
- Test: `apps/web/tests/unit/features/places/place-detail-model.test.ts`

**Interfaces:**
- Consumes: `DiscoveryImage`, `PlaceRankingItem`, `SearchParamValue` and `mainDiscoveryMock.places`.
- Produces: `PlaceDetailTabId`, `ReviewSourceId`, `PlaceReview`, `PlaceReviewDetail`, `ResolvedPlaceDetail`, `parsePlaceDetailQuery(searchParams)`, `buildPlaceDetailHref(placeId, query?)`, `selectPlaceReviews(reviews, source)`, `placeReviewDetails`, `getPlaceDetailById(placeId)` and `getPlaceStaticParams()`.

- [ ] **Step 1: Write failing parser, href, lookup and invariant tests**

```ts
import { describe, expect, it } from "vitest";

import { mainDiscoveryMock } from "@/features/discovery/main-discovery.mock";
import {
  buildPlaceDetailHref,
  parsePlaceDetailQuery,
  selectPlaceReviews,
} from "@/features/places/place-detail-model";
import {
  getPlaceDetailById,
  getPlaceStaticParams,
} from "@/features/places/place-detail.mock";

describe("place detail model", () => {
  it("normalizes unknown route values to the review-all defaults", () => {
    expect(parsePlaceDetailQuery({ tab: "unknown", source: ["bad"] })).toEqual({
      tab: "reviews",
      source: "all",
    });
  });

  it("builds stable tab and provider URLs", () => {
    expect(buildPlaceDetailHref("icheon-termeden")).toBe(
      "/places/icheon-termeden",
    );
    expect(
      buildPlaceDetailHref("icheon-termeden", {
        tab: "reviews",
        source: "kakao",
      }),
    ).toBe("/places/icheon-termeden?tab=reviews&source=kakao");
  });

  it("filters reviews by provider without mutating the catalog", () => {
    const detail = getPlaceDetailById("icheon-termeden");
    expect(detail).toBeDefined();
    if (!detail) return;
    expect(selectPlaceReviews(detail.reviews, "google")).toEqual(
      detail.reviews.filter((review) => review.provider === "google"),
    );
    expect(selectPlaceReviews(detail.reviews, "all")).toBe(detail.reviews);
  });

  it("resolves every discovery place and keeps distribution totals honest", () => {
    for (const place of mainDiscoveryMock.places) {
      const detail = getPlaceDetailById(place.id);
      expect(detail?.title).toBe(place.title);
      expect(detail?.reviews.length).toBeGreaterThan(0);
      expect(
        detail?.ratingDistribution.reduce((sum, item) => sum + item.count, 0),
      ).toBe(place.reviewCount);
    }
  });

  it("returns undefined for unknown IDs and projects all static params", () => {
    expect(getPlaceDetailById("missing-place")).toBeUndefined();
    expect(getPlaceStaticParams()).toEqual(
      mainDiscoveryMock.places.map(({ id }) => ({ placeId: id })),
    );
  });
});
```

- [ ] **Step 2: Run the focused model test and verify the missing-module failure**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/features/places/place-detail-model.test.ts`

Expected: FAIL because both `@/features/places/place-detail-model` and `place-detail.mock` do not exist.

- [ ] **Step 3: Add exact route, query and review types plus pure helpers**

```ts
import type {
  DiscoveryImage,
  PlaceRankingItem,
  SearchParamValue,
} from "@/features/discovery/discovery-model";

export const placeDetailTabIds = [
  "introduction",
  "course",
  "reviews",
  "information",
] as const;
export const reviewSourceIds = ["all", "kakao", "google", "naver"] as const;

export type PlaceDetailTabId = (typeof placeDetailTabIds)[number];
export type ReviewSourceId = (typeof reviewSourceIds)[number];
export type ReviewProviderId = Exclude<ReviewSourceId, "all">;
export type PlaceDetailSearchParams = Record<string, SearchParamValue>;
export type PlaceDetailQuery = {
  tab: PlaceDetailTabId;
  source: ReviewSourceId;
};
export type PlaceReview = {
  id: string;
  provider: ReviewProviderId;
  author: string;
  rating: number;
  content: string;
  date: string;
  likeCount: number;
  avatar?: DiscoveryImage;
  images: readonly DiscoveryImage[];
};
export type PlaceReviewDetail = {
  placeId: string;
  ratingDistribution: readonly {
    score: 1 | 2 | 3 | 4 | 5;
    count: number;
  }[];
  reviews: readonly PlaceReview[];
};
export type ResolvedPlaceDetail = PlaceRankingItem & PlaceReviewDetail;

const defaultPlaceDetailQuery: PlaceDetailQuery = {
  tab: "reviews",
  source: "all",
};

function firstValue(value: SearchParamValue) {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePlaceDetailQuery(
  searchParams: PlaceDetailSearchParams,
): PlaceDetailQuery {
  const tab = firstValue(searchParams.tab);
  const source = firstValue(searchParams.source);
  return {
    tab: placeDetailTabIds.includes(tab as PlaceDetailTabId)
      ? (tab as PlaceDetailTabId)
      : defaultPlaceDetailQuery.tab,
    source: reviewSourceIds.includes(source as ReviewSourceId)
      ? (source as ReviewSourceId)
      : defaultPlaceDetailQuery.source,
  };
}

export function buildPlaceDetailHref(
  placeId: string,
  query?: PlaceDetailQuery,
) {
  const pathname = `/places/${encodeURIComponent(placeId)}`;
  if (!query || (query.tab === "reviews" && query.source === "all")) {
    return pathname;
  }
  const params = new URLSearchParams({ tab: query.tab });
  if (query.tab === "reviews" && query.source !== "all") {
    params.set("source", query.source);
  }
  return `${pathname}?${params.toString()}`;
}

export function selectPlaceReviews(
  reviews: readonly PlaceReview[],
  source: ReviewSourceId,
) {
  return source === "all"
    ? reviews
    : reviews.filter((review) => review.provider === source);
}
```

- [ ] **Step 4: Add the complete typed extension catalog**

Create `placeReviewDetails` for these exact place IDs and distributions:

| Place ID | 5★ | 4★ | 3★ | 2★ | 1★ | Total |
|---|---:|---:|---:|---:|---:|---:|
| `icheon-termeden` | 1,677 | 466 | 156 | 32 | 14 | 2,345 |
| `everland` | 2,590 | 836 | 331 | 90 | 45 | 3,892 |
| `suwon-hwaseong` | 1,280 | 430 | 190 | 57 | 30 | 1,987 |
| `seongsan-ilchulbong` | 900 | 260 | 80 | 30 | 14 | 1,284 |
| `hyeopjae-beach` | 690 | 210 | 55 | 20 | 11 | 986 |
| `bijarim-forest` | 510 | 160 | 45 | 18 | 9 | 742 |

Use these exact Icheon reviews:

| ID | Provider | Author | Rating | Date | Likes | Content | Images |
|---|---|---|---:|---|---:|---|---|
| `icheon-kakao-clean-pool` | kakao | 김여행 | 5.0 | 2026.08.12 | 12 | `시설이 깨끗하고 물도 좋아요! 가족끼리 오기 정말 좋은 곳입니다.` | outdoor, family, garden |
| `icheon-google-weekend` | google | Traveler_J | 4.0 | 2026.08.10 | 8 | `다양한 탕이 있어서 좋았어요. 다만 주말에는 사람이 많아서 조금 붐빕니다.` | none |
| `icheon-naver-family` | naver | 민서네 가족여행 | 4.8 | 2026.08.08 | 9 | `아이와 함께 방문했는데 정말 즐거운 시간이었어요. 특히 야외존이 최고예요!` | indoor, stone, pavilion |

Use these exact reviews for the other five places; each uses the place's current discovery image as its single review image:

| Place ID | Review ID | Provider | Author | Rating | Date | Likes | Content |
|---|---|---|---|---:|---|---:|---|
| `everland` | `everland-google-garden` | google | 놀이공원탐험가 | 4.5 | 2026.08.16 | 21 | `놀이기구뿐 아니라 정원도 잘 꾸며져 있어서 하루 종일 즐기기 좋았어요.` |
| `suwon-hwaseong` | `suwon-naver-wall-walk` | naver | 수원산책 | 4.6 | 2026.08.14 | 15 | `성곽길을 따라 걷는 풍경이 좋고 해질 무렵 분위기가 특히 아름다웠어요.` |
| `seongsan-ilchulbong` | `seongsan-kakao-sunrise` | kakao | 제주아침 | 5.0 | 2026.08.11 | 28 | `조금 일찍 올라가니 정상에서 시원한 바람과 멋진 풍경을 함께 볼 수 있었어요.` |
| `hyeopjae-beach` | `hyeopjae-google-water` | google | BlueTraveler | 4.7 | 2026.08.09 | 17 | `물빛이 맑고 얕은 구간이 있어 천천히 바다를 즐기기 좋았습니다.` |
| `bijarim-forest` | `bijarim-naver-quiet` | naver | 숲길기록 | 4.8 | 2026.08.07 | 13 | `나무 사이로 난 길이 평탄하고 조용해서 여유롭게 걷기 좋은 숲이에요.` |

Implement exact lookup and static-param helpers:

```ts
export function getPlaceDetailById(placeId: string) {
  const summary = mainDiscoveryMock.places.find((place) => place.id === placeId);
  const extension = placeReviewDetails.find(
    (detail) => detail.placeId === placeId,
  );
  return summary && extension ? { ...summary, ...extension } : undefined;
}

export function getPlaceStaticParams() {
  return mainDiscoveryMock.places.map(({ id }) => ({ placeId: id }));
}
```

- [ ] **Step 5: Run the focused model test**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/features/places/place-detail-model.test.ts`

Expected: PASS with five tests and no circular-import error.

- [ ] **Step 6: Review the task without Git mutation**

Run: `git diff --check -- apps/web/src/features/places apps/web/tests/unit/features/places/place-detail-model.test.ts`

Expected: no output. Do not stage or commit.

---

### Task 2: Turn every discovery place card into an accessible detail link

**Files:**
- Modify: `apps/web/src/components/travel/place-ranking-card.tsx`
- Modify: `apps/web/src/components/patterns/ranked-place-section.tsx`
- Modify: `apps/web/tests/unit/components/travel/discovery-components.test.tsx`

**Interfaces:**
- Consumes: `buildPlaceDetailHref(placeId: string, query?: PlaceDetailQuery): string` from Task 1.
- Produces: `PlaceRankingCardProps = { place: PlaceRankingItem; href: string }` and one full-card named link.

- [ ] **Step 1: Update the existing card test to require a full-card link**

```tsx
render(
  <PlaceRankingCard
    place={mainDiscoveryMock.places[0]}
    href="/places/icheon-termeden"
  />,
);

expect(
  screen.getByRole("link", { name: /1위 이천 테르메덴/ }),
).toHaveAttribute("href", "/places/icheon-termeden");
```

Retain the existing image ratio, location, rating and review-count assertions so the link change cannot regress the current card.

- [ ] **Step 2: Run the focused component test and verify the prop/role failure**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/discovery-components.test.tsx`

Expected: FAIL because `PlaceRankingCard` does not accept `href` and has no link.

- [ ] **Step 3: Wrap the complete card content in one Next Link**

```tsx
import Image from "next/image";
import Link from "next/link";

import { RatingSummary } from "@/components/travel/rating-summary";
import type { PlaceRankingItem } from "@/features/discovery/discovery-model";

type PlaceRankingCardProps = {
  place: PlaceRankingItem;
  href: string;
};

function PlaceRankingCard({ place, href }: PlaceRankingCardProps) {
  const rankLabel = `${place.rank}위`;

  return (
    <article aria-label={`${rankLabel} ${place.title}`} className="min-w-0">
      <Link
        href={href}
        className="grid min-h-11 gap-2 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/25"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-primary-subtle">
          <Image
            src={place.image.src}
            alt={place.image.alt}
            fill
            sizes="(max-width: 480px) 30vw, 144px"
            className="object-cover"
          />
          <span className="type-caption absolute top-1.5 left-1.5 rounded-full bg-primary px-2 py-0.5 font-semibold text-primary-foreground">
            {rankLabel}
          </span>
        </div>
        <div className="min-w-0 space-y-1">
          <h3 className="type-label truncate text-foreground">{place.title}</h3>
          <p className="type-caption truncate text-muted-foreground">
            {place.location}
          </p>
          <RatingSummary
            value={place.rating}
            reviewCount={place.reviewCount}
            size="compact"
            countVariant="parenthetical"
          />
        </div>
      </Link>
    </article>
  );
}

export { PlaceRankingCard, type PlaceRankingCardProps };
```

Do not nest another button or link.

- [ ] **Step 4: Build and pass each place URL at the composition boundary**

```tsx
<PlaceRankingCard
  place={place}
  href={buildPlaceDetailHref(place.id)}
/>
```

Import `buildPlaceDetailHref` in `ranked-place-section.tsx`; do not construct `/places/...` inline in the travel component.

- [ ] **Step 5: Run the focused discovery tests**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/discovery-components.test.tsx tests/unit/components/patterns/main-discovery.test.tsx`

Expected: PASS, including the existing discovery order and responsive-card assertions.

- [ ] **Step 6: Review the task without Git mutation**

Run: `git diff --check -- apps/web/src/components/travel/place-ranking-card.tsx apps/web/src/components/patterns/ranked-place-section.tsx apps/web/tests/unit/components/travel/discovery-components.test.tsx`

Expected: no output. Do not stage or commit.

---

### Task 3: Produce review photography and provider icon support

**Files:**
- Create: six Icheon review images under `apps/web/public/images/places/icheon-termeden/reviews/`
- Create: `apps/web/src/components/travel/review-provider-mark.tsx`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Test: `apps/web/tests/unit/components/travel/place-detail-components.test.tsx`

**Interfaces:**
- Consumes: `ReviewProviderId = "kakao" | "google" | "naver"`.
- Produces: `ReviewProviderMark({ provider }: { provider: ReviewProviderId })` and six 4:3 local image assets.

- [ ] **Step 1: Add an exact provider-mark test before the dependency**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReviewProviderMark } from "@/components/travel/review-provider-mark";

describe("ReviewProviderMark", () => {
  it.each([
    ["kakao", "카카오맵"],
    ["google", "구글맵"],
    ["naver", "네이버 블로그"],
  ] as const)("keeps %s recognizable as visible text", (provider, label) => {
    render(<ReviewProviderMark provider={provider} />);
    expect(screen.getByText(label)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the focused test and verify the missing-module failure**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/place-detail-components.test.tsx`

Expected: FAIL because `review-provider-mark.tsx` does not exist.

- [ ] **Step 3: Add the pinned icon-library dependency**

Run: `pnpm --filter @haetteum/web add react-icons@5.7.0`

Expected: `apps/web/package.json` contains `"react-icons": "5.7.0"` and only the web package plus `pnpm-lock.yaml` change for this command.

- [ ] **Step 4: Implement the provider map without custom SVG or text-glyph icons**

```tsx
import { MapPinIcon } from "lucide-react";
import { SiGoogle, SiKakao, SiNaver } from "react-icons/si";

import type { ReviewProviderId } from "@/features/places/place-detail-model";

const providerConfig = {
  kakao: { label: "카카오맵", icon: SiKakao, className: "bg-[#FEE500] text-[#191919]" },
  google: { label: "구글맵", icon: SiGoogle, className: "bg-card text-foreground" },
  naver: { label: "네이버 블로그", icon: SiNaver, className: "bg-[#03C75A] text-white" },
} as const;
```

Render a 24px circular brand mark plus visible provider label. Add a 12px `MapPinIcon` overlay only for Kakao so the mark reads as map rather than messaging. Keep the raw brand hex values local to this provider-only component; do not add them as global semantic state colors.

- [ ] **Step 5: Generate six coherent Icheon review assets with ImageGen**

Generate one image per call, landscape 4:3, documentary Korean travel-review photography, natural daylight, no text, no logos and no people in close-up. Use these exact subjects and output paths:

1. `outdoor-pool.png`: a clean outdoor thermal pool at a Korean European-style spa resort, pale blue water, stone buildings and trees, eye-level wide view.
2. `family-pool.png`: family-friendly shallow outdoor spa pool, children and parents only as distant unidentifiable figures, sunny landscaped garden.
3. `garden-spa.png`: curved outdoor thermal pool beside a cream pavilion, calm water and manicured greenery.
4. `indoor-bath.png`: bright indoor thermal bath with tall windows, warm neutral tile, quiet uncrowded atmosphere.
5. `stone-pool.png`: organic stone-lined outdoor hot pool, forest edge, late-afternoon natural light.
6. `pavilion-pool.png`: wide spa pool facing a small European pavilion and garden, clear sky, balanced travel-photo composition.

Inspect every result before saving. Reject images with distorted architecture, visible text, logos, duplicated people, water artifacts or inconsistent color direction.

- [ ] **Step 6: Verify asset dimensions and file identity**

Run:

```bash
file apps/web/public/images/places/icheon-termeden/reviews/*.png
sips -g pixelWidth -g pixelHeight apps/web/public/images/places/icheon-termeden/reviews/*.png
```

Expected: six valid PNG files, each landscape and exactly 4:3 after a non-destructive formatting crop if ImageGen output needs normalization.

- [ ] **Step 7: Run the provider test and dependency check**

Run:

```bash
pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/place-detail-components.test.tsx
pnpm --filter @haetteum/web exec tsc --noEmit
```

Expected: provider test PASS and TypeScript resolves `react-icons/si`.

- [ ] **Step 8: Review the task without Git mutation**

Run: `git diff --check -- apps/web/package.json pnpm-lock.yaml apps/web/src/components/travel/review-provider-mark.tsx apps/web/tests/unit/components/travel/place-detail-components.test.tsx`

Expected: no output. Do not stage or commit.

---

### Task 4: Extend the reusable rating and review presentation variants

**Files:**
- Modify: `apps/web/src/components/travel/rating-summary.tsx`
- Modify: `apps/web/src/components/travel/review-card.tsx`
- Modify: `apps/web/tests/unit/components/travel/travel-components.test.tsx`
- Modify: `apps/web/tests/unit/components/travel/place-detail-components.test.tsx`

**Interfaces:**
- Consumes: existing `RatingSummaryProps` and `ReviewCardProps`, plus `DiscoveryImage`-shaped image data.
- Produces: `RatingSummaryProps.layout?: "stacked" | "split"`, `tone?: "rating" | "primary"`, `distributionValue?: "percentage" | "count"`; `ReviewCardProps.variant?: "default" | "feed"`, `images?: readonly { src: string; alt: string }[]`, `likeCount?: number`.

- [ ] **Step 1: Add failing opt-in variant tests while preserving the old tests**

```tsx
render(
  <RatingSummary
    value={4.6}
    reviewCount={2345}
    layout="split"
    tone="primary"
    distributionValue="count"
    distribution={[
      { score: 5, count: 1677 },
      { score: 4, count: 466 },
      { score: 3, count: 156 },
      { score: 2, count: 32 },
      { score: 1, count: 14 },
    ]}
  />,
);

expect(screen.getByText("1,677")).toBeVisible();
expect(screen.getByRole("meter", { name: "5점 후기 비율" })).toHaveAttribute(
  "aria-valuenow",
  "72",
);
```

```tsx
render(
  <ReviewCard
    variant="feed"
    author="김여행"
    rating={5}
    date="2026.08.12"
    content="시설이 깨끗하고 물도 좋아요!"
    provider="카카오맵"
    providerIcon={<span>provider mark</span>}
    images={[
      { src: "/images/places/icheon-termeden/reviews/outdoor-pool.png", alt: "야외 온천 수영장" },
    ]}
    likeCount={12}
  />,
);

expect(screen.getByRole("img", { name: "야외 온천 수영장" })).toBeVisible();
expect(screen.getByText("12")).toBeVisible();
```

- [ ] **Step 2: Run both focused component suites and verify the new-prop failures**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/travel-components.test.tsx tests/unit/components/travel/place-detail-components.test.tsx`

Expected: FAIL because the new rating and review props are not implemented; existing default tests still compile.

- [ ] **Step 3: Add backward-compatible RatingSummary variants**

Keep current defaults exactly:

```ts
layout = "stacked";
tone = "rating";
distributionValue = "percentage";
```

For `layout="split"`, render a two-column mobile grid with the value and five-star row on the left and the 5→1 distribution on the right. Calculate `percentage = Math.round(count / Math.max(reviewCount, 1) * 100)`, keep the meter accessible, and render the localized raw count when `distributionValue="count"`. Use `text-primary`, `fill-primary` and `bg-primary` only when `tone="primary"`; keep `text-rating`, `fill-rating` and `bg-rating` as the default.

- [ ] **Step 4: Add the feed ReviewCard variant without changing default markup**

For `variant="feed"`:

- render provider mark + provider label + purple star row + decimal rating at the top;
- render body copy below;
- when `images.length > 0`, render an overflow-x-auto rail whose items use `relative aspect-[4/3] min-w-[8.25rem] overflow-hidden rounded-lg` and `NextImage fill sizes="132px"`;
- render avatar/author/date at the bottom-left and a Lucide `ThumbsUpIcon` plus localized likes at the bottom-right;
- preserve `article` name `${author}의 후기` and do not make the like indicator a button.

Leave `variant="default"` byte-for-byte equivalent in behavior to the existing card.

- [ ] **Step 5: Run the focused suites**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/travel-components.test.tsx tests/unit/components/travel/place-detail-components.test.tsx`

Expected: PASS for existing defaults and new opt-in variants.

- [ ] **Step 6: Review the task without Git mutation**

Run: `git diff --check -- apps/web/src/components/travel/rating-summary.tsx apps/web/src/components/travel/review-card.tsx apps/web/tests/unit/components/travel/travel-components.test.tsx apps/web/tests/unit/components/travel/place-detail-components.test.tsx`

Expected: no output. Do not stage or commit.

---

### Task 5: Build the detail navigation, filters and client actions

**Files:**
- Create: `apps/web/src/components/travel/place-detail-header.tsx`
- Create: `apps/web/src/components/travel/place-detail-tabs.tsx`
- Create: `apps/web/src/components/travel/place-review-overview.tsx`
- Create: `apps/web/src/components/travel/review-source-filter.tsx`
- Create: `apps/web/src/components/travel/place-detail-preparation.tsx`
- Create: `apps/web/src/components/travel/place-detail-actions.tsx`
- Modify: `apps/web/tests/unit/components/travel/place-detail-components.test.tsx`

**Interfaces:**
- Consumes: `ResolvedPlaceDetail`, `PlaceDetailQuery`, `PlaceDetailTabId`, `ReviewSourceId`, `buildPlaceDetailHref` and extended Task 4 components.
- Produces: six focused travel components with no data fetching.

- [ ] **Step 1: Add failing navigation and action tests**

Test these exact behaviors:

```tsx
render(
  <PlaceDetailTabs placeId="icheon-termeden" currentTab="reviews" />,
);
expect(screen.getByRole("link", { name: "후기" })).toHaveAttribute(
  "aria-current",
  "page",
);
expect(screen.getByRole("link", { name: "소개" })).toHaveAttribute(
  "href",
  "/places/icheon-termeden?tab=introduction",
);
```

```tsx
render(
  <ReviewSourceFilter placeId="icheon-termeden" currentSource="kakao" />,
);
expect(screen.getByRole("link", { name: "카카오맵" })).toHaveAttribute(
  "aria-current",
  "true",
);
expect(screen.getByRole("link", { name: "전체" })).toHaveAttribute(
  "href",
  "/places/icheon-termeden",
);
```

```tsx
const user = userEvent.setup();
render(<PlaceDetailActions />);
await user.click(screen.getByRole("button", { name: "후기 작성하기" }));
expect(screen.getByRole("status")).toHaveTextContent(
  "후기 작성 기능을 준비하고 있어요",
);
```

Mock `next/navigation` and navigator APIs to verify:

- save toggles `aria-pressed` and accessible name;
- back calls `router.back()` when `window.history.length > 1` and `router.push("/")` otherwise;
- share calls `navigator.share({ title, url })` when available;
- non-Abort share failure copies `window.location.href` and announces success;
- total failure announces `링크를 공유하지 못했어요`.

- [ ] **Step 2: Run the focused test and verify all missing-component failures**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/place-detail-components.test.tsx`

Expected: FAIL because the six components do not exist.

- [ ] **Step 3: Implement URL-backed tabs and source filters**

Use `Link`, not client state. The tab labels and IDs are exactly:

```ts
const tabs = [
  { id: "introduction", label: "소개" },
  { id: "course", label: "코스 추천" },
  { id: "reviews", label: "후기" },
  { id: "information", label: "정보" },
] as const;
```

The source labels are exactly `전체`, `카카오맵`, `구글맵`, `네이버 블로그`. Tabs use four equal columns and a primary underline; source links are 44px-high pills in a horizontal scroll area. Both preserve focus-visible feedback and announce current state with more than color.

- [ ] **Step 4: Implement header controls in one small Client Component**

Use `ArrowLeftIcon`, `HeartIcon` and `Share2Icon`. Keep the location title centered and truncated. Implement the exact state algorithm:

```ts
function handleBack() {
  if (window.history.length > 1) router.back();
  else router.push("/");
}

async function handleShare() {
  const url = window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title, url });
      setMessage("공유 화면을 열었어요");
      return;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return;
  }
  try {
    await navigator.clipboard.writeText(url);
    setMessage("링크를 복사했어요");
  } catch {
    setMessage("링크를 공유하지 못했어요");
  }
}
```

Save is local-only and toggles `aria-pressed`, heart fill and the labels `{title} 찜하기` / `{title} 찜 해제`.

- [ ] **Step 5: Implement overview, preparation and floating action presentation**

- `PlaceReviewOverview` renders `통합 후기` + localized count and delegates the split chart to `RatingSummary` with `layout="split" tone="primary" distributionValue="count"`.
- `PlaceDetailPreparation` maps each unfinished tab to exact copy: `소개를 준비하고 있어요`, `추천 코스를 준비하고 있어요`, `상세 정보를 준비하고 있어요`; it includes a link back to the review tab.
- `PlaceDetailActions` uses `fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[30rem]`, `safe-area-bottom`, a 52px primary pill and a visually available `role="status"` message.

- [ ] **Step 6: Run the focused test**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/place-detail-components.test.tsx`

Expected: PASS for URL contracts, header actions, preparation copy, overview and CTA notice.

- [ ] **Step 7: Review the task without Git mutation**

Run: `git diff --check -- apps/web/src/components/travel/place-detail-*.tsx apps/web/src/components/travel/place-review-overview.tsx apps/web/src/components/travel/review-source-filter.tsx apps/web/tests/unit/components/travel/place-detail-components.test.tsx`

Expected: no output. Do not stage or commit.

---

### Task 6: Compose the review screen and accessible empty states

**Files:**
- Create: `apps/web/src/components/patterns/place-detail-screen.tsx`
- Test: `apps/web/tests/unit/components/patterns/place-detail-screen.test.tsx`

**Interfaces:**
- Consumes: `ResolvedPlaceDetail`, `PlaceDetailQuery`, `selectPlaceReviews` and all Task 3–5 travel components.
- Produces: `PlaceDetailScreen({ place, query }: { place: ResolvedPlaceDetail; query: PlaceDetailQuery })`.

- [ ] **Step 1: Write failing screen-order, filtering, preparation and axe tests**

Render Icheon with `{ tab: "reviews", source: "all" }` and require these test regions in exact order:

```ts
expect(
  screen.getAllByTestId("place-detail-region").map((node) =>
    node.getAttribute("data-region"),
  ),
).toEqual(["header", "tabs", "review-heading", "filters", "rating", "feed", "action"]);
```

Assert three Icheon review articles are visible for `all`, only `Traveler_J의 후기` is visible for `google`, and an empty provider selection renders `선택한 출처에는 아직 후기가 없어요` plus an `전체 후기 보기` link.

Render `{ tab: "course", source: "all" }`, assert `추천 코스를 준비하고 있어요`, and assert no review filter or review feed is present.

Run axe:

```ts
const results = await axe(container);
expect(results.violations).toEqual([]);
```

- [ ] **Step 2: Run the focused screen test and verify the missing-module failure**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/patterns/place-detail-screen.test.tsx`

Expected: FAIL because `PlaceDetailScreen` does not exist.

- [ ] **Step 3: Compose the complete mobile screen**

Use this outer contract:

```tsx
<div className="mx-auto min-h-screen w-full max-w-[30rem] bg-background pb-[calc(7rem+var(--safe-area-bottom))]">
  <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md">
    <PlaceDetailHeader title={place.title} />
    <PlaceDetailTabs placeId={place.id} currentTab={query.tab} />
  </div>
  {query.tab === "reviews" ? <ReviewSurface /> : <PlaceDetailPreparation />}
  {query.tab === "reviews" ? <PlaceDetailActions /> : null}
</div>
```

For the review surface, preserve the exact reference order. Render each selected review with `ReviewProviderMark`, `ReviewCard variant="feed"`, data-driven images and likes. Use `space-y-3` between bordered white cards and avoid additional shadows beyond the current card token.

- [ ] **Step 4: Implement the empty-provider state**

Use a bordered, neutral panel only when the selected review list is empty. Keep the overall rating visible, explain `선택한 출처에는 아직 후기가 없어요`, and link to `buildPlaceDetailHref(place.id)` with `전체 후기 보기`. Do not render empty review-card shells or fake copy.

- [ ] **Step 5: Run the focused screen test**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/components/patterns/place-detail-screen.test.tsx`

Expected: PASS for order, provider filtering, preparation state and zero axe violations.

- [ ] **Step 6: Review the task without Git mutation**

Run: `git diff --check -- apps/web/src/components/patterns/place-detail-screen.tsx apps/web/tests/unit/components/patterns/place-detail-screen.test.tsx`

Expected: no output. Do not stage or commit.

---

### Task 7: Add the Next.js 16 dynamic route, metadata and scoped 404

**Files:**
- Create: `apps/web/src/app/places/[placeId]/page.tsx`
- Create: `apps/web/src/app/places/[placeId]/not-found.tsx`
- Test: `apps/web/tests/unit/app/place-detail-page.test.tsx`

**Interfaces:**
- Consumes: `getPlaceDetailById`, `getPlaceStaticParams`, `parsePlaceDetailQuery` and `PlaceDetailScreen`.
- Produces: `/places/[placeId]`, `generateStaticParams()`, `generateMetadata({ params })` and scoped not-found UI.

- [ ] **Step 1: Re-read the four Next.js guides listed in Global Constraints**

Confirm before code that `params` and `searchParams` use `Promise<...>`, dynamic metadata remains server-only, and `notFound()` is the correct unknown-ID boundary.

- [ ] **Step 2: Write failing route tests**

Cover these exact cases:

```tsx
expect(generateStaticParams()).toEqual(
  mainDiscoveryMock.places.map(({ id }) => ({ placeId: id })),
);

await expect(
  generateMetadata({ params: Promise.resolve({ placeId: "icheon-termeden" }) }),
).resolves.toMatchObject({ title: "이천 테르메덴 후기 | 해뜸" });
```

Render `await PlaceDetailPage({ params, searchParams })` for Icheon and expect the title, `통합 후기`, and `2,345개`. Mock `next/navigation.notFound` to throw a sentinel for `missing-place` and assert that sentinel. Render the scoped `NotFound` component and assert `장소를 찾을 수 없어요` and a `/` return link.

- [ ] **Step 3: Run the focused app test and verify the route-module failure**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/app/place-detail-page.test.tsx`

Expected: FAIL because the dynamic route does not exist.

- [ ] **Step 4: Implement the server route using the verified Next.js 16 contract**

```tsx
type PlaceDetailPageProps = {
  params: Promise<{ placeId: string }>;
  searchParams: Promise<PlaceDetailSearchParams>;
};

export function generateStaticParams() {
  return getPlaceStaticParams();
}

export async function generateMetadata({
  params,
}: Pick<PlaceDetailPageProps, "params">): Promise<Metadata> {
  const { placeId } = await params;
  const place = getPlaceDetailById(placeId);
  if (!place) return { title: "장소를 찾을 수 없어요 | 해뜸" };
  return {
    title: `${place.title} 후기 | 해뜸`,
    description: `${place.title}의 통합 후기 ${new Intl.NumberFormat("ko-KR").format(place.reviewCount)}개를 확인해 보세요.`,
  };
}

export default async function PlaceDetailPage({
  params,
  searchParams,
}: PlaceDetailPageProps) {
  const [{ placeId }, rawSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const place = getPlaceDetailById(placeId);
  if (!place) notFound();
  return (
    <main className="min-h-screen bg-background">
      <PlaceDetailScreen
        place={place}
        query={parsePlaceDetailQuery(rawSearchParams)}
      />
    </main>
  );
}
```

- [ ] **Step 5: Add the scoped 404**

Render a max-480px centered surface with `장소를 찾을 수 없어요`, `요청한 장소가 없거나 이동되었어요.` and a 44px-high link labeled `여행 탐색으로 돌아가기` to `/`. Use only existing semantic tokens.

- [ ] **Step 6: Run route and focused feature tests**

Run: `pnpm --filter @haetteum/web exec vitest run tests/unit/app/place-detail-page.test.tsx tests/unit/features/places/place-detail-model.test.ts tests/unit/components/patterns/place-detail-screen.test.tsx`

Expected: PASS for route, metadata, static params, unknown ID and screen composition.

- [ ] **Step 7: Review the task without Git mutation**

Run: `git diff --check -- apps/web/src/app/places apps/web/tests/unit/app/place-detail-page.test.tsx`

Expected: no output. Do not stage or commit.

---

### Task 8: Update the design source of truth and run the full verification gate

**Files:**
- Modify: `DESIGN.md`
- Create: `artifacts/place-review-detail/design-qa.md`
- Verify: all files created or modified by Tasks 1–7.

**Interfaces:**
- Consumes: the completed page and reference image.
- Produces: synchronized design documentation, a passing visual QA report and evidence for handoff.

- [ ] **Step 1: Update only the implemented design-system facts**

Add `PlaceDetailScreen`, place detail header/tabs/filter/action components, `ReviewCard feed` and `RatingSummary split/primary` to the implemented-components section. Record `/places/[placeId]` as the reusable detail route, 후기 as complete, and the other tabs as preparation states. Do not document API, persistence or actual review writing as implemented.

- [ ] **Step 2: Run all focused feature tests together**

Run:

```bash
pnpm --filter @haetteum/web exec vitest run \
  tests/unit/features/places/place-detail-model.test.ts \
  tests/unit/components/travel/place-detail-components.test.tsx \
  tests/unit/components/travel/travel-components.test.tsx \
  tests/unit/components/travel/discovery-components.test.tsx \
  tests/unit/components/patterns/place-detail-screen.test.tsx \
  tests/unit/components/patterns/main-discovery.test.tsx \
  tests/unit/app/place-detail-page.test.tsx
```

Expected: every listed file passes with zero failed tests.

- [ ] **Step 3: Run the complete web quality gate**

Run:

```bash
pnpm --filter @haetteum/web test
pnpm --filter @haetteum/web lint
pnpm --filter @haetteum/web build
```

Expected: all web tests, ESLint and Next production build pass. Report unrelated failures honestly rather than changing out-of-scope code.

- [ ] **Step 4: Start a clean local development server**

Before starting, inspect existing listeners and do not run `next dev` and `next build` simultaneously against the same `.next` directory. Start the project with an explicit available port, then keep the process running for Browser QA.

Suggested command: `pnpm --filter @haetteum/web dev -- --hostname 127.0.0.1 --port 3000`

- [ ] **Step 5: Use the in-app Browser and capture matching states**

Read the `browser:control-in-app-browser` skill before use. Open the local app in the in-app browser and capture:

- `/places/icheon-termeden` at 320×844, 390×844 and 480×900;
- `/places/icheon-termeden?tab=reviews&source=google` at 390×844;
- `/places/icheon-termeden?tab=course` at 390×844;
- one non-Icheon place detail at 390×844;
- an unknown place route.

Test back, save toggle, share fallback, all four provider filters, all four tabs and the review-writing notice. Inspect browser console errors and verify there is no page-level horizontal overflow.

- [ ] **Step 6: Run blocking same-state design QA**

Open the source reference and the 390×844 Icheon all-reviews capture together. Compare:

- header/tabs height and alignment;
- review heading/filter spacing;
- split rating hierarchy and 5→1 bar lengths;
- review-card density, image crop and footer alignment;
- floating CTA size, position and content reserve;
- typography, border, radius and color fidelity.

Write each iteration to `artifacts/place-review-detail/design-qa.md` with P0–P3 findings. Fix every P0/P1/P2, recapture and compare again. The final line must be exactly `final result: passed`; if source capture, app capture or comparison is blocked, write `final result: blocked` and do not claim completion.

- [ ] **Step 7: Run the final post-QA regression gate**

After visual fixes, rerun:

```bash
pnpm --filter @haetteum/web exec vitest run \
  tests/unit/features/places/place-detail-model.test.ts \
  tests/unit/components/travel/place-detail-components.test.tsx \
  tests/unit/components/patterns/place-detail-screen.test.tsx \
  tests/unit/app/place-detail-page.test.tsx
pnpm --filter @haetteum/web lint
pnpm --filter @haetteum/web build
git diff --check
```

Expected: focused regression, lint, build and whitespace checks pass after the final visual edits.

- [ ] **Step 8: Audit scope and hand off without Git mutation**

Run:

```bash
git status --short
git diff --stat
rg -n "final result:" artifacts/place-review-detail/design-qa.md
```

Confirm the QA report ends in `passed`, no unrelated file was reverted or overwritten, and no Git staging/commit/branch/push operation occurred. Hand off the clickable local route first and distinguish verified behavior from the three preparation-only tabs and the preparation-only review-writing CTA.
