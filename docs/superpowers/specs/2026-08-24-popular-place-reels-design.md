# Haetteum 인기 관광지 릴스 미리보기 및 전체 화면 재생 설계

**상태:** 구현 및 시각 QA 완료

**작성일:** 2026-08-24

**범위:** `/`의 `tab=places` 인기 관광지 UI, 자동 미리재생, `/reels/[videoId]` 전체 화면 영상 경험

## 1. 목표

- 인기 관광지 탭을 첨부된 첫 번째 참고 이미지의 정보 밀도와 화면 위계에 맞게
  조정한다.
- 인기 관광지 카드가 화면에 머물러 있을 때 Instagram Reels처럼 짧은 영상을
  자동으로 보여준다.
- 카드 또는 `영상으로 둘러보기`를 선택하면 두 번째 참고 이미지와 같은 세로형
  전체 화면 영상 경험으로 전환한다.
- 모바일에서 몰입감 있게 동작하되 320px 이상의 화면, 키보드 사용자, 모션 감소
  설정과 데이터 절약 설정을 함께 지원한다.
- 기존 검색, 상단 탭, URL query, 하단 내비게이션과 다른 탐색 탭의 동작을
  회귀시키지 않는다.

## 2. 현재 상태와 전제

- 인기 관광지 탭은 `PopularPlacesTab`이 인기 숏폼 Carousel, 여행 테마 목록,
  영상 코스 Carousel을 조합한다.
- `PopularVideoCard`는 현재 정적인 포스터와 재생 아이콘만 표시한다.
- 저장소에는 `mp4`, `webm`, `mov` 등 실제 영상 자산이 없다.
- 사용자는 실제 영상이 없는 현재 단계에서 기존 Haetteum 관광지 포스터로
  6~8초 길이의 로컬 모션 프리뷰를 만들어 사용하는 방식을 승인했다.
- 생성되는 모션 프리뷰는 실제 현장 촬영본이 아니라 포스터를 천천히 이동·확대하는
  임시 시각 자산이다. 이후 동일한 데이터 필드의 파일만 실제 영상으로 교체할 수
  있어야 한다.

## 3. 비목표

- Instagram API, 외부 동영상 플랫폼, CDN 또는 스트리밍 백엔드를 연결하지 않는다.
- 댓글 작성, 댓글 목록, 사용자 계정별 좋아요 저장, 조회수 집계와 서버 영속성을
  구현하지 않는다.
- 추천, 관광 축제, 테마 여행 탭이나 공통 app header를 재설계하지 않는다.
- 전체 화면 플레이어 안에 새로운 여행 예약, 코스 저장 또는 구매 흐름을 추가하지
  않는다.
- 외부 샘플 영상을 실제 관광지 영상처럼 사용하지 않는다.
- 새로운 전역 상태 라이브러리나 범용 미디어 프레임워크를 도입하지 않는다.

## 4. 선택한 접근

전용 route와 두 개의 좁은 Client Component 경계를 사용한다.

```text
MainDiscovery (Server)
└─ PopularPlacesTab (Server)
   ├─ PopularVideoRail (Client)
   │  └─ PopularVideoCard[]
   ├─ TravelThemeItem[]
   └─ VideoCourseCard[] 2-column grid

/reels/[videoId] (Server route)
└─ ReelsViewer (Client)
   └─ ReelsSlide[] vertical snap feed
```

- `PopularVideoRail`은 Embla의 선택 index를 단일 활성 영상으로 관리한다.
- `PopularVideoCard`는 `active`일 때만 영상을 재생하고 나머지는 포스터 상태로
  정지한다.
- `/reels/[videoId]`는 선택된 영상부터 시작하는 공유 가능한 route다.
- `ReelsViewer`는 세로 스크롤 snap과 IntersectionObserver를 이용해 현재 slide
  하나만 재생한다.
- 모달 방식은 URL 공유와 새로고침 복원이 약하고, 현재 화면 내부 확장은 두 번째
  참고 이미지의 몰입형 구성을 만들기 어려워 사용하지 않는다.

## 5. 인기 관광지 탭 UI

### 5.1 릴스형 인기 관광지

- 섹션 제목, 설명, `영상으로 둘러보기` 행동은 유지한다.
- 영상 카드는 현재 모바일 shell 안에서 약 2장과 다음 카드 일부가 보이도록 한다.
- 카드 비율은 세로형 포스터 비율을 유지하고 카드 간격, 둥근 모서리와 이미지 scrim은
  기존 Haetteum token을 사용한다.
