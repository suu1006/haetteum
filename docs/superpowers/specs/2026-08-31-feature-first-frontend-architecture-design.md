# Feature-First Frontend Architecture Design

## 목적

Haetteum 웹 프론트엔드를 기술 계층 중심의 전역 `components/patterns`,
`components/travel`, 평면적인 `features` 구조에서 기능 소유권이 명확한
feature-first 구조로 변경한다. 동작과 화면은 유지하고, 함께 변경되는 API,
모델, 상태, 컴포넌트와 테스트가 같은 기능 디렉터리에 있도록 재배치한다.

이 설계는 다음 문제를 해결한다.

- 기능 하나를 수정할 때 `app`, `features`, `components/patterns`,
  `components/travel`을 모두 찾아야 한다.
- 표현 컴포넌트 계층이 API 요청, React Query, 인증 상태와 라우팅 흐름을 직접
  소유한다.
- 공용 타입처럼 사용되는 `DiscoveryImage`가 특정 기능에 속해 feature 간 직접
  의존을 만든다.
- 공용 컴포넌트와 특정 기능에서만 사용하는 컴포넌트가 같은 디렉터리에 있어
  재사용 가능 여부를 파일명만으로 판단하기 어렵다.

## 범위

이번 변경은 `apps/web`의 디렉터리 구조, import 경로, 테스트 위치와 프론트
아키텍처 문서를 대상으로 한다. 렌더링 결과, URL, API 계약, 상태 전이, 사용자
문구와 스타일은 변경하지 않는다. `apps/api`와 데이터베이스는 변경하지 않는다.

작업 트리에 이미 존재하는 미커밋 프론트 변경은 새 구조의 입력으로 취급한다.
해당 변경을 되돌리거나 이전 커밋의 내용으로 덮어쓰지 않는다.

## 목표 구조

```text
apps/web/src/
  app/                         # URL 경계, metadata, 서버 화면 조립
  features/
    auth/
      api/                     # 인증 HTTP 요청
      model/                   # 사용자와 인증 상태
      components/              # bootstrap, hydration, 로그인 UI
      index.ts                 # app/다른 소비자를 위한 공개 API
    courses/
      api/
      model/
      components/
      index.ts
    discovery/
    explore/
    festivals/
    places/
    profile/
    reviews/
    themes/
    trips/
    welcome/
  shared/
    components/
      travel/                  # 둘 이상의 기능이 재사용하는 순수 표현 컴포넌트
    model/                     # 기능 중립 값 객체와 타입
    lib/                       # 기능 중립 유틸리티
  components/
    ui/                        # 도메인을 모르는 디자인 시스템 primitive
  styles/
```

`features/query`는 제품 기능이 아니라 서버 상태 기반 시설이므로
`shared/query`로 이동한다. 기존 `src/lib`의 기능 중립 유틸리티도
`shared/lib`로 이동한다.

## 소유권 규칙

### `app`

- URL segment, route params, search params, metadata와 Next.js 서버 경계를 소유한다.
- 기능의 내부 파일이 아니라 각 feature의 `index.ts` 공개 API만 import한다.
- 복잡한 화면 상태나 사용자 행동을 직접 구현하지 않는다.

### `features/<feature>/api`

- 해당 기능의 HTTP 요청과 응답 경계 검증을 소유한다.
- React Query query option과 mutation option을 소유한다.
- API 응답을 기능 모델로 변환하는 adapter를 호출할 수 있다.
- React 컴포넌트와 브라우저 표시 상태를 소유하지 않는다.

### `features/<feature>/model`

- 기능 전용 TypeScript 타입, 상수와 상태 표현을 소유한다.
- 필터링, 후보 선택, URL 생성, API-to-view-model 변환과 같은 순수 함수를
  소유한다.
- React, Next.js router, React Query와 네트워크 요청에 의존하지 않는다.

### `features/<feature>/components`

- 해당 기능에서만 사용하는 표현 컴포넌트와 조합 컴포넌트를 함께 소유한다.
- query hook, mutation, feature 상태, navigation 같은 사용자 흐름을 소유할 수
  있다.
