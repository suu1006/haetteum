# Course Edit Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first mock course edit route where users reorder itinerary cards vertically with pointer, touch, or keyboard input.

**Architecture:** Keep the dynamic route and mock lookup in a Server Component, then pass serializable course data into a narrow Client Component that owns tabs and in-memory ordering. Reuse existing Icheon course image assets, place generic rendering under `components/travel`, screen composition under `components/patterns`, and pure state transforms under `features/courses`.

**Tech Stack:** Next.js 16.3.1 App Router, React 19.2.8, TypeScript, Tailwind CSS 4, `@dnd-kit/core` 6.3.1, `@dnd-kit/sortable` 10.0.0, `@dnd-kit/utilities` 3.2.2, Vitest, Testing Library, axe-core.

**Spec:** `docs/superpowers/specs/2026-08-24-course-edit-screen-design.md`

## Global Constraints

- The only public mock route is `/courses/icheon-day-trip/edit`; unknown IDs call `notFound()`.
- Keep the existing `코스 수정하기` button disabled and unlinked in this implementation.
- Use typed local mock data only; do not add API, DB, persistence, auth, React Query, or Zustand state.
- Time slots stay fixed while places move between them.
- Keep Pointer and keyboard sorting equivalent and announce completed moves through `aria-live`.
- Use existing assets already referenced by `placeCourseDetails`; do not generate or add duplicate course images.
- Preserve the current dirty worktree and do not stage, commit, branch, create a worktree, or push.
- Read Next.js 16 local docs before code changes; route `params` is a Promise and interactive state belongs in a narrow Client Component.

---

## File Map

- Create `apps/web/src/features/courses/course-edit-model.ts` — types and pure ordering helpers.
- Create `apps/web/src/features/courses/course-edit.mock.ts` — AI/custom course fixtures and lookup.
- Create `apps/web/src/features/courses/course-editor.tsx` — Client Component state and dnd orchestration.
- Create `apps/web/src/components/travel/sortable-itinerary-card.tsx` — one sortable time/card row.
- Create `apps/web/src/components/patterns/course-edit-screen.tsx` — screen shell, header, tabs, list, actions.
- Create `apps/web/src/app/courses/[courseId]/edit/page.tsx` — metadata, static param and mock lookup.
- Create `apps/web/src/app/courses/[courseId]/edit/not-found.tsx` — scoped recovery screen.
- Create `apps/web/tests/unit/features/courses/course-edit-model.test.ts` — pure helper and fixture tests.
- Create `apps/web/tests/unit/components/patterns/course-edit-screen.test.tsx` — rendered interaction and accessibility tests.
- Create `apps/web/tests/unit/app/course-edit-page.test.tsx` — route contract tests.
- Modify `apps/web/package.json` and `pnpm-lock.yaml` — sortable dependencies only.
- Create `design-qa.md` — source-versus-rendered visual verdict.

### Task 1: Course editing model and mock fixtures

**Files:**
- Create: `apps/web/src/features/courses/course-edit-model.ts`
- Create: `apps/web/src/features/courses/course-edit.mock.ts`
- Test: `apps/web/tests/unit/features/courses/course-edit-model.test.ts`

**Interfaces:**
- Produces: `CourseSource`, `CoursePlace`, `CourseTimeSlot`, `EditableCourse`, `CourseOrders`, `movePlace(places, activeId, overId)`, `appendPlace(places, candidate)`, `formatMoveAnnouncement(place, index)`, `courseEditMock`, `getEditableCourseById(courseId)`.
- Consumes: image paths and labels already present in `features/places/place-detail.mock.ts`, copied into an independent edit fixture to avoid feature-to-feature runtime coupling.

- [ ] **Step 1: Write failing pure-model tests**

