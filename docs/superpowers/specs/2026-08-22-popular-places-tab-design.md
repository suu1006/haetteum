# Haetteum 인기 관광지 탭 설계

**상태:** 구현 및 검증 완료
**작성일:** 2026-08-22
**범위:** `/`의 `tab=places` 콘텐츠, 재사용 가능한 여행 카드, mock 표시 모델

## 1. 목표

- 기존 메인 탐색 화면에서 `인기 관광지` 탭만 참고 이미지의 정보 구조로
  확장한다.
- 콘텐츠를 `릴스형 인기 관광지 → 테마 원형 목록 → 지금 뜨는 영상 코스` 순서로
  제공한다.
- 반복되는 표현을 travel 컴포넌트로 분리해 다른 탐색 화면에서도 재사용할 수
  있게 한다.
- 기존 Haetteum 토큰과 shadcn 기반 Foundation을 사용해 현재 화면과 같은 제품
  언어를 유지한다.

## 2. 비목표

- 기존 app header, 검색창, 상단 콘텐츠 탭과 하단 내비게이션을 재설계하지
  않는다.
- `추천`, `관광 축제`, `AI 코스` 탭의 기존 구성을 변경하지 않는다.
- 실제 동영상 재생, 미디어 스트리밍, 상세 페이지와 신규 route를 구현하지 않는다.
- `영상으로 둘러보기`, `더보기`, `짧게 보고 바로 저장`은 이번 UI 범위에서
  visual-only이며 재생·확장·영속 저장 동작을 가장하지 않는다.
- Nest API, React Query, Zustand, 데이터베이스 또는 공유 계약을 연결하지 않는다.
- 참고 이미지의 문구, 브랜드, 휴대폰 frame이나 상태바를 복제하지 않는다.
- 새 이미지 생성 없이 현재 `public/images/discovery`의 Haetteum 소유 이미지를
  포스터 프레임으로 재사용한다.

## 3. 선택한 접근

탭 전용 pattern과 재사용 가능한 travel 컴포넌트를 분리한다.

```text
MainDiscovery
└─ tab=places
   └─ PopularPlacesTab
      ├─ 릴스형 인기 관광지 + 영상 visual CTA
      │  └─ PopularVideoCard[]
      ├─ 테마 원형 목록
      │  └─ TravelThemeItem[] + TravelThemeMoreItem
      └─ 지금 뜨는 영상 코스 + 더보기 visual CTA
         └─ VideoCourseCard[] + CourseQuickSaveCard
```

이 구조는 하나의 큰 화면 컴포넌트보다 카드 재사용성과 테스트 격리가 좋고,
임의의 JSON section renderer보다 현재 범위가 명확하다. 범용 renderer나 새로운
디자인 시스템 계층은 만들지 않는다.

## 4. 화면 동작

- `DiscoverySearchPanel`과 URL query 구조를 그대로 사용한다.
- `tab=recommended`는 기존 `RankedPlaceSection`, `AiCourseBanner`,
  `FestivalSection`을 유지한다.
- `tab=places`는 기존 순위 카드 대신 `PopularPlacesTab`만 렌더링한다.
- `tab=festivals`와 `tab=ai-course`의 현재 분기도 유지한다.
- 인기 관광지 탭의 숏폼 관광지와 영상 코스는 현재 `region`과 `q`를 적용한다.
- 여행 테마는 지역과 무관한 탐색 카테고리이므로 검색 결과와 관계없이 유지한다.
- 필터 결과가 없으면 해당 탭 안에서 이유와 `검색어 지우기` 행동을 제공한다.

## 5. 컴포넌트 책임

### `PopularPlacesTab`

- 세 섹션의 제목, 설명, 순서와 간격을 소유한다.
- shadcn Carousel을 이용한 가로 탐색 영역을 조합한다.
- 비어 있는 결과의 설명과 query 초기화 링크를 제공한다.
- API 요청, 데이터 필터링과 route 선택은 소유하지 않는다.

### `PopularVideoCard`

