# 코스 일정 수정 화면 설계

## 상태

- 승인된 시각 기준: 사용자가 제공한 532×1018 모바일 참고 이미지
- 데이터 범위: 타입이 지정된 로컬 mock 데이터만 사용
- 제품 위치: 독립 편집 경로 `/courses/icheon-day-trip/edit`
- 제외 범위: 기존 `코스 수정하기` 버튼 연결, API, DB 저장, 인증, 전역 상태, 실제 AI 재생성

## 목표

사용자가 모바일에서 일정 카드를 직접 위아래로 옮겨 방문 순서를 바꿀 수 있는 코스 수정 화면을 구현한다. 첨부 이미지의 시간선, 카드 밀도, 보라색 선택 상태와 하단 행동 영역을 Haetteum 디자인 시스템으로 재현하고, 추후 실제 코스 상세 화면에서 링크만 연결하면 사용할 수 있는 독립 경로로 제공한다.

## 선택한 접근

세로 정렬은 `dnd-kit`의 React sortable 기능을 사용한다. Pointer와 키보드 입력을 함께 지원하고 drag 상태, 충돌 판정, 접근성 안내를 제품 코드에서 처음부터 다시 만들지 않기 위해서다.

직접 Pointer Events를 구현하면 새 의존성은 없지만 모바일 스크롤 충돌, drag 취소, 키보드 이동과 화면 읽기 안내까지 제품 코드가 소유해야 한다. 위·아래 버튼만 제공하는 방식은 단순하지만 참고 이미지와 사용자가 요청한 직접 이동 경험을 충족하지 못한다.

## 라우트와 화면 구조

```text
app/courses/[courseId]/edit/page.tsx
└─ CourseEditScreen
   ├─ CourseEditHeader
   ├─ CourseSourceTabs
   ├─ SortableItineraryList
   │  └─ SortableItineraryCard × N
   └─ CourseEditActions
```

- 동작하는 mock course ID는 `icheon-day-trip`이다.
- 알 수 없는 course ID는 Next.js `notFound()`로 처리한다.
- 화면은 320px 이상에서 동작하고 최대 480px 너비의 모바일 surface로 중앙 정렬한다.
- 기존 메인 화면, 코스 카드와 내 일정 내비게이션에는 링크를 추가하지 않는다.

## 컴포넌트 소유권

### `app/courses/[courseId]/edit`

- route parameter를 해석한다.
- mock course를 조회하고 metadata를 제공한다.
- 클라이언트 정렬 상태나 화면 마크업을 직접 소유하지 않는다.

### `components/travel`

- `SortableItineraryCard`: 시간, 이미지, 장소명, 카테고리와 drag handle을 표시한다.
- 카드 표현은 명시적 props와 sortable bindings만 받고 mock 조회, 탭 전환, 초기화 정책은 소유하지 않는다.
- 기존 `ItineraryItem`은 번호·상태·이동시간 중심의 읽기 전용 표현이므로 변경하지 않는다.

### `components/patterns`

- `CourseEditScreen`: 헤더, 탭, 안내, 시간선, 정렬 목록과 하단 행동 영역을 첨부 이미지 순서로 조립한다.
- fixed 하단 영역과 본문 safe-area reserve를 소유한다.
- drag 순서 상태나 데이터 선택 로직은 feature에 위임한다.

### `features/courses`

- `course-edit-model.ts`: 코스, 시간 slot, 장소, source tab 타입과 순서 변경·복원 순수 함수를 소유한다.
- `course-edit.mock.ts`: AI 추천 코스, 사용자가 만든 코스와 추가 후보 장소를 소유한다.
- `course-editor.tsx`: 선택 탭, 현재 장소 순서, drag 상태와 mock 행동을 소유하는 Client Component다.

## Mock 데이터 계약

```ts
type CourseSource = "ai" | "custom";

type CoursePlace = {
  id: string;
  title: string;
  category: string;
  image: { src: string; alt: string };
};

type CourseTimeSlot = {
  id: string;
  time: string;
};

type EditableCourse = {
  id: string;
  source: CourseSource;
  slots: readonly CourseTimeSlot[];
  places: readonly CoursePlace[];
};
```

AI 추천 코스의 최초 순서는 다음과 같다.

1. `08:30` 임금님 쌀밥집 — 아침 식사
2. `09:30` 이천 테르메덴 — 온천/워터파크
3. `12:30` 설봉공원 — 산책/휴식
4. `15:00` 이천 시립박물관 — 관람
5. `16:30` 해주냉면 — 저녁 식사

시간은 위치 slot에 고정한다. 장소를 옮기면 장소가 새 slot의 시간을 배정받는다. 예를 들어 설봉공원을 첫 번째로 이동하면 설봉공원이 `08:30` 일정이 된다.

`내가 만든 코스` 탭은 동일한 slot 구조에 별도 mock 장소 순서를 사용한다. 두 탭의 현재 순서는 서로 독립적으로 유지한다.

## 정렬 상호작용

- 사용자는 카드 오른쪽의 drag handle을 누른 채 위아래로 이동한다.
- Pointer 입력은 마우스, 터치와 펜을 지원한다.
- drag 시작에는 작은 이동 또는 짧은 hold 제약을 두어 모바일 스크롤의 우발적인 정렬을 줄인다.
- 키보드는 handle에 focus한 뒤 Space 또는 Enter로 카드를 들고, 위·아래 화살표로 이동하고, Space 또는 Enter로 놓을 수 있게 한다.
- 이동 중인 카드는 primary border와 floating shadow로 강조한다.
- 이동 예정 위치는 점선 drop indicator로 표시한다.
- 유효한 대상 위에서 놓으면 장소 배열 순서를 갱신한다.
- 목록 밖에서 놓거나 drag를 취소하면 기존 순서를 유지한다.
- drag 이후 focus는 이동한 handle에 유지한다.
- `aria-live` 영역에서 장소명과 새 순서를 한국어로 안내한다.

