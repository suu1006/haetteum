# Haetteum Design System Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Haetteum의 primitive/semantic 토큰과 타이포그래피를 구축하고, Base UI 기반 shadcn Rhea의 Button, Toggle, ToggleGroup, Card를 모바일 제품 규칙에 맞게 제공한다.

**Architecture:** `src/styles`가 디자인 토큰의 단일 원본을 소유하고 `src/app/globals.css`는 이를 조립한다. `src/components/ui`는 shadcn 생성 코드를 기반으로 범용 접근성과 variant만 제공하며, 개발 환경 전용 `/design-system` route가 모든 Foundation 상태를 실제 조합으로 보여준다.

**Tech Stack:** Next.js 16.3.1 App Router, React 19.2.8, TypeScript 5, Tailwind CSS 4, shadcn/ui Base UI + Rhea, Pretendard Variable, Vitest, React Testing Library, axe-core

**Spec:** `DESIGN.md`

## Global Constraints

- 모바일 우선, 라이트 모드, 단일 브랜드만 구현한다.
- Primary purple `#6F3DE5`는 CTA, 선택 상태, 활성 경로와 핵심 강조에만 사용한다.
- 기본 터치 영역은 44×44px 이상이고 하단 주요 CTA는 52px 높이다.
- `components/ui`에는 여행 API 타입, 페이지 데이터 요청, 화면별 조건문을 넣지 않는다.
- primitive와 semantic token의 단일 원본은 `src/styles/tokens.css`다.
- Tailwind CSS 4의 CSS-first 설정을 사용하고 `tailwind.config`를 만들지 않는다.
- `/design-system` route는 개발 환경에서만 내용을 노출한다.
- dark mode, 실제 제품 페이지, 여행 도메인 컴포넌트는 이번 범위에 포함하지 않는다.
- shadcn CLI 생성 코드와 테스트 설정은 generated/configuration 작업으로 취급한다. Haetteum 전용 component API와 variant는 실패 테스트 후 구현한다.
- 사용자가 요청하지 않은 commit, push, branch 생성은 하지 않는다.

## File Structure

- `components.json`: Base UI, Rhea, neutral, CSS variables와 import alias를 고정한다.
- `package.json`, `pnpm-lock.yaml`: shadcn runtime과 Vitest/RTL/axe 개발 의존성을 기록한다.
- `vitest.config.mts`: jsdom, React, `@/*` alias, setup file을 연결한다.
- `src/test/setup.ts`: jest-dom matcher와 RTL cleanup을 설정한다.
- `src/styles/tokens.css`: primitive, semantic, Tailwind theme bridge, radius, shadow, motion token을 소유한다.
- `src/styles/typography.css`: Pretendard font import, type role utility와 텍스트 렌더링 기준을 소유한다.
- `src/styles/safe-area.css`: safe-area utility와 sticky surface inset 규칙을 소유한다.
- `src/app/globals.css`: Tailwind와 세 style 파일을 불러오고 최소 전역 reset만 적용한다.
- `src/lib/utils.ts`: shadcn 컴포넌트용 `cn()` helper를 제공한다.
- `src/components/ui/button.tsx`: Haetteum Button variant, 36/44/52px 크기, icon 크기를 제공한다.
- `src/components/ui/toggle.tsx`: 선택 상태를 두 가지 이상의 시각 신호로 표현한다.
- `src/components/ui/toggle-group.tsx`: 연결형과 독립 필터형 그룹을 모두 합성한다.
- `src/components/ui/card.tsx`: 16px spacing과 default/sm density를 제공한다.
- `src/components/ui/components.test.tsx`: Foundation component의 사용자 관찰 가능 상태를 검증한다.
- `src/components/design-system/design-system-preview.tsx`: Foundation 상태를 조합한 실제 확인 surface다.
- `src/components/design-system/design-system-preview.test.tsx`: preview의 문서 구조와 접근성을 검증한다.
- `src/app/design-system/page.tsx`: development 환경에서 preview를 노출하고 production에서는 `notFound()`를 호출한다.

---

### Task 1: shadcn Rhea와 테스트 기반 구성

