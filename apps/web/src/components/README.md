# 컴포넌트 구조

```text
components/
├── ui/
│   ├── button/ (button.tsx, button.types.ts)
│   ├── input/ (input.tsx, input.types.ts)
│   ├── modal/
│   ├── menu/
│   ├── tabs/
│   ├── toast/
│   ├── badge/
│   ├── card/
│   ├── carousel/
│   ├── select/
│   ├── switch/
│   ├── toggle/
│   └── toggle-group/
├── patterns/
│   ├── empty-state/
│   ├── error-state/
│   ├── loading-state/
│   ├── search-bar/
│   └── navigation/
├── domain/
│   ├── place/
│   ├── festival/
│   ├── course/
│   └── review/
└── design-system/
```

- UI는 React/Base UI와 디자인 토큰을 소유한다. 도메인 데이터 요청을 넣지 않는다.
- patterns는 제목, 설명, action, children을 받아 공통 화면 패턴을 표현한다.
- domain은 장소·축제·코스·후기 이름과 기존 컴포넌트 API를 유지한다.
- 화면 전체의 조합과 데이터 흐름은 `features/<feature>/components`에 둔다.
- 예: `import { Button } from "@/components/ui/button/button"`.
- 공개 props의 타입은 ButtonProps/InputProps처럼 이름을 붙여 필요할 때 인접 types 파일로 분리한다.
- Modal/Menu는 Base UI의 합성 API, ref, render를 유지하면서 배경·본문·메뉴 항목의 반복 스타일을 제공한다. 화면별 크기·위치는 className으로 전달한다. 기존 bottom sheet처럼 별도 스타일을 모두 소유하는 경우 Modal의 unstyled를 명시한다.
- Tabs는 URL 이동용이다. SelectionTabs는 화면 내부 탭의 선택·방향키·Home/End·roving tabindex를 담당한다. 패널 id와 상태는 화면이 소유한다.
- Toast는 호출자가 메시지와 표시 기간을 관리하는 인라인 `role=status` 표현이다.
- 새 화면을 patterns에 넣거나 Base UI를 UI 밖에서 직접 import하지 않는다.

- ErrorState는 section/inline variant와 title/description/action을 지원한다. EmptyState는 빈 목록의 문구·행동을 받는다.
- LoadingState는 상태 알림 의미를 공유한다. className을 지정하면 기본 caption 레이아웃을 대체한다.
- SearchBar는 GET 검색 form, SearchInput은 실시간 검색용 아이콘+Input을 제공한다.
- 인증용 버튼/입력은 공통 Button/Input을 합성하고 인증 화면의 크기와 아이콘만 관리한다.