## 기타 화면 행동

- 상단 뒤로 가기는 브라우저 history가 있으면 이전 화면으로 이동하고, 직접 진입한 경우 `/`로 이동한다.
- `AI 추천 코스`와 `내가 만든 코스` 탭은 각각 별도 mock 목록을 표시한다.
- `초기화`는 현재 탭만 해당 탭의 최초 mock 순서로 되돌린다.
- `장소 추가하기`는 현재 탭에 없는 첫 번째 mock 후보 장소를 마지막 slot으로 추가한다. 더 추가할 후보가 없으면 상태 메시지로 알린다.
- `일정 다시 구성하기`는 네트워크나 AI를 호출하지 않고 현재 장소를 mock 추천 순서로 재배치한다.
- 순서는 브라우저 메모리에 저장하지 않으며 새로고침하면 최초 mock 상태로 돌아간다.

## 시각 기준

- 앱 surface 최대 폭 480px, 참고 이미지와 같은 밝은 배경
- 헤더에는 왼쪽 뒤로 가기, 중앙 `일정 수정`, 오른쪽 `초기화`
- 두 탭은 하나의 pill surface 안에서 active 탭만 primary purple로 채운다.
- 안내 문구는 muted foreground를 사용한다.
- 시간선은 왼쪽 시간, primary marker와 얇은 route line, 오른쪽 카드로 구성한다.
- 카드는 흰 surface, 1px border, 16px radius, 약한 shadow와 64px 안팎의 정사각 썸네일을 사용한다.
- drag handle과 모든 버튼은 최소 44×44px touch target을 제공한다.
- 본문은 fixed 하단 행동 영역, home indicator와 safe area에 가리지 않도록 여백을 확보한다.
- 하단에는 outline `장소 추가하기`와 primary `일정 다시 구성하기`를 나란히 배치한다.
- `prefers-reduced-motion`에서는 drag를 제외한 전환 animation 시간을 최소화한다.

## 이미지와 아이콘

- 이천 테르메덴과 이천 쌀 문화 관련 기존 제품 이미지가 카드 crop에 맞으면 재사용한다.
- 기존 자산이 피사체와 맞지 않는 임금님 쌀밥집, 설봉공원, 이천 시립박물관과 해주냉면 이미지는 참고 화면과 같은 자연스러운 여행 사진 톤의 mock 자산으로 만든다.
- 새 자산은 `apps/web/public/images/courses/icheon-day-trip`에 저장한다.
- 아이콘은 프로젝트의 Lucide를 사용한다. inline SVG, emoji와 CSS 그림을 만들지 않는다.

## 접근성

- drag handle은 장소명을 포함한 접근 가능한 이름을 갖는다.
- Pointer drag와 동등한 키보드 정렬을 제공한다.
- 현재 탭은 `aria-selected`, drag 상태는 관련 ARIA 속성과 live region으로 전달한다.
- 선택과 이동 상태는 색뿐 아니라 border, shadow, 텍스트 안내로도 구분한다.
- 시간과 장소는 각각 semantic `time`과 ordered list 구조를 사용한다.
- icon-only 뒤로 가기와 초기화 control은 명시적 한국어 이름을 제공한다.
- 모든 interactive control은 focus-visible과 최소 44px touch target을 갖는다.

## 테스트와 시각 검증

- 순서 변경, 잘못된 대상 유지, 탭별 초기화와 mock 재구성 순수 함수 단위 테스트
- mock 데이터의 slot/place 길이와 ID 유일성 테스트
- 두 탭 전환, 초기화, 장소 추가와 재구성 사용자 상호작용 테스트
- 키보드 정렬과 `aria-live` 결과 안내 테스트
- 알 수 없는 course ID의 not-found route 테스트
- 핵심 화면 axe 접근성 검사
- `pnpm --filter @haetteum/web lint`
- `pnpm --filter @haetteum/web test`
- `pnpm --filter @haetteum/web build`
- 첨부 이미지와 동일한 viewport 및 drag 상태로 브라우저 캡처 후 디자인 QA
- 디자인 QA 결과는 프로젝트 루트 `design-qa.md`에 기록하고 P0/P1/P2 차이를 수정한 뒤 `final result: passed`를 확인한다.

## 변경 안전성

현재 작업 트리의 기존 수정과 미추적 파일은 사용자 작업으로 간주한다. 코스 수정 화면에 필요한 새 파일과 직접 관련된 디자인 토큰·의존성만 변경한다. 메인 탐색, 테마 여행, 관광지·축제 상세, 백엔드와 기존 문서를 되돌리거나 정리하지 않는다.

Git stage, commit, branch, worktree와 push는 별도 승인 없이 수행하지 않는다.

## 완료 기준

- `/courses/icheon-day-trip/edit`에서 첨부 이미지와 같은 일정 수정 화면이 열린다.
- 사용자가 Pointer와 키보드로 일정 카드를 위아래로 옮길 수 있다.
- 시간 slot은 고정되고 장소가 새 시간에 배정된다.
- 탭, 초기화, 장소 추가와 mock 재구성이 화면 안에서 동작한다.
- 새로고침 전까지 두 탭의 순서 상태가 독립적으로 유지된다.
- 기존 화면과 사용자 변경을 훼손하지 않는다.
- 관련 테스트, lint, build와 디자인 QA가 통과한다.