- 포스터 이미지, 강조 badge, 재생시간, 제목, 조회수, 좋아요 수와 위치를 표시한다.
- semantic root는 `article`이며 장소명으로 접근 가능한 이름을 제공한다.
- 재생 표시는 비대화형 preview cue다. 동작하지 않는 버튼으로 노출하지 않는다.

### `TravelThemeItem`

- 원형 이미지와 짧은 테마명을 표시한다.
- 이 구현 단위에서는 필터나 route가 확정되지 않았으므로 대화형 control로 가장하지
  않는다.

### `TravelThemeMoreItem`

- 기존 테마 항목과 같은 크기·label 규칙을 재사용해 여섯 번째 `더보기` 항목을
  표현한다.
- 실제 확장 동작이 없으므로 button이나 link role을 만들지 않는다.

### `VideoCourseCard`

- 가로 포스터, 재생시간, 코스명, 한 줄 설명과 위치를 표시한다.
- semantic root는 `article`이며 코스명으로 접근 가능한 이름을 제공한다.
- 재생 표시는 `PopularVideoCard`와 같은 비대화형 preview cue를 사용한다.

### `CourseQuickSaveCard`

- 코스 rail 끝에 보라색 surface, 카메라와 sparkle icon, `짧게 보고 바로 저장`
  문구를 표시한다.
- 실제 저장 상태나 persistence를 소유하지 않는 visual-only `article`이다.

## 6. shadcn 사용 원칙

- 기존 `Button`과 `Card`를 재사용한다.
- highlight 상태에는 shadcn `Badge`를 추가한다.
- 숏폼과 영상 코스의 가로 목록에는 shadcn `Carousel`을 추가한다.
- 인기 탭 Carousel은 참고 이미지에 없는 이전·다음 화살표를 렌더링하지 않고 swipe
  rail로만 사용한다.
- 상단 콘텐츠 탭은 URL query와 새로고침 가능한 상태를 소유하므로 shadcn `Tabs`로
  교체하지 않는다.
- `components/ui`에는 여행 데이터 타입과 화면 조건을 추가하지 않는다.

## 7. 표시 모델

`apps/web/src/features/discovery/discovery-model.ts`에 다음 표시 타입을 추가한다.

```text
PopularVideoItem
- id, title, region, location
- badgeLabel, durationLabel, viewCountLabel, likeCountLabel
- image

TravelThemeItem
- id, label, image

VideoCourseItem
- id, title, summary, region, location
- durationLabel, image

PopularPlacesData
- videos, themes, courses
```

`MainDiscoveryData`는 `popularPlaces`를 포함하고,
`main-discovery.mock.ts`가 읽기 전용 표시 데이터를 제공한다. `DiscoveryView`는
추천 순위와 인기 관광지 콘텐츠의 표시 여부를 분리한다. 검색은 제목, 위치와 코스
설명을 대상으로 하며 region 필터를 함께 적용한다.

표시용 조회수, 좋아요 수와 재생시간은 실제 운영 정보가 아닌 mock 문자열로
취급한다. 이 값을 실제 통계나 동영상 metadata로 오해시키는 API 타입은 만들지
않는다.

## 8. 시각 규칙

- 모바일 앱 surface와 16px screen padding을 유지한다.
- 숏폼 카드는 세로 포스터 비율, 영상 코스는 가로 포스터 비율을 고정한다.
- 첫 카드와 다음 카드 일부를 함께 보여 가로 탐색 가능성을 전달한다.
- 제목과 핵심 metadata는 이미지 위의 제한된 scrim 또는 밝은 정보 surface로
  읽기 쉽게 표시한다.
- Primary purple은 선택, badge와 carousel control 같은 핵심 강조에만 사용한다.
- 여행 테마는 원형 이미지와 짧은 한 줄 label로 구성한다.
- 320px 이상에서 가로 page overflow가 없어야 하며 긴 제목과 위치는 카드 내부에서
  줄바꿈하거나 제한된 줄 수로 정리한다.

