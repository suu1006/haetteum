# 일정 장소 검색 및 선택 화면 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** 일정 수정 화면에서 주변 장소를 검색, 필터, 정렬하고 여러 장소를 선택해 active course 끝에 mock 시간 slot과 함께 추가하는 재사용 가능한 전체 화면 선택 흐름을 구현한다.

**Architecture:** CourseEditor가 일정 draft와 edit/place-search 전환을 소유하고, CoursePlacePicker가 검색, 필터, 정렬, 선택 상태를 관리한다. NearbyPlaceSearchScreen과 NearbyPlaceSelectCard는 mock이나 route를 참조하지 않는 controlled UI이며, 검색 데이터와 순수 함수는 features/places에 둔다.

**Tech Stack:** Next.js 16.3.1 App Router, React 19.2.8, TypeScript strict, Tailwind CSS 4, Base UI 기반 shadcn components, Lucide, Vitest 4, Testing Library, axe-core

**Spec:** docs/superpowers/specs/2026-08-24-nearby-place-search-design.md

## Global Constraints

- Node 24.19.0과 pnpm 10.33.0을 사용한다.
- 구현 전에 apps/web/node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md를 다시 확인한다.
- DESIGN.md의 styles → components/ui → components/travel → components/patterns → features/app 소유권을 유지한다.
- 새 route, 전역 store, API, React Query, 지도 SDK와 새 npm dependency를 추가하지 않는다.
- 기존 apps/web/public/images와 lucide-react만 사용한다.
- 320px 이상, 최대 480px mobile surface, 44px touch target, safe area와 WCAG 2.2 AA 기준을 유지한다.
- 기존 dirty worktree는 사용자 작업이다. 무관한 파일을 수정, 정리, 복원하지 않는다.
- Git stage, commit, branch, worktree와 push는 별도 승인 없이 수행하지 않는다. 각 task는 commit 대신 diff checkpoint로 끝낸다.
- 모든 production behavior는 실패하는 테스트를 먼저 확인한 뒤 최소 구현한다.

## File Map

| File | Responsibility |
|---|---|
| apps/web/src/features/places/nearby-place-search-model.ts | 검색 결과 타입과 filter/sort 순수 함수 |
| apps/web/src/features/places/nearby-place-search.mock.ts | 이천 주변 장소 6개 mock |
| apps/web/src/components/travel/nearby-place-select-card.tsx | controlled 장소 선택 카드 |
| apps/web/src/components/patterns/nearby-place-search-screen.tsx | 검색 화면 전체 조합 |
| apps/web/src/features/courses/course-place-picker.tsx | query/category/sort/selected ID 상태 |
| apps/web/src/features/courses/course-edit-model.ts | 코스 장소 변환, 중복 제거, 시간 slot 추가 함수 |
| apps/web/src/features/courses/course-edit.mock.ts | 기존 즉시 추가 candidate 제거와 fixture 유지 |
| apps/web/src/features/courses/course-editor.tsx | 화면 전환과 active draft 반영 |

---

### Task 1: 주변 장소 검색 모델과 mock 데이터

**Files:**
- Create: apps/web/src/features/places/nearby-place-search-model.ts
- Create: apps/web/src/features/places/nearby-place-search.mock.ts
- Create: apps/web/tests/unit/features/places/nearby-place-search-model.test.ts

**Interfaces:**
- Consumes: DiscoveryImage
- Produces: NearbyPlaceResult, NearbyPlaceCategory, NearbyPlaceCategoryFilter, NearbyPlaceSort, filterAndSortNearbyPlaces, nearbyPlaceSearchMock

- [ ] **Step 1: 실패 테스트 작성**

~~~ts
it("matches trimmed query and applies category and sort", () => {
  expect(
    filterAndSortNearbyPlaces(places, {
      query: "  온천 ",
      category: "all",
      sort: "recommended",
    }).map(({ id }) => id),
  ).toEqual(["cafe"]);

  expect(
    filterAndSortNearbyPlaces(places, {
      query: "",
      category: "all",
      sort: "distance",
    }).map(({ id }) => id),
  ).toEqual(["rice", "cafe", "museum"]);

  expect(
    filterAndSortNearbyPlaces(places, {
      query: "",
      category: "all",
      sort: "rating",
    }).map(({ id }) => id),
  ).toEqual(["rice", "cafe", "museum"]);
});
~~~

