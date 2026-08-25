# Haetteum Popular Place Reels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This repository run uses inline execution because the user did not request subagents.

**Goal:** 인기 관광지 카드 한 개만 자동 미리재생하고, 선택한 관광지부터 시작하는 세로형 전체 화면 릴스 route와 참고 이미지에 맞춘 2열 영상 코스 UI를 구현한다.

**Architecture:** 서버 표시 모델은 영상 metadata와 route용 순서 선택 함수를 소유하고, `PopularVideoRail`과 `ReelsViewer`만 Client Component로 둔다. 피드에서는 Embla 선택 slide 하나, 전체 화면에서는 viewport에 가장 가까운 vertical snap slide 하나만 재생하며 실제 영상이 없는 현재 단계에는 로컬 포스터로 생성한 무음 H.264 motion preview를 사용한다.

**Tech Stack:** Next.js 16.3.1 App Router, React 19.2.8, TypeScript strict, Tailwind CSS 4, Embla Carousel, Vitest, React Testing Library, axe-core, macOS AVFoundation

**Spec:** `docs/superpowers/specs/2026-08-24-popular-place-reels-design.md`

## Global Constraints

- Node.js는 `.nvmrc`의 `24.19.0`, package manager는 `pnpm@10.33.0`을 사용한다.
- 코드 작성 전에 `apps/web/node_modules/next/dist/docs/`의 dynamic routes, Link/navigation, Image와 Vitest 문서를 읽는다.
- 현재 작업 트리의 기존 미커밋 변경을 보존하고 관련 파일에 최소 diff만 만든다.
- 브랜치, worktree, stage, commit, push와 PR은 별도 사용자 승인 없이 수행하지 않는다.
- Instagram API, 외부 영상, CDN, 댓글 backend, 좋아요 persistence와 새 전역 상태 dependency를 추가하지 않는다.
- 피드와 viewer에서 동시에 재생되는 media element는 최대 하나다.
- 피드 autoplay는 항상 muted이며 `prefers-reduced-motion` 또는 `saveData`에서는 poster fallback을 사용한다.
- 임시 영상은 실제 촬영본으로 표현하지 않고 `hasAudio: false`로 취급한다.
- 320px 이상에서 page-level 가로 overflow가 없어야 하며 모든 실제 control은 최소 44×44px target을 가진다.

---

## File Map

### Create

- `apps/web/scripts/generate-popular-motion-previews.swift`: 기존 포스터에서 재현 가능한 세로 H.264 MP4를 생성한다.
- `apps/web/public/videos/discovery/*.mp4`: 세 개 인기 관광지용 6초 무음 motion preview다.
- `apps/web/src/features/discovery/popular-video-feed.ts`: id lookup과 선택 영상부터의 feed 순서를 계산하는 pure helper다.
- `apps/web/src/components/travel/popular-video-rail.tsx`: Embla 선택 index, section visibility와 return-position snapshot을 소유한다.
- `apps/web/src/components/travel/reels-viewer.tsx`: vertical snap, 활성 재생, like/share, sound capability와 viewer keyboard 동작을 소유한다.
- `apps/web/src/app/reels/[videoId]/page.tsx`: static params, metadata, not-found와 ordered feed 조합을 소유한다.
- `apps/web/src/app/reels/[videoId]/not-found.tsx`: 잘못된 영상 id의 복구 UI다.
- `apps/web/tests/unit/features/discovery/popular-video-feed.test.ts`: feed helper 단위 테스트다.
- `apps/web/tests/unit/components/travel/popular-video-rail.test.tsx`: 단일 autoplay와 return snapshot 테스트다.
- `apps/web/tests/unit/components/travel/reels-viewer.test.tsx`: viewer interaction 테스트다.
- `apps/web/tests/unit/app/reels-page.test.tsx`: dynamic route 조합 테스트다.

### Modify

