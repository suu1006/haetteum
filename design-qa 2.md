# Welcome page design QA

## Comparison target

- Source visual truth: `.omx/artifacts/visual-ralph/welcome-page/reference.png`
  (`502 × 1230` pixels, supplied screenshot).
- Normalized app-content reference:
  `.omx/artifacts/visual-ralph/welcome-page/reference-content-390x955.png`.
- Rendered implementation:
  `.omx/artifacts/visual-ralph/welcome-page/implementation-390x955.png`.
- Route and state: `/welcome`, light mode, unauthenticated welcome state.
- CSS viewport: `390 × 955`; browser screenshot: `390 × 955` pixels;
  device scale factor: `1`.
- Normalization: the source phone status bar, outer canvas and bottom caption were
  excluded by cropping the app-owned content to `433 × 1060`, then resizing it
  to `390 × 955`. The source's brown floating overlay and the development-only
  Next.js tools bubble are excluded from the visual verdict.

## Evidence

- Full-view side-by-side comparison:
  `.omx/artifacts/visual-ralph/welcome-page/comparison-390x955.png`.
- Secondary pixel-diff evidence:
  `.omx/artifacts/visual-ralph/welcome-page/pixel-diff-390x955.png`.
- Responsive captures:
  - `.omx/artifacts/visual-ralph/welcome-page/implementation-320.png`
  - `.omx/artifacts/visual-ralph/welcome-page/implementation-320-bottom.png`
  - `.omx/artifacts/visual-ralph/welcome-page/implementation-768.png`
- No separate focused crop was required: the normalized `390 × 955` full view
  keeps the headline, all card copy, icons, CTA and login control legible at
  1:1 density.

## Required fidelity surfaces

- Fonts and typography: Pretendard is active; display/body hierarchy, weights,
  line heights and Korean word wrapping are stable. Non-breaking phrase spans
  prevent particles in `한눈에 확인`, `최적의 경로 추천` and `후기를 한 번에`
  from splitting awkwardly.
- Spacing and layout rhythm: reference-aligned `32px` mobile side margins,
  `12px` card gaps, `326px` cards/CTA, `52px` CTA and `44px` login control.
  At `768 × 1024`, the `480px` hero is centered at `left: 144px` with no
  horizontal overflow.
- Colors and tokens: primary purple and welcome ranking/course/review accents
  use semantic CSS tokens. The glass card uses the welcome-only 80% surface
  token with backdrop blur.
- Image quality: the project-owned `841 × 1870` generated photograph is loaded
  through `next/image`, uses a responsive `sizes` value, and retains a clean
  balloon/valley composition without embedded UI or text.
- Copy and content: the three approved product features are present. The CTA
  intentionally uses the corrected product copy `여행 시작하기` rather than
  the typo in the visual reference.
- Icons and interactions: Lucide icons are consistent in stroke family. The CTA
  navigates to `/`; login remains visibly disabled because its destination is
  undecided.
- Accessibility: semantic heading/region/article/link/button structure is
  present, the decorative image has empty alt text, native disabled state is
  used, controls meet the 44px minimum, and axe reports no detectable
  violations with the established jsdom color-contrast exception.

## Responsive and browser results

- `320 × 568`: document height `776px`, maximum vertical scroll `208px`, no
  horizontal overflow; CTA `52px`, login `44px`; the complete lower action area
  is reachable by scrolling.
- `390 × 955`: document equals viewport, three cards are `326 × 92px`, no
  horizontal overflow, background image loaded successfully.
- `768 × 1024`: centered hero `480 × 960px`, no horizontal overflow; CTA
  `416 × 52px`, login `416 × 44px`.
- Primary interaction: activating `여행 시작하기` reached
  `http://127.0.0.1:3000/` and rendered the `Haetteum` heading.
- Browser console: zero errors and zero warnings in the captured states.

## Comparison history

1. Initial unnormalized pass scored `78/100`. Findings included mismatched crop,
   over-wide cards, higher feature stack and approximate icons. The CTA copy
   finding was rejected because `여행 시작하기` is the approved product copy.