The rating fixture gives rice and cafe the same rating and rice more reviews, proving the tie-break. Add a separate assertion that sorting does not mutate the input.

- [ ] **Step 2: RED 확인**

Run:

~~~bash
pnpm --filter @haetteum/web exec vitest run tests/unit/features/places/nearby-place-search-model.test.ts --reporter=dot
~~~

Expected: FAIL because the module and exports do not exist.

- [ ] **Step 3: 최소 타입과 함수 구현**

~~~ts
export type NearbyPlaceCategory =
  | "attraction"
  | "restaurant"
  | "cafe"
  | "accommodation";
export type NearbyPlaceCategoryFilter = "all" | NearbyPlaceCategory;
export type NearbyPlaceTravelMode = "car" | "walk";
export type NearbyPlaceSort = "recommended" | "distance" | "rating";

export type NearbyPlaceResult = {
  id: string;
  title: string;
  category: NearbyPlaceCategory;
  categoryLabel: string;
  distanceKm: number;
  travelMode: NearbyPlaceTravelMode;
  travelMinutes: number;
  description: string;
  rating: number;
  reviewCount: number;
  image: DiscoveryImage;
};

export function filterAndSortNearbyPlaces(
  places: readonly NearbyPlaceResult[],
  options: {
    query: string;
    category: NearbyPlaceCategoryFilter;
    sort: NearbyPlaceSort;
  },
) {
  const query = options.query.trim().toLocaleLowerCase("ko-KR");
  const filtered = places.filter((place) => {
    const text =
      (place.title + " " + place.description + " " + place.categoryLabel)
        .toLocaleLowerCase("ko-KR");
    return (
      (options.category === "all" || place.category === options.category) &&
      (!query || text.includes(query))
    );
  });

  if (options.sort === "distance") {
    return [...filtered].sort((a, b) => a.distanceKm - b.distanceKm);
  }
  if (options.sort === "rating") {
    return [...filtered].sort(
      (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
    );
  }
  return filtered;
}
~~~

- [ ] **Step 4: mock 6개 추가**

Create nearbyPlaceSearchMock with these stable IDs: icheon-city-museum, icheon-rice-breakfast, cafe-oncheon, termeden-resort, haeju-cold-noodles and icheon-ceramic-village. Use only current /images paths and enforce as const satisfies readonly NearbyPlaceResult[]. Add tests for unique IDs and image paths beginning with /images/.

- [ ] **Step 5: GREEN 및 checkpoint**

Run the focused test; expect all tests pass. Then run:

~~~bash
git status --short -- apps/web/src/features/places apps/web/tests/unit/features/places
~~~

Only Task 1 paths may appear as new changes.

---

### Task 2: 코스 변환과 90분 slot 생성

**Files:**
- Modify: apps/web/src/features/courses/course-edit-model.ts
- Modify: apps/web/src/features/courses/course-edit.mock.ts
- Modify: apps/web/tests/unit/features/courses/course-edit-model.test.ts

**Interfaces:**
- Consumes: NearbyPlaceResult
- Produces: toCoursePlace, appendUniqueCoursePlaces, appendFollowingTimeSlots

- [ ] **Step 1: 실패 테스트 추가**

~~~ts
it("appends only selected IDs not already in the course", () => {
  const current = courseEditMock.courses.ai.places;
  const selected = [nearbyPlaceSearchMock[0], nearbyPlaceSearchMock[2]];
  const next = appendUniqueCoursePlaces(current, selected);

  expect(next).toHaveLength(current.length + 1);
  expect(next.at(-1)).toMatchObject({
    id: "cafe-oncheon",
    title: "카페 온천",
    category: "카페",
  });
});

it("appends stable 90 minute slots", () => {
  const slots = courseEditMock.courses.ai.slots;
  const next = appendFollowingTimeSlots("ai", slots, 2, 90);

  expect(next.slice(-2)).toEqual([
    { id: "ai-slot-6", time: "18:00" },
    { id: "ai-slot-7", time: "19:30" },
  ]);
  expect(slots).toHaveLength(5);
});
~~~

Also assert invalid time, empty slots, non-positive count and midnight overflow return the original slots reference.

- [ ] **Step 2: RED 확인**

~~~bash
pnpm --filter @haetteum/web exec vitest run tests/unit/features/courses/course-edit-model.test.ts --reporter=dot
~~~

Expected: FAIL because the new functions are missing.

- [ ] **Step 3: 최소 구현**

~~~ts
export function toCoursePlace(place: NearbyPlaceResult): CoursePlace {
  return {
    id: place.id,
    title: place.title,
    category: place.categoryLabel,
    image: place.image,
  };
}

export function appendUniqueCoursePlaces(
  current: readonly CoursePlace[],
  selected: readonly NearbyPlaceResult[],
) {
  const currentIds = new Set(current.map(({ id }) => id));
  const additions = selected
    .filter(({ id }) => !currentIds.has(id))
    .map(toCoursePlace);
  return additions.length ? [...current, ...additions] : current;
}
~~~

Implement appendFollowingTimeSlots(source, slots, count, intervalMinutes). Parse strict HH:mm, append deterministic source-slot-N IDs, reject invalid input and any result at or after 24:00 by returning the original slots reference.

- [ ] **Step 4: 기존 candidate 계약 제거**

Remove CourseCandidate, EditableCourse.candidates, both fixture candidate arrays, handleAddPlace dependencies, and the old direct-candidate test. Preserve slot/place length and unique-ID fixture assertions.

- [ ] **Step 5: GREEN 및 checkpoint**

Run the focused model test. Then confirm no pattern or route file changed in Task 2.

---

### Task 3: 재사용 가능한 장소 선택 카드

**Files:**
- Create: apps/web/src/components/travel/nearby-place-select-card.tsx
- Create: apps/web/tests/unit/components/travel/nearby-place-select-card.test.tsx

**Interfaces:**
- Consumes: NearbyPlaceResult, existing RatingSummary, Button, Badge, next/image
- Produces: NearbyPlaceSelectCard({ place, selected, unavailable, onSelectedChange })

- [ ] **Step 1: 실패 테스트 작성**

~~~tsx
it("renders place facts and toggles a selectable place", async () => {
  const user = userEvent.setup();
  const onSelectedChange = vi.fn();
  render(
    <NearbyPlaceSelectCard
      place={nearbyPlaceSearchMock[2]}
      selected={false}
      unavailable={false}
      onSelectedChange={onSelectedChange}
    />,
  );

  expect(screen.getByRole("article", { name: "카페 온천" })).toBeVisible();
  expect(screen.getByText("1.2km · 차로 4분")).toBeVisible();
  const control = screen.getByRole("button", { name: "카페 온천 선택" });
  expect(control).toHaveAttribute("aria-pressed", "false");
  await user.click(control);
  expect(onSelectedChange).toHaveBeenCalledWith(true);
});

it("disables a place already in the course", () => {
  render(
    <NearbyPlaceSelectCard
      place={nearbyPlaceSearchMock[0]}
      selected={false}
      unavailable
      onSelectedChange={vi.fn()}
    />,
  );

  expect(screen.getByText("추가됨")).toBeVisible();
  expect(
    screen.getByRole("button", {
      name: "이천 시립박물관 이미 일정에 추가됨",
    }),
  ).toBeDisabled();
});
~~~

- [ ] **Step 2: RED 확인**

~~~bash
pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/nearby-place-select-card.test.tsx --reporter=dot
~~~

Expected: FAIL because the component does not exist.

- [ ] **Step 3: 최소 카드 구현**

Use an article with an 80px image column, flexible text column and 44px action. Use Badge, RatingSummary and a controlled Button. The button label is title + 선택, 선택 해제, or 이미 일정에 추가됨. Use Plus and Check icons. Show 추가됨 text for unavailable places.

- [ ] **Step 4: selected rerender test**

Rerender with selected=true and assert the accessible name, aria-pressed=true and check icon. Do not assert Tailwind source strings.

- [ ] **Step 5: GREEN, lint and checkpoint**

~~~bash
pnpm --filter @haetteum/web exec vitest run tests/unit/components/travel/nearby-place-select-card.test.tsx --reporter=dot
pnpm --filter @haetteum/web exec eslint src/components/travel/nearby-place-select-card.tsx tests/unit/components/travel/nearby-place-select-card.test.tsx
~~~

Expected: both exit 0.

---

### Task 4: Controlled 주변 장소 검색 화면

**Files:**
- Create: apps/web/src/components/patterns/nearby-place-search-screen.tsx
- Create: apps/web/tests/unit/components/patterns/nearby-place-search-screen.test.tsx

**Interfaces:**
- Consumes: Task 1 types, NearbyPlaceSelectCard, Input, ToggleGroup, Select, Button
- Produces: NearbyPlaceSearchScreenProps and NearbyPlaceSearchScreen

- [ ] **Step 1: 실패 테스트 작성**

~~~tsx
it("renders regions and disables confirm with no selection", () => {
  render(<NearbyPlaceSearchScreen {...defaultProps} />);

  expect(
    screen.getByRole("heading", { name: "주변 장소 검색" }),
  ).toBeVisible();
  expect(
    screen.getByRole("searchbox", { name: "주변 장소 검색어" }),
  ).toBeVisible();
  expect(
    screen.getByRole("group", { name: "장소 카테고리" }),
  ).toBeVisible();
  expect(
    screen.getByRole("list", { name: "주변 추천 장소" }),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "선택한 장소 추가하기 0" }),
  ).toBeDisabled();
});