- 카드 상단에는 badge와 전체 영상 길이를, 하단에는 장소명, 조회수, 좋아요 수와
  위치를 표시한다.
- 활성 카드가 재생되면 중앙의 큰 재생 아이콘을 숨기고, 카드 하단에 얇은 진행
  표시를 노출한다.
- 정지, 로딩 실패, 모션 감소 또는 데이터 절약 상태에서는 포스터와 재생 cue를
  표시한다.
- 카드 전체를 의미 있는 link로 제공하며 선택한 영상의 `/reels/[videoId]`로
  이동한다.
- `영상으로 둘러보기`는 현재 필터 결과의 첫 번째 영상으로 이동한다. 영상이 없으면
  노출하지 않는다.

### 5.2 여행 테마

- 기존 원형 이미지 목록과 가로 탐색을 유지한다.
- 기존 한 화면 여섯 항목의 밀도와 scrollbar 없는 탐색 동작을 유지한다.
- 영상 기능을 위해 테마 항목의 의미나 동작을 임의로 변경하지 않는다.

### 5.3 지금 뜨는 영상 코스

- 현재 작은 가로 rail과 보라색 빠른 저장 카드를 제거한다.
- 첫 번째 참고 이미지처럼 모바일 2열 grid에 큰 가로 영상 코스 카드를 표시한다.
- 각 카드에는 포스터, 재생시간, 코스명, 한 줄 요약과 위치를 표시한다.
- 이번 범위에서는 영상 코스 카드 자체를 자동재생하거나 신규 상세 route로 연결하지
  않는다. 자동재생 대상은 상단 릴스형 인기 관광지다.

## 6. 피드 자동 미리재생

- 처음 선택된 Embla slide 하나만 자동재생한다.
- 영상은 `muted`, `playsInline`, `loop`, `preload=metadata`로 재생한다.
- 자동재생은 사용자 입력 없이 소리를 재생하지 않는다.
- Carousel의 선택 slide가 바뀌면 이전 영상은 `pause()` 후 시작 지점으로 되돌리고,
  새 선택 영상만 `play()`한다.
- 문서가 숨겨지거나 인기 관광지 섹션이 viewport에서 벗어나면 활성 영상도 멈춘다.
- 브라우저가 자동재생을 거부하면 예외를 삼키지 않고 포스터와 명시적인 재생 cue로
  전환한다.
- `prefers-reduced-motion: reduce` 또는 `navigator.connection.saveData`가 켜져 있으면
  피드에서는 자동재생하지 않는다.
- 여러 영상이 동시에 재생되는 구현은 허용하지 않는다.

## 7. 전체 화면 릴스 경험

- 배경은 어두운 media surface이며 앱의 최대 모바일 폭 안에서 영상은 viewport를
  채운다.
- 영상은 세로 9:16 stage에서 `object-cover`로 표시하고 포스터를 fallback으로
  사용한다.
- 상단에는 뒤로가기, 위치명과 주소를 표시한다.
- 우측 action rail에는 좋아요, 댓글 수, 공유 수와 더보기 control을 세로로 배치한다.
- 하단에는 원형 장소 이미지, 장소명, badge, 한두 줄 설명과 사운드 label을 표시한다.
- 좋아요는 현재 viewer session 안에서만 토글하며 영속 저장을 가장하지 않는다.
- 공유는 Web Share API를 우선 사용하고 지원하지 않으면 현재 URL을 clipboard에
  복사한 뒤 성공 메시지를 제공한다.
- 댓글과 더보기는 참고 이미지의 위계를 위해 표시하되 `준비 중` 상태를 명확히
  알리고 동작하는 기능으로 가장하지 않는다.
- 실제 오디오 track이 있는 영상은 첫 진입 시 음소거 상태이며, 사용자가 sound
  control을 선택하면 소리를 켠다. 임시 모션 프리뷰처럼 오디오가 없는 영상은
  sound control을 노출하지 않고 `원본 오디오 없음`으로 표시한다.
- 화면 탭으로 재생/일시정지를 전환하고 sound control은 별도로 제공한다.
- 위아래 swipe, wheel, `ArrowUp`과 `ArrowDown`으로 이전·다음 영상을 탐색한다.
- 현재 slide만 재생하고 이동한 slide는 정지 및 시작 위치 초기화한다.
- 마지막 slide에서 아래로 이동하거나 첫 slide에서 위로 이동할 때 loop하지 않는다.
- 뒤로가기 후 인기 관광지 탭의 세로 scroll과 Carousel 선택 위치를 복원한다.

## 8. 표시 모델과 미디어 자산

`PopularVideoItem`을 다음 표시 정보로 확장한다.