- `apps/web/src/features/discovery/discovery-model.ts`: `PopularVideoMedia`와 확장된 `PopularVideoItem` 계약을 제공한다.
- `apps/web/src/features/discovery/main-discovery.mock.ts`: route와 viewer에 필요한 실제 표시값 및 media path를 제공한다.
- `apps/web/src/components/travel/popular-video-card.tsx`: poster card를 active video link로 바꾼다.
- `apps/web/src/components/patterns/popular-places-tab.tsx`: client rail과 2열 course grid를 조합한다.
- `apps/web/src/components/travel/video-course-card.tsx`: 2열 grid 비율과 image sizes를 사용한다.
- `apps/web/tests/setup.ts`: media play/pause와 connection capability의 안전한 기본 stub을 제공한다.
- `apps/web/tests/unit/components/travel/discovery-components.test.tsx`: video link/card와 course grid 카드 계약을 검증한다.
- `apps/web/tests/unit/components/patterns/main-discovery.test.tsx`: rail CTA와 course grid 구조를 검증한다.
- `apps/web/tests/unit/features/discovery/discovery-model.test.ts`: 확장된 mock 표시 계약을 검증한다.
- `DESIGN.md`: 구현 상태와 신규 route/client 경계를 기록한다.

---

### Task 1: Next.js 규칙 확인과 영상 표시 모델

**Files:**

- Create: `apps/web/src/features/discovery/popular-video-feed.ts`
- Create: `apps/web/tests/unit/features/discovery/popular-video-feed.test.ts`
- Modify: `apps/web/src/features/discovery/discovery-model.ts`
- Modify: `apps/web/src/features/discovery/main-discovery.mock.ts`
- Modify: `apps/web/tests/unit/features/discovery/discovery-model.test.ts`

**Interfaces:**

- Produces: `PopularVideoMedia`, 확장된 `PopularVideoItem`, `orderPopularVideosFrom(videos, videoId)`, `findPopularVideoById(videos, videoId)`.
- `orderPopularVideosFrom` returns `readonly PopularVideoItem[] | null`; 선택 영상부터 끝까지 간 뒤 앞부분을 이어 붙인다.

- [ ] **Step 1: 프로젝트에 설치된 Next.js 문서를 읽는다**

```bash
sed -n '1,240p' apps/web/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/dynamic-routes.md
sed -n '1,220p' apps/web/node_modules/next/dist/docs/01-app/01-getting-started/04-linking-and-navigating.md
sed -n '1,220p' apps/web/node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md
sed -n '1,180p' apps/web/node_modules/next/dist/docs/01-app/02-guides/testing/vitest.md
```

- [ ] **Step 2: feed helper와 media contract의 실패 테스트를 작성한다**

```ts
it("orders the selected reel first without losing the remaining videos", () => {
  const ordered = orderPopularVideosFrom(
    mainDiscoveryMock.popularPlaces.videos,
    "hyeopjae-sunset-highlight",
  );

  expect(ordered?.map((video) => video.id)).toEqual([
    "hyeopjae-sunset-highlight",
    "bijarim-walk-preview",
    "seongsan-sunrise-preview",
  ]);
});

it("returns null for an unknown reel", () => {
  expect(
    orderPopularVideosFrom(mainDiscoveryMock.popularPlaces.videos, "missing"),
  ).toBeNull();
});

it("defines local video metadata for every popular reel", () => {
  for (const video of mainDiscoveryMock.popularPlaces.videos) {
    expect(video.video.src).toMatch(/^\/videos\/discovery\/.+\.mp4$/);
    expect(video.video.posterSrc).toBe(video.image.src);
    expect(video.video.durationSeconds).toBe(6);
    expect(video.video.hasAudio).toBe(false);
  }
});
```

- [ ] **Step 3: focused tests를 실행해 새 계약 부재로 실패하는지 확인한다**

```bash
pnpm --filter @haetteum/web exec vitest run \
  tests/unit/features/discovery/popular-video-feed.test.ts \
  tests/unit/features/discovery/discovery-model.test.ts
```

Expected: `popular-video-feed` module과 `video`, `address`, `description`, interaction count 필드가 없어 FAIL.

- [ ] **Step 4: 표시 타입과 pure helper를 최소 구현한다**

```ts
export type PopularVideoMedia = {
  src: string;
  posterSrc: string;
  durationSeconds: number;
  hasAudio: boolean;
};

export type PopularVideoItem = {
  id: string;
  title: string;
  region: RegionId;
  location: string;
  address: string;
  description: string;
  creatorLabel: string;
  soundLabel: string;
  badgeLabel: string;
  durationLabel: string;
  viewCountLabel: string;
  likeCountLabel: string;
  commentCountLabel: string;
  shareCountLabel: string;
  image: DiscoveryImage;
  video: PopularVideoMedia;
};

export function findPopularVideoById(
  videos: readonly PopularVideoItem[],
  videoId: string,
) {
  return videos.find((video) => video.id === videoId);
}

export function orderPopularVideosFrom(
  videos: readonly PopularVideoItem[],
  videoId: string,
): readonly PopularVideoItem[] | null {
  const selectedIndex = videos.findIndex((video) => video.id === videoId);
  if (selectedIndex < 0) return null;
  return [...videos.slice(selectedIndex), ...videos.slice(0, selectedIndex)];
}
```

