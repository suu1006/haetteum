# Haetteum 메인·웰컴 화면 설계

**상태:** 메인 화면 상세 설계 사용자 승인, 문서 검토 대기
**작성일:** 2026-08-20
**최종 갱신:** 2026-08-21
**범위:** `/` 메인 탐색 화면, `/welcome` 웰컴 화면, 화면 조합 계층

## 1. 목표

- `/`를 Haetteum의 메인 여행 탐색 화면으로 만든다.
- `/welcome`을 서비스 소개와 첫 진입을 담당하는 웰컴 화면으로 만든다.
- App Router 파일은 라우트와 페이지 조립만 담당하고, 화면 단위 구성은
  `components/patterns`가 소유한다.
- 실제 API가 없는 현재 단계에서도 제품 정보 구조와 반응형 UI를 검증할 수 있게
  정적 표시 데이터를 사용한다.
- 사용자 제공 참고 이미지의 제품 문구를 복사하지 않고 상단 이미지, 검색, 목록,
  배너, 내비게이션의 구조와 정보 밀도를 Haetteum에 맞게 적용한다.

## 2. 비목표

- Nest API, React Query, Zustand 또는 공유 도메인 계약을 연결하지 않는다.
- 로그인 경로와 인증 동작을 구현하지 않는다.
- `탐색`, `내 일정`, `내 후기`, `마이페이지`의 새 route나 placeholder 화면을
  임의로 만들지 않는다.
- 최종 관광지 이미지, 지도 SDK, 일정 생성 기능을 구현하지 않는다.

## 3. 라우트 책임

### `/welcome`

- 서비스 가치와 Haetteum의 여행 경험을 소개한다.
- 여행지 탐색, 통합 후기, AI 코스의 세 가지 기능을 설명한다.
- 주요 CTA 문구는 정확히 `여행 시작하기`로 사용하고 `/`로 이동한다.
- 로그인은 보조 링크 형태로 표시하되, 목적지가 확정되지 않았으므로 비활성 안내로
  처리한다.
- 하단 내비게이션을 표시하지 않는다.

### `/`

- 상단 브랜드와 현재 지역 문맥을 제공한다.
- 검색 진입, 지역 필터, 추천 관광지, 관광지 순위, 진행 중인 축제,
  AI 여행 코스 진입을 한 화면에서 제공한다.
- 실제 데이터 연결 전까지 정적 표시 모델을 사용한다.
- 하단 내비게이션은 `홈`, `탐색`, `내 일정`, `내 후기`, `마이페이지`의 5개
  항목을 표시한다. 이번 범위에서는 `홈`만 실제 route와 현재 위치를 가지며,
  나머지 항목은 `준비 중` 상태로 표시한다.

## 4. 메인 화면 정보 구조

메인 화면은 아래 다섯 영역을 순서대로 렌더링한다.

1. **상단 이미지 영역**
   - 220~260px 높이의 국내 여행 이미지를 사용한다.
   - 이미지 위에 인사말과 `오늘은 어디로 떠나볼까요?`를 표시한다.
   - 텍스트 가독성을 위한 제한된 scrim만 사용하고 별도 상태바나 휴대폰 frame은
     재현하지 않는다.
2. **검색 영역**
   - 상단 이미지 하단과 겹치는 surface에 검색 필드와 콘텐츠 탭을 배치한다.
   - 탭은 `추천`, `인기 관광지`, `관광 축제`, `AI 코스`로 구성한다.
   - 지역 필터는 `서울`, `경기`, `강원`, `부산`, `제주`를 제공한다.
3. **리스트 영역**
   - `지역별 인기 관광지 TOP 3`는 순위가 있는 가로 스크롤 목록으로 표시한다.
   - `이번 주 인기 축제`는 이미지와 날짜·장소가 있는 세로 목록으로 표시한다.
4. **배너 영역**
   - 관광지와 축제 사이에 AI 맞춤 코스 배너를 배치한다.
   - CTA 문구는 `코스 추천받기`를 사용하고 새 route가 승인되기 전에는 mock
     interaction 결과를 현재 화면에서 제공한다.
5. **내비게이션 영역**
   - 화면 하단에 고정하고 safe area를 반영한다.
   - 활성 항목은 색상뿐 아니라 `aria-current="page"`로 함께 전달한다.

## 5. 컴포넌트 구조