```text
id, title, region, location, address
description, creatorLabel, soundLabel
badgeLabel, durationLabel
viewCountLabel, likeCountLabel, commentCountLabel, shareCountLabel
image
video: { src, posterSrc, durationSeconds, hasAudio }
```

- 실제 운영 통계와 혼동되지 않도록 기존 mock label을 그대로 mock 표시값으로
  취급한다.
- 영상 파일은 `apps/web/public/videos/discovery/` 아래에 안정적인 id 기반 이름으로
  둔다.
- 포스터와 영상은 같은 관광지를 가리켜야 한다.
- 임시 motion asset은 6~8초, 세로 H.264 MP4, 무음, 브라우저 친화적 크기로 만들고
  `hasAudio: false`로 명시한다.
- UI는 특정 생성 방식이나 확장자에 결합하지 않고 `video.src`만 소비한다.

## 9. 상태와 오류 처리

- 영상 로딩 전에는 poster를 즉시 표시해 빈 검은 카드를 만들지 않는다.
- `canplay` 이후에만 재생 상태와 진행 표시를 노출한다.
- `error` 또는 `play()` 거부 시 poster fallback과 재시도 control을 제공한다.
- URL의 `videoId`가 없으면 기존 app not-found 패턴을 따른다.
- 필터 결과가 없을 때의 인기 관광지 빈 상태와 검색어 지우기 행동을 유지한다.
- clipboard 공유 실패 시 사용자가 다시 시도할 수 있는 오류 메시지를 제공한다.
- viewer 이탈 시 실행 중인 observer, event listener와 media 재생을 모두 정리한다.

## 10. 접근성

- 영상 카드 link는 장소명으로 접근 가능한 이름을 가진다.
- 장식 icon은 음성 출력에서 제외하고 숫자의 의미는 숨김 label로 보완한다.
- viewer는 고유 heading과 현재 slide 위치(`1 / 3`)를 보조 기술에 제공한다.
- 모든 실제 control은 최소 44×44px pointer target과 명확한 focus ring을 가진다.
- 재생/일시정지, 오디오가 있는 영상의 음소거/소리 켜기와 좋아요 상태는
  `aria-pressed` 또는 명확한 상태 text를 제공한다.
- 준비 중인 댓글·더보기는 실행 가능한 빈 button으로 노출하지 않는다.
- 모션 감소 설정에서는 자동재생과 smooth scrolling을 사용하지 않는다.
- 영상 위 text는 scrim으로 대비를 확보하고 색상만으로 상태를 전달하지 않는다.

## 11. 성능

- 피드에서는 활성 영상의 metadata만 우선 준비하고 나머지는 poster를 사용한다.
- 동시에 재생 가능한 media element 수는 1개다.
- route 전환 전에 모든 feed media를 정지한다.
- 전체 화면 viewer는 현재 영상과 바로 다음 영상까지만 준비한다.
- 생성 영상은 모바일 화면용 해상도와 bitrate로 제한하고 원본 포스터보다 과도하게 큰
  파일을 만들지 않는다.
- Next dev와 production build가 같은 `.next`를 공유하지 않도록 검증 환경을
  분리한다.

## 12. 변경 예상 파일

### 생성

```text
apps/web/public/videos/discovery/*.mp4
apps/web/src/app/reels/[videoId]/page.tsx
apps/web/src/app/reels/[videoId]/not-found.tsx
apps/web/src/components/travel/popular-video-rail.tsx
apps/web/src/components/travel/reels-viewer.tsx
apps/web/tests/unit/app/reels-page.test.tsx
apps/web/tests/unit/components/travel/popular-video-rail.test.tsx
apps/web/tests/unit/components/travel/reels-viewer.test.tsx
```

### 수정

```text
apps/web/src/components/patterns/popular-places-tab.tsx
apps/web/src/components/travel/popular-video-card.tsx
apps/web/src/components/travel/video-course-card.tsx
apps/web/src/features/discovery/discovery-model.ts
apps/web/src/features/discovery/main-discovery.mock.ts
apps/web/tests/setup.ts
apps/web/tests/unit/components/patterns/main-discovery.test.tsx
apps/web/tests/unit/components/travel/discovery-components.test.tsx
apps/web/tests/unit/features/discovery/discovery-model.test.ts
DESIGN.md
```

실제 구현 중 현재 구조로 충분한 테스트 파일은 새 파일로 분리하지 않고 기존 suite에
둘 수 있다. 관련 없는 파일이나 사용자 미커밋 변경은 정리하지 않는다.

## 13. 검증