- [ ] **Step 5: 세 mock item에 주소·설명·count·media 값을 추가한다**

Use stable paths:

```ts
video: {
  src: "/videos/discovery/seongsan-sunrise-preview.mp4",
  posterSrc: "/images/discovery/place-seongsan.png",
  durationSeconds: 6,
  hasAudio: false,
}
```

Use truthful copy: `creatorLabel: "해뜸 여행"`, `soundLabel: "원본 오디오 없음"`; location별 실제 mock 주소는 `제주특별자치도 서귀포시 성산읍`, `제주특별자치도 제주시 한림읍`, `제주특별자치도 제주시 구좌읍`으로 고정한다.

- [ ] **Step 6: focused tests와 변경 파일 lint를 통과시킨다**

```bash
pnpm --filter @haetteum/web exec vitest run \
  tests/unit/features/discovery/popular-video-feed.test.ts \
  tests/unit/features/discovery/discovery-model.test.ts
pnpm --filter @haetteum/web exec eslint \
  src/features/discovery/discovery-model.ts \
  src/features/discovery/main-discovery.mock.ts \
  src/features/discovery/popular-video-feed.ts \
  tests/unit/features/discovery/popular-video-feed.test.ts \
  tests/unit/features/discovery/discovery-model.test.ts
```

---

### Task 2: 재현 가능한 로컬 motion preview 자산

**Files:**

- Create: `apps/web/scripts/generate-popular-motion-previews.swift`
- Create: `apps/web/public/videos/discovery/seongsan-sunrise-preview.mp4`
- Create: `apps/web/public/videos/discovery/hyeopjae-sunset-highlight.mp4`
- Create: `apps/web/public/videos/discovery/bijarim-walk-preview.mp4`

**Interfaces:**

- Consumes: 세 `apps/web/public/images/discovery/place-*.png` poster.
- Produces: 720×1280, 30fps, 6초, H.264, silent MP4 세 개.

- [ ] **Step 1: 자산 생성 전 실패 상태를 확인한다**

```bash
for video in \
  seongsan-sunrise-preview \
  hyeopjae-sunset-highlight \
  bijarim-walk-preview; do
  test -f "apps/web/public/videos/discovery/${video}.mp4"
done
```

Expected: 파일이 없어 non-zero exit.

- [ ] **Step 2: AVFoundation generator를 작성한다**

The script defines this exact input map and render contract:

```swift
struct PreviewInput {
  let imagePath: String
  let outputPath: String
  let zoomStart: CGFloat
  let zoomEnd: CGFloat
  let horizontalDrift: CGFloat
}

let width = 720
let height = 1280
let framesPerSecond: Int32 = 30
let durationSeconds: Int32 = 6
```

Use `AVAssetWriter`, `AVAssetWriterInputPixelBufferAdaptor`, Core Image and a
single `AVVideoCodecType.h264` video input. For each frame, aspect-fill the
poster, interpolate zoom from `1.00` to `1.08`, apply at most 4% horizontal
drift, crop to 720×1280, render into the pixel buffer, and append at
`CMTime(value: frame, timescale: 30)`. Do not add an audio track.

- [ ] **Step 3: 세 영상을 생성한다**

```bash
swift apps/web/scripts/generate-popular-motion-previews.swift
```

Expected: `apps/web/public/videos/discovery/` 아래에 세 MP4가 생성되고 각 파일이 0 byte보다 큼.

- [ ] **Step 4: QuickTime metadata와 파일 크기를 검증한다**

```bash
for video in apps/web/public/videos/discovery/*.mp4; do
  test -s "$video"
  mdls -name kMDItemDurationSeconds -name kMDItemPixelWidth \
    -name kMDItemPixelHeight "$video"
done
```

Expected: duration 약 6초, width 720, height 1280. 각 파일은 모바일 preview 용도로 5MB 이하를 목표로 한다.

---

### Task 3: 선택된 카드 하나만 자동재생하는 인기 영상 rail

**Files:**

