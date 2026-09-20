# Task 2 implementation report

Base: `eecbaac` (Task 1 reviewed). Worktree: `/Users/jeongsu/.codex/worktrees/tourapi-durable-recovery/haetteum`.
Scope: bounded network retries, durable recovery HTTP allocation, durable provider cooldown, batch deadline, fair detail selection, and their tests/documentation. No Task 3 reporting changes, live TourAPI calls, production/development DB changes, deployment, or push.

## Result and interfaces

- `TourApiClient`: maximum 3 HTTP attempts, backoff 2s then 10s plus independent 0–500ms jitter. Retries NETWORK_ERROR/TIMEOUT/5xx/429 and body codes 01/05/23. Provider JSON/XML code is classified before HTTP status: 22 and auth 20/30/31 (also HTTP 401/403 and symbolic XML SERVICE_KEY_IS_NOT_REGISTERED_ERROR) never retry.
- Retry-After accepts numeric seconds or HTTP date. Sleeps at least the larger backoff/Retry-After; >60s immediately persists cooldown and defers. Exhausted 429/23 persists cooldown. Other transient exhaustion preserves the TourApiError and counts one failed item execution as before.
- A single 20s timeout covers fetch headers and complete streaming body, capped by remaining batch time. Body collection stops above 2MiB and throws RESPONSE_TOO_LARGE without network retry, after bounded capture and REJECTED marking. Cancellation invokes AbortController.abort and reader.cancel before the request callback unwinds; rejected/hanging cancellation promises never block cleanup. Buffer copies prevent retaining a huge received chunk through a small subarray.
- `TourApiPolicy.request(work, {retry?: boolean})` atomically charges `tour_api_job_daily_usage.retry_calls` together with job and global calls. Tourism limit 70, festival 30, inside existing 700/300/1000 budgets. Client passes `attempt > 0 || recovery.current()?.isRetry === true` (not a sum). Every HTTP for a prior failed **current source version** is a retry; a new version is fresh. Denied transaction rolls back both ledgers.
- `ensureCapacity(minimumCalls, {retry?: boolean})` checks the same quota without charging. `TourApiRecovery.item` passes its prior-failure version context. Local replay has no HTTP reservation and no retry charge.
- `TourApiRecovery.beforeRequest()` now checks local CLI permission/limit only; `requestReserved()` increments the CLI request count only inside an accepted policy callback. Thus rejected policy reservation no longer consumes its local max-requests.
- `TourApiPolicy.stopProvider(reason, retryAfterMs, cause?)` runs its update on the **same request connection** under REQUEST_LOCK (avoids another pool slot or an unlocked window). `tour_api_provider_cooldown` id=1 is shared by all jobs. THROTTLE minimum 15 minutes or longer Retry-After; QUOTA until next KST midnight; AUTH minimum 15 minutes and fatal current-batch `TOUR_API_PROVIDER_AUTH`. AUTH cause and quota/throttle cause preserve the original TourApiError; each rejected response remains captured as REJECTED. Further HTTP is blocked even if caller catches the initial exception. Local processing does not check HTTP cooldown.
- New `TourApiDeferredReason`: `TOUR_API_RETRY_DAILY_LIMIT`, `TOUR_API_PROVIDER_COOLDOWN`, `TOUR_API_BATCH_DEADLINE`. Existing reasons remain. `TourApiBudgetDeferredError` now accepts optional ErrorOptions/cause.
- Batch state carries a 40-minute deadline. assertBatch, preflight, HTTP start, response timeout, and retry-delay admission check it. Request/preflight PostgreSQL lock_timeout and statement_timeout use min(20s, remaining batch time); production policy pool also has connection=5s, statement=20s, query=21s timeouts. Pooled session timeout settings are reset during release. Cleanup may finish inside its separate bounded DB timeout after work admission stops.
- Connection, preflight and reservation errors remain TourApiPolicyError, so neither network retries nor durable item-failure counts are fabricated for DB/lock failures. The original DB error remains cause. Existing completion-to-next-start spacing, completion timestamp persistence, advisory locks, timing-failure behavior and request counts remain.
- `eligible()` alternates fresh and due versions, starting fresh. Tourism/festival detail loops continue after retry-only quota deferrals; global/job/cooldown/deadline still stop HTTP. CLI treats non-deadline budget deferrals as deferred items and can continue to later local candidates. No identity/version selection or post-commit reconciliation weakening.

