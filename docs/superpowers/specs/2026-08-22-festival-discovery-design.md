# 관광 축제 탭 상세 설계

**상태:** 사용자 화면 설계 승인, 문서 검토 대기
**작성일:** 2026-08-22
**범위:** `/` 메인 탐색 화면의 `관광 축제` 탭 콘텐츠

## 1. 목표

- 현재 해뜸 메인 화면의 히어로, 검색, 콘텐츠 탭, 지역 선택과 하단 내비게이션을 유지한다.
- `관광 축제` 탭을 선택했을 때 축제 탐색에 맞는 필터, 순위 카드, 월간 테마와 AI 코스 배너를 제공한다.
- shadcn 기반 Foundation을 재사용하고, 축제 표현과 화면 조합의 책임을 분리한다.
- 실제 축제 API를 연결하기 전에도 URL 기반 필터와 현실적인 mock 데이터로 핵심 상호작용을 검증한다.

## 2. 참고 이미지 적용 원칙

- 사용자 제공 이미지는 축제 탭의 정보 구조, 카드 밀도와 탐색 흐름을 위한 참고 자료로만 사용한다.
- 이미지 속 서비스명, 축제명, 날짜, 순위, 사진과 AI 캐릭터를 제품 데이터로 복사하지 않는다.
- 기존 해뜸의 Pretendard, primary purple, 밝은 surface, 44px 터치 영역, radius와 safe-area 규칙을 유지한다.
- 공통 상단을 참고 이미지의 흰색 헤더 구조로 교체하지 않는다.

## 3. 비목표

- Nest API, Prisma, React Query 또는 실제 관광 데이터 제공자를 연결하지 않는다.
- 축제 상세, 전체 목록, AI 코스 결과를 위한 신규 route를 만들지 않는다.
- 기존 추천 탭의 관광지 순위, AI 배너와 간단 축제 목록을 전면 재설계하지 않는다.
- 하단 내비게이션의 준비 중 메뉴를 활성화하지 않는다.
- 참고 이미지의 휴대폰 frame이나 상태 표시줄을 재현하지 않는다.

## 4. 선택한 접근

`FestivalSection`에 모든 축제 탭 책임을 추가하지 않고, 전용 화면 패턴인
`FestivalDiscovery`를 추가한다.

- 추천 탭은 기존의 간단한 `FestivalSection`을 계속 사용한다.
- 관광 축제 탭은 `FestivalDiscovery`가 필터, 순위 카드와 배너를 조합한다.
- 축제 카드와 배너는 `components/travel`에서 독립적인 props 기반 표현 컴포넌트로 제공한다.
- URL 파싱, 필터링과 mock 선택은 `features/discovery`가 담당한다.

이 구조는 추천 탭의 간단한 축제 노출과 축제 탭의 깊은 탐색 경험이 한 컴포넌트에서 조건문으로 얽히는 것을 방지한다.

## 5. 정보 구조

공통 상단 아래의 축제 탭 콘텐츠는 다음 순서로 렌더링한다.

1. **제목과 필터**
   - 제목은 `관광 축제`를 사용한다.
   - 필터는 `진행 중`, `이번 주`, `무료`, `가족`을 제공한다.
   - 지역은 공통 검색 패널의 기존 지역 선택을 단일 기준으로 사용해 중복 필터를 만들지 않는다.
2. **축제 순위 목록**
   - 순위, 진행 상태, 사진, 축제명, 기간, 지역과 태그를 포함한 세로형 카드를 가로 스크롤 목록으로 표시한다.
   - 390px 화면에서 두 장 안팎과 다음 카드 일부가 보여 가로 탐색 가능성을 전달한다.
3. **추가 축제 노출**
   - `더 많은 축제 보기` 버튼은 새 route로 이동하지 않고 현재 목록에 추가 mock 축제를 펼친다.
   - 추가 노출 이후 버튼은 `추가 축제를 모두 펼쳤어요` 상태 문구로 교체하고, `접기` 동작은 만들지 않는다.
4. **이달의 축제 배너**
   - 계절 주제, 설명, 기간과 태그를 왼쪽에, 전용 이미지를 오른쪽에 배치한다.
   - 모바일 좁은 폭에서도 텍스트가 이미지에 덮이지 않게 별도 column 영역을 유지한다.
5. **AI 축제 코스 배너**
   - 기존 AI 여행 코스 배너의 레이아웃과 완료 상태 상호작용을 재사용한다.
   - 제목, 설명, CTA와 완료 문구는 props로 주입해 축제 문맥으로 바꾼다.

