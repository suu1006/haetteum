# 일정 장소 검색 및 선택 화면 설계

## 상태와 설계 우선순위

- 상태: 대화에서 화면 구조, 다중 선택 동작, mock 데이터 및 검증 범위 승인
- 시각 기준: 사용자가 제공한 `근처 장소 검색 화면` 모바일 참고 이미지
- 적용 화면: `/courses/icheon-day-trip/edit`의 `장소 추가하기` 후속 단계
- 데이터 범위: 타입이 지정된 로컬 mock 데이터
- 이 문서는 `2026-08-24-course-edit-screen-design.md`의 `장소 추가하기` 즉시 추가 동작을 대체한다.
- 기존 일정 정렬, 탭, 초기화와 저장 CTA의 별도 동작은 이 설계의 범위가 아니다.

## 목표

사용자가 일정 수정 화면을 벗어나거나 수정 중인 draft를 잃지 않고 주변 장소를 검색하고 여러 개 선택해 현재 코스 끝에 한꺼번에 추가할 수 있게 한다. 장소 검색 UI는 코스 편집기에 종속된 마크업으로 만들지 않고, 다른 장소 선택 흐름에서도 데이터와 callback만 바꿔 재사용할 수 있는 표현 컴포넌트와 화면 pattern으로 분리한다.

## 범위와 비범위

### 포함

- 일정 수정 화면과 장소 검색 화면 사이의 in-editor 전체 화면 전환
- 장소명·설명 검색
- `전체`, `관광지`, `맛집`, `카페`, `숙소` 카테고리 필터
- `추천순`, `거리순`, `평점순` 정렬
- 여러 장소 선택, 선택 해제와 선택 개수 표시
- 기존 일정 장소의 중복 선택 방지
- 선택한 장소 일괄 추가와 mock 시간 slot 생성
- 빈 결과, 선택 불가와 준비 중 상태의 접근 가능한 안내
- 모바일 반응형 및 키보드·스크린리더 동작

### 제외

- 별도 장소 검색 route와 전역 store
- API, 데이터베이스, React Query와 영속 저장
- 실제 위치 권한, 거리 계산과 지도 SDK
- 지도 화면, 고급 필터 drawer와 pagination
- 실제 자동차·도보 경로 계산
- 코스 전체 저장 또는 서버 반영

## 선택한 접근

`CourseEditor` 안에서 `edit | place-search` 단계를 전환한다. 별도 route는 URL과 브라우저 history를 제공하지만, 현재 로컬 draft를 보존하기 위해 Context나 전역 store가 추가된다. Dialog 또는 Drawer는 긴 검색 목록과 참고 이미지의 전체 화면 정보 구조에 맞지 않는다.

장소 검색 단계는 모바일 surface 전체를 사용하지만 route는 유지한다. 사용자는 검색 단계의 뒤로 가기로 미확정 선택을 버리고 동일한 일정 수정 draft로 돌아간다. 확정하면 선택된 장소만 active source의 일정 끝에 추가한 뒤 수정 단계로 돌아간다.

## 화면 흐름

```text
일정 수정
  └─ 장소 추가하기
       ↓
주변 장소 검색
  ├─ 뒤로 가기 → 미확정 선택 폐기 → 일정 수정
  ├─ 검색 / 카테고리 / 정렬
  ├─ 장소 + 선택 / 선택 해제
  └─ 선택한 장소 추가하기 N
       ↓
active course 끝에 중복 없이 추가
       ↓
일정 수정
```

- 검색 단계에 처음 진입할 때 선택 개수는 0이다.
- 검색어와 필터를 바꿔 목록에서 사라진 장소도 선택 상태는 유지한다.
- 기존 active course에 포함된 장소는 `추가됨`으로 표시하고 선택 control을 비활성화한다.
- 선택 CTA는 0개일 때 disabled이고 1개 이상일 때 `선택한 장소 추가하기 N`으로 동작한다.
- 확정 후 추가된 장소 수를 일정 수정 화면의 `aria-live` 상태로 안내한다.
- 뒤로 가기 또는 확정 후 검색어, 필터, 정렬과 미확정 선택은 초기화한다.

## 화면 구성

```text
NearbyPlaceSearchScreen
├─ header
│  ├─ 뒤로 가기
│  ├─ 주변 장소 검색
│  └─ 지도
├─ search field
├─ category filters
├─ section heading / sort select
├─ result list
│  └─ NearbyPlaceSelectCard × N
├─ empty state
├─ polite status region
└─ fixed selection action
```

### 헤더와 검색