it("forwards search, category, sort and map actions", async () => {
  const user = userEvent.setup();
  render(<NearbyPlaceSearchScreen {...defaultProps} />);

  await user.type(
    screen.getByRole("searchbox", { name: "주변 장소 검색어" }),
    "카페",
  );
  expect(defaultProps.onQueryChange).toHaveBeenLastCalledWith("카페");

  await user.click(screen.getByRole("radio", { name: "카페" }));
  expect(defaultProps.onCategoryChange).toHaveBeenCalledWith("cafe");

  await user.click(screen.getByRole("button", { name: "지도" }));
  expect(defaultProps.onMapRequest).toHaveBeenCalledOnce();
});
~~~

Add empty-result and selected-count cases.

- [ ] **Step 2: RED 확인**

~~~bash
pnpm --filter @haetteum/web exec vitest run tests/unit/components/patterns/nearby-place-search-screen.test.tsx --reporter=dot
~~~

Expected: FAIL because the component does not exist.

- [ ] **Step 3: 화면 최소 구현**

Define controlled props for query, category, sort, places, selectedIds, unavailableIds, status and all callbacks. Compose header, search Input, single ToggleGroup, Select, list/empty state, polite status and fixed safe-area CTA. ToggleGroup values follow the existing array API:

~~~tsx
<ToggleGroup
  type="single"
  aria-label="장소 카테고리"
  value={[category]}
  onValueChange={(values) => {
    const next = values[0];
    if (next) onCategoryChange(next as NearbyPlaceCategoryFilter);
  }}