- 자신의 feature 내부 상대 경로, `shared`, `components/ui`만 import한다.

### `shared`

- 두 개 이상의 feature가 실제로 사용하는 기능 중립 코드만 둔다.
- 특정 API endpoint, 특정 route 또는 feature 상태를 알지 못한다.
- `shared/components/travel`은 명시적 props로 렌더링하는 순수 표현 컴포넌트만
  소유한다.
- 공용화 가능성이 아니라 현재 확인된 재사용을 기준으로 승격한다.

### `components/ui`

- shadcn/Base UI 기반 접근성 primitive와 공통 variant만 소유한다.
- 여행 도메인 타입, API 타입, feature 조건을 import하지 않는다.

## 의존 방향

허용되는 기본 의존 방향은 다음과 같다.

```text
app
  -> features/<feature>/index.ts
  -> shared
  -> components/ui

features/<feature>
  -> shared
  -> components/ui

shared/components
  -> shared/model, shared/lib
  -> components/ui

components/ui
  -> styles, 외부 UI primitive
```

feature 간 직접 import는 금지한다. 기능 간 조합은 `app` 또는 상위 orchestration
feature가 각 feature의 공개 API를 통해 수행한다. 동일 타입이나 순수 함수가 두
기능에서 필요하면 의미가 기능 중립인지 확인한 후 `shared`로 옮긴다.

초기 리팩터링에서는 현재 메인 탐색 화면이 여러 기능을 조합하므로
`discovery`를 orchestration feature로 인정한다. 이 경우에도 다른 feature의 내부
파일이 아니라 공개 `index.ts`만 import한다. 순환 의존이 생기면 조합을 `app`으로
올린다.

## 기능별 이동 기준

- `auth`: 로그인 화면, bootstrap, hydration, auth store와 인증 client/server
  adapter.
- `courses`: 코스 편집, 저장 코스, 랜덤 코스 생성, 일정/코스 전용 UI.
- `discovery`: 메인 탐색 shell, 순위, 인기 영상/reels, 검색과 메인 navigation.
- `explore`: 탐색 카테고리와 목적지 화면.
- `festivals`: 축제 탐색, 축제 목록/상세, 축제 API와 필터 UI.
- `places`: 장소 상세, 주변 장소, 장소 코스와 장소 후기 표시.
- `profile`: 마이페이지 shell, 프로필 요약, 메뉴와 여행 기록 표시.
- `reviews`: 내 후기 목록, 후기 작성·수정과 후기 입력 UI.
- `themes`: 테마 여행과 테마 코스 탐색.
- `trips`: 여행 일정, 참가자와 확정 일정 UI.
- `welcome`: 웰컴 hero, 대화/코스 slide와 CTA UI.

`Button`, `Card`, `Input`, `Select`, `Toggle` 등은 `components/ui`에 유지한다.
`RatingSummary`, `ProviderBadge`, `ReviewCard`, `PlaceCard`, `ItineraryItem`처럼
둘 이상의 기능에서 실제 사용되는 순수 표현 컴포넌트만
`shared/components/travel`에 둔다. 사용처가 하나뿐인 파일은 이름이 범용적으로
보이더라도 해당 feature가 소유한다.

## 공유 모델

현재 `DiscoveryImage`는 courses, festivals, places와 discovery가 함께 사용하므로
`shared/model/image.ts`의 `ImageAsset`으로 이동한다. 기존 필드와 의미는 유지하고
모든 소비자가 새 이름을 사용한다.

API 응답 타입은 `@haetteum/contracts`를 단일 원천으로 유지한다. feature
`model`은 API 타입을 복제하지 않고, 화면이나 사용자 흐름에 필요한 view model과
상태 타입만 정의한다.

## 공개 API

각 feature의 `index.ts`는 `app`과 orchestration 소비자에게 필요한 최소 심볼만
export한다. feature 내부 컴포넌트끼리는 barrel을 통하지 않고 상대 경로를
사용하여 순환 의존을 방지한다.