**Files:**
- Create: `components.json`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Create: `vitest.config.mts`
- Create: `src/test/setup.ts`
- Generate: `src/lib/utils.ts`
- Generate: `src/components/ui/button.tsx`
- Generate: `src/components/ui/toggle.tsx`
- Generate: `src/components/ui/toggle-group.tsx`
- Generate: `src/components/ui/card.tsx`

**Interfaces:**
- Consumes: existing Next.js 16.3.1 App Router and Tailwind CSS 4 setup
- Produces: `cn(...inputs: ClassValue[]): string`, shadcn Base UI components, `pnpm test`

- [x] **Step 1: Initialize shadcn with the approved preset**

Run:

```bash
pnpm dlx shadcn@latest init --template next --base base --preset rhea --css-variables --yes
pnpm dlx shadcn@latest add button toggle toggle-group card --yes
```

Expected: `components.json` identifies the Base UI Rhea style, `src/lib/utils.ts` exists, and only the four requested UI components are added.

- [x] **Step 2: Install the self-hosted font and test dependencies**

Run:

```bash
pnpm add pretendard
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event axe-core
```

Expected: dependencies and lockfile update without peer dependency errors.

- [x] **Step 3: Add the test script and Vitest configuration**

Add `"test": "vitest run"` to `package.json` and create `vitest.config.mts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
```

- [x] **Step 4: Verify the generated/configuration baseline**

Run:

```bash
pnpm test
pnpm lint
```

Expected: Vitest reports no test files yet without configuration errors; ESLint exits 0.

---

### Task 2: Design tokens and Foundation component contracts

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/typography.css`
- Create: `src/styles/safe-area.css`
- Modify: `src/app/globals.css`
- Modify: `src/components/ui/button.tsx`
- Modify: `src/components/ui/toggle.tsx`
- Modify: `src/components/ui/toggle-group.tsx`
- Modify: `src/components/ui/card.tsx`
- Create: `src/components/ui/components.test.tsx`

**Interfaces:**
- Consumes: shadcn generated Base UI components and `cn()`
- Produces: semantic Tailwind utilities and the Button/Toggle/ToggleGroup/Card public APIs documented in `DESIGN.md`

- [x] **Step 1: Write failing tests for the Haetteum component contract**

Create `src/components/ui/components.test.tsx` with real component renders that verify:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

describe("Button", () => {
  it("uses the 44px mobile control as its default size", () => {
    render(<Button>코스 보기</Button>);
    expect(screen.getByRole("button", { name: "코스 보기" })).toHaveClass("h-11");
  });

  it("provides the 52px primary action size", () => {
    render(<Button size="lg">코스 수정하기</Button>);
    expect(screen.getByRole("button", { name: "코스 수정하기" })).toHaveClass("h-13");
  });

  it("keeps disabled actions natively unavailable", () => {
    render(<Button disabled>저장하기</Button>);
    expect(screen.getByRole("button", { name: "저장하기" })).toBeDisabled();
  });
});

describe("Toggle", () => {
  it("exposes its pressed state and changes it on activation", async () => {
    const user = userEvent.setup();
    render(<Toggle aria-label="즐겨찾기">저장</Toggle>);
    const toggle = screen.getByRole("button", { name: "즐겨찾기" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });
});

describe("ToggleGroup", () => {
  it("allows one region filter to be selected", async () => {
    const user = userEvent.setup();
    render(
      <ToggleGroup aria-label="지역 선택" type="single">
        <ToggleGroupItem value="seoul">서울</ToggleGroupItem>
        <ToggleGroupItem value="busan">부산</ToggleGroupItem>
      </ToggleGroup>,
    );
    await user.click(screen.getByRole("button", { name: "서울" }));
    expect(screen.getByRole("button", { name: "서울" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "부산" })).toHaveAttribute("aria-pressed", "false");
  });
});

describe("Card", () => {
  it("keeps title and content as semantic card parts", () => {
    render(
      <Card>
        <CardTitle>성산일출봉</CardTitle>
        <CardContent>제주 동부의 대표 여행지</CardContent>
      </Card>,
    );
    expect(screen.getByText("성산일출봉")).toHaveAttribute("data-slot", "card-title");
    expect(screen.getByText("제주 동부의 대표 여행지")).toHaveAttribute("data-slot", "card-content");
  });
});
```

Install `@testing-library/user-event` if it was not included transitively:

```bash
pnpm add -D @testing-library/user-event
```