- 왼쪽에는 44×44px 뒤로 가기, 중앙에는 `주변 장소 검색`, 오른쪽에는 Lucide 지도 아이콘과 `지도`를 배치한다.
- 실제 지도는 범위 밖이므로 지도 control은 `지도 보기는 준비 중이에요.`를 status region에 전달하며 화면을 이동시키지 않는다.
- 검색 field placeholder는 `장소, 음식, 숙소를 검색해보세요`다.
- 검색은 submit 없이 입력 즉시 로컬 mock 결과에 적용한다.

### 카테고리와 정렬

- 카테고리는 독립 chip 형태의 single-select `ToggleGroup`을 사용한다.
- 선택 상태는 primary background, primary foreground와 font weight로 함께 구분한다.
- 정렬은 기존 `Select`를 재사용하고 접근 가능한 이름은 `장소 정렬`이다.
- 기본 정렬은 mock 배열의 추천 순서를 유지한다.

### 장소 카드

- 카드 root는 장소명을 accessible name으로 갖는 `article`이다.
- 왼쪽 고정 비율 이미지, 가운데 카테고리·장소명·거리/이동시간·설명·평점, 오른쪽 선택 control로 구성한다.
- 이미지는 80×96px 안팎의 세로 crop을 사용하고 320px에서 본문과 선택 control이 겹치지 않게 한다.
- 설명은 최대 두 줄, 거리·이동시간은 한 줄, 장소명은 좁은 화면에서 말줄임한다.
- 선택 control은 최소 44×44px이며 `aria-pressed`로 상태를 제공한다.
- 미선택은 Plus, 선택은 Check 아이콘과 primary subtle surface를 사용한다.
- 이미 일정에 있는 장소는 `추가됨` 텍스트와 disabled 상태를 함께 제공한다.

### 하단 CTA

- 앱 surface 하단에 fixed 배치하고 safe area를 반영한다.
- 본문에는 CTA 높이만큼 reserve를 둬 마지막 카드가 가리지 않게 한다.
- 선택 개수는 텍스트와 숫자 badge로 함께 표시한다.
- disabled 상태는 HTML `disabled`, muted surface와 텍스트를 함께 사용한다.

## 컴포넌트와 상태 소유권

```text
CourseEditor
├─ CourseEditScreen
└─ CoursePlacePicker
   └─ NearbyPlaceSearchScreen
      ├─ Input / ToggleGroup / Select / Button
      └─ NearbyPlaceSelectCard × N
```

### `features/courses/CourseEditor`

- 현재 `edit | place-search` 단계와 AI/custom별 일정 draft를 소유한다.
- `nearbyPlaceSearchMock`을 가져와 `CoursePlacePicker`의 `places` prop으로 전달한다.
- 검색 진입 시 active course의 장소 ID를 `CoursePlacePicker`에 전달한다.
- 확정된 `NearbyPlaceResult[]`를 `CoursePlace[]`로 변환하고 시간 slot을 생성한다.
- active source에만 장소와 slot을 추가한다.
- 추가 완료 후 일정 수정 단계로 돌아가고 결과를 live status로 알린다.

### `features/courses/CoursePlacePicker`

- 검색어, category, sort와 선택 ID를 소유하는 작은 Client Component다.
- `places`, `unavailableIds`, `onCancel`, `onConfirm`을 명시적 props로 받는다.
- 선택 ID는 배열로 유지하고 선택 시 끝에 추가하며 해제 시 제거해 사용자가 선택한 순서를 보존한다.
- 검색·필터·정렬 순수 함수를 사용해 화면에 전달할 결과를 계산한다.
- 이미 일정에 있는 ID를 unavailable set으로 관리한다.
- 취소와 확정 callback 외에 코스 draft나 routing을 직접 수정하지 않는다.

### `components/patterns/NearbyPlaceSearchScreen`

- 헤더, 검색, 필터, 정렬, 목록, 빈 상태와 fixed CTA를 조립한다.
- 모든 값과 event callback을 명시적 props로 받는다.
- mock import, route 이동, 데이터 필터링과 코스 변환을 소유하지 않는다.

### `components/travel/NearbyPlaceSelectCard`

- 한 장소의 이미지와 검색 요약, controlled 선택 상태를 표현한다.
- `place`, `selected`, `unavailable`, `onSelectedChange`만 받는다.
- 검색, 정렬, 목록과 코스 시간 정책을 소유하지 않는다.

### `features/places`

- `nearby-place-search-model.ts`: 결과 타입, category/sort 타입과 필터·정렬 순수 함수
- `nearby-place-search.mock.ts`: 이천 주변 장소 mock 목록
- API 응답 타입이나 코스 편집 상태를 포함하지 않는다.

## 데이터 계약

```ts
type NearbyPlaceCategory =
  | "attraction"
  | "restaurant"
  | "cafe"
  | "accommodation";

type NearbyPlaceTravelMode = "car" | "walk";
type NearbyPlaceSort = "recommended" | "distance" | "rating";

type NearbyPlaceResult = {
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
```

