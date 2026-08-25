# 장소 후기 상세 페이지 설계

**상태:** 사용자 최종 승인

**작성일:** 2026-08-22

**범위:** 메인 장소 카드에서 진입하는 재사용 가능한 장소 상세 화면과 완성된 후기 탭

## 1. 목표

- 메인 탐색의 모든 장소 카드를 누르면 독립적인 상세 URL로 이동한다.
- 사용자 제공 참고 이미지의 모바일 화면 구성, 정보 위계와 밀도를 재현한다.
- 이천 테르메덴뿐 아니라 현재 mock에 등록된 모든 장소가 같은 상세 화면을 재사용한다.
- 1차 구현에서는 후기 탭만 완성하고 소개, 코스 추천, 정보 탭은 명확한 준비 중 화면을 제공한다.
- 실제 API 없이도 탭, 후기 출처 필터, 뒤로가기, 찜, 공유와 후기 작성 준비 중 안내가 동작한다.

## 2. 참고 이미지 적용 원칙

- 기준 이미지는 `/var/folders/18/zsywvwpj29jbnnlynpkv4qrc0000gn/T/codex-clipboard-b245c490-89e0-4bef-a666-f21daa2bd448.png`이다.
- 화면 순서는 `상단 행동 영역 → 상세 탭 → 후기 제목과 수 → 출처 필터 → 평점 요약 → 후기 피드 → 플로팅 작성 버튼`으로 유지한다.
- 휴대폰 bezel, 상태 표시줄, 이미지 바깥의 발표 자료 문구와 파란 구분선은 제품 UI로 만들지 않는다.
- 최대 480px 모바일 앱 surface, Pretendard, 밝은 surface, 16px 화면 여백, primary purple, 44px 이상 터치 영역과 safe-area 규칙을 유지한다.
- 참고 이미지의 보라색 별점과 분포 막대는 이 화면에 한정된 `primary` tone으로 제공한다. 기존 전역 rating token과 다른 화면의 기본 평점 표현은 변경하지 않는다.
- 참고 이미지의 사진을 잘라 제품 자산으로 사용하지 않는다. 부족한 후기 사진은 같은 온천·여행 사진 방향의 로컬 자산으로 제작한다.

## 3. 선택한 접근

장소 상세를 `/places/[placeId]` 동적 라우트로 제공한다.

- 주소 공유, 새로고침, 직접 진입과 브라우저 뒤로가기를 지원한다.
- 페이지는 Server Component를 기본으로 유지한다.
- 탭과 후기 출처는 URL 검색 파라미터로 표현한다.
- 뒤로가기, 찜, 공유와 후기 작성 준비 중 안내만 작은 Client Component 경계로 격리한다.
- `features/places`가 상세 mock, URL 값 해석과 데이터 선택을 담당한다.
- `components/travel`은 전달받은 표시 데이터와 상태만 렌더링하며 데이터 조회나 라우트 조합 규칙을 소유하지 않는다.

장소별 정적 페이지 복제는 데이터와 화면 중복이 커서 사용하지 않는다. 메인 위에 표시하는 intercepting route 또는 전체 화면 modal은 직접 URL과 초기 범위에 비해 복잡도가 커서 사용하지 않는다.

## 4. 사용자 흐름

1. 사용자가 메인의 장소 카드 전체 영역을 누른다.
2. `/places/{placeId}`로 이동하며 후기 탭이 기본으로 선택된다.
3. 사용자는 통합 평점과 분포를 확인하고 전체, 카카오맵, 구글맵, 네이버 블로그 출처를 필터링한다.
4. 소개, 코스 추천 또는 정보 탭을 누르면 장소명과 상단 행동 영역을 유지한 채 해당 탭의 준비 중 화면이 나타난다.
5. 찜은 현재 화면에서 선택 상태를 전환한다.
6. 공유는 Web Share API를 우선 사용하고 미지원 환경에서는 현재 URL을 clipboard에 복사한다.
7. 후기 작성하기를 누르면 이번 범위에서 준비 중인 기능임을 같은 화면에서 알린다.
8. 뒤로가기는 이전 화면으로 돌아가며 직접 진입한 경우 `/`로 이동한다.

## 5. 라우트와 URL 계약