## 6. 컴포넌트와 파일 책임

```text
apps/web/src/components/patterns/main-discovery.tsx
  -> 추천 탭: 기존 섹션 조합
  -> 관광 축제 탭: FestivalDiscovery

apps/web/src/components/patterns/festival-discovery.tsx
  -> FestivalFilterGroup
  -> FestivalRankingCard 목록
  -> 더 많은 축제 보기
  -> FestivalFeatureBanner
  -> AiCourseBanner

apps/web/src/components/travel/festival-filter-group.tsx
apps/web/src/components/travel/festival-ranking-card.tsx
apps/web/src/components/travel/festival-feature-banner.tsx
```

- `components/ui`는 shadcn 기반 `Button`, `Card`, `ToggleGroup`, `Badge` 같은 범용 요소만 소유한다.
- 필요한 shadcn 컴포넌트는 실제 사용 시점에만 추가하고 해뜸 semantic token으로 표현한다.
- `FestivalFilterGroup`은 필터 표시와 링크 생성만 담당하고 데이터 필터링을 수행하지 않는다.
- `FestivalRankingCard`는 축제 props를 표현하며 URL, API 또는 전역 상태를 알지 않는다.
- `FestivalDiscovery`는 화면 순서와 국소적인 `더 보기` 상호작용만 조합한다.
- `features/discovery`는 query 파싱, 필터 조건, 표시 목록과 빈 상태를 계산한다.

## 7. 데이터 모델과 상태

축제 표시 모델은 다음 정보를 갖는다.

```text
FestivalItem
- id
- rank
- title
- dateLabel
- region / location
- status: ongoing | upcoming
- isThisWeek
- isFree
- audiences
- tags
- image
```

축제 전용 query는 기존 `q`, `region`, `tab`을 보존하면서 다음 값을 선택적으로 추가한다.

```text
festivalStatus=ongoing
festivalPeriod=week
festivalPrice=free
festivalAudience=family
```

- 필터 상태는 URL query로 표현해 새로고침과 링크 이동 후에도 유지한다.
- 각 필터는 독립적인 URL 링크로 켜고 끌 수 있으며, 활성 상태는 색상과 `aria-current="true"` 및 화면 낭독용 선택 문구로 함께 전달한다.
- 검색어와 공통 지역 조건을 먼저 적용한 뒤 축제 전용 조건을 적용한다.
- 조건에 맞는 결과가 없으면 선택 조건을 설명하고 `축제 필터 초기화` 링크를 제공한다.
- 데이터와 이미지에는 mock임을 코드 경계와 이름으로 명확히 남긴다.

## 8. shadcn과 재사용 원칙

- 필터는 기존 Toggle과 ToggleGroup의 시각 규칙을 재사용한 링크형 pill로 만들고 최소 높이 44px을 유지한다. URL 이동을 담당하는 링크를 Toggle 버튼 내부에 중첩하지 않는다.
- 카드 surface, border와 radius는 shadcn `Card`를 사용한다.
- 상태와 태그는 shadcn `Badge`를 추가해 공통 variant로 표현한다.
- `더 많은 축제 보기`와 AI CTA는 shadcn `Button`을 사용한다.
- 축제 순위와 상태를 CSS 도형, emoji 또는 직접 만든 SVG로 대체하지 않는다.
- 기존 Lucide 아이콘과 로컬 이미지 자산을 사용하며 외부 이미지 런타임 의존성을 만들지 않는다.
- 동일한 표시 컴포넌트가 추천 탭과 축제 탭에서 필요하면 props와 variant로 재사용하고 화면 조건은 pattern 계층에 남긴다.

## 9. 이미지 자산

- 기존 `apps/web/public/images/discovery/festival-jeju.png`는 어울리는 카드에서 재사용할 수 있다.
- 부족한 축제 카드와 월간 테마 이미지는 같은 현실적인 국내 여행 사진 방향으로 제작한다.
- 새 자산은 `apps/web/public/images/discovery/festivals/`에 목적을 알 수 있는 파일명으로 저장한다.
- 카드 이미지는 고정 aspect ratio와 `object-cover`를 사용하고, 월간 배너는 텍스트 방향에 맞는 focal point를 갖는다.
- 이미지 안에 UI 텍스트를 합성하지 않는다. 축제명, 날짜와 상태는 접근 가능한 HTML 콘텐츠로 제공한다.

