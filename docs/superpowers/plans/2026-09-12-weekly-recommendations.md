# Nationwide weekly recommendations implementation plan

**Goal:** Serve twenty nationwide weekly recommendations prepared Saturday, validated Sunday, atomically published Monday in Asia/Seoul.
**Architecture:** Persistent weekly editions and candidate audit records; deterministic balanced selection with region/type caps, four-week repeat exclusion, prepared thumbnails. Read API only reads published snapshots. Failed preparation preserves last published edition. Scheduler and manual CLI share implementation.
**Approved design:** User conversation: automatic validation, nationwide region/type diversity, 20 places, reserve candidates, retries, stable weekly order and previous-edition fallback.

## Tasks
- [x] Backend schema and lifecycle: editions DRAFT/VERIFIED/PUBLISHED/FAILED; audited candidates; prepare 60, validate remote source + fields + explicit closure + images, publish 20 and retain reserves; distributed database lease; idempotent schedules and CLI; failure logging.
- [x] Nationwide ingestion: seed missing 17 regions and expand TourAPI sync supported provider codes; preserve existing search filters; type classifier and coverage tests.
- [x] Thumbnail preparation: bounded allowlisted download, copyright eligibility, sharp decode/resize WebP, content-addressed persistent files, public reachability check, immutable serving and configurable CDN base; failure tests.
- [x] Contracts/UI: separate nationwide response (region is not five-region search enum); single weekly API fetch; 20 cards, first two eager, rest lazy; preserve current user-edited square card ratio; API and component tests.
- [x] Integration: migration generation, build, unit suites, lifecycle and concurrency tests, operating guide and data-source document update.

## Decisions
- Work in existing checkout to preserve ongoing user changes; no commit/deploy or bulk live sync implicitly performed.
- Regional breadth uses 17 administrative regions. Primary balanced selection caps four per region and ten per type, at least five regions and two types; report insufficient coverage instead of silently publishing.
- Local persistent thumbnail storage is default; CDN is configurable infrastructure, not provisioned by code.
- Log structured failures for operator collection; no unauthorized external messages.

## Verification
API unit/HTTP suite, web suite, contracts, TypeScript and scoped ESLint passed. All 24 migrations applied to isolated PostgreSQL. Four DB tests verify rollback, fallback, concurrent publication, lease handling. Production deployment/storage/CDN not activated; see docs/weekly-recommendations.md.
