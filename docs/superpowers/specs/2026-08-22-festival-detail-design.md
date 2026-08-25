# 축제 상세 페이지 설계

**상태:** 사용자 최종 승인
**작성일:** 2026-08-22
**범위:** 메인 탐색의 축제 카드에서 진입하는 재사용 가능한 축제 상세 화면

## 1. 목표

- 추천 탭과 관광 축제 탭의 축제 카드를 누르면 독립적인 상세 URL로 이동한다.
- 사용자 제공 참고 이미지의 정보 위계와 모바일 밀도를 따르되 해뜸의 기존 디자인 시스템을 유지한다.
- 모든 현재 축제가 같은 상세 화면과 데이터 계약을 재사용한다.
- 뒤로가기, 찜, 공유, 소개 펼치기와 이미지 탐색은 실제로 동작한다.
- 일정 추가와 길찾기는 향후 기능임을 명확히 안내한다.

## 2. 참고 이미지 적용 원칙

- 참고 이미지는 상세 화면의 영역 순서, 정보 밀도, 이미지 중심 상단과 고정 하단 행동 영역을 위한 시각 기준으로 사용한다.
- 이미지 속 휴대폰 frame, 상태 표시줄, 서비스 문구, 평점, 후기 수와 추천 장소를 제품 데이터로 복제하지 않는다.
- Pretendard, primary purple, 밝은 surface, semantic token, 44px 이상 터치 영역과 safe-area 규칙을 유지한다.
- 프로그램과 추천 포인트는 emoji 또는 임의 도형 대신 기존 Lucide 아이콘을 사용한다.
- 원본 화면의 사진을 잘라 제품 자산으로 사용하지 않는다. 필요한 축제 이미지는 해뜸 소유의 로컬 자산으로 제작한다.

## 3. 선택한 접근

축제 상세를 `/festivals/[festivalId]` 동적 라우트로 제공한다.

- 주소 공유, 새로고침, 직접 진입과 브라우저 뒤로가기를 지원한다.
- 상세 페이지는 Server Component를 기본으로 유지한다.
- 찜, 공유, 갤러리 카운터, 소개 펼치기와 준비 중 안내만 작은 Client Component로 격리한다.
- URL 생성과 데이터 선택은 `features/festivals`가 담당한다.
- `components/travel`은 전달받은 표시 데이터와 `href`만 사용하고 API 또는 URL 조합 규칙을 소유하지 않는다.

같은 화면을 메인 내부 상태로 교체하는 방식은 직접 URL이 없고, intercepting route 기반 전체 화면 modal은 현재 요구보다 복잡하므로 사용하지 않는다.

## 4. 사용자 흐름

1. 사용자가 추천 탭의 간단 축제 항목 또는 관광 축제 탭의 순위 카드를 누른다.
2. 전체 카드가 하나의 접근 가능한 링크로 동작해 `/festivals/{festivalId}`로 이동한다.
3. 상세 화면은 해당 축제의 갤러리, 기본 정보, 소개, 프로그램, 추천 포인트와 주변 코스를 표시한다.
4. 사용자는 이미지를 넘기고, 소개를 펼치거나 접고, 찜 상태를 바꾸고, 현재 주소를 공유할 수 있다.
5. 일정 추가 또는 길찾기를 누르면 `준비 중인 기능이에요` 상태 안내가 표시된다.
6. 뒤로가기는 이전 화면으로 돌아가며 직접 URL로 진입한 경우 `/`로 이동한다.

## 5. 라우트와 데이터 흐름

```text
FestivalSection / FestivalDiscovery
  -> buildFestivalDetailHref(festival.id)
  -> FestivalListItem / FestivalRankingCard
  -> /festivals/[festivalId]/page.tsx
  -> getFestivalDetailById(festivalId)
     -> 존재: FestivalDetailScreen
     -> 없음: notFound()
```

- 상세 페이지 metadata는 축제명, 기간과 장소를 사용해 생성한다.
- mock 데이터 단계에서는 현재 축제 ID를 정적 parameter로 제공할 수 있게 상세 카탈로그를 열거 가능하게 구성한다.
- API, React Query, Nest Controller, Prisma 모델과 migration은 추가하지 않는다.

## 6. 화면 정보 구조

상세 화면은 다음 순서를 고정한다.

1. **상단 헤더**
   - 왼쪽 뒤로가기, 가운데 축제명, 오른쪽 찜과 공유를 배치한다.
   - 버튼은 44×44px 이상의 터치 영역과 명확한 접근성 이름을 갖는다.
2. **축제 갤러리**
   - 고정 비율의 큰 이미지 영역을 사용한다.
   - 여러 이미지가 있으면 가로 scroll snap으로 탐색하고 `현재/전체` 카운터를 갱신한다.
   - 한 장인 축제도 같은 컴포넌트를 사용하며 카운터는 `1/1`로 표시한다.
3. **축제 요약**
   - 축제명, 기간, 장소, 평점, 후기 수와 상태 배지를 표시한다.
   - 아래에 가족, 먹거리, 체험, 계절 또는 지역 성격을 나타내는 태그를 배치한다.
