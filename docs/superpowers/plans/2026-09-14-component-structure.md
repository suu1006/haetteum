# 컴포넌트 계층 재구성

사용자가 제시한 ui / patterns / domain 구조를 적용한다. 화면과 API 동작은 유지한다.

- ui: 기존 9개 primitive를 ui/<name>/<name>.tsx로 이동. Button/Input 공개 props는 types 파일로 분리. 기존 Base UI Dialog/Menu 접근은 ui/modal, ui/menu를 통해 제공한다. Toast는 현재 인라인 상태 알림의 공통 표현으로 추출하고 새 알림 시스템은 도입하지 않는다.
- patterns: empty-state, error-state, loading-state, search-bar 및 공통 navigation을 소유한다. 도메인 문구·URL·쿼리는 props/children으로 전달한다.
- domain: place/festival/course/review로 기존 travel 표현 컴포넌트를 분류한다. 프로필/인증/릴스/데이터 연결은 features/<feature>/components에 둔다.
- 기존 patterns의 화면 조합은 features/<feature>/components로 이동한다. 기존 파일의 수정 내용을 그대로 보존하고 이동한다.
- 모든 소스·테스트 import/mock/dynamic import 경로를 갱신한다. 테스트 폴더도 새 소유권을 따른다. 과거 계획과 감사 보고서는 당시 기록으로 보존한다.

## 실행 및 검증

1. 현재 전체 웹 테스트를 실행해 기준 결과 저장: pnpm --filter @haetteum/web test
2. 파일별 이동 표를 생성하고 충돌 없는 rename을 적용. import 문자열과 상대경로는 원래 위치의 resolve 결과에 따라 갱신.
3. UI props 분리, 공통 상태/검색 컴포넌트 추출 및 실제 호출부 연결. 기존 테스트로 화면/동작 회귀 확인.
4. DESIGN.md 및 컴포넌트 README의 소유권/사용법 갱신. 과거 경로와 잘못된 import가 남지 않았는지 검색.
5. 전체 웹 테스트, tsc --noEmit, eslint, production build 및 대표 화면 확인. 기존 오류와 신규 오류를 구분하여 보고.

## 완료 기록

- 소스/테스트 177개 경로 이동 및 import/mock 경로 갱신. 이동 대상 존재 확인 통과.
- Button/Input props 분리; Modal/Menu UI 진입점과 Tabs/Toast 추출.
- EmptyState/ErrorState/LoadingState/SearchBar를 기존 화면에 연결.
- Base UI 직접 import 경계에 ESLint 규칙 추가. 문서와 경로표 갱신.
- 웹 타입 검사 통과. 린트 오류 0개, 기존 인증 컴포넌트 경고 3개.
- 전체 테스트: 변경 전 689 통과/4 실패 → 변경 후 692 통과/같은 4 실패. 기존 review-moderation 테스트가 보이지 않는 `후기 메뉴` 텍스트를 찾는 문제이며 테스트를 숨기거나 제외하지 않았다.
- Next.js production build: Turbopack은 환경의 subprocess/port 제한으로 실패. `next build --webpack`은 정상 종료, 모든 route 컴파일 통과.
- 실제 브라우저에서 헌화로 상세와 탐색 검색 GET 제출, 경기 필터가 유지된 빈 결과 화면 확인.
- 별도 읽기 전용 코드 리뷰: 신규 런타임 회귀 발견 없음. 문서 지적 3곳 수정.
- 전역 토스트 큐, 모달 시각 스타일 통일, 타이포그래피/터치 크기 변경은 이번 구조 리팩토링에 포함하지 않는다.