```text
PlaceRankingCard
  -> buildPlaceDetailHref(place.id)
  -> /places/[placeId]/page.tsx
  -> getPlaceDetailById(placeId)
     -> 존재: PlaceDetailScreen
     -> 없음: notFound()

/places/icheon-termeden
  -> 기본 tab=reviews, source=all

/places/icheon-termeden?tab=reviews&source=kakao
  -> 카카오맵 후기만 표시

/places/icheon-termeden?tab=introduction
  -> 소개 준비 중 화면
```

- 지원 탭 값은 `introduction`, `course`, `reviews`, `information`이다.
- 지원 출처 값은 `all`, `kakao`, `google`, `naver`이다.
- `tab`이 없으면 `reviews`, `source`가 없으면 `all`을 사용한다.
- 알 수 없는 탭과 출처 값은 오류를 내지 않고 각각 기본값으로 정규화한다.
- 출처 파라미터는 후기 탭에서만 의미가 있으며 다른 탭에서 후기 수나 빈 목록을 표시하지 않는다.
- 페이지 metadata는 장소명과 통합 후기 수를 사용한다.

## 6. 데이터 구조와 단일 기준

메인 장소 요약은 기존 `mainDiscoveryMock.places`를 단일 기준으로 유지한다. 장소 상세 mock은 같은 `id`를 키로 평점 분포와 후기만 확장해 제목, 평점과 후기 수를 이중 관리하지 않는다.

```ts
type ReviewProviderId = "kakao" | "google" | "naver";

type PlaceReview = {
  id: string;
  provider: ReviewProviderId;
  author: string;
  rating: number;
  content: string;
  date: string;
  likeCount: number;
  avatar?: DiscoveryImage;
  images: readonly DiscoveryImage[];
};

type PlaceReviewDetail = {
  placeId: string;
  ratingDistribution: readonly {
    score: 1 | 2 | 3 | 4 | 5;
    count: number;
  }[];
  reviews: readonly PlaceReview[];
};

type ResolvedPlaceDetail = PlaceRankingItem & PlaceReviewDetail;
```

- 현재 메인에 존재하는 모든 장소 ID는 상세 extension에 존재해야 한다.
- 이천 테르메덴은 참고 화면을 검증할 수 있도록 세 출처, 사진 포함 후기와 사진 없는 후기를 모두 제공한다.
- 다른 장소도 같은 계약으로 상세 진입과 출처 필터가 정상 동작해야 한다.
- 평점 분포의 count 합계는 메인 `reviewCount`와 같아야 한다.
- 각 후기 평점은 0에서 5 사이이며 좋아요 수는 음수가 아닌 정수여야 한다.
- mock 데이터에 ReactNode, JSX 또는 컴포넌트 함수를 저장하지 않는다. provider ID는 화면 계층에서 아이콘과 표시명으로 변환한다.

## 7. 컴포넌트와 책임

### App 및 feature

- `app/places/[placeId]/page.tsx`: 비동기 params와 searchParams 해석, metadata, 상세 조회와 `notFound()` 처리
- `features/places/place-detail-model.ts`: 탭·출처 타입, href builder, 파서와 순수 선택 함수
- `features/places/place-detail.mock.ts`: 모든 현재 장소의 후기 상세 extension과 조회 함수

### Pattern

- `components/patterns/place-detail-screen.tsx`: 상단, 탭, 후기 본문 또는 준비 중 본문, 하단 여백을 화면 순서대로 조합

### Travel

- `place-detail-header.tsx`: 뒤로가기, 장소명, 찜과 공유
- `place-detail-tabs.tsx`: 네 탭 링크와 현재 탭 접근성 상태
- `place-review-overview.tsx`: 통합 후기 제목, 평점 값, 별점과 5점부터 1점 분포
- `review-source-filter.tsx`: 네 출처 링크와 현재 필터 상태
- `place-detail-actions.tsx`: safe-area를 포함한 후기 작성 플로팅 CTA와 준비 중 안내
- `place-detail-preparation.tsx`: 소개, 코스 추천과 정보에 재사용하는 준비 중 화면
- 기존 `review-card.tsx`: 기본 API는 유지하고 `feed` variant, 선택적 이미지 rail과 좋아요 수를 추가
- 기존 `rating-summary.tsx`: 기본 API는 유지하고 count 기반 분포 표시와 `primary` tone을 선택적으로 추가
- 기존 `place-ranking-card.tsx`: `href`를 받아 전체 카드가 하나의 접근 가능한 링크로 동작

