# Task 1 — durable capture and recovery

Status: DONE (Task 2 retry/cooldown/quota and Task 3 reporting remain separate).

## Implemented

- Additive migration `20260920090000_tourapi_durable_recovery`: `tour_api_captures` (bounded redacted raw text, safe parameters and hash, job/scope, content/version, operation, HTTP status, capture/completion times, lifecycle) and `tour_api_item_recovery` (unique job/content/version, stage, safe code, attempts, next attempt, state).
- Required Nest recovery dependencies; old constructor/Nest tests now provide explicit test recovery rather than introducing a production fallback. Every capture/replay asserts active batch context. All HTTP stays in TourApiClient/TourApiPolicy.
- Capture occurs before JSON/schema parsing, including rejected provider envelopes and unsuccessful HTTP responses. Configured plain/encoded/decoded key is redacted. Persisted UTF-8 body is capped at 2 MiB with truncation flagged and ineligible for replay. Storage failure is a safe policy error and cannot become a network retry.
- Version-scoped per-operation replay reparses current schemas. Pending successful raw envelopes captured before schema-state update also avoid capacity reservation. Rejected provider responses remain evidence but permit fresh fetch. Only missing operations need HTTP capacity; default local CLI never fetches missing data. Validation evidence can be reparsed after a parser fix without HTTP.
- Both tourism/festival wrap mapping and destination persistence in item recovery. They retain good previous snapshots, mark captures complete only after destination commit, and guard destination source version (tourism now uses version+visibility in update predicate; festival's guard retained).
- Failure stage records actual operation or MAPPING/PERSISTENCE; code permits provider classifications and Prisma P2xxx, with safe PROCESSING_FAILED fallback. First failure waits 1 day, second 3 days, third quarantines. Deferred policy/system storage errors do not increment item failure attempts. New versions are independent. Never-attempted items precede due failed versions.
- Pending counts include waiting/quarantined items. A batch cannot claim SUCCEEDED just because none are currently due: it reports DEFERRED/TOUR_API_RECOVERY_WAIT while pending remains.
- Lists reuse only pending pages with matching KST day, list scope and exact safe parameter hash. Destination commit precedes page completion. Replayed list runs cannot advance checkpoint or perform missing-row deactivation: they record safe refresh-required failure and automatically run a fresh list. If fresh requests are budget denied, the prior successful checkpoint remains untouched. Successful previous lists and previous-day pending pages do not suppress fresh collection.
- `pnpm --filter @haetteum/api tourism:replay -- --job=tourism|festival [--ids=...] [--limit=1..100]` defaults to 20 failed IDs and no HTTP. Explicit `--fetch-missing --max-requests=1..100` bounds all attempted fetches; policy still reserves actual requests. Explicit `--requeue` requires IDs. Existing CLI commands remain compatible. Safe count-only output.
- Retention repository cleanup deletes COMPLETE captures only, at most 1,000 per invocation. No scheduled cleanup; unresolved/rejected/quarantined evidence remains. Exact tables, behavior and commands documented in docs/tourapi-calls.md.

## RED → GREEN evidence

Commands executed from isolated worktree `/Users/jeongsu/.codex/worktrees/tourapi-durable-recovery/haetteum` (API commands below use `pnpm --filter @haetteum/api exec node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand ...`).

1. `tour-api-recovery.spec.ts`: initial missing-module run identified absent implementation; minimal contract stubs then produced actual assertions: attempt count undefined instead of 1, missing-capacity list empty instead of [1], storage failure incorrectly resolved (3 failures). Implemented persistence/context scheduling; 4 passed.
2. Same file client tests before client integration failed because raw body absent, retry HTTP count 2 instead of 1, rejected state absent (3 failures). Integrated capture before parse/replay; 7 passed.
3. PostgreSQL `--config test/jest-e2e.json tour-api-recovery.e2e-spec.ts`: before service integration both services failed on second execution with exhausted-capacity error (2 failures). Integrated durable item scopes: 2 passed using actual destination and recovery tables, new repository/client instance, zero HTTP replay and identical IDs.
4. `tourism-replay.command.spec.ts`: parser stub failed all 10 argument validation assertions. Implemented parser/CLI: 10 passed.
5. `tourism-sync.service.spec.ts`: recovery-wait regression failed with SUCCEEDED/requested0/remaining0 instead of DEFERRED/requested1/remaining1. Fixed total-pending propagation through both services; all service regressions passed.
6. `tour-api-recovery.spec.ts`: capture-before-parse crash case failed with exhausted-capacity error. Successful raw envelope preflight fixed it; 16 recovery unit tests passed.

Additional focused tests cover partial request identities, new source versions, unavailable staging database, no failed-attempt increment on budget denial, bounded UTF-8, fresh-first selection, previous-day list isolation and HTTP-free parser repair. Real PostgreSQL tests cover both service persistence failures, guarded version races, restart/unique failure persistence, unresolved retention and list checkpoint safety with exhausted fresh-refresh budget.

## Final verification

- Full API units: **94 suites / 731 tests passed**. `/private/tmp/tourapi-task1-units.log`.
- PostgreSQL tourism/festival/policy/recovery: **5 suites / 37 tests passed**. Command: `DATABASE_URL=postgresql://test:test@127.0.0.1:55439/haetteum_tourapi_test_recovery pnpm --filter @haetteum/api exec node --experimental-vm-modules node_modules/jest/bin/jest.js --config test/jest-e2e.json --runInBand 'tour-api|tourism|festival-sync'`. `/private/tmp/tourapi-task1-db.log`.
- After final capture preflight change, focused actual PostgreSQL recovery: **5/5 passed**. `/private/tmp/tourapi-task1-recovery-db.log`.
- Full API ESLint `pnpm exec eslint '{src,test}/**/*.ts' --max-warnings=0`: **passed**, log `/private/tmp/tourapi-task1-lint.log`.
- API `pnpm build`: **passed**, log `/private/tmp/tourapi-task1-build.log`. Final production `pnpm exec tsc --noEmit -p tsconfig.build.json`: **passed**, `/private/tmp/tourapi-task1-types.log`.
- `git diff --check`: passed.
- Optional test-inclusive tsc reports existing unrelated auth/notion/place-courses test type errors; none in changed recovery/service tests. Production type/build checks passed. No live API calls, no user checkout changes, no production/development DB migrations.

## Task 2 interfaces and concerns

- `TourApiRecovery.current()?.isRetry` is true for an existing FAILED/QUARANTINED item, including explicitly requeued attempts reset to zero. `identity` includes job/contentId/sourceVersion; `scope`, `stage`, `replayed` are available. Each client HTTP attempt runs inside this ALS scope.
- `TourApiRecovery.beforeRequest()` enforces local-only and max-request mode **before** policy reservation. It currently tracks allowed attempted callbacks, while reported actual HTTP usage remains `TourApiPolicy.currentBatchRequestCount()`. Task 2 should preserve denial-before-reservation and use durable request ledger for actual quotas.
- Avoid constructor cycle: recovery already depends on policy. Pass retry metadata as an optional request/ensureCapacity argument from client/recovery, or introduce a standalone context provider, rather than injecting recovery into policy directly.
- `TourApiPolicy.assertBatch()` and `currentJob()` are public read/assert helpers. Existing minimum-capacity API remains positive-only; recovery simply skips it when no HTTP is required.
- `eligible(job, rows, now?)` returns fresh first then due failed rows, excluding wait/quarantine. It currently does not reserve retry headroom. To ensure due recovery also makes progress with a full fresh backlog, Task 2 should introduce candidate partitions or reserve recovery opportunity within its 70/30 retry budgets. Task 1 prevents failures from starving untouched IDs; reverse fairness belongs with Task 2 quota scheduling.
- Timeout/retry intervals, Retry-After, persistent cooldowns, retry ledger and batch deadline are intentionally unchanged for Task 2. Raw persistence is bounded, but `response.text()` allocation is still unbounded until Task 2 implements its bounded body read/timeout.

## Task 3 interfaces and concerns

- New `TourApiDeferredReason` member: `TOUR_API_RECOVERY_WAIT`; ensure recorder whitelist/user-visible safe reason handles it explicitly. Summary counts retain all pending, but detailed quarantined/local-replayed breakdown is not yet exposed.
- CLI currently prints requested/succeeded/failed/deferred and actual requests. It is a separate `tourism:replay` entry point supporting both jobs. Existing sync CLI modes unchanged.
- Failure repository exposes `failures(job)`, `failedIds(job, ids, limit, requeue)` through recovery; the latter is bounded in returned IDs. Dedicated inspect/report view can list safe failure rows without raw bodies.
- Missing local raw data is deferred, not counted as item execution failure. Recovery-storage system errors stop the batch.
- Historical 103-failure cause remains unproven; newly retained raw responses and stages support future diagnosis. No provider schema relaxation was made.

## Review fix round 1 (base 8af4197)

Addressed both Important findings and the related bounded-selection finding from `task-1-review.md`.

- Replaced `failedIds()` with `failedItems(): Promise<ItemIdentity[]>`. Repository selection joins failures against the destination's current source version before ordered LIMIT; obsolete failures, newly changed unfailed versions, completed destinations and quarantined versions without explicit requeue cannot occupy actionable slots. CLI passes the selected version through execution, which rereads the destination and rechecks the exact FAILED identity before any HTTP. Selection/version/state races report safe `TOUR_API_RECOVERY_SELECTION_CHANGED` deferral.
- Requeue mutates only the concretely selected, bounded identities; `--ids=A,B --limit=1 --requeue` cannot requeue both. Festival CLI uses a targeted unique lookup rather than scanning all pending rows for each ID.
- Already-committed destinations reconcile matching validated captures and failure rows to COMPLETE without remapping or HTTP. Both the pre-complete and pre-resolve crash windows converge after a new service/repository instance. COMPLETE evidence is then eligible for retention. CLI performs a separately bounded committed-state reconciliation without consuming actionable execution slots. Scheduled detail collection similarly reconciles at most 100 current committed identities per run.
- Obsolete historical evidence remains retained for inspection, but is excluded from current actionable selection. No schema or migration change was needed.

### Regression evidence

Initial real-PostgreSQL RED run produced **10 failed / 5 passed**: for both jobs, historical failure selected current quarantine/current-complete/obsolete-limit cases, and both post-commit `complete()` and `resolve()` faults left FAILED state unresolved. Log: `/private/tmp/tourapi-task1-review-red.log`.

Final focused commands (from worktree root):

```sh
pnpm --filter @haetteum/api exec node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand tour-api-recovery.spec.ts tourism-replay.command.spec.ts tourism-sync.service.spec.ts festival-sync.service.spec.ts festival.repository.spec.ts
DATABASE_URL=postgresql://test:test@127.0.0.1:55439/haetteum_tourapi_test_recovery pnpm --filter @haetteum/api exec node --experimental-vm-modules node_modules/jest/bin/jest.js --config test/jest-e2e.json --runInBand tour-api-recovery.e2e-spec.ts
pnpm --filter @haetteum/api exec tsc --noEmit -p tsconfig.build.json
```

Results: focused units **5 suites / 75 passed** (`/private/tmp/tourapi-task1-review-units.log`); actual PostgreSQL recovery **23 passed** (`/private/tmp/tourapi-task1-review-db.log`); production typecheck passed. PostgreSQL coverage additionally verifies both version and quarantine changes after selection, current-complete reconciliation without consuming execution slots, and requeue limited to one selected identity. Both crash-window tests assert zero subsequent HTTP, same destination ID, terminal failure/capture state, and successful COMPLETE-only cleanup.

Changed-file ESLint passed (run from apps/api): `pnpm exec eslint src/tourism/tour-api-recovery.ts src/tourism/tour-api-recovery.repository.ts src/tourism/tourism-sync.service.ts src/tourism/festival-sync.service.ts src/tourism/festival.repository.ts src/tourism/tourism-replay.command.ts test/tour-api-recovery-fixture.ts test/tour-api-recovery.e2e-spec.ts --max-warnings=0`. Log: `/private/tmp/tourapi-task1-review-lint.log`. No broad unrelated suite rerun. Task 2/3 remain separate; their interface notes above should use `failedItems` rather than removed `failedIds`.