- Create: `apps/web/src/components/travel/popular-video-rail.tsx`
- Create: `apps/web/tests/unit/components/travel/popular-video-rail.test.tsx`
- Modify: `apps/web/src/components/travel/popular-video-card.tsx`
- Modify: `apps/web/tests/setup.ts`
- Modify: `apps/web/tests/unit/components/travel/discovery-components.test.tsx`

**Interfaces:**

- `PopularVideoRailProps = { videos: readonly PopularVideoItem[] }`.
- `PopularVideoCardProps = { video: PopularVideoItem; active: boolean; eager?: boolean; onNavigate?: (videoId: string) => void }`.
- `PopularVideoRail` persists `{ href, scrollY, selectedVideoId }` under `haetteum:popular-reels:return` immediately before route navigation.

- [ ] **Step 1: deterministic media stubs를 test setup에 추가한다**

```ts
Object.defineProperty(HTMLMediaElement.prototype, "play", {
  configurable: true,
  value: vi.fn().mockResolvedValue(undefined),
});
Object.defineProperty(HTMLMediaElement.prototype, "pause", {
  configurable: true,
  value: vi.fn(),
});
```

Also provide a configurable `navigator.connection.saveData` test value without changing production globals.

- [ ] **Step 2: 자동재생과 link 계약의 실패 테스트를 작성한다**

```tsx
it("plays only the selected popular reel", async () => {
  render(<PopularVideoRail videos={mainDiscoveryMock.popularPlaces.videos} />);
  const media = document.querySelectorAll("video");

  await waitFor(() => expect(media[0].play).toHaveBeenCalled());
  expect(media[1].play).not.toHaveBeenCalled();
  expect(media[2].play).not.toHaveBeenCalled();
});

it("links every card to its reel route without forcing scroll", () => {
  render(<PopularVideoRail videos={mainDiscoveryMock.popularPlaces.videos} />);
  expect(
    screen.getByRole("link", { name: /성산일출봉 일출 미리보기/ }),
  ).toHaveAttribute("href", "/reels/seongsan-sunrise-preview");
});

it("renders the poster cue when reduced motion is requested", () => {
  setMatchMediaMatches("(prefers-reduced-motion: reduce)", true);
  render(<PopularVideoRail videos={mainDiscoveryMock.popularPlaces.videos} />);
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  expect(screen.getAllByLabelText("영상 미리보기 재생")[0]).toBeVisible();
});
```

- [ ] **Step 3: focused test를 실행해 static card 때문에 실패하는지 확인한다**

```bash
pnpm --filter @haetteum/web exec vitest run \
  tests/unit/components/travel/popular-video-rail.test.tsx \
  tests/unit/components/travel/discovery-components.test.tsx
```

Expected: `PopularVideoRail` 부재, video/link/active props 부재로 FAIL.

- [ ] **Step 4: `PopularVideoCard`를 active media link로 구현한다**

Implementation rules:

```tsx
<Link
  href={`/reels/${video.id}`}
  scroll={false}
  onClick={() => onNavigate?.(video.id)}
  aria-label={`${video.title} 릴스 보기`}
>
  <video
    ref={videoRef}
    src={video.video.src}
    poster={video.video.posterSrc}
    muted
    playsInline
    loop
    preload={active ? "metadata" : "none"}
    aria-hidden="true"
  />
</Link>
```

On `active`, visible document, no reduced motion and no save-data, call
`play()`. Otherwise call `pause()` and set `currentTime = 0`. Catch a rejected
`play()` and render the poster/play cue. Hide the center cue only after
`onPlaying`; render an `aria-hidden` progress bar with a 6-second animation.

- [ ] **Step 5: `PopularVideoRail`을 Embla selection coordinator로 구현한다**

Use the existing `Carousel setApi` contract. Subscribe to `select` and
`reInit`; active index is `api.selectedScrollSnap()`. Observe the rail root and
disable active playback when it leaves the viewport. On navigation, write the
current `pathname + search + hash`, `window.scrollY`, and selected video id to
sessionStorage.

- [ ] **Step 6: focused tests와 lint를 통과시킨다**

```bash
pnpm --filter @haetteum/web exec vitest run \
  tests/unit/components/travel/popular-video-rail.test.tsx \
  tests/unit/components/travel/discovery-components.test.tsx
pnpm --filter @haetteum/web exec eslint \
  src/components/travel/popular-video-card.tsx \
  src/components/travel/popular-video-rail.tsx \
  tests/setup.ts \
  tests/unit/components/travel/popular-video-rail.test.tsx \
  tests/unit/components/travel/discovery-components.test.tsx
```