- UI 표시는 `distanceKm`를 소수점 한 자리 km로, 후기 수를 `ko-KR` locale로 format한다.
- 추천순은 mock 배열 순서다.
- 거리순은 `distanceKm` 오름차순이다.
- 평점순은 `rating` 내림차순이며 동률이면 `reviewCount` 내림차순이다.
- 검색어는 trim 후 장소명, 설명과 category label에 부분 일치시킨다.
- category `all`은 view/filter 상태이며 장소 데이터 category 값으로 저장하지 않는다.

## Mock 데이터

참고 이미지의 정보 밀도와 기존 이천 자산을 재사용해 다음 장소를 기본 목록으로 제공한다.

1. 이천 시립박물관 — 관광지 — 기존 일정에서는 `추가됨`
2. 임금님 쌀밥집 — 맛집 — 기존 일정에서는 `추가됨`
3. 카페 온천 — 카페 — 선택 가능
4. 테르메덴 리조트 — 숙소 — 선택 가능
5. 해주냉면 — 맛집 — 기존 일정에서는 `추가됨`
6. 이천 도예마을 — 관광지 — 선택 가능

- 기존 `apps/web/public/images`의 박물관, 한식, 카페, 온천, 음식 및 문화 체험 이미지를 재사용한다.
- 새 이미지 생성, 외부 URL과 원격 image host 설정은 추가하지 않는다.
- active source에 따라 unavailable 상태를 계산하므로 같은 mock 결과를 다른 선택 흐름에서도 재사용할 수 있다.

## 시간 slot 생성

- 선택 장소는 검색 결과의 현재 표시 순서가 아니라 사용자가 선택한 순서로 추가한다.
- 첫 새 slot은 active course의 마지막 slot에서 90분 뒤다.
- 이후 선택 장소마다 90분씩 증가한다.
- slot ID는 active source, 추가 시점의 현재 slot 수와 선택 index를 조합해 안정적으로 만든다.
- 이번 mock 목록에서 선택 가능한 장소 수와 초기 마지막 시간을 제한해 날짜가 바뀌지 않게 한다.
- 시간 계산은 `appendFollowingTimeSlots(source, slots, count, intervalMinutes)` 순수 함수로 분리한다.
- 마지막 slot이 없거나 `HH:mm`이 잘못되었거나 count가 0 이하이면 입력 `slots` 참조를 그대로 반환한다.

## 상태와 예외 처리

- 검색 결과 없음: `검색 조건에 맞는 장소가 없어요`와 필터 변경 안내를 표시한다.
- 선택 0개: CTA disabled, count 0 표시
- unavailable 장소: 선택 callback을 호출하지 않고 `이미 일정에 추가된 장소예요.`를 접근 가능하게 전달
- 지도 요청: 화면 이동 없이 `지도 보기는 준비 중이에요.` status 안내
- 중복 확정: `CourseEditor`에서 최종 ID 중복을 한 번 더 제거한다.
- 이미지: 기존 `next/image`와 alt를 사용하며 이미지 실패용 새 네트워크 fallback은 만들지 않는다.

## 접근성

- 헤더, 검색, 카테고리, 정렬, 결과와 하단 행동을 semantic 영역으로 구분한다.
- 카테고리는 single selection 의미와 선택 상태를 제공한다.
- 장소 목록은 `ul`/`li`, 각 카드 내용은 `article`을 사용한다.
- 선택 control의 accessible name은 `${장소명} 선택` 또는 `${장소명} 선택 해제`다.
- unavailable control에는 disabled와 현재 일정 포함 안내를 함께 제공한다.
- 결과 수, 지도 준비 중, 선택 및 추가 결과는 polite live region으로 알린다.
- 모든 control은 keyboard로 작동하고 focus-visible ring과 최소 44px touch target을 제공한다.
- 선택 상태는 색뿐 아니라 아이콘, border와 accessible state로 구분한다.
- JSDOM axe 검사는 canvas가 필요한 color contrast rule을 제외하고 구조·이름·상태 위반을 확인한다. 실제 색상 대비는 브라우저 시각 QA에서 토큰 조합을 확인한다.

## 반응형과 시각 기준

- 320px 이상 모바일을 1차 기준으로 하고 최대 480px 앱 surface로 중앙 정렬한다.
- inline padding 16px, 카드/list gap 12px, control radius 12px와 card radius 16px를 기존 token으로 사용한다.
- primary purple은 category 선택, 장소 선택과 활성 CTA에만 사용한다.
- 밝은 card surface, 1px border와 조용한 shadow를 유지하며 새 gradient나 glass 효과를 추가하지 않는다.
- Pretendard와 기존 type utility를 사용하고 화면별 임의 font family를 추가하지 않는다.
- 아이콘은 기존 `lucide-react`를 사용하고 inline SVG, emoji와 CSS drawing을 만들지 않는다.
- 768px 이상에서도 정보 구조는 바꾸지 않고 480px surface를 중앙 정렬한다.