## 8. 상세 화면 구성

### 상단과 탭

- 상단 높이는 56px 이상이며 좌우 행동은 각각 44×44px 터치 영역을 갖는다.
- 장소명은 한 줄 말줄임 처리하고 화면 중앙에 시각적으로 유지한다.
- 탭은 같은 폭의 네 열이며 후기 탭은 primary 텍스트와 하단 indicator로 선택 상태를 전달한다.
- 상단과 탭은 긴 후기 목록을 읽을 때도 현재 장소와 탭을 잃지 않도록 앱 surface 안에서 sticky로 유지한다.

### 후기 제목과 필터

- `통합 후기 {N}개`를 제목으로 표시하고 수는 보조 색으로 구분한다.
- 필터는 좁은 화면에서 가로 스크롤이 가능하며 각 항목은 44px 이상 높이를 갖는다.
- 선택 필터는 테두리, 배경과 글자색을 함께 바꿔 색상 하나에만 의존하지 않는다.

### 평점 요약

- 왼쪽에는 큰 `4.6 / 5`와 별점 행, 오른쪽에는 5점부터 1점까지 count 기반 분포를 배치한다.
- 320px에서도 두 영역이 겹치지 않도록 `minmax(0, 1fr)` 기반 grid를 사용하고 숫자 영역의 최소 폭을 보장한다.
- 분포 막대는 실제 count와 전체 후기 수로 계산하며 접근성 meter 값을 제공한다.

### 후기 피드

- 카드 상단은 provider 아이콘·이름, 보라색 별점, 숫자 평점 순서다.
- 본문은 두세 줄 밀도의 자연스러운 한국어 mock 후기다.
- 이미지가 있는 후기는 최대 세 장의 동일 높이 가로 rail로 표시한다.
- 카드 하단에는 avatar, 작성자, 날짜와 좋아요 수를 배치한다.
- 출처 필터 결과가 없으면 빈 카드 placeholder 대신 해당 출처에 아직 후기가 없다는 설명과 전체 보기 링크를 제공한다.

### 플로팅 CTA

- `후기 작성하기`는 콘텐츠 위에 떠 있는 pill 버튼으로 배치하되 마지막 카드와 겹치지 않도록 본문 하단에 충분한 reserve를 둔다.
- safe-area inset을 반영하고 최소 52px 높이를 사용한다.
- 누르면 비활성 버튼처럼 무반응하지 않고 `후기 작성 기능을 준비하고 있어요`라는 live 안내를 제공한다.

## 9. 아이콘과 이미지

- 뒤로가기, 찜, 공유, 별점, 좋아요와 작성 아이콘은 기존 `lucide-react` 체계를 사용한다.
- 외부 provider 표시는 provider ID를 기반으로 한 재사용 가능한 표시 매핑을 사용한다. 브랜드 아이콘은 `react-icons/si`의 Google, Naver와 Kakao 계열 아이콘을 사용하고, Kakao Map의 위치 의미는 기존 Lucide `MapPin`을 함께 사용해 구분한다. 새 UI를 위해 emoji, 문자 대체 아이콘, CSS 도형, inline SVG 또는 참고 이미지 crop을 사용하지 않는다.
- 이천 테르메덴 후기용 사진은 온천 야외 수영장, 가족 물놀이와 정원형 스파라는 같은 art direction으로 구성한다.
- 후기 이미지는 `public/images/places/{placeId}/reviews` 아래에 두고 고정 화면비, 의미 있는 alt와 정확한 `sizes`를 사용한다.
- 현재 장소 자산이 후기 맥락에도 자연스럽고 충분한 해상도를 가지면 우선 재사용한다.

## 10. 반응형과 접근성

- 320px, 390px와 480px 모바일 폭을 우선 지원한다.
- 480px보다 넓은 화면은 최대 480px 앱 surface를 중앙 배치하되 휴대폰 frame을 재현하지 않는다.
- 링크와 버튼은 키보드로 조작 가능하고 명확한 `focus-visible` 상태를 갖는다.
- 탭에는 `aria-current="page"`, 필터에는 현재 선택 상태, 찜에는 `aria-pressed`를 제공한다.
- 평점 분포는 점수, count와 비율을 스크린 리더가 이해할 수 있게 제공한다.
- 공유와 준비 중 결과는 `aria-live`로 알린다.
- 이미지 alt는 같은 후기 안에서도 장면을 구분한다.
- `prefers-reduced-motion`에서는 새로운 이동 animation을 추가하지 않는다.