---

### Task 4: 인기 관광지 조합과 2열 영상 코스 UI

**Files:**

- Modify: `apps/web/src/components/patterns/popular-places-tab.tsx`
- Modify: `apps/web/src/components/travel/video-course-card.tsx`
- Modify: `apps/web/tests/unit/components/patterns/main-discovery.test.tsx`
- Modify: `apps/web/tests/unit/components/travel/discovery-components.test.tsx`

**Interfaces:**

- Consumes: `PopularVideoRail`, existing `VideoCourseItem`.
- Produces: first-reel CTA link and semantic `ul.grid.grid-cols-2` course list.

- [ ] **Step 1: CTA와 2열 grid 실패 테스트를 작성한다**

```tsx
expect(
  screen.getByRole("link", { name: "영상으로 둘러보기" }),
).toHaveAttribute("href", "/reels/seongsan-sunrise-preview");

const courseList = screen.getByRole("list", {
  name: "지금 뜨는 영상 코스 목록",
});
expect(courseList).toHaveClass("grid", "grid-cols-2");
expect(within(courseList).getAllByRole("listitem")).toHaveLength(3);
expect(screen.queryByRole("region", {
  name: "지금 뜨는 영상 코스 목록",
})).not.toBeInTheDocument();
```

- [ ] **Step 2: focused pattern test를 실행해 기존 visual CTA와 Carousel 때문에 실패하는지 확인한다**

```bash
pnpm --filter @haetteum/web exec vitest run \
  tests/unit/components/patterns/main-discovery.test.tsx \
  tests/unit/components/travel/discovery-components.test.tsx
```

- [ ] **Step 3: pattern을 rail과 grid로 최소 변경한다**

- `VideoBrowseVisualAction`을 first video route를 받는 `Link`로 변경한다.
- popular video `Carousel` block을 `<PopularVideoRail videos={videos} />`로 교체한다.
- course `Carousel`을 `<ul aria-label="지금 뜨는 영상 코스 목록" className="mt-2.5 grid grid-cols-2 gap-2">`로 교체한다.
- `VideoCourseCard` image container를 `aspect-[16/10]`로, `sizes`를 `(max-width: 479px) 46vw, 216px`로 맞춘다.
- 320px에서 제목과 metadata가 겹치지 않도록 title은 `line-clamp-1`, summary와 location은 한 줄 제한을 사용한다.

- [ ] **Step 4: focused tests와 lint를 통과시킨다**

```bash
pnpm --filter @haetteum/web exec vitest run \
  tests/unit/components/patterns/main-discovery.test.tsx \
  tests/unit/components/travel/discovery-components.test.tsx
pnpm --filter @haetteum/web exec eslint \
  src/components/patterns/popular-places-tab.tsx \
  src/components/travel/video-course-card.tsx \
  tests/unit/components/patterns/main-discovery.test.tsx \
  tests/unit/components/travel/discovery-components.test.tsx
```

---

### Task 5: 전체 화면 릴스 route와 viewer

**Files:**

- Create: `apps/web/src/components/travel/reels-viewer.tsx`
- Create: `apps/web/src/app/reels/[videoId]/page.tsx`
- Create: `apps/web/src/app/reels/[videoId]/not-found.tsx`
- Create: `apps/web/tests/unit/components/travel/reels-viewer.test.tsx`
- Create: `apps/web/tests/unit/app/reels-page.test.tsx`

**Interfaces:**

- `ReelsViewerProps = { videos: readonly PopularVideoItem[]; returnHref: string }`.
- The page calls `orderPopularVideosFrom(mainDiscoveryMock.popularPlaces.videos, videoId)` and passes the ordered result.
- `generateStaticParams()` returns `{ videoId }[]`; metadata uses the selected video title and description.

- [ ] **Step 1: route 조합과 viewer interaction 실패 테스트를 작성한다**