2. The reference was normalized to app-owned `390 × 955` content. Card width,
   page padding, bottom spacing, icon choice and Korean wrapping were refined.
   The normalized pass scored `82/100` and identified the background composition
   as the dominant remaining mismatch.
3. A second project-owned background was generated with reference-aligned four
   balloon placement, a warmer middle valley and darker lower forest. Card copy
   phrases were made wrap-safe. The next verdict scored `91/100`.
4. Glass opacity was reduced from 84% to 80%. The final visual verdict scored
   `92/100` and confirmed the threshold remained satisfied.

## Findings

- No actionable P0, P1 or P2 findings remain for the requested responsive
  welcome-page scope.
- Accepted P3 differences: the original generated photograph has small balloon
  and ridge offsets from the reference; route/review Lucide glyphs are slightly
  simpler; the hero headline is fractionally less luminous. These preserve the
  approved product design while keeping the image and icons project-owned.

## Implementation checklist

- [x] Reusable feature-card component
- [x] Responsive `/welcome` route
- [x] Project-owned background asset
- [x] CTA and disabled login state
- [x] 320/390/768 browser verification
- [x] Visual score at or above 90
- [x] Pixel-diff evidence
- [x] Unit, accessibility, lint and production-build verification

final result: passed

---

# Main discovery page design QA

## Comparison target

- Source visual truth:
  `.superpowers/sdd/2026-08-21-main-discovery-page/qa/source-approved.png`
  (`456 × 1198` pixels), copied without alteration from the approved clipboard
  image at
  `/var/folders/18/zsywvwpj29jbnnlynpkv4qrc0000gn/T/codex-clipboard-e10a7c4f-8de6-455c-b8b1-44071ee03408.png`.
- Binding product specification:
  `docs/superpowers/specs/2026-08-20-main-welcome-routes-design.md`.
- Route and state: `/`, light theme, no search query, `추천` tab, `제주`
  region, AI result not yet requested.
- Browser-rendered implementation:
  `.superpowers/sdd/2026-08-21-main-discovery-page/qa/390-default-final-normalized.jpg`.
- CSS viewport for the normalized capture: `390 × 1200`; browser screenshot:
  `390 × 1170` pixels; device scale factor: `1`.
- Density normalization: the `456 × 1198` source and the `390px`-wide
  implementation were displayed together at a common `390px` comparison
  width. At that width the uncropped source renders as `390 × 1025`; the
  implementation remains `390 × 1170`. The source phone frame, status bar,
  external canvas and bottom `메인 페이지` caption are non-binding because the
  approved specification explicitly excludes recreated phone chrome. Copy and
  character identity are also non-binding; structure, hierarchy and density are
  binding.

## Evidence

- Baseline full-view comparison, source and implementation in one image:
  `.superpowers/sdd/2026-08-21-main-discovery-page/qa/comparison-baseline-source-vs-390.png`.
- Final full-view comparison, source and implementation in one image:
  `.superpowers/sdd/2026-08-21-main-discovery-page/qa/comparison-final-source-vs-390.png`.
- Focused search, filter and ranking comparison:
  `.superpowers/sdd/2026-08-21-main-discovery-page/qa/comparison-focus-search-ranking.png`.
- Focused AI banner, festival and fixed-navigation comparison:
  `.superpowers/sdd/2026-08-21-main-discovery-page/qa/comparison-focus-banner-festival-nav.png`.
- Exact responsive viewport captures:
  - `.superpowers/sdd/2026-08-21-main-discovery-page/qa/320-default-final-viewport.jpg`
    (`320 × 800`)
  - `.superpowers/sdd/2026-08-21-main-discovery-page/qa/390-default-final-viewport.jpg`
    (`390 × 844`)
  - `.superpowers/sdd/2026-08-21-main-discovery-page/qa/768-default-final-viewport.jpg`
    (`768 × 1024`)
- AI interaction evidence:
  `.superpowers/sdd/2026-08-21-main-discovery-page/qa/390-ai-success-final-viewport.jpg`
  (`390 × 844`).

## Automated verification

All commands used Node `24.19.0` from the required prefixed PATH.