## 10. 반응형과 시각 규칙

- 메인 앱 surface의 최대 폭 480px과 중앙 정렬을 유지한다.
- 320px에서도 본문 가로 overflow가 발생하지 않아야 하며, 필터와 카드 목록만 의도적으로 가로 스크롤한다.
- 축제 카드 폭은 화면에 한 장만 과도하게 크게 보이지 않고 다음 항목의 일부가 보이도록 고정한다.
- primary purple은 활성 필터, 상태 강조와 CTA에만 사용한다.
- 기본 카드에는 강한 그림자를 추가하지 않고 border와 기존 card elevation을 사용한다.
- 하단 고정 내비게이션과 safe-area를 고려해 마지막 배너 아래 여백을 유지한다.

## 11. 접근성과 상호작용

- 축제 순위는 순서가 있는 목록으로 제공한다.
- 축제 카드는 축제명을 포함한 접근 가능한 article 이름을 갖는다.
- 필터의 활성 상태와 탭의 현재 상태는 색상에만 의존하지 않는다.
- 모든 필터, 더 보기와 CTA는 키보드로 조작할 수 있고 44×44px 이상의 터치 영역을 갖는다.
- 가로 목록은 focus 이동을 방해하지 않으며 scrollbar가 숨겨져도 스크롤 가능해야 한다.
- `더 많은 축제 보기` 후 추가된 항목 수를 status로 알린다.
- AI CTA 결과는 기존과 동일하게 live status로 전달한다.
- `prefers-reduced-motion`에서는 목록과 상태 변화에 별도 이동 애니메이션을 사용하지 않는다.

## 12. 오류와 빈 상태

- mock 단계에서는 네트워크 loading과 error UI를 추가하지 않는다.
- 검색 또는 필터 결과가 비면 빈 카드 목록 대신 안내 문구와 초기화 링크를 표시한다.
- 잘못된 query 값은 무시하고 승인된 기본값으로 정규화한다.
- 이미지 로딩 실패를 별도 placeholder 도형으로 숨기지 않으며 Next Image의 고정 영역으로 layout shift를 방지한다.

## 13. 테스트와 검증

- `parseDiscoveryQuery`가 축제 filter query를 정규화하는지 검증한다.
- `selectDiscoveryView`가 검색어, 지역과 축제 필터를 함께 적용하는지 검증한다.
- 관광 축제 탭에서 관광지 순위와 일반 AI 배너가 숨고 `FestivalDiscovery`만 표시되는지 검증한다.
- 추천 탭의 기존 섹션 순서가 유지되는지 회귀 테스트한다.
- 필터 링크가 기존 검색어, 지역과 탭을 보존하는지 검증한다.
- 순위 목록, 카드 이름, 필터 상태, 빈 상태, 더 보기와 AI 완료 상태를 컴포넌트 테스트로 검증한다.
- axe 기반 접근성 검사를 축제 탭 조합에 실행한다.
- focused Vitest, 전체 web Vitest, ESLint와 Next production build를 실행한다.
- 320px, 390px, 480px와 넓은 화면 중앙 surface에서 실제 브라우저로 overflow, 이미지 crop, 카드 노출 밀도, 필터와 고정 내비게이션을 확인한다.
- 동일 viewport와 동일 탭 상태에서 참고 이미지와 구현 화면을 비교하고 P0, P1, P2 차이를 수정한다.

## 14. 수용 기준

- 공통 상단과 하단 내비게이션의 현재 해뜸 디자인이 유지된다.
- `관광 축제` 탭에서 축제 제목, 필터, 순위 카드, 더 보기, 이달의 축제와 AI 축제 코스가 순서대로 표시된다.
- 추천 탭은 기존 관광지, 일반 AI 배너와 간단 축제 목록 구성을 유지한다.
- 필터는 URL에 반영되고 검색어와 지역 조건을 잃지 않는다.
- 축제 카드와 배너는 재사용 가능한 props 기반 컴포넌트이며 API와 라우팅을 직접 소유하지 않는다.
- shadcn Foundation과 해뜸 semantic token을 사용하고 화면 전용 색상과 radius를 임의로 추가하지 않는다.
- 필요한 사진은 로컬 자산으로 제공되고 참고 이미지의 제품 콘텐츠를 복제하지 않는다.
- API, 인증 또는 미승인 신규 route를 추가하지 않는다.