```tsx
it("renders the selected reel first", async () => {
  const ui = await ReelsPage({
    params: Promise.resolve({ videoId: "hyeopjae-sunset-highlight" }),
  });
  render(ui);
  expect(screen.getAllByRole("group", { name: /릴스/ })[0]).toHaveAccessibleName(
    /협재 노을 하이라이트/,
  );
});

it("toggles a local like without changing server data", async () => {
  const user = userEvent.setup();
  render(<ReelsViewer videos={orderedVideos} returnHref="/?tab=places" />);
  const like = screen.getByRole("button", { name: /좋아요/ });
  await user.click(like);
  expect(like).toHaveAttribute("aria-pressed", "true");
});

it("shows no sound button for silent motion previews", () => {
  render(<ReelsViewer videos={orderedVideos} returnHref="/?tab=places" />);
  expect(screen.queryByRole("button", { name: /소리/ })).not.toBeInTheDocument();
  expect(screen.getAllByText("원본 오디오 없음")[0]).toBeVisible();
});
```

Mock `next/navigation` `notFound` with the existing route test pattern and test
unknown ids separately.

- [ ] **Step 2: focused tests를 실행해 route와 viewer 부재로 실패하는지 확인한다**

```bash
pnpm --filter @haetteum/web exec vitest run \
  tests/unit/app/reels-page.test.tsx \
  tests/unit/components/travel/reels-viewer.test.tsx
```

- [ ] **Step 3: dynamic route와 not-found를 구현한다**

```tsx
export function generateStaticParams() {
  return mainDiscoveryMock.popularPlaces.videos.map(({ id }) => ({
    videoId: id,
  }));
}

export default async function ReelsPage({ params }: ReelsPageProps) {
  const { videoId } = await params;
  const videos = orderPopularVideosFrom(
    mainDiscoveryMock.popularPlaces.videos,
    videoId,
  );
  if (!videos) notFound();
  return <ReelsViewer videos={videos} returnHref="/?tab=places" />;
}
```

The not-found page uses the existing centered app-shell pattern and a link
named `인기 관광지로 돌아가기` to `/?tab=places`.

- [ ] **Step 4: `ReelsViewer` layout and single-active playback를 구현한다**

- Root: `fixed inset-0 z-50 mx-auto h-dvh max-w-[30rem] overflow-y-auto snap-y snap-mandatory bg-black`.
- Each slide: `relative h-dvh snap-start snap-always overflow-hidden` with one video, top metadata, right action rail and bottom details.
- `IntersectionObserver` threshold `[0.6, 0.8]` updates active index; keyboard `ArrowUp`/`ArrowDown` calls `scrollIntoView` unless reduced motion.
- Active media follows the same play/pause/reset rule as the feed.
- Back control calls `router.back()` when history exists and otherwise `router.push(returnHref)`.
- Tap on the non-control video surface toggles pause. Like state is a `Set<string>` in component state.
- Share uses `navigator.share({ title, text, url })`; clipboard fallback announces `링크를 복사했어요.` in an `aria-live="polite"` region.
- Comment and more are non-interactive labeled rows with `준비 중` text, not empty buttons.
- Audio button is rendered only for `video.video.hasAudio`.

- [ ] **Step 5: viewer와 route focused tests 및 lint를 통과시킨다**

```bash
pnpm --filter @haetteum/web exec vitest run \
  tests/unit/app/reels-page.test.tsx \
  tests/unit/components/travel/reels-viewer.test.tsx
pnpm --filter @haetteum/web exec eslint \
  src/app/reels/'[videoId]'/page.tsx \
  src/app/reels/'[videoId]'/not-found.tsx \
  src/components/travel/reels-viewer.tsx \
  tests/unit/app/reels-page.test.tsx \
  tests/unit/components/travel/reels-viewer.test.tsx
```

---

### Task 6: 뒤로가기 복원, 문서 상태와 전체 회귀

**Files:**

- Modify: `apps/web/src/components/travel/popular-video-rail.tsx`
- Modify: `apps/web/tests/unit/components/travel/popular-video-rail.test.tsx`
- Modify: `DESIGN.md`
- Modify: `docs/superpowers/specs/2026-08-24-popular-place-reels-design.md`

**Interfaces:**

- Consumes: session snapshot key `haetteum:popular-reels:return`.
- Produces: one-time scroll/selected-video restoration and implementation verification record.

- [ ] **Step 1: return snapshot 복원 실패 테스트를 작성한다**

```tsx
it("restores and consumes the saved popular-reel position", async () => {
  sessionStorage.setItem(
    "haetteum:popular-reels:return",
    JSON.stringify({
      href: "/?region=jeju&tab=places",
      scrollY: 420,
      selectedVideoId: "hyeopjae-sunset-highlight",
    }),
  );

  render(<PopularVideoRail videos={mainDiscoveryMock.popularPlaces.videos} />);
  await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(0, 420));
  expect(sessionStorage.getItem("haetteum:popular-reels:return")).toBeNull();
});
```