다른 feature는 `@/features/<feature>`만 사용할 수 있으며
`@/features/<feature>/api/...`, `model/...`, `components/...` deep import를 사용하지
않는다.

## 테스트 전략

- 기존 동작 테스트를 파일 이동 전에 기준선으로 실행한다.
- 제품 동작은 바꾸지 않으므로 기존 assertion을 유지하고 import 경로와 테스트
  위치만 새 소유권에 맞춘다.
- 테스트는 `tests/unit/features/<feature>`에서 해당 기능의 API, model,
  components를 함께 구성한다.
- `tests/unit/shared`는 공유 컴포넌트와 모델만 검증한다.
- 정적 아키텍처 테스트를 추가하여 다음을 검증한다.
  - `components/ui`가 `features`, `shared/components/travel` 또는 도메인 계약을
    import하지 않는다.
  - `shared`가 `features` 또는 `app`을 import하지 않는다.
  - feature 간 deep import가 존재하지 않는다.
  - `app`이 feature 내부 경로를 deep import하지 않는다.
- 전체 Vitest, TypeScript 검사와 ESLint를 최종 실행한다.

파일 이동 자체는 새 동작을 만들지 않으므로 기존 테스트가 회귀 검증을 담당한다.
새 아키텍처 경계는 실패하는 정적 테스트를 먼저 추가한 후 구조를 이동해 통과시킨다.

## 문서화

루트에 `FRONTEND_ARCHITECTURE.md`를 생성하여 최종 디렉터리 구조, 각 계층의
책임, 의존 규칙, 파일 배치 판단 절차와 예시를 기록한다. `ARCHITECTURE.md`의
프론트엔드 절은 개요와 링크만 유지하도록 정리하고, `README.md`의 문서 목록에도
프론트 아키텍처 문서를 추가한다. 기존 `DESIGN.md`의 UI 시각 언어와 디자인
시스템 규칙은 그대로 유지하되, 오래된 컴포넌트 경로 설명은 새 문서를 참조하게
갱신한다.

## 마이그레이션 순서

1. 현재 전체 웹 테스트, typecheck와 lint 기준선을 확인한다.
2. 아키텍처 경계 테스트를 추가하고 현재 구조에서 예상대로 실패하는지 확인한다.
3. `shared/model`, `shared/lib`, `shared/query`를 만들고 기능 중립 코드를 이동한다.
4. auth, profile, reviews, trips, welcome처럼 경계가 비교적 독립적인 기능을 이동한다.
5. festivals, explore, themes를 이동한다.
6. places와 courses를 이동하고 랜덤 코스 및 주변 장소 query 흐름을 feature에
   귀속한다.
7. discovery orchestration과 순위/reels 컴포넌트를 이동한다.
8. 실제 다중 기능 재사용이 확인된 표현 컴포넌트만 shared에 남긴다.
9. 테스트를 새 소유권 구조로 이동하고 모든 deep import를 공개 API로 교체한다.
10. 프론트 아키텍처 문서를 작성하고 기존 문서 링크를 갱신한다.
11. 전체 검증을 실행하고 빈 `components/patterns`, `components/travel`, 기존
    `features/query`, `src/lib` 디렉터리가 남지 않았는지 확인한다.

## 완료 조건

- 모든 기능 전용 코드와 테스트가 해당 `features/<feature>` 아래에서 찾을 수 있다.
- 전역 `components/patterns`와 `components/travel` 디렉터리가 제거된다.
- API 요청이나 사용자 흐름을 소유한 컴포넌트가 `shared`에 존재하지 않는다.
- feature 간 deep import와 공유 계층의 feature 의존이 정적 테스트로 차단된다.
- 기존 웹 테스트, typecheck와 lint가 통과한다.
- `FRONTEND_ARCHITECTURE.md`가 현재 코드 구조와 일치하고 기존 아키텍처 문서에서
  연결된다.
- 기존 사용자 작업과 제품 동작이 보존된다.