4. **축제 소개**
   - 접힌 상태에서는 정해진 줄 수만 표시하고 실제 overflow가 있을 때만 더보기 버튼을 제공한다.
   - 펼친 뒤에는 접기 동작을 제공한다.
5. **주요 프로그램**
   - 아이콘, 프로그램명과 한 줄 설명으로 구성된 네 개의 항목을 표시한다.
   - 좁은 화면에서도 읽을 수 있도록 균등 grid를 사용하고 텍스트 잘림을 피한다.
6. **추천 포인트**
   - 계절, 동행, 먹거리, 접근성 같은 이유를 카드로 표시한다.
   - 320px에서는 가로 탐색을 허용하고 390px 이상에서는 네 항목이 안정적으로 보이게 한다.
7. **주변 추천 코스**
   - 사진, 장소명, 유형과 거리를 갖는 가로 목록을 제공한다.
   - `전체보기`는 이번 범위에 새로운 route를 만들지 않고 준비 중 안내를 사용한다.
8. **고정 하단 행동 영역**
   - 보조 CTA `일정에 추가`와 primary CTA `길찾기`를 나란히 배치한다.
   - 하단 내비게이션은 상세 화면에서 표시하지 않는다.
   - 본문 마지막 내용이 고정 영역에 가려지지 않도록 높이와 safe-area만큼 여백을 예약한다.

## 7. 컴포넌트 책임

```text
apps/web/src/app/festivals/[festivalId]/page.tsx
  -> FestivalDetailScreen

apps/web/src/components/patterns/festival-detail-screen.tsx
  -> FestivalDetailHeader
  -> FestivalGallery
  -> FestivalSummary
  -> FestivalIntroduction
  -> FestivalProgramGrid
  -> FestivalRecommendationPoints
  -> NearbyCourseList
  -> FestivalDetailActions

apps/web/src/components/travel/
  festival-detail-header.tsx
  festival-gallery.tsx
  festival-summary.tsx
  festival-introduction.tsx
  festival-program-grid.tsx
  festival-recommendation-points.tsx
  nearby-course-list.tsx
  festival-detail-actions.tsx

apps/web/src/features/festivals/
  festival-detail-model.ts
  festival-detail.mock.ts
```

- `FestivalDetailScreen`은 화면 순서와 고정 하단 영역을 조합한다.
- 각 travel 컴포넌트는 props 기반 표현과 자신의 국소 상호작용만 담당한다.
- 링크 주소 생성, 상세 데이터 조회와 정적 route parameter 열거는 feature 계층이 담당한다.
- 기존 `Button`, `Badge`, `Card`를 우선 사용하며 실제 반복이 확인되지 않은 Foundation variant나 token은 선행 추가하지 않는다.

## 8. 데이터 계약

`FestivalDetail`은 목록의 요약 정보와 다음 상세 정보를 포함한다.

```text
FestivalDetail
- id
- title
- dateLabel
- region / location
- status
- rating / reviewCount
- tags
- gallery[]
- introduction
- programs[]
- recommendationPoints[]
- nearbyCourses[]
```

각 하위 항목은 안정적인 `id`와 화면에 필요한 명시적 필드를 갖는다. ReactNode나 JSX를 mock 데이터에 저장하지 않는다.

- 현재 목록에 표시되는 모든 축제 ID는 상세 카탈로그에 존재해야 한다.
- 이천쌀문화축제는 참고 화면의 밀도를 검증할 수 있는 풍부한 프로그램, 추천 포인트와 갤러리를 제공한다.
- 다른 축제도 같은 계약으로 정상 진입하며 비어 있는 상세 섹션을 임의 placeholder로 채우지 않는다.
- 주변 코스 이미지는 제품에 이미 존재하는 적절한 로컬 관광지 자산을 우선 재사용한다.

## 9. 상호작용 계약

### 뒤로가기

- Client Component가 브라우저 history가 있으면 `router.back()`을 사용한다.
- 직접 진입 등 이전 화면을 신뢰할 수 없으면 `/`로 이동한다.

### 찜

- 버튼을 누르면 현재 페이지 안에서 선택 상태와 접근성 이름을 전환한다.
- 서버 저장, 로그인 요구와 새로고침 후 persistence는 이번 범위에 포함하지 않는다.

### 공유

- 지원 환경에서는 Web Share API를 사용한다.
- 미지원 또는 취소 외 실패 환경에서는 현재 URL을 clipboard에 복사하고 결과를 `aria-live`로 알린다.
- 브라우저 권한 때문에 두 방식 모두 실패하면 실패 안내를 표시한다.

### 갤러리와 소개

- 갤러리는 버튼 전용 carousel이 아니라 터치와 트랙패드 scroll snap을 기본 입력으로 사용한다.
- 현재 slide는 IntersectionObserver 또는 동등한 가시성 기준으로 계산한다.
- 소개는 overflow가 있을 때만 펼치기 제어를 노출한다.

### 준비 중 행동