```ts
expect(movePlace(ai.places, "seolbong-park", "icheon-rice-breakfast").map(({ id }) => id))
  .toEqual(["seolbong-park", "icheon-rice-breakfast", "icheon-termeden", "icheon-city-museum", "haeju-cold-noodles"]);
expect(movePlace(ai.places, "missing", "icheon-termeden")).toBe(ai.places);
expect(formatMoveAnnouncement(ai.places[2], 0)).toBe("설봉공원이 1번째 일정으로 이동했습니다.");
expect(getEditableCourseById("missing-course")).toBeUndefined();
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm --filter @haetteum/web test -- tests/unit/features/courses/course-edit-model.test.ts`

Expected: FAIL because the course model and fixture modules do not exist.

- [ ] **Step 3: Implement immutable ordering helpers and typed fixtures**

```ts
export function movePlace(
  places: readonly CoursePlace[],
  activeId: string,
  overId: string,
): readonly CoursePlace[] {
  const from = places.findIndex(({ id }) => id === activeId);
  const to = places.findIndex(({ id }) => id === overId);
  if (from < 0 || to < 0 || from === to) return places;
  const next = [...places];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
```

Use the five approved AI stops and a separate five-stop custom order. Provide at least one extra candidate place for the add action. Ensure every source has matching initial slots and places.

- [ ] **Step 4: Run focused model tests and verify GREEN**

Run: `pnpm --filter @haetteum/web test -- tests/unit/features/courses/course-edit-model.test.ts`

Expected: PASS for reorder, invalid move identity, announcement, fixture uniqueness and lookup.

### Task 2: Route contract and sortable dependencies

**Files:**
- Create: `apps/web/src/app/courses/[courseId]/edit/page.tsx`
- Create: `apps/web/src/app/courses/[courseId]/edit/not-found.tsx`
- Test: `apps/web/tests/unit/app/course-edit-page.test.tsx`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `getEditableCourseById(courseId)` and `courseEditMock.id` from Task 1.
- Produces: `generateStaticParams()`, `generateMetadata({ params })`, the public page component and a scoped 404 recovery link.

- [ ] **Step 1: Add exact sortable dependencies**

Run: `pnpm --filter @haetteum/web add @dnd-kit/core@6.3.1 @dnd-kit/sortable@10.0.0 @dnd-kit/utilities@3.2.2`

Expected: only `apps/web/package.json` and `pnpm-lock.yaml` gain the three packages.

- [ ] **Step 2: Write failing route tests**

```tsx
expect(generateStaticParams()).toEqual([{ courseId: "icheon-day-trip" }]);
await expect(generateMetadata({ params: Promise.resolve({ courseId: "icheon-day-trip" }) }))
  .resolves.toMatchObject({ title: "이천 하루 코스 일정 수정 | 해뜸" });
render(await CourseEditPage({ params: Promise.resolve({ courseId: "icheon-day-trip" }) }));
expect(screen.getByRole("heading", { name: "일정 수정" })).toBeVisible();
await expect(CourseEditPage({ params: Promise.resolve({ courseId: "missing" }) }))
  .rejects.toThrow("NEXT_NOT_FOUND");
```

- [ ] **Step 3: Run the route test and verify RED**

Run: `pnpm --filter @haetteum/web test -- tests/unit/app/course-edit-page.test.tsx`

Expected: FAIL because the route and screen modules do not exist.

- [ ] **Step 4: Implement the Server Component route**

```tsx
export async function generateStaticParams() {
  return [{ courseId: "icheon-day-trip" }];
}

export default async function CourseEditPage({ params }: PageProps<"/courses/[courseId]/edit">) {
  const { courseId } = await params;
  const course = getEditableCourseById(courseId);
  if (!course) notFound();
  return <CourseEditor course={course} />;
}
```

The scoped not-found page must show `코스를 찾을 수 없어요` and link back to `/` with label `여행 탐색으로 돌아가기`.

- [ ] **Step 5: Leave the route test red only for missing UI**

Run: `pnpm --filter @haetteum/web test -- tests/unit/app/course-edit-page.test.tsx`