- Initial and final full web test:
  `pnpm --filter @haetteum/web test` -> `11` test files passed, `50` tests
  passed.
- Image-warning regression RED: the focused travel-component test failed with
  `Expected ... relative; Received: aspect-[4/3]` before the production fix.
- Image-warning regression GREEN:
  `tests/unit/components/travel/discovery-components.test.tsx` -> `4/4`
  passed.
- Final nearest affected tests:
  `tests/unit/components/patterns/main-discovery.test.tsx` plus
  `tests/unit/components/travel/discovery-components.test.tsx` -> `15/15`
  passed.
- Final lint: `pnpm --filter @haetteum/web lint` -> exit `0`, no diagnostics.
- Final production build: `pnpm --filter @haetteum/web build` -> exit `0`;
  compilation, TypeScript, page-data collection and all `6/6` static-page
  generations completed. `/` remains a dynamic App Router route.

## Browser interaction results

- Search: entering `성산` and submitting reached
  `/?tab=recommended&region=jeju&q=성산`, preserved the query in the search
  control and reduced the ranking to the one matching item.
- Content tabs: `추천`, `인기 관광지`, `관광 축제`, and `AI 코스` each
  navigated to its serialized query/fragment and exposed `aria-current="page"`.
- Region filters: `서울`, `경기`, `강원`, `부산`, and `제주` each navigated to
  the correct serialized query and exposed `aria-current="true"`; the four
  regions without current mock items rendered zero ranked results, while 제주
  restored all three.
- AI CTA: `코스 추천받기` kept the route on `/` and exposed the live
  `role="status"` message `제주 하루 코스 추천을 준비했어요.`.
- Home semantics: from the 부산 query, activating `홈` returned to `/`; Home is
  the only bottom-navigation link and carries `aria-current="page"`.
- Coming-soon semantics: `탐색`, `내 일정`, `내 후기`, and `마이페이지` are
  four non-focusable `span[aria-disabled="true"]` items, each with the hidden
  `준비 중` label and no placeholder href.
- Keyboard focus: the search input accepted keyboard focus and settled to the
  project focus treatment: primary border plus a `3px` primary ring.
- Browser console on the fresh post-build server: zero errors and zero warnings.
  The original reproducible Next Image warning for the festival thumbnail no
  longer appears.

## Responsive and accessibility results

- `320 × 800`: document `scrollWidth` equals `clientWidth` at `320px`; all four
  tabs and five regions fit on one line; every visible link, button and input is
  at least `44 × 44`; the ranked list is `288px` wide with `504px` scrollable
  content and exposes part of the next card; hero/search overlap is `32px`.
- `390 × 844`: document `scrollWidth` is `390px`; page height is `1199px`; the
  `358px` ranked scroller exposes the third card after two complete `160px`
  cards; the compact AI banner is `358 × 210`; hero/search overlap is `32px`.
- `768 × 1024`: the mobile information structure is centered in the approved
  `480px` shell from `x=144` to `x=624`; the fixed navigation matches that
  shell, there is no page overflow, and the third `176px` card remains partially
  visible in the `448px` ranked scroller.
- Fixed navigation reserves `96px` in the page shell and uses the existing
  `safe-area-bottom` utility. The test browser reports a zero environmental
  inset, as expected, and the final content clearance is `95.5px` (subpixel
  rounding of the `96px` reserve), so festival content remains reachable.
- All six visible raster assets completed loading. Each `next/image` uses
  `object-fit: cover`; the hero, 4:3 place cards, right-side AI art and festival
  thumbnail preserve aspect ratio without stretching.
- Landmark, heading, ordered-ranking, form, navigation, image-alt and selected
  state semantics were present in the browser DOM. Selection is not conveyed by
  color alone because tabs/regions expose `aria-current`, Home exposes
  `aria-current="page"`, and unavailable destinations expose `aria-disabled`.

## Required fidelity surfaces

- Fonts and typography: the loaded stack begins with `Pretendard Variable` /
  `Pretendard`; the hero heading is `24px / 32px / 700` with `-0.48px`
  tracking, and section headings are `20px / 28px / 600` with `-0.25px`
  tracking. Korean labels no longer wrap at `320px`; hierarchy and optical
  weight remain consistent from hero through navigation.