- [ ] **Step 2: 현재 URL이 snapshot href와 일치할 때만 복원한다**

After Embla API is ready, call `scrollTo(selectedIndex, true)`, then restore
window scroll in `requestAnimationFrame`. Consume the snapshot once. Invalid
JSON, missing video ids, mismatched URLs and unavailable storage are ignored
without throwing.

- [ ] **Step 3: focused feature suite를 실행한다**

```bash
pnpm --filter @haetteum/web exec vitest run \
  tests/unit/features/discovery/popular-video-feed.test.ts \
  tests/unit/features/discovery/discovery-model.test.ts \
  tests/unit/components/travel/discovery-components.test.tsx \
  tests/unit/components/travel/popular-video-rail.test.tsx \
  tests/unit/components/travel/reels-viewer.test.tsx \
  tests/unit/components/patterns/main-discovery.test.tsx \
  tests/unit/app/reels-page.test.tsx
```

- [ ] **Step 4: 전체 web test와 변경 파일 lint를 분리 실행한다**

```bash
pnpm --filter @haetteum/web test
pnpm --filter @haetteum/web exec eslint \
  src/app/reels/'[videoId]'/page.tsx \
  src/app/reels/'[videoId]'/not-found.tsx \
  src/components/patterns/popular-places-tab.tsx \
  src/components/travel/popular-video-card.tsx \
  src/components/travel/popular-video-rail.tsx \
  src/components/travel/reels-viewer.tsx \
  src/components/travel/video-course-card.tsx \
  src/features/discovery/discovery-model.ts \
  src/features/discovery/main-discovery.mock.ts \
  src/features/discovery/popular-video-feed.ts
```

Repository-wide existing failures must be reported separately from focused
feature results.

- [ ] **Step 5: DESIGN/spec 상태를 실제 결과만으로 갱신한다**

Record implemented components, route, media source limitation, exact test
counts and browser QA evidence. Do not mark the spec complete until browser
verification and design QA pass.

---

### Task 7: 실제 브라우저 및 시각 QA

**Files:**

- Create or update: `design-qa.md`
- Create: `.omx/artifacts/visual-ralph/popular-place-reels/*` screenshots and comparison evidence.

**Interfaces:**

- Consumes: running local Next app and both user reference images.
- Produces: `design-qa.md` with `final result: passed` or an explicit blocking reason.

- [ ] **Step 1: 실행 중인 dev server를 확인하고 충돌 없이 앱을 시작한다**

```bash
lsof -nP -iTCP -sTCP:LISTEN | rg ':(3000|3001|4173)\b' || true
```

Reuse an existing user server when it serves the current checkout. Otherwise
start `pnpm --filter @haetteum/web dev` in a persistent session. Do not run a
production build against the same `.next` directory while dev is active.

- [ ] **Step 2: 390px에서 인기 관광지와 릴스 기본 흐름을 검증한다**

Open `/?region=jeju&tab=places`, verify only the selected card is playing,
capture the tab, click the second card, verify `/reels/hyeopjae-sunset-highlight`,
capture the viewer, toggle like, invoke share fallback, move to the next slide,
and go back.

- [ ] **Step 3: 320px와 768px 회귀를 검증한다**

At each width verify document `scrollWidth === clientWidth`, no card metadata
collision, 44px controls, 2-column courses, fixed viewer sizing, keyboard
navigation, return scroll restoration and zero console errors.

- [ ] **Step 4: reduced-motion과 media fallback을 검증한다**

Emulate `prefers-reduced-motion: reduce`; verify feed autoplay is absent and
the poster cue remains. Trigger one video source error in the browser and
verify poster/retry UI without an uncaught console error.

- [ ] **Step 5: reference comparison과 blocking design QA를 작성한다**

Compare the user home reference with the popular-place capture and the user
reels reference with the selected viewer capture at matching mobile width.
Record P0-P3 findings in `design-qa.md`, fix P0/P1/P2 issues, recapture, and
repeat until the file states `final result: passed`. P3 polish may remain as
explicit follow-up notes.

- [ ] **Step 6: final verification을 fresh-run 한다**

Re-run focused tests, changed-file lint, `git diff --check`, inspect
`git status --short`, and confirm no unrelated files were modified. Report
production build as skipped if an active user dev server still owns `.next`,
or run it only in an isolated copy.