>
  {categoryOptions.map((option) => (
    <ToggleGroupItem
      key={option.id}
      value={option.id}
      role="radio"
      aria-checked={category === option.id}
    >
      {option.label}
    </ToggleGroupItem>
  ))}
</ToggleGroup>
~~~

- [ ] **Step 4: axe 테스트**

Run axe.run(container) against the default screen and require an empty violations array. Disable only the JSDOM canvas-dependent color-contrast rule, then verify real token contrast during browser visual QA.

- [ ] **Step 5: GREEN, lint and boundary checkpoint**

Run focused test and ESLint. Confirm the pattern imports neither the mock module nor next/navigation.

---

### Task 5: CoursePlacePicker와 CourseEditor 통합

**Files:**
- Create: apps/web/src/features/courses/course-place-picker.tsx
- Modify: apps/web/src/features/courses/course-editor.tsx
- Modify: apps/web/tests/unit/components/patterns/course-edit-screen.test.tsx

**Interfaces:**
- Consumes: nearbyPlaceSearchMock, filterAndSortNearbyPlaces, NearbyPlaceSearchScreen and Task 2 helpers
- Produces: CoursePlacePicker and working edit/place-search flow

- [ ] **Step 1: 기존 직접 추가 테스트를 흐름 테스트로 교체**

~~~tsx
it("opens the nearby picker without changing the draft", async () => {
  const user = userEvent.setup();
  render(<CourseEditor course={courseEditMock} />);

  await user.click(screen.getByRole("button", { name: "장소 추가하기" }));

  expect(
    screen.getByRole("heading", { name: "주변 장소 검색" }),
  ).toBeVisible();
  expect(
    screen.queryByRole("heading", { name: "일정 수정" }),
  ).not.toBeInTheDocument();
});