- Spacing and layout rhythm: the `240px` hero and `32px` search overlap preserve
  the approved composition. Ranking cards were reduced to `160px` mobile /
  `176px` tablet widths, made image-flush, and compacted to restore the source's
  scan density while retaining the approved horizontal-discovery cue. The AI
  banner was reduced from the baseline tall stack to a `210px` horizontal
  composition with copy left and artwork right.
- Colors and tokens: the browser reports the semantic light background, white
  card/navigation surfaces, neutral border, and primary purple selected state.
  Primary is limited to CTA, selection and ranking emphasis; contrast remains
  legible and no unapproved palette was introduced.
- Image quality and asset fidelity: the implementation uses the six
  project-owned raster assets supplied by the discovery mock. No source logo,
  character, photograph, handcrafted SVG, CSS illustration or placeholder art
  was copied or substituted. Responsive `sizes` now matches the compact card and
  AI placements.
- Copy and content: approved Haetteum copy is intact, including
  `오늘은 어디로 떠나볼까요?`, the four approved tab labels, five region
  labels, `지역별 인기 관광지 TOP 3`, `코스 추천받기`, and
  `이번 주 인기 축제`. Source-product place names and character identity were
  intentionally not copied.
- Icons and interactions: Lucide icons consistently render at `16px` or `20px`
  with `2px` strokes and are marked decorative where text provides the name.
  Search, filters, CTA and Home all have verified interaction outcomes.
- Shape and surfaces: cards use the project `16px` radius, neutral border and
  restrained card shadow. The search panel retains its approved floating
  surface; no extra phone frame, fake status bar or decorative container was
  introduced.

## Comparison history

1. Baseline verdict: blocked. The combined baseline found a P1 density mismatch
   in the AI banner (stacked illustration made the implementation `1553px`
   tall), a P2 ranking-density mismatch (roughly one card plus a narrow second
   cue), a P2 `320px` filter-wrap / undersized-target issue, and a P2 Next Image
   parent-position warning for the festival thumbnail.
2. Correction round: the AI asset became a right-side banner image; ranking
   cards became compact, image-flush `160/176px` cards; filters gained
   `44px` minimum width, no-wrap text and tuned horizontal gaps; the festival
   image's immediate fill parent became positioned. An intermediate `320px`
   check showed the final tab still clipping at the edge, so padding and gaps
   were tightened within the same correction round before the accepted capture.
3. Post-fix verdict: the final combined and focused comparisons show source-like
   section density, a horizontal AI banner, readable single-line filters, two
   complete ranking cards plus the approved next-card cue, and compact festival
   and fixed-navigation regions. Browser console, exact responsive captures,
   focused tests, full tests, lint and build all passed; no P0/P1/P2 remained.

## Findings

- No actionable P0, P1 or P2 findings remain for the approved main-discovery
  scope.
- Accepted intentional differences: the implementation uses the specification's
  photographic hero instead of the source's white phone header; it omits source
  phone chrome and notification affordances; it uses project-owned place and AI
  imagery; and it shows two ranking cards plus the next cue rather than three
  complete cards so horizontal discovery remains explicit down to `320px`.
- Follow-up P3 polish: the filled selected-tab pill is visually stronger than
  the source underline, and Lucide navigation glyphs are slightly lighter than
  the source icons. Both remain consistent with the existing Haetteum tokens,
  accessibility states and component system.

## Implementation checklist

- [x] Source and implementation inspected together
- [x] Focused region comparisons inspected
- [x] Search, four tabs, five regions and AI success verified
- [x] Home and four coming-soon navigation items verified
- [x] 320/390/768 responsive captures verified
- [x] Horizontal overflow, next-card cue, overlap, image crop and fixed nav checked
- [x] Console, keyboard focus, semantics and minimum targets checked
- [x] Focused regression test, full tests, lint and production build passed
- [x] Fresh local server left running at `http://127.0.0.1:3000/`

final result: passed
