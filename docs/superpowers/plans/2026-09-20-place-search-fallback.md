# Place search fallback implementation plan

> **For agentic workers:** Use subagent-driven-development for the bounded API task and review; coordinate the UI integration in this task. Steps use checkbox syntax.

**Goal:** Find 경복궁 without an implicit 경기 filter and show useful external place information when the stored catalog has no match.

**Architecture:** Keep `/places` and UUID-based saved-course/review flows unchanged. Add `/places/external-search` for Kakao keyword results; discovery searches the DB first and calls external search only on empty results or explicit “더 찾아보기”. External results open an accessible basic-detail dialog; matching internal places link to existing details. No TourAPI calls or collection from search.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Zod contracts, Next.js 16.3 App Router, React, Jest/Vitest.

**Spec:** User-approved design in this conversation (2026-09-20): default region fix, DB missing-data check, Kakao fallback and basic details. Rich editorial descriptions and new data collection are deferred.

## Global constraints
- No migration, TourAPI request, background collection, or production writes.
- Keep current unrelated reel changes, output/, tmp/, and reliability plan untouched.
- Use current local branch `codex/place-search-fallback`; changes remain reviewable in the shared checkout.
- No key, DB URL, raw provider error, or configuration secret in UI/log output.
- A search failure is not an empty result; preserve successful DB results on external errors.

### Task 1: External keyword API and contracts

Files: `packages/contracts/src/places.ts`, `packages/contracts/src/index.ts`, `apps/api/src/places/kakao-local.client.ts`, `kakao-local.schemas.ts`, new `external-place-search.service.ts` and tests, `places.controller.ts`, `places.module.ts`, existing affected API tests.

Interfaces:
```ts
// Export these from @haetteum/contracts.
ExternalPlaceSearchQuerySchema // { q: trimmed nonempty max100, region?: PlaceRegion }
ExternalPlaceSearchItemSchema // NearbyPlaceItemSchema.extend({matchedPlaceId: uuid.nullable()})
ExternalPlaceSearchResponseSchema // {status:'ready',items:ExternalPlaceSearchItem[]} | {status:'unavailable',reason:'provider_not_configured'|'provider_unavailable'}
// GET /api/v1/places/external-search?q=경복궁&region=seoul
KakaoLocalPort.searchKeyword(input: {query: string; size: number}): Promise<readonly KakaoLocalPlace[]>
ExternalPlaceSearchService.search(input: ExternalPlaceSearchQuery): Promise<ExternalPlaceSearchResponse>
```

- [x] Add failing tests for fixed keyword endpoint, no radius/category restriction, blank distance, configured/unconfigured/error responses, explicit regional address filtering, duplicate provider IDs, internal matching by normalized exact title plus close coordinates (100m) OR same normalized full address. Do not match title alone. Internal matching only visible places in active supported regions. Avoid arbitrary candidate limits silently causing duplicates; query relevant titles.
- [x] Run API targeted Jest tests and record expected red.
- [x] Reuse existing Kakao timeout/validation/normalization. Add keyword method, fixed URL. Validate numeric provider ID, sane geographic bounds and map URL at provider boundary; never return arbitrary external URLs. Keyword field distance may be omitted. Query text unchanged; filter explicit region by first address subdivision (서울/서울특별시, 경기/경기도, 강원/강원도/강원특별자치도, 부산/부산광역시, 제주/제주도/제주특별자치도). Global search accepts all regions. Fetch up to 15 relevance-sorted results. Return factual fields, no invented image/description. Do not cache provider errors. No persistence or migration.
- [x] Register static route before UUID dynamic route. Update port stubs and controller dependencies. Run affected Jest suites, contracts build, API lint/build.

### Task 2: Search scope and external detail UI

Files: discovery model/page/content, explore screen, search-results-section, new discovery-place-search-api, place-search-form, external-place-result, tests.

Interfaces:
```ts
// Keep existing searchPlaces DB-only for course/review pickers.
searchDiscoveryPlaces(region: PlaceRegion|undefined,q: string,includeExternal: boolean): Promise<DiscoveryPlaceSearchLoadState>
// ready contains items: PlaceListItem[], external?: ExternalPlaceSearchResponse.
// DiscoveryQuery adds searchRegion?: PlaceRegion (independent of browse region), externalSearch?: boolean.
```

- [x] Failing regression: `/explore?q=경복궁` has no region parameter in DB request even when reelRegion=jeju. Explicit searchRegion=seoul is respected. Default form displays 전체 지역; submitted searchRegion is visible and independent of reel filters.
- [x] Failing API tests: nonempty DB bypasses external lookup, empty DB automatically calls external, manual includeExternal does so with DB results, external failure keeps DB results, DB error remains error, invalid/empty query does not call external.
- [x] Implement model fields and form shared by explore and main search results; preserve existing browsing defaults and clear-search behavior. Forward searchRegion and external flag in generated links. Retain old DB-only search API for course picker/review.
- [x] Render external results as separate additional-place list. Filter already displayed internal matched IDs; matching internal IDs absent from first page get internal links. Deduplicate matched internal IDs too. Button opens an accessible modal basic detail (name, category, road/address, telephone as text, coordinates, Kakao map link, provenance). Missing rich content is clearly stated; never route external ID to UUID detail page. Preserve DB results and show retryable external status. Distinguish true empty vs provider unavailable. Manual external button uses prefetch=false and retains query/searchRegion.
- [x] Test real components: opening/closing external detail, safe link/provenance, internal matched navigation, duplicates, empty/error states, region form submission. Run affected Vitest suites and typecheck/lint.

### Task 3: Verify and review
- [x] Read-only local configured DB query for 경복궁, visibility and region; no raw secrets. Record unavailable access accurately.
- [x] Full contracts/API tests and API build; affected web tests, web typecheck/build and changed-file lint. Investigate failures attributable to change.
- [x] Independent review of API and integrated diff, resolve actionable issues, rerun covering tests.
- [x] Summarize changed behavior, verification, and any live-check limitations. No push/deploy requested.


## Completion evidence

- Read-only DB: 경복궁 exists in active Seoul region, visible; detailSyncedAt is null. No data collection or migration performed.
- Search region regression reproduced before fix. Current default search returns 경복궁; explicit Seoul selection retains it.
- Browser: DB-missing 경복궁 근정전 automatically falls back to Kakao and opens a factual basic-detail dialog. Existing 경복궁 opens its UUID detail page.
- Browser after address fix: 경복궁 appears once; Kakao additions begin with 경복궁 주차장. Canonicalization handles 서울특별시/서울 and (세종로), while preserving (101동)/(102동).
- Web: 743 tests passed, tsc and changed-file ESLint passed, production `next build --webpack` passed. Default Turbopack failed on the environment's process/port restriction, including the escalated retry.
- API: full suite 716 tests passed before the final building-qualifier regression; final affected service 6/6 passed after that guard, API lint/build passed. Contracts 53 tests passed.
- Independent web/integrated review complete; final scoped P2 address qualifier finding addressed and re-reviewed clean.
- Local API development server restored after build stopped its prior process. No repository env configuration changed.
- Work remains uncommitted on codex/place-search-fallback; unrelated pre-existing reel edits remain untouched.

## Follow-up: remove search region filtering

User requested removal of the search-region control. Removed the form control and searchRegion state/link propagation; discovery and explore now always search all supported stored regions, regardless of legacy searchRegion URL values. Browsing filters and regional APIs used by other flows remain intact. Updated empty-state copy and regressions. Verified 174 related web tests, TypeScript, scoped lint, and the live browser (filter absent, 경복궁 and external results visible).