```text
apps/web/src/app/page.tsx
  -> MainDiscovery
     -> DiscoveryHero
     -> DiscoverySearchPanel
     -> RankedPlaceSection
        -> PlaceRankingCard
     -> AiCourseBanner
     -> FestivalSection
        -> FestivalListItem
     -> BottomNavigation

apps/web/src/app/welcome/page.tsx
  -> WelcomeHero
     -> WelcomeFeatureCard

apps/web/src/components/patterns/
  main-discovery.tsx
  discovery-hero.tsx
  discovery-search-panel.tsx
  ranked-place-section.tsx
  festival-section.tsx
  welcome-hero.tsx
  welcome-feature-card.tsx

apps/web/src/components/travel/
  place-ranking-card.tsx
  festival-list-item.tsx
  ai-course-banner.tsx
  bottom-navigation.tsx
```

- `app`은 metadata와 pattern 조립만 담당한다.
- `patterns`는 여러 Foundation·travel 컴포넌트를 화면 단위로 조합한다.
- `components/ui`에는 여행 도메인 조건을 추가하지 않는다.
- `components/travel`은 API 요청이나 라우트 전환을 직접 소유하지 않는다.
- 검색 입력, 탭과 지역 필터는 범용 `components/ui`를 사용하며 페이지 전용
  variant를 범용 컴포넌트에 추가하지 않는다.

## 6. 시각 방향

- 기존 `DESIGN.md`의 밝은 모바일 surface, Pretendard, primary purple,
  44px 최소 터치 영역과 safe area 규칙을 그대로 사용한다.
- 웰컴 화면은 여행 경로를 연상시키는 하나의 시각 모티프에 강조를 집중하고,
  기능 카드는 조용한 surface로 구성한다.
- 메인 화면은 정보 탐색이 우선이며 primary 색상은 CTA와 선택 상태에만 사용한다.
- 320px 이상 모바일을 기본으로 하고, 768px 이상에서는 모바일 정보 구조를 유지한
  채 콘텐츠 폭만 제한한다.
- 여행지 카드 목록은 320px에서도 다음 카드의 일부가 보여 가로 탐색 가능성을
  전달하고, 768px 이상에서도 모바일 최대 폭 480px 안에서 같은 구조를 유지한다.
- 참고 이미지의 사진이나 AI 캐릭터를 복제하지 않고 Haetteum이 소유하는 로컬
  이미지 자산으로 교체한다.

## 7. 상태와 데이터

- 이번 범위의 콘텐츠는
  `apps/web/src/features/discovery/main-discovery.mock.ts`의 읽기 전용 정적 표시
  모델이다.
- 기본 지역은 `제주`이며 관광지 mock은 `성산일출봉`, `협재해수욕장`, `비자림`을
  사용한다. 평점, 후기 수, 축제 날짜와 장소는 실제 운영 정보가 아닌 화면 검증용
  데이터임을 코드에서 명확히 구분한다.
- 검색어, 콘텐츠 탭과 지역 필터는 URL query로 표현하고 mock 목록에만 반영한다.
  전체 화면을 Client Component로 전환하거나 Zustand·React Query를 추가하지 않는다.
- AI 코스 CTA는 현재 화면에서 mock 추천 완료 상태를 보여 주며 새 route를 만들지
  않는다.
- loading, error, empty 상태는 실제 데이터 계층을 연결할 때 feature 계층에서
  추가한다.

## 8. 접근성과 검증

- 제목 계층, landmark, 링크와 버튼의 의미를 유지한다.
- 색상만으로 선택 상태를 전달하지 않는다.
- `/welcome`의 CTA가 `/`를 가리키는지 자동 테스트로 검증한다.
- `/`와 `/welcome`의 핵심 heading과 콘텐츠 영역을 컴포넌트 테스트로 검증한다.
- 순위는 단순 badge가 아니라 순서가 있는 목록 의미를 사용한다.
- 검색 form, 선택된 탭·지역, 활성 내비게이션과 준비 중 메뉴 상태를 자동 테스트로
  검증한다.
- Vitest, ESLint, Next production build를 실행한다.
- 320px, 390px, 768px 폭에서 overflow, 이미지 crop, 터치 영역과 고정 내비게이션을
  실제 브라우저로 확인한다.

## 9. 승인된 수용 기준

- `/`가 초기 Next.js 안내 화면이 아니라 메인 여행 탐색 화면을 렌더링한다.
- `/welcome`이 독립된 웰컴 화면을 렌더링한다.
- `여행 시작하기` CTA가 `/`로 이동한다.
- `/welcome`에는 하단 내비게이션이 없다.
- `/`는 상단 이미지, 검색, 관광지·축제 목록, AI 배너, 하단 내비게이션의 다섯
  영역을 순서대로 렌더링한다.
- 하단 내비게이션은 `홈`, `탐색`, `내 일정`, `내 후기`, `마이페이지`를 표시한다.
- mock 데이터와 UI 상태는 실제 API 데이터로 오해되지 않게 분리한다.
- API, 로그인과 미승인 신규 route를 임의로 구현하지 않는다.