- [x] **Step 2: Run the component tests and confirm the Haetteum sizes fail**

Run:

```bash
pnpm test src/components/ui/components.test.tsx
```

Expected: the default generated Button does not yet satisfy `h-11` and `h-13`; the failure proves the mobile size contract is not implemented.

- [x] **Step 3: Implement token, typography and safe-area styles**

Create the three focused style files from the approved values in `DESIGN.md`. `src/app/globals.css` must import them in this order:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
@import "../styles/tokens.css";
@import "../styles/typography.css";
@import "../styles/safe-area.css";
```

Use `@theme inline` in `tokens.css` to expose `background`, `foreground`, `card`, `primary`, `muted`, `border`, `ring`, `destructive`, `rating`, `current-location`, and `route-line` utilities. Apply light-only document defaults and `prefers-reduced-motion` safeguards without adding a dark theme.

- [x] **Step 4: Implement the minimal component variants**

Update only the generated CVA classes and public size/variant values:

- Button: `sm=h-9`, `default=h-11`, `lg=h-13`, `icon=size-11`, `icon-sm=size-9`, plus `glass`.
- Toggle: matching 36/44/52px heights and selected background + font weight/border signal.
- ToggleGroup: preserve Base UI semantics and allow `spacing={0}` for connected segments.
- Card: 16px default spacing, 12px small spacing, 16px radius, thin semantic border/ring.

- [x] **Step 5: Run the focused test to green**

Run:

```bash
pnpm test src/components/ui/components.test.tsx
```

Expected: all Foundation component contract tests pass with no act or accessibility warnings.

---

### Task 3: Development-only design-system preview and full verification

**Files:**
- Create: `src/components/design-system/design-system-preview.tsx`
- Create: `src/components/design-system/design-system-preview.test.tsx`
- Create: `src/app/design-system/page.tsx`

**Interfaces:**
- Consumes: the four Foundation components and semantic Tailwind utilities
- Produces: development-only `/design-system` route and an accessibility regression test

- [x] **Step 1: Write a failing integration test for the preview**

Create `src/components/design-system/design-system-preview.test.tsx` with a caught dynamic import so the missing module produces an assertion failure rather than a test-runner resolution error. Once the module exists, render the real preview component, verify the `Haetteum 디자인 시스템` level-one heading and named sections, and call `axe.run(container)` from `axe-core`. Assert `results.violations` is an empty array.

- [x] **Step 2: Run the preview test and confirm the module contract fails because the component is missing**

Run:

```bash
pnpm test src/components/design-system/design-system-preview.test.tsx
```

Expected: the dynamic import is caught and the explicit module-contract assertion fails because `DesignSystemPreview` has not been implemented. The test process itself must not fail with an unresolved-module error.

- [x] **Step 3: Implement the preview and route**

`DesignSystemPreview` must show:

- Color and typography foundation samples
- Button variants, all sizes, disabled state and icon-only accessible name
- Toggle and single-select ToggleGroup states
- Default and small Card examples
- A restrained mobile-first layout using semantic utilities only

Create `src/app/design-system/page.tsx`:

```tsx
import { notFound } from "next/navigation";

import { DesignSystemPreview } from "@/components/design-system/design-system-preview";

export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }

  return <DesignSystemPreview />;
}
```

- [x] **Step 4: Run the preview and complete test suites**

Run:

```bash
pnpm test src/components/design-system/design-system-preview.test.tsx
pnpm test
```

Expected: preview test and full test suite pass with zero axe violations.

- [x] **Step 5: Run static and production verification**

Run:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
git diff --check
```

Expected: every command exits 0. The production build does not expose design-system content because the page resolves to `notFound()` outside development.

- [x] **Step 6: Verify the development route in the browser**

Start `pnpm dev`, request `http://127.0.0.1:3000/design-system`, and verify:

- HTTP 200 in development
- no horizontal overflow at 320px, 390px and 768px
- visible focus states using keyboard navigation
- Toggle and ToggleGroup selected states change visibly
- 44px default controls and 52px large CTA are preserved

- [x] **Step 7: Review scope and working tree**

Run:

```bash
git status --short
git diff --stat
git diff --check
```

Expected: only `DESIGN.md`, this plan, planned configuration/dependency files, Foundation styles/components/tests, and the development preview are changed. Do not commit or push.