it("selects multiple places and appends them to the active course", async () => {
  const user = userEvent.setup();
  render(<CourseEditor course={courseEditMock} />);
  await user.click(screen.getByRole("button", { name: "장소 추가하기" }));

  await user.click(screen.getByRole("button", { name: "카페 온천 선택" }));
  await user.click(
    screen.getByRole("button", { name: "테르메덴 리조트 선택" }),
  );
  await user.click(
    screen.getByRole("button", { name: "선택한 장소 추가하기 2" }),
  );

  const itinerary = screen.getByRole("list", {
    name: "AI 추천 코스 일정",
  });
  expect(within(itinerary).getAllByRole("listitem")).toHaveLength(7);
  expect(within(itinerary).getByText("18:00")).toBeVisible();
  expect(within(itinerary).getByText("19:30")).toBeVisible();
  expect(
    screen.getByRole("status", { name: "일정 편집 상태" }),
  ).toHaveTextContent("장소 2개를 일정에 추가했습니다.");
});
~~~

Add cancel/discard, unavailable duplicate and AI/custom independence cases.

- [ ] **Step 2: RED 확인**

~~~bash
pnpm --filter @haetteum/web exec vitest run tests/unit/components/patterns/course-edit-screen.test.tsx --reporter=dot
~~~

Expected: the new picker tests fail while unchanged drag/reset tests still pass.

- [ ] **Step 3: CoursePlacePicker 최소 구현**

Use state for query, category, sort, selectedIds array and status. Keep selection order by appending/removing IDs. Pass a Set to the screen, but map confirmed IDs back through the original places array in selectedIds order. Map action sets 지도 보기는 준비 중이에요.

- [ ] **Step 4: CourseEditor integration**

Add step state. Render CoursePlacePicker for place-search and CourseEditScreen otherwise. Pass current active IDs as unavailableIds. On confirm:

1. append unique places;
2. derive actual added count;
3. append the same number of 90-minute slots;
4. update only drafts[source];
5. announce 장소 N개를 일정에 추가했습니다.;
6. return to edit.

Change onAddPlace to enter place-search. Remove direct candidate behavior.

- [ ] **Step 5: GREEN, lint and checkpoint**

Run the focused screen integration test and ESLint for all Task 5 paths. Confirm no route, backend, package manifest or lockfile changed.

---

### Task 6: 전체 검증과 시각 QA

**Files:**
- Modify after implementation passes: DESIGN.md
- Create or append without erasing other work: design-qa.md

**Interfaces:**
- Consumes: Tasks 1 through 5
- Produces: verified feature and current design-system status

- [ ] **Step 1: 관련 테스트 전체 실행**

~~~bash
pnpm --filter @haetteum/web exec vitest run   tests/unit/features/places/nearby-place-search-model.test.ts   tests/unit/features/courses/course-edit-model.test.ts   tests/unit/components/travel/nearby-place-select-card.test.tsx   tests/unit/components/patterns/nearby-place-search-screen.test.tsx   tests/unit/components/patterns/course-edit-screen.test.tsx   --reporter=dot
~~~

Expected: every listed file passes.

- [ ] **Step 2: 전체 web lint와 test**

~~~bash
pnpm --filter @haetteum/web lint
pnpm --filter @haetteum/web test
~~~

Expected: both exit 0. If an unrelated dirty-worktree test fails, report its exact name and keep unrelated code unchanged.

- [ ] **Step 3: production build**

Verify no active next dev writes the same apps/web/.next, then run:

~~~bash
pnpm --filter @haetteum/web build
~~~

Expected: exit 0 and the course edit route builds.

- [ ] **Step 4: local responsive interaction QA**

Use a free explicit port. At 390px and 320px, verify:

- no horizontal overflow;
- header, search, chips, sort, cards and fixed CTA follow the reference hierarchy;
- the last card scrolls above the CTA;
- selection count moves 0 → 1 → 2;
- confirm returns with 18:00 and 19:30 slots;
- every control has keyboard focus and a visible focus ring.

- [ ] **Step 5: design QA report**

Capture reference and local picker at the same viewport. Update design-qa.md with P0 through P3 findings. Preserve unrelated existing report content. Set final result: passed only after every P0, P1 and P2 is fixed.

- [ ] **Step 6: DESIGN.md actual-state update**

Only after verification, add NearbyPlaceSelectCard to implemented travel components and NearbyPlaceSearchScreen to implemented patterns. Record that CoursePlacePicker owns transient mock state and no API, route or store was added.

- [ ] **Step 7: final safety check**

~~~bash
git diff --check
git status --short
~~~

Read complete outputs. Report exactly which commands passed, any unrelated failures, visual QA status and files changed. Do not stage or commit.
