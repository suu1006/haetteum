# Storybook

해뜸의 공통 UI와 도메인 컴포넌트를 백엔드 없이 확인하는 개발용 카탈로그다.

## 실행

저장소 루트에서 프로젝트의 Node 24.19.0과 pnpm 10.33.0을 사용한다.

```bash
pnpm install --frozen-lockfile
pnpm storybook
```

브라우저에서 `http://localhost:6006`을 연다. 웹 앱이나 API를 먼저 실행할 필요가 없다.

```bash
pnpm build-storybook
```

정적 결과는 `apps/web/storybook-static`에 생성된다. HTTP 서버로 제공해야 하며 `file://`로 열면 모듈과 MSW 서비스 워커가 동작하지 않는다. CI는 PR과 main 변경 시 빌드하고 7일간 다운로드 가능한 artifact를 남긴다. 자동 배포는 하지 않는다.

## 구성과 스토리 위치

- `apps/web/.storybook/main.ts`: Next.js Vite 프레임워크, 문서·접근성·MSW 애드온, 정적 이미지 경로.
- `apps/web/.storybook/preview.tsx`: 앱 전역 CSS, Pretendard, App Router mock, 모바일 기본 viewport, MSW.
- `apps/web/src/components/design-system/foundations.stories.tsx`: 실제 CSS 변수를 쓰는 색상·타이포그래피·간격.
- 공통 UI: `src/components/ui/<name>/<name>.stories.tsx`.
- 도메인 UI: `src/components/domain/<area>/<name>.stories.tsx`.

Button, Input, Badge, Toggle, Select, Switch, PlaceCard, PlaceRankingCard, ReviewCard, RatingSummary를 제공한다. 컴포넌트마다 기본·선택·비활성화·이미지 없음·긴 텍스트 등 해당하는 상태를 독립 스토리로 둔다. Controls에서 props를 바꾸고 Actions에서 이벤트를 확인한다. PlaceCard의 저장 버튼은 Controls의 `saved` 값과 동기화된다.

새 스토리는 CSF 3의 `satisfies Meta<typeof Component>`와 `StoryObj<typeof meta>`를 사용한다. 내비게이션 제목은 `UI/<Name>` 또는 `Domain/<Area>/<Name>`으로 지정한다. 스토리 파일을 앱의 barrel export에서 내보내지 않는다.

## 스타일과 이미지

앱의 `globals.css`와 토큰을 재사용한다. Vite에서 Tailwind가 폰트 CSS를 인라인하면 상대 woff2 경로를 잃기 때문에, Storybook의 Vite 플러그인은 globals의 Pretendard import만 제거하고 preview에서 같은 폰트 CSS를 직접 import한다. 앱 CSS와 Next.js 빌드 경로는 바꾸지 않는다.

모바일 390px가 기본이며 toolbar에서 태블릿 768px·데스크톱 1280px로 전환한다. 현재 디자인은 light 토큰을 사용한다.

스토리의 이미지에는 `public/images` 안의 고정 샘플을 사용한다. 동영상 디렉터리는 정적 빌드에 복사하지 않는다. 랭킹 카드는 프로덕션의 공식 이미지 호스트 검증을 유지하기 위해 허용된 호스트의 가상 URL을 사용하고, 해당 URL만 MSW가 로컬 샘플로 응답한다. `ImageFailure`는 별도 가상 URL에 404를 반환해 실제 오류 폴백을 확인한다. Docs에서 여러 스토리가 동시에 렌더링돼도 성공·실패 handler가 충돌하지 않도록 URL을 분리한다.

## 네트워크와 상태 격리

실제 API, 인증, DB, TourAPI에 의존하지 않는다. MSW에 handler가 없는 외부 요청과 같은 origin의 `/api/` 요청은 오류로 차단하고, 로컬 모듈·폰트·이미지는 통과시킨다. 스토리별 handler는 MSW 애드온이 전환 시 초기화한다.

화면 스토리를 추가할 때 필요한 API 응답은 `parameters.msw.handlers`에서 성공·로딩·빈 결과·오류별로 정의한다. QueryClient와 인증 상태는 해당 스토리의 decorator에서 새로 만들고, RootLayout이나 AuthBootstrap을 그대로 가져오지 않는다. 지도 SDK가 필요한 화면은 먼저 지도 대체 컴포넌트를 주입할 수 있게 설계한다.

MSW를 업그레이드하면 서비스 워커도 갱신한다. 앱 public 폴더에 설치하지 않는다.

```bash
pnpm --filter @haetteum/web exec msw init .storybook/public --no-save
```

## 검증 범위

접근성 패널은 검토용(`a11y.test: "todo"`)이며 CI 실패 조건은 아니다. 현재 CI는 정적 빌드만 검사한다. 브라우저 상호작용 자동 테스트, 접근성 CI 차단, 시각적 회귀 서비스는 후속 도입 범위다. 기존 Vitest 테스트 실행 방법은 그대로 유지한다.