- 테스트를 먼저 추가해 자동재생 active/inactive 전환, fallback, route와 viewer
  상호작용을 실패 상태로 확인한 뒤 구현한다.
- jsdom에서 `HTMLMediaElement.play`, `pause`, IntersectionObserver와 Embla selection을
  제어 가능한 stub으로 검증한다.
- 기존 인기 관광지 구성, 다른 탭, 검색/지역 필터와 빈 상태의 회귀 테스트를 유지한다.
- 변경 파일 ESLint와 focused Vitest를 실행한다.
- 전체 web test는 focused 결과와 분리해 보고한다.
- 브라우저에서 320px, 390px와 768px 폭을 확인한다.
- 브라우저 검증 항목은 다음과 같다.
  - 첫 활성 영상만 자동재생하고 다음 카드 선택 시 정확히 교체되는가
  - 카드 선택 시 올바른 `/reels/[videoId]`가 열리는가
  - viewer에서 세로 swipe/keyboard 탐색이 동작하고 오디오 유무에 맞는 control을
    표시하는가
  - 좋아요와 공유 feedback이 동작하는가
  - 뒤로가기 후 세로 scroll과 Carousel 위치가 유지되는가
  - 320px 이상에서 page-level 가로 overflow와 text/control 충돌이 없는가
  - 모션 감소와 데이터 절약 fallback이 작동하는가
  - console error와 hydration mismatch가 없는가
- 첨부된 두 참고 이미지와 동일 viewport의 구현 capture를 비교해 UI 위계와 밀도를
  점검한다.

## 14. 수용 기준

- 인기 관광지 탭의 선택된 숏폼 카드 하나가 사용자 입력 없이 음소거 자동재생된다.
- 보이지 않거나 선택되지 않은 카드는 재생되지 않는다.
- 카드 또는 `영상으로 둘러보기` 선택 시 해당 영상의 전체 화면 route가 열린다.
- 전체 화면은 선택 영상부터 시작하며 세로 탐색, 재생/정지, 좋아요와 공유가 요구한
  범위에서 동작한다. sound control은 실제 오디오 track이 있을 때만 동작한다.
- 댓글·더보기와 통계가 실제 서버 기능인 것처럼 보이지 않는다.
- 영상 코스는 첫 번째 참고 이미지처럼 2열 카드 grid로 표시된다.
- 뒤로가기 후 인기 관광지 탐색 위치가 보존된다.
- 모션 감소, 데이터 절약, 자동재생 거부와 영상 오류 상태에서 poster fallback을
  제공한다.
- 추천, 관광 축제, 테마 여행과 기존 URL query 동작이 유지된다.
- 관련 focused test, 변경 파일 lint와 실제 브라우저 QA가 통과하기 전에는 완료로
  보고하지 않는다.

## 15. Git 및 작업 트리 원칙

- 현재 작업 트리의 많은 기존 미커밋 변경은 사용자 작업으로 간주해 보존한다.
- 구현 범위와 겹치는 파일은 현재 내용을 기준으로 최소 diff만 만든다.
- 브랜치, worktree, stage, commit, push와 PR은 별도 사용자 승인 없이 수행하지
  않는다.

## 16. 실제 검증 결과

- 승인된 세 포스터에서 AVFoundation으로 `720 × 1280`, 30fps, 6초, 약 1.3MB의
  무음 H.264 MP4 세 개를 생성했다.
- 관련 focused Vitest는 `7 files / 72 tests`가 통과했다.
- 변경 파일 ESLint와 `tsc --noEmit`가 통과했다.
- 전체 web test는 `36 files / 246 tests`가 통과했고, 변경과 무관한 기존
  `theme-travel-section.test.tsx`의 Base UI 정렬 option 탐색 1개가 실패했다.
- Codex in-app Browser에서 320px, 390px와 768px을 확인했다. page-level 가로
  overflow가 없고 768px 앱 surface는 480px로 중앙 정렬됐다.
- 390px에서 피드는 선택 영상 하나만 재생했고, viewer는 세로 keyboard snap 후
  다음 영상 하나만 재생했다. 좋아요, back route와 선택 카드 복원이 동작했다.
- 초기 viewer의 desktop scrollbar로 인한 15px 폭 손실, 과한 action surface와
  3개 course의 불균형을 수정한 뒤 재검증했다.
- 최종 home/reels 콘솔 warning 및 error는 0건이다.
- 최종 비교와 iteration 기록은 프로젝트 root `design-qa.md`이며
  `final result: passed`다.
- 사용자 Git 승인 없이 stage, commit, branch, worktree, push와 PR은 수행하지
  않았다.