Migration: `20260920120000_tourapi_retry_policy` adds retry_calls (default 0, 0 <= retry_calls <= calls) and singleton provider cooldown table. Apply after Task 1 migration. Prisma schema addition is narrowly scoped; formatter churn in unrelated models was removed.

## TDD / verification evidence

All commands below ran from the isolated worktree. API Jest invocation:

```
pnpm --filter @haetteum/api exec node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand ...
```

PostgreSQL invocation prepends `DATABASE_URL=postgresql://test:test@127.0.0.1:55439/haetteum_tourapi_test_recovery` and adds `--config ./test/jest-e2e.json`.

RED before corresponding implementation:

1. `tour-api-retries.spec.ts`: initial 10 failures. Corrected fixtures to include the required resultMsg, reran focused provider/Retry-After/oversize cases: confirmed body01/05/23 rejected instead of retry, delays were old250/750, oversized body INVALID_RESPONSE, fatal503 retried3 times, hanging body exceeded test timeout.
2. `tour-api-retry-policy.e2e-spec.ts`: 3 failures on old policy—tourism/festival retry budget did not reject after70/30, concurrent final slot admitted both. The first accidental no-DATABASE_URL invocation skipped; reran against explicit isolated DB and observed these real RED failures.
3. `tour-api-policy.spec.ts -t 'forty minutes'`: failed because expired assertBatch did not throw.
4. `tour-api-recovery.spec.ts tourism-sync.service.spec.ts festival-sync.service.spec.ts -t 'slot between|continues fresh'`: 3 failures: due item stayed behind all fresh items; later fresh successes omitted after retry quota. Festival fixture identity corrected, rerun confirmed intended1-vs2 success failure.
5. `tour-api-retry-policy.e2e-spec.ts -t 'contended'`: actual PostgreSQL lock holder + 50ms remaining timeout failed with item failure count1 instead of0. Fixed preflight classification; GREEN1 test.
6. `tour-api-policy.spec.ts -t 'failed connection before'`: raw connection error was not TourApiPolicyError. Fixed policy connection wrapping; included in final GREEN18 policy tests.

GREEN/checks:

- Migration deploy to dedicated DB only: `DATABASE_URL=... pnpm --filter @haetteum/api db:deploy` exit0, new migration applied successfully.
- `tour-api-retries.spec.ts tour-api-policy.spec.ts`: **30 passed** (12 retry/body/deadline,18 policy). Fake timers/sleep; no2s/10s real waits and no real HTTP. Expected policy-error logger output from existing tests.
- Focused fairness/continue-fresh: **3 passed**.
- Final scoped PostgreSQL command with `tour-api-retry-policy.e2e-spec.ts tour-api-policy.e2e-spec.ts tour-api-recovery.e2e-spec.ts`: **45 passed across3 suites**, exit0. Includes all Task1 recovery/crash/version tests unchanged plus12 new retry-policy tests. Real DB verifies restart70/30, concurrent lastslot, atomic denial, source-version doublecharge prevention, local zero cost, cooldown persistence/auth/quota/throttle, preflight independent quota, finite lockwait/no failure count, exhausted429/23 rejected evidence and cause.
- Final `DATABASE_URL=... pnpm --filter @haetteum/api build`: exit0 (contracts, Prisma generate, Nest compile).
- Scoped ESLint on all modified production/test TS files: exit0. Corrected old unused import/assertions and added typed query result; last changed client spec also separately linted exit0.
- `git diff --check`: exit0.
- One full API unit run: **747 passed / 1 failed / 748 total (95 suites)**. Sole failure was the remaining legacy HTTP429+22 expectation still asserting TourApiError fields rather than the new cooldown deferral. Updated that assertion (no production change), then `tour-api.client.spec.ts` **19/19 passed**, exit0. No broad rerun after this isolated expectation fix, per avoid-repetition instruction. Do not describe the historical full run as748/748; final coverage is747 passed plus corrected suite19 passed.