## 9. 접근성과 상태

- 각 섹션은 고유 heading과 `aria-labelledby` 관계를 가진다.
- 숏폼과 영상 코스는 의미 있는 목록으로 제공한다.
- Carousel은 의미 있는 list/slide 구조를 유지하고 pointer/touch swipe로 탐색한다.
- play icon, 조회수, 좋아요와 위치 icon은 중복 음성 출력을 막기 위해 장식 아이콘으로
  처리하고 동일 정보를 텍스트로 제공한다.
- 색상만으로 badge나 선택 상태를 설명하지 않는다.
- 필터 결과가 없을 때 빈 영역만 남기지 않고 검색어 초기화 행동을 제공한다.
- loading과 error는 실제 데이터 계층을 연결하는 후속 범위로 남긴다.

## 10. 변경 대상

```text
DESIGN.md
apps/web/package.json
apps/web/src/components/ui/badge.tsx
apps/web/src/components/ui/carousel.tsx
apps/web/src/components/travel/popular-video-card.tsx
apps/web/src/components/travel/travel-theme-item.tsx
apps/web/src/components/travel/video-course-card.tsx
apps/web/src/components/travel/course-quick-save-card.tsx
apps/web/src/components/patterns/popular-places-tab.tsx
apps/web/src/components/patterns/main-discovery.tsx
apps/web/src/features/discovery/discovery-model.ts
apps/web/src/features/discovery/main-discovery.mock.ts
apps/web/tests/unit/components/travel/discovery-components.test.tsx
apps/web/tests/unit/components/patterns/main-discovery.test.tsx
apps/web/tests/unit/features/discovery/discovery-model.test.ts
```

shadcn Carousel이 요구하는 dependency와 lockfile 변경은 생성 결과에 필요한 최소
범위로 제한한다. 기존 미커밋 파일을 덮어쓰거나 관련 없는 formatting을 수행하지
않는다.

## 11. 검증

- `tab=recommended`의 기존 TOP 3, AI 코스와 축제 순서를 회귀 테스트한다.
- `tab=places`가 세 섹션을 승인된 순서로 렌더링하는지 검증한다.
- travel 카드가 필요한 텍스트, 이미지와 semantic article 이름을 제공하는지
  검증한다.
- 지역, 검색어와 빈 결과 선택 로직을 단위 테스트한다.
- 조합 화면에 axe 접근성 위반이 없는지 확인한다.
- focused Vitest, 전체 web test, ESLint와 Next production build를 실행한다.
- 실제 브라우저의 320px, 390px와 768px 폭에서 이미지 crop, 카드 스냅, carousel
  control, 터치 영역, 하단 내비게이션 reserve와 page overflow를 확인한다.
- 390px의 동일한 탭 상태에서 첨부 참고 이미지와 구현 화면을 함께 비교해 섹션
  위계, 밀도, 간격과 다음 카드 노출을 점검한다.

## 12. 수용 기준

- 기존 화면에서 `인기 관광지`를 선택하면 새 탭 콘텐츠만 표시된다.
- 새 탭은 `릴스형 인기 관광지 → 테마 원형 목록 → 지금 뜨는 영상 코스` 순서를 유지한다.
- 추천 탭과 다른 탭의 기존 동작과 URL query가 유지된다.
- 새 travel 컴포넌트는 명시적 props만 받고 API나 route를 직접 참조하지 않는다.
- shadcn `Card`, `Button`, `Badge`, `Carousel`을 프로젝트 계층에 맞게 사용한다.
- 실제 동영상, API, 신규 route와 전역 상태를 추가하지 않는다.
- 320px 이상에서 page-level 가로 overflow가 없고 rail 내부 콘텐츠만 가로
  overflow를 가진다.
- 관련 테스트, lint, build와 시각 QA가 통과하기 전에는 구현 완료로 보고하지 않는다.

## 13. 실제 검증 결과

