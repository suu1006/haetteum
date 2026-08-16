# Next.js 16 Project Initialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 빈 저장소를 pnpm 기반 Next.js 16 App Router 프로젝트로 초기화하고 개발·검사·빌드가 가능한 상태로 만든다.

**Architecture:** 공식 `create-next-app@16.3.1`의 빈 App Router 템플릿을 현재 저장소에 생성한다. 생성된 `src/app` 경계를 유지하면서 메타데이터, 시작 화면, 전역 스타일, Node.js 버전 제약만 프로젝트 기본값으로 정리한다.

**Tech Stack:** Next.js 16.3.1, React 19.2.8, TypeScript 5, Tailwind CSS 4, ESLint 9, pnpm 10.33.0

## Global Constraints

- Next.js는 16의 최신 확인 패치 버전인 `16.3.1`을 사용한다.
- Node.js 최소 버전은 Next.js 16 요구사항과 같은 `>=20.9.0`으로 명시한다.
- 패키지 관리자는 pnpm을 사용하고 `pnpm-lock.yaml`을 저장한다.
- TypeScript, App Router, `src/` 디렉터리, Tailwind CSS, ESLint를 사용한다.
- import alias는 `@/*`로 설정한다.
- React Compiler, 테스트 프레임워크, 포매터, Git 훅, UI 라이브러리, 인증, 데이터베이스는 추가하지 않는다.
- 기존 `docs/superpowers/` 문서는 보존한다.

## File Structure

- `package.json`: 실행 스크립트, Next.js/React 의존성, pnpm 및 Node.js 버전 계약
- `pnpm-lock.yaml`: 재현 가능한 의존성 해석 결과
- `pnpm-workspace.yaml`: pnpm이 허용할 빌드 의존성 설정
- `next.config.ts`: Next.js 기본 설정 경계
- `tsconfig.json`: strict TypeScript와 `@/*` 경로 alias
- `eslint.config.mjs`: Next.js Core Web Vitals 및 TypeScript lint 규칙
- `postcss.config.mjs`: Tailwind CSS PostCSS 플러그인
- `src/app/layout.tsx`: 루트 HTML 구조와 프로젝트 메타데이터
- `src/app/page.tsx`: 범용 초기 시작 화면
- `src/app/globals.css`: Tailwind 진입점과 최소 색상/타이포그래피 기본값
- `public/.gitkeep`: 정적 자산 디렉터리 보존
- `AGENTS.md`: Next.js 16이 개발 시 자동 유지하는 버전별 에이전트 지침
- `CLAUDE.md`: 생성기가 만든 `AGENTS.md` 참조 파일
- `.gitignore`: Next.js, Node.js, 환경 파일 및 빌드 산출물 제외
- `README.md`: 설치, 개발, 검사, 빌드 명령 안내

---

### Task 1: 공식 App Router 프로젝트 생성 및 검증

**Files:**
- Create: `package.json`
- Create: `pnpm-lock.yaml`
- Create: `pnpm-workspace.yaml`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `eslint.config.mjs`
- Create: `postcss.config.mjs`
- Generate locally (ignored): `next-env.d.ts`
- Create: `.gitignore`
- Create: `README.md`
- Create: `public/.gitkeep`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `AGENTS.md`
- Create: `CLAUDE.md`
- Preserve: `docs/superpowers/specs/2026-08-16-nextjs-16-initialization-design.md`
- Preserve: `docs/superpowers/plans/2026-08-16-nextjs-16-initialization.md`

**Interfaces:**
- Consumes: Node.js `>=20.9.0`, pnpm `10.33.0`, official `create-next-app@16.3.1`
- Produces: `pnpm dev`, `pnpm lint`, `pnpm build`, `pnpm start` scripts and the `/` App Router route

- [x] **Step 1: Scaffold the official empty template in the repository**

Run:

```bash
pnpm dlx create-next-app@16.3.1 . \
  --ts \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias '@/*' \
  --use-pnpm \
  --empty \
  --disable-git \
  --yes
```

Expected: the command reports `Success! Created` and preserves `docs/superpowers/`.

- [x] **Step 2: Preserve generated Next.js 16 agent guidance**

Keep the generated `AGENTS.md` and `CLAUDE.md`. Next.js 16 automatically maintains these files during `next dev`, so deleting them would immediately dirty the working tree again.

- [x] **Step 3: Set runtime metadata in `package.json`**

Keep the generated scripts and dependencies, and add these top-level properties:

```json
{
  "engines": {
    "node": ">=20.9.0"
  },
  "packageManager": "pnpm@10.33.0"
}
```

Expected dependency versions include `next: "16.3.1"`, `react: "19.2.8"`, `react-dom: "19.2.8"`, and `eslint-config-next: "16.3.1"`.

- [x] **Step 4: Set project metadata in `src/app/layout.tsx`**

Replace the generated layout with this root layout:

```tsx
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Haetteum",
  description: "Haetteum web application",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

The `<html lang="ko">` value makes Korean the default document language.

- [x] **Step 5: Replace `src/app/page.tsx` with the minimal start page**

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Haetteum</h1>
        <p className="mt-3 text-neutral-600">Next.js 16 App Router</p>
      </section>
    </main>
  );
}
```

- [x] **Step 6: Keep Tailwind and define minimal globals in `src/app/globals.css`**

```css
@import "tailwindcss";

:root {
  color-scheme: light;
}

body {
  margin: 0;
  background: #ffffff;
  color: #171717;
  font-family: Arial, Helvetica, sans-serif;
}
```

- [x] **Step 7: Preserve the static asset directory**

Create an empty `public/.gitkeep` file so Git retains `public/` before assets are added.

- [x] **Step 8: Document the supported commands in `README.md`**

The README must state Node.js `>=20.9.0`, pnpm usage, and these commands:

```bash
pnpm install
pnpm dev
pnpm lint
pnpm build
pnpm start
```

- [x] **Step 9: Run static checks**

Run:

```bash
pnpm lint
```

Expected: exit code `0` with no ESLint errors.

- [x] **Step 10: Run the production build**

Run:

```bash
pnpm build
```

Expected: exit code `0`; Next.js reports the `/` route as statically generated.

- [x] **Step 11: Verify the development server response**

Start `pnpm dev` in a managed terminal session, wait for the ready message, then run:

```bash
curl --fail --silent --show-error http://127.0.0.1:3000/ >/dev/null
```

Expected: `curl` exits `0`. Stop the development server after the check.

- [x] **Step 12: Review the generated diff**

Run:

```bash
git status --short
git diff --check
```

Expected: only the planned project files and this plan are new or modified, with no whitespace errors.

- [x] **Step 13: Commit the initialized project**

```bash
git add .gitignore AGENTS.md CLAUDE.md README.md eslint.config.mjs next.config.ts package.json pnpm-lock.yaml pnpm-workspace.yaml postcss.config.mjs public/.gitkeep src tsconfig.json docs/superpowers/plans/2026-08-16-nextjs-16-initialization.md
git commit -m "chore: Next.js 16 프로젝트 초기화"
```