Existing client tests for old250/750 delays now assert permitted2,000–2,500 and10,000–10,500 ranges. The Task1 rejected-response replay test uses non-retryable99 instead of newly retryable01, keeping its original purpose (provider failures are retained but never reused as success). Policy connection-loss tests now assert the wrapper and original cause, retaining cleanup/original error evidence assertions.

## Controller / Task 3 integration

Reporting can whitelist the three new deferred codes above. Authentication is fatal `TOUR_API_PROVIDER_AUTH` rather than a deferred reason; ordinary cooldown on later runs is PROVIDER_COOLDOWN. RESPONSE_TOO_LARGE is a safe item failure providerCode and retained in recovery error-code filtering. Old code22 fatal catch branches remain compatible with external/test ports, but real client now converts22 into durable cooldown deferral after evidence capture.

No behavior depends on new environment variables: recovery70/30 and40minute deadline are fixed policy values. `docs/tourapi-calls.md` has current semantics and migration prerequisite.

## Limitations / decisions

- Standard production Node fetch must honor AbortSignal. JavaScript cannot physically terminate a custom injected fetch that ignores abort. Caller remains bounded even for that test double; controller explicitly accepted the standard transport contract. Cancellation is initiated before lock release, never awaited indefinitely. Fake-clock tests cover a body with a never-resolving cancel hook and a never-settling fetch promise.
- Batch deadline cooperatively prevents new work and caps response/retry/lock waits. In-progress database completion/cleanup can finish under its separate finite DB timeout; this is not a process kill timer.
- Raw evidence, version integrity, replay retention and cleanup policy remain Task1 behavior. Only complete bounded raw responses are parseable; oversized captures are REJECTED.
- Same shared DB requirement remains; external systems bypassing this policy cannot be included in quota accounting.

## Review fix round 1 (base 283b44b)

P2 verified: a PostgreSQL preflight lock/statement timeout that crossed the batch deadline was wrapped as fatal TOUR_API_PREFLIGHT_FAILED. The ensureCapacity catch now checks the deadline before generic wrapping and throws TOUR_API_BATCH_DEADLINE instead. It checks deadline directly so existing non-deadline connection-loss errors retain their original cause/wrapper behavior. No request counters are consumed; cleanup still releases both connections.

TDD regression `defers when a preflight lock timeout crosses the batch deadline` advances Date.now past2,400,000ms when the lock query rejects with55P03. RED command `pnpm --filter @haetteum/api exec node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand tour-api-policy.spec.ts -t 'preflight lock timeout crosses'` failed with PREFLIGHT_FAILED instead of expected deadline reason. After the single guard change:

- Full `tour-api-policy.spec.ts`:19/19 passed.
- `pnpm --filter @haetteum/api exec eslint src/tourism/tour-api-policy.ts src/tourism/tour-api-policy.spec.ts`: clean.
- `pnpm --filter @haetteum/api exec tsc --noEmit -p tsconfig.build.json`: clean.
- Explicit dedicated DB command with `--config ./test/jest-e2e.json --runInBand tour-api-retry-policy.e2e-spec.ts -t 'contended'`:1 passed,11 skipped. This retains actual PostgreSQL50ms lock-wait/no-charge/no-item-failure behavior before deadline.
- `git diff --check`: clean.

No broad test rerun, live API, deployment or unrelated edits.