Expected: module resolution succeeds; rendering can remain red until Tasks 3–4 provide `CourseEditor`.

### Task 3: Static screen composition matching the reference

**Files:**
- Create: `apps/web/src/components/travel/sortable-itinerary-card.tsx`
- Create: `apps/web/src/components/patterns/course-edit-screen.tsx`
- Test: `apps/web/tests/unit/components/patterns/course-edit-screen.test.tsx`

**Interfaces:**
- Consumes: `CoursePlace`, `CourseTimeSlot`, controlled tab/order values and event callbacks.
- Produces: `SortableItineraryCard(props)` and `CourseEditScreen(props)` with no mock lookup or persistence.

- [ ] **Step 1: Write failing reference-order and accessibility tests**

```tsx
expect(screen.getAllByTestId("course-edit-region").map((node) => node.dataset.region))
  .toEqual(["header", "tabs", "instructions", "itinerary", "actions"]);
expect(screen.getAllByRole("listitem")).toHaveLength(5);
expect(screen.getByRole("button", { name: "임금님쌀밥집 일정 이동" })).toBeVisible();
expect(screen.getByRole("tab", { name: "AI 추천 코스" })).toHaveAttribute("aria-selected", "true");
```

- [ ] **Step 2: Run the screen test and verify RED**

Run: `pnpm --filter @haetteum/web test -- tests/unit/components/patterns/course-edit-screen.test.tsx`

Expected: FAIL because the pattern and travel card modules do not exist.

- [ ] **Step 3: Implement the card layout**

Render each row as a fixed time column, route marker/line, and white card. Use `next/image` with `fill`, a fixed `size-16` positioned parent and `sizes="64px"`. Apply sortable transform with `CSS.Transform.toString(transform)` and a transition from `useSortable`. Put listeners only on a minimum-44px grip button.

- [ ] **Step 4: Implement the controlled screen shell**

Provide explicit props for active source, slots, places, status text and callbacks. Render the exact labels `일정 수정`, `초기화`, `AI 추천 코스`, `내가 만든 코스`, `드래그해서 순서를 변경하거나, '+' 버튼으로 장소를 추가하세요`, `장소 추가하기`, `일정 다시 구성하기`. Add bottom safe-area reserve and a polite screen-reader status region.

- [ ] **Step 5: Run static screen and axe tests**

Run: `pnpm --filter @haetteum/web test -- tests/unit/components/patterns/course-edit-screen.test.tsx`

Expected: PASS for region order, labels, list semantics, 44px controls and axe with color-contrast disabled in jsdom.

### Task 4: Client state, tab behavior and drag sorting

**Files:**
- Create: `apps/web/src/features/courses/course-editor.tsx`
- Modify: `apps/web/tests/unit/components/patterns/course-edit-screen.test.tsx`
- Modify: `apps/web/tests/unit/app/course-edit-page.test.tsx`

**Interfaces:**
- Consumes: Task 1 helpers/fixtures and Task 3 controlled `CourseEditScreen`.
- Produces: `CourseEditor({ course })`, independent AI/custom orders, reset/add/reconfigure actions and `DndContext` handlers.

- [ ] **Step 1: Add failing behavior tests**

```tsx
await user.click(screen.getByRole("tab", { name: "내가 만든 코스" }));
expect(screen.getByRole("tab", { name: "내가 만든 코스" })).toHaveAttribute("aria-selected", "true");
await user.click(screen.getByRole("button", { name: "장소 추가하기" }));
expect(screen.getAllByRole("listitem")).toHaveLength(6);
await user.click(screen.getByRole("button", { name: "초기화" }));
expect(screen.getAllByRole("listitem")).toHaveLength(5);
```

Add a focused test that calls the exported drag-end adapter with `active.id="seolbong-park"` and `over.id="icheon-rice-breakfast"`, then asserts the first rendered time row contains 설봉공원 and the live announcement names its first position.