## 예상 변경 파일

```text
apps/web/src/features/places/nearby-place-search-model.ts
apps/web/src/features/places/nearby-place-search.mock.ts
apps/web/src/components/travel/nearby-place-select-card.tsx
apps/web/src/components/patterns/nearby-place-search-screen.tsx
apps/web/src/features/courses/course-place-picker.tsx
apps/web/src/features/courses/course-edit-model.ts
apps/web/src/features/courses/course-edit.mock.ts
apps/web/src/features/courses/course-editor.tsx
apps/web/src/components/patterns/course-edit-screen.tsx
apps/web/tests/unit/features/places/nearby-place-search-model.test.ts
apps/web/tests/unit/features/courses/course-edit-model.test.ts
apps/web/tests/unit/components/travel/nearby-place-select-card.test.tsx
apps/web/tests/unit/components/patterns/nearby-place-search-screen.test.tsx
apps/web/tests/unit/components/patterns/course-edit-screen.test.tsx
```

- 실제 구현 중 동일 책임의 기존 파일에 자연스럽게 합칠 수 있으면 새 파일 수를 줄인다.
- `DESIGN.md`의 implemented component 목록은 구현과 검증이 끝난 뒤 실제 상태만 반영한다.
- 새 범용 UI primitive나 외부 의존성은 추가하지 않는다.

## 테스트와 시각 검증

### 순수 함수

- 검색어 trim과 장소명·설명·category label 부분 일치
- category별 필터와 `all`
- 추천순·거리순·평점순, 평점 동률의 후기 수 tie-break
- 기존 장소와 선택 장소의 ID 중복 제거
- 마지막 시간 기준 90분 단위 slot 생성과 잘못된 시간 입력 유지

### 컴포넌트

- 장소 카드의 이미지, 텍스트, 평점과 후기 수
- 선택·선택 해제 callback 및 `aria-pressed`
- unavailable 장소가 `추가됨`과 disabled 상태를 함께 제공
- 화면 영역 순서, 검색, category, sort, 빈 상태와 fixed CTA
- 선택 0개 CTA disabled 및 선택 개수 표시
- 핵심 화면 axe 접근성 검사

### 통합 상호작용

- `장소 추가하기`가 직접 장소를 추가하지 않고 검색 단계로 전환
- 검색, category와 sort 변경 후 결과 갱신
- 여러 장소 선택 후 CTA count 변경
- 확정 시 active source에만 장소와 slot 추가 후 수정 단계 복귀
- 뒤로 가기 시 미확정 선택 폐기
- 이미 포함된 장소의 중복 추가 차단
- AI/custom draft 독립성 유지

### 명령과 시각 QA

- Node `24.19.0`과 pnpm `10.33.0` 사용
- 대상 Vitest를 RED → GREEN 순서로 실행
- `pnpm --filter @haetteum/web lint`
- `pnpm --filter @haetteum/web test`
- `pnpm --filter @haetteum/web build`
- 첨부 이미지와 동일한 모바일 viewport에서 로컬 화면을 캡처해 header, 검색, chip, 카드 밀도와 fixed CTA를 비교한다.
- 320px viewport에서 실제 문서의 `scrollWidth`가 `clientWidth`를 넘지 않고 마지막 카드가 fixed CTA 위까지 스크롤되는지 확인한다.
- 프로젝트 루트 `design-qa.md`에 결과를 기록하고 P0/P1/P2를 해소한 뒤 `final result: passed`를 확인한다.

## 완료 기준

- 일정 수정 화면의 `장소 추가하기`에서 주변 장소 검색 단계가 열린다.
- 수정 중인 active draft를 잃지 않고 검색 단계와 수정 단계를 왕복한다.
- 검색, category, sort와 다중 선택이 mock 데이터로 동작한다.
- 기존 일정 장소를 중복 선택하거나 확정할 수 없다.
- 선택한 장소가 90분 간격의 새 slot과 함께 active course 끝에 추가된다.
- 재사용 컴포넌트가 mock, route와 코스 draft를 직접 참조하지 않는다.
- 320px 이상에서 fixed CTA가 내용을 가리거나 가로 overflow를 만들지 않는다.
- keyboard와 screen reader로 같은 장소 선택·확정 흐름을 완료할 수 있다.
- 관련 테스트, lint, build와 디자인 QA가 실제로 통과한다.
- 기존 dirty worktree와 무관한 화면, 백엔드와 문서를 되돌리거나 정리하지 않는다.

## Git 안전성

- 기존 수정과 미추적 파일은 사용자 작업으로 보존한다.
- stage, commit, branch, worktree와 push는 별도 승인 없이 수행하지 않는다.