- 시각 기준은 `.omx/artifacts/visual-ralph/popular-places-tab/reference.png`
  (`992 × 1586`)와 `reference-popular-content.png` (`886 × 1100`)이며,
  `/?region=jeju&tab=places#places`의 light in-app Browser 상태를 비교했다.
- 390px 1차 구현(`implementation-390-places.png`, `390 × 1000`)은 `62 fail`로,
  P1 카드 비율/다음 카드 노출·내비게이션 중단과 P2 코스 밀도/control weight를
  확인했다. 인기 basis/image `46%`, courses `32%`, themes `56px`,
  `space-y-6`/gap/typography 축소와 조용한 44px control을 적용했다.
- 390px 2차(`implementation-390-lower-v2.png` `390 × 844`,
  `implementation-390-full-v2.png` `390 × 1214`, CSS `390 × 844`, density `1`)는
  `91 pass`이며 actionable P0/P1/P2가 없다. 잔여 P3는 카드가 약간 compact하고
  몰입감이 낮은 점, 코스 border가 강한 점이다. `여행 테마` heading 유지,
  reference-only CTA/save 미추가, gradient 대신 semantic scrim을 의도적으로
  유지했다.
- 비교 입력은 popular crop과 lower-v2이며 overlay/pixel diff는
  `overlay-390-v2.png`/`pixel-diff-390-v2.png`이다. pixel evidence는 source와
  implementation을 forced scaling으로 `390 × 717`에 정규화한 secondary/debug
  자료이며 최종 판정 근거가 아니다.
- 320px CSS `320 × 844`: document client/scroll `320/320`, `#places` 높이
  `661.125`, video/course slide `138/96`, active places `page`, Jeju `true`,
  next/previous와 ArrowLeft 복귀, 두 rails, console errors `0`.
  390px `#places` `390 × 716.64`, horizontal overflow 없음, console errors `0`;
  Iteration 2에서는 hero/첫 popular image의 Next dev LCP warning 2건을 기록했고,
  final Iteration 3에는 `place-hyeopjae` LCP warning 1건만 남아 P3 only다.
  768px CSS `768 × 1024`: shell/nav/`#places` `480px`, centered `x=144`,
  document client/scroll `768/768`, nav bottom `1024`, console errors `0`.
- 최종 TDD 정적 검증은 eager RED `2` failures 후 focused `3` files/`46` tests가
  GREEN, theme eager RED `1` 후 travel `13/13` GREEN이었다. Final full web는
  `12` files/`86` tests이며 eslint와 diff check가 통과했다. Production build는
  user dev가 `.next`를 점유해 isolated
  `/tmp` snapshot으로 수행했으며, 첫 symlink 시도는 Turbopack external-root
  protection으로만 실패했고 copy-on-write dependency retry는 compile/TypeScript
  통과, `6` static pages/routes 생성, exit `0`이었다. 임시 snapshot은 삭제하고
  user dev는 보존했다.
- Iteration 3 final-fix review에서 Important 320px badge/duration collision과
  unused `showPlaces`/image hints를 정리했다. `max-[359px]` duration은 badge
  아래로 stack하고, 첫 `PopularVideoCard`만 eager/나머지는 lazy, fallback sizes
  `206px`/`144px`, 모든 `56px` `TravelThemeItem` thumbnail eager, festival flags
  유지로 확정했다.
- Fresh 320px는 세 collision 모두 `false`, badge bottom `216`/duration top `228`,
  client/scroll `320/320`, first poster eager와 next two lazy, console errors `0`이며
  `implementation-320-viewport-final.png`/`implementation-320-full-final-v2.png`를
  남겼다. Fresh 390px는 세 collision `false`, client/scroll `390/390`, five themes
  eager/complete/naturalWidth `55`, errors `0`, `implementation-390-full-final-v2.png`;
  `place-hyeopjae` LCP dev warning 1건은 P3 only다. Fresh 768px는 client/scroll
  `768/768`, shell/nav `480px` centered `x=144`, nav bottom `1024`, errors `0`,
  `implementation-768-full-final.png`이다.