- [ ] **Step 2: Run behavior tests and verify RED**

Run: `pnpm --filter @haetteum/web test -- tests/unit/components/patterns/course-edit-screen.test.tsx tests/unit/app/course-edit-page.test.tsx`

Expected: FAIL because client state handlers are not implemented.

- [ ] **Step 3: Implement independent source state**

Initialize a record keyed by `ai` and `custom`. Switching tabs changes only the visible source. Reset clones the active source's initial places. Add appends the first unused candidate and creates its next time slot. Reconfigure maps the active places through the fixture's deterministic recommended ID order.

- [ ] **Step 4: Implement dnd sensors and completion handling**

```tsx
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
);

function handleDragEnd({ active, over }: DragEndEvent) {
  if (!over) return;
  setOrders((current) => ({
    ...current,
    [source]: movePlace(current[source], String(active.id), String(over.id)),
  }));
}
```

Use `closestCenter`, `verticalListSortingStrategy`, `DragOverlay` only if the base transform cannot match the reference, and `screenReaderInstructions`/live status in Korean.

- [ ] **Step 5: Run focused route and interaction tests**

Run: `pnpm --filter @haetteum/web test -- tests/unit/features/courses/course-edit-model.test.ts tests/unit/components/patterns/course-edit-screen.test.tsx tests/unit/app/course-edit-page.test.tsx`

Expected: PASS.

### Task 5: Full verification and visual QA

**Files:**
- Create: `design-qa.md`
- Modify only P0/P1/P2 issues in the course edit files above.

**Interfaces:**
- Consumes: finished route and the attached 532×1018 reference.
- Produces: a running local preview, captured initial and active-drag states, and `design-qa.md` containing `final result: passed`.

- [ ] **Step 1: Run targeted static checks**

Run: `pnpm --filter @haetteum/web exec eslint src/app/courses src/features/courses src/components/patterns/course-edit-screen.tsx src/components/travel/sortable-itinerary-card.tsx tests/unit/app/course-edit-page.test.tsx tests/unit/features/courses/course-edit-model.test.ts tests/unit/components/patterns/course-edit-screen.test.tsx`

Run: `git diff --check -- apps/web/package.json pnpm-lock.yaml apps/web/src/app/courses apps/web/src/features/courses apps/web/src/components/patterns/course-edit-screen.tsx apps/web/src/components/travel/sortable-itinerary-card.tsx apps/web/tests/unit/app/course-edit-page.test.tsx apps/web/tests/unit/features/courses/course-edit-model.test.ts apps/web/tests/unit/components/patterns/course-edit-screen.test.tsx docs/superpowers/specs/2026-08-24-course-edit-screen-design.md docs/superpowers/plans/2026-08-24-course-edit-screen.md design-qa.md`

Expected: both commands exit 0.

- [ ] **Step 2: Run the full web test suite and build**

Run: `pnpm --filter @haetteum/web test`

Run: `pnpm --filter @haetteum/web build`

Expected: both commands exit 0. If an unrelated dirty-tree failure exists, record it separately with exact evidence and keep focused course tests green.

- [ ] **Step 3: Start the existing app without changing runtime configuration**

Run: `pnpm --filter @haetteum/web dev`

Open `/courses/icheon-day-trip/edit` in the Codex in-app browser at 532×1018 CSS pixels. Keep the preview running.

- [ ] **Step 4: Verify the core journey in the browser**

Confirm initial order, Pointer drag from 설봉공원 to the first slot, keyboard reorder, tab switch, reset, add and reconfigure. Inspect the browser console after interaction and require no uncaught errors.

- [ ] **Step 5: Complete design QA**

Compare the attached reference and latest rendered capture at the same viewport. Record spacing, typography, borders, radii, thumbnail crop, fixed action area and drag-state differences in `design-qa.md`. Fix every P0/P1/P2, recapture, and repeat until the file says `final result: passed`. Leave any P3-only polish as iteration notes.