- 일정 추가, 길찾기와 주변 코스 전체보기는 disabled control로 만들지 않는다.
- 누르면 동일한 화면 안에서 `준비 중인 기능이에요` 안내를 표시해 탭 결과를 제공한다.

## 10. 이미지와 아이콘

- 이천쌀문화축제에는 서로 같은 art direction을 갖는 갤러리 이미지 세 장을 제공한다.
  - 축제 입구와 가을 들판의 전경
  - 쌀 먹거리와 체험 프로그램
  - 전통문화 공연과 가족 관람객
- 이미지에는 편집 가능한 UI 문구를 합성하지 않는다.
- 기존 축제 자산은 품질과 화면비가 맞으면 다른 축제의 단일 갤러리 이미지로 재사용한다.
- 프로그램, 추천 포인트와 행동 아이콘은 기존 `lucide-react`에서 가장 가까운 의미의 아이콘을 선택한다.
- 휴대폰 bezel, 상태 표시줄과 home indicator는 자산으로 만들지 않는다.

## 11. 반응형과 접근성

- 320px, 390px와 480px 모바일 폭을 우선 지원한다.
- 480px보다 넓은 화면은 최대 480px 앱 surface를 중앙 배치하되 휴대폰 frame을 재현하지 않는다.
- 본문 inline padding은 기존 16px 규칙을 유지한다.
- 고정 하단 영역은 `env(safe-area-inset-bottom)`을 포함한다.
- 링크와 버튼은 키보드로 조작 가능하고 명확한 `focus-visible` 상태를 갖는다.
- 선택 상태는 색상뿐 아니라 아이콘 fill, `aria-pressed`와 접근성 이름으로 전달한다.
- 갤러리는 현재 위치를 텍스트로 제공하며 각 이미지 alt는 장면을 구분한다.
- `prefers-reduced-motion`에서는 이동 animation을 추가하지 않는다.

## 12. 오류와 경계 상태

- 알 수 없는 축제 ID는 `notFound()`로 처리한다.
- gallery가 비어 있는 상세 record는 허용하지 않으며 데이터 테스트에서 차단한다.
- 프로그램, 추천 포인트 또는 주변 코스가 없는 경우 해당 섹션 자체를 렌더링하지 않는다.
- 공유 실패는 조용히 무시하지 않고 사용자에게 알린다.
- mock 단계에서는 네트워크 loading과 error UI를 만들지 않는다.

## 13. 테스트와 검증

- 모든 목록 축제 ID에 상세 데이터가 존재하는지 모델 테스트로 검증한다.
- 상세 href 생성과 잘못된 ID 선택을 검증한다.
- 순위 카드와 간단 목록 카드 전체가 올바른 상세 링크인지 검증한다.
- 상세 화면의 영역 순서, metadata, 찜 상태, 소개 펼치기, 공유 fallback과 준비 중 안내를 테스트한다.
- 상세 화면 조합에 axe 기반 접근성 검사를 실행한다.
- focused Vitest, 전체 web Vitest, ESLint와 Next production build를 실행한다.
- 320px, 390px, 480px와 넓은 화면에서 overflow, 이미지 crop, 고정 CTA와 safe-area를 실제 브라우저로 확인한다.
- 같은 viewport와 상호작용 상태에서 참고 이미지와 구현 화면을 함께 비교하고 P0, P1, P2 차이를 수정한다.
- 시각 검증 결과를 프로젝트 root의 `design-qa.md`에 기록하고 `final result: passed` 전에는 완료로 보고하지 않는다.

## 14. 비목표

- Nest API, Prisma, 실제 관광 데이터 제공자와의 연동
- 사용자 계정 기반 찜 저장
- 실제 일정 생성과 일정 화면 연결
- 지도 SDK 또는 외부 지도 앱 연결
- 주변 코스 전체보기 route
- 후기 목록과 후기 작성 기능
- Git staging, commit, branch, push 또는 PR 생성

## 15. 수용 기준

- 추천 탭과 관광 축제 탭의 모든 축제 카드가 각 상세 URL로 이동한다.
- 새로고침과 직접 URL 진입에서도 동일한 축제 상세가 표시된다.
- 상세 화면은 참고 이미지의 정보 순서를 따르면서 해뜸 token, typography와 컴포넌트 계층을 유지한다.
- 모든 현재 축제가 하나의 재사용 가능한 `FestivalDetailScreen`으로 렌더링된다.
- 뒤로가기, 찜, 공유, 갤러리와 소개 펼치기가 실제 동작한다.
- 일정 추가, 길찾기와 전체보기는 일관된 준비 중 안내를 제공한다.
- 알 수 없는 ID는 404로 처리되고 빈 갤러리 데이터는 테스트에서 거부된다.
- 하단 CTA가 콘텐츠를 가리지 않고 320px부터 넓은 화면까지 horizontal overflow가 없다.
- focused/전체 테스트, lint, build와 브라우저 시각 QA 결과를 각각 실제 실행 결과에 근거해 보고한다.
- 기존 작업 중인 변경과 무관한 파일을 되돌리거나 Git 상태를 변경하지 않는다.