- Iteration 3 visual verdict는 `91 pass`이며 320px collision이 해소되었고
  actionable P0/P1/P2는 없다. 잔여 차이는 승인된 P3뿐이다. Final isolated build는
  compile `6.4s`, TypeScript `4.2s`, pages `6/6`, exit `0`이며 user dev 보존과
  temp snapshot 삭제를 확인했다.
- 상세 viewport, interaction, console와 최종 판정은 project-root `design-qa.md`에
  기록했다. 최종 시각 판정: `final result: passed`.

## 14. 2026-08-22 reference v2 반영

- 새 source truth는
  `.omx/artifacts/visual-ralph/popular-places-tab-v2-reference.png`
  (`774 × 1280`)이다. 기존 app header·검색·URL 탭·하단 내비게이션은 유지하고
  popular content를 reference에 맞게 재구성했다.
- `PopularPlacesTab`은 `릴스형 인기 관광지`와 visual CTA, 화살표 없는 46% reels
  rail, 5 themes와 `TravelThemeMoreItem`, compact 24% course cards와
  `CourseQuickSaveCard`를 조합한다.
- `영상으로 둘러보기`, 두 `더보기`, `짧게 보고 바로 저장`은 UI-only라는 사용자
  승인을 반영해 button/link, playback, persistence와 신규 route를 추가하지 않았다.
- 390px final은 document `390 × 847`, `#places` height `540.92`, popular card 약
  `170px`, course/save card 약 `88 × 90`, theme row `scrollWidth/clientWidth`
  `358/358`이다. 320px은 client/scroll `320/320`과 모든 badge/duration
  collision `false`, 768px은 480px shell centered x `144`를 확인했다.
- Visual verdict는 `94 pass`, actionable P0/P1/P2는 없다. Overlay와 diff는
  `popular-places-tab-v2-overlay.png`, `popular-places-tab-v2-pixel-diff.png`이며
  forced scaling한 secondary evidence다.
- TDD focused `3` files/`38` tests, final full web `12` files/`91` tests,
  focused popular ESLint, diff check와 isolated production build가 통과했다. Full
  ESLint는 범위 밖 `welcome-desktop-showcase.tsx`의 concurrent effect rule 1건으로
  blocked 상태를 정확히 유지한다.
- 최종 evidence는 project-root `design-qa.md`에 기록했으며
  `final result: passed`다.

## 15. 2026-08-24 영상 가시성 개선

- 새 source truth는 사용자 제공 997 × 1578 모바일 참고 이미지다.
- 상단 릴스 rail의 46% 세로 카드와 테마 원형 목록은 유지한다.
- 영상 코스 rail은 24% 카드와 `CourseQuickSaveCard` 조합 대신 50% 폭의 실제
  코스 카드를 사용해 한 화면에 두 개씩 렌더링한다.
- `VideoCourseCard`는 4:3 이미지 안에 재생시간, 제목, 설명과 위치를 스크림으로
  겹쳐 표시하며 390px에서 세 정보가 모두 보인다.
- 320px에서는 카드 비율을 6:5로 높이고 설명·위치를 숨겨 영상 면적을 확보한다.
  상단 릴스 카드도 조회수만 시각적으로 남겨 배지, 재생시간, 제목과 metadata가
  서로 겹치지 않도록 한다.
- 기존 app header, 검색, 탭, 테마 목록, 하단 내비게이션, mock 데이터, API와
  route 계약은 변경하지 않는다.
- 최종 시각 evidence는 `artifacts/popular-places-refresh/`에 저장한다.

### 2026-08-24 두 장 배치 추가 조정

- 사용자의 최신 지시에 따라 기존 세 장 밀도를 두 장 배치로 확대했다.
- 첫 화면에는 두 카드가 완전히 보이고, 세 번째 카드는 가로 swipe로 탐색한다.
- Next Image `sizes`는 모바일 46vw, 최대 앱 surface에서 216px로 조정한다.
- 320px의 제목-only overlay와 360px 이상 전체 정보 표시 규칙은 유지한다.