## 11. 오류와 경계 상태

- 알 수 없는 장소 ID는 `notFound()`로 처리한다.
- 현재 메인 장소에 상세 extension이 없거나 평점 분포 합계가 맞지 않으면 데이터 테스트가 실패한다.
- 출처 filter 결과가 비어 있어도 상단 평점 요약은 장소 전체 기준으로 유지한다.
- Web Share API가 없거나 취소 외 실패가 발생하면 clipboard 복사를 시도한다.
- 공유와 복사가 모두 실패하면 실패 안내를 표시하고 조용히 무시하지 않는다.
- mock 단계에서는 네트워크 loading, API error와 optimistic write를 만들지 않는다.

## 12. 테스트와 시각 검증

- 모든 discovery 장소 ID가 상세 extension과 비어 있지 않은 후기 데이터를 갖는지 모델 테스트로 검증한다.
- 탭·출처 파서, href builder, unknown ID 조회와 필터 선택 함수를 검증한다.
- 메인 장소 카드 전체가 올바른 상세 링크인지 검증한다.
- 후기 화면의 영역 순서, 탭 이동, 필터링, 빈 상태, 찜, 공유 fallback과 준비 중 안내를 테스트한다.
- 상세 화면 조합에 axe 기반 접근성 검사를 실행한다.
- focused Vitest, 전체 web Vitest, ESLint와 Next production build를 실행한다.
- Next.js route 코드를 쓰기 전에 `apps/web/node_modules/next/dist/docs/`의 현재 App Router dynamic route, params, searchParams와 metadata 문서를 읽는다.
- in-app Browser에서 320px, 390px, 480px와 넓은 화면의 overflow, sticky header, 이미지 crop, 플로팅 CTA와 safe-area를 확인한다.
- 같은 viewport와 같은 상호작용 상태에서 참고 이미지와 구현 화면을 함께 비교하고 P0, P1, P2 차이를 수정한다.
- 기존 root `design-qa.md`는 인기 관광지 탭의 작업 산출물이므로 덮어쓰지 않는다. 이번 비교 결과는 `artifacts/place-review-detail/design-qa.md`에 기록하며 `final result: passed` 전에는 완료로 보고하지 않는다.

## 13. 비목표

- Nest API, Prisma, 실제 관광 데이터 제공자와의 연동
- 실제 사용자 계정 기반 찜 저장
- 후기 작성 폼, 후기 등록과 서버 저장
- 소개, 코스 추천과 정보 탭의 실제 콘텐츠
- 지도 SDK, 일정 추가 또는 외부 지도 앱 연결
- 로그인·권한·신고 기능
- Git staging, commit, branch, push, tag 또는 PR 생성

## 14. 수용 기준

- 메인의 모든 현재 장소 카드가 각각 `/places/{placeId}`로 이동한다.
- 새로고침과 직접 URL 진입에서도 같은 장소 상세가 표시된다.
- 후기 탭은 참고 이미지와 같은 영역 순서, 모바일 밀도, provider 필터, 평점 분포, 후기 카드와 플로팅 CTA를 제공한다.
- 소개, 코스 추천과 정보 탭은 선택 상태를 유지하며 일관된 준비 중 화면을 제공한다.
- 이천 테르메덴과 다른 장소가 한 개의 `PlaceDetailScreen`과 같은 데이터 계약으로 렌더링된다.
- 뒤로가기, 찜, 공유, 필터와 준비 중 안내가 실제로 동작한다.
- 알 수 없는 ID는 404로 처리되고 상세 누락과 잘못된 평점 분포는 테스트에서 차단된다.
- 320px부터 넓은 화면까지 horizontal overflow가 없고 플로팅 CTA가 콘텐츠를 가리지 않는다.
- focused/전체 테스트, lint, build와 브라우저 시각 QA 결과를 각각 실제 실행 결과에 근거해 보고한다.
- 기존 작업 중인 변경과 무관한 파일을 되돌리거나 Git 상태를 변경하지 않는다.
