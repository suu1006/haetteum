# Task 3 implementation report

Base: `8c01ff0`. Scope: truthful reporting, bounded read-only failure inspection, operational documentation. No external Notion mutations or live TourAPI calls.

## Implemented

- Preserve all six policy deferral codes in Notion: global/job daily budget, recovery wait, retry daily budget, provider cooldown, batch deadline. Wording distinguishes remaining-budget insufficiency from actual exhaustion and cooldown/time/wait from daily quota.
- Existing Notion status options (성공/실패/보류) and number property stay unchanged. Partial detail failures explicitly retain successful details and describe the completed list. Detail stop reason is separately reported when failure takes priority over deferral. Body includes waiting/quarantined/wholly-local replay counts; no new external properties.
- Detail summary fields `waitingCount`, `quarantinedCount`, `locallyReplayedCount` are optional for legacy callers, populated by real measured execution. Current-version pending identity matches exclude old versions; locally replayed counts successful items using saved responses and zero HTTP reservations in this execution. Mixed HTTP/local successes and historical successes do not count as wholly-local replays. Reporting read failures leave counts unknown and do not override the collection result; any existing fatal DetailEnrichmentError retains the reporting storage failure internally.
- Schedulers log a safe BATCH_RESULT with list/detail stage and counters and no original fatal exception stack. Original exceptions are retained for callers. Fatal CLI detail errors emit measured progress. Replay emits safe stop reason and remaining/local counts even on termination. A batch deadline stops further replay work and reports pure postponement as exit 2; earlier item failures retain exit 1.
- `tourism:inspect -- --job=tourism|festival [--ids=...] [--limit=1..100]`: read only, default 20, current visible pending source version join before LIMIT, FAILED/QUARANTINED only. Fields are bounded allowlisted metadata; bodies, arbitrary DB field contents, URL/keys excluded. No HTTP or mutation flags accepted. Scheduler startup disabled.
- `docs/tourapi-recovery-runbook.md` adapts supplied draft to actual inspect/replay commands, missing-operation request limits, explicit requeue, retention limits, stale-version behavior, and historical 103 limitation. `docs/tourapi-calls.md` updated consistently. Historical 103 cause remains unproven; no retrospective local recovery without retained evidence.

## RED / GREEN evidence

All worktree commands run from `/Users/jeongsu/.codex/worktrees/tourapi-durable-recovery/haetteum`. Test/build presteps used dedicated `DATABASE_URL=postgresql://test:test@127.0.0.1:55439/haetteum_tourapi_test_recovery`.

1. RED: `pnpm --filter @haetteum/api test --runTestsByPath src/tourism/notion-batch-recorder.spec.ts src/tourism/tour-api-recovery.spec.ts`: 8 failed, 23 passed (new reason whitelist/text and missing metric methods). `/private/tmp/task3-red.log`.
2. RED: inspection command unit import failed before the command existed. `/private/tmp/task3-inspect-red.log`.
3. RED: scheduler/CLI reporting regression command: 3 failed, 16 passed (missing final counters log and fatal CLI progress). `/private/tmp/task3-final-red.log`.
4. RED: recovery/replay tests: reporting storage failure incorrectly changed outcome and safe replay reason export missing. `/private/tmp/task3-last-red.log`.
5. GREEN final affected units: `pnpm --filter @haetteum/api test --runTestsByPath src/tourism/notion-batch-recorder.spec.ts src/tourism/tour-api-recovery.spec.ts src/tourism/tourism-sync.service.spec.ts src/tourism/festival-sync.service.spec.ts src/tourism/tourism-inspect.command.spec.ts src/tourism/tourism-sync.scheduler.spec.ts src/tourism/festival-sync.scheduler.spec.ts src/tourism/festival-sync.command.spec.ts src/tourism/tourism-sync.command.spec.ts src/tourism/tourism-replay.command.spec.ts` — **10 suites / 110 tests passed**. `/private/tmp/task3-units.log`.
6. GREEN final isolated PostgreSQL: `pnpm --filter @haetteum/api test:e2e --runTestsByPath test/tour-api-recovery.e2e-spec.ts` — **25 tests passed**, including both-job inspect current-version filter, ID filter, committed-detail exclusion and limit. `/private/tmp/task3-db-final.log`.
7. GREEN `pnpm --filter @haetteum/api build` and `pnpm --filter @haetteum/api lint` — both exit 0. `/private/tmp/task3-build.log`, `/private/tmp/task3-lint.log`.
8. `git diff --check` passed.

The first test invocation accidentally omitted workdir and ran main-root pretest (contracts build and generated Prisma client), then failed because the recovery test file does not exist there. No authored main-root file was changed; parent informed immediately. Subsequent commands explicitly used the isolated worktree. Initial isolated pretest without DATABASE_URL failed before tests; all reported verification above used the dedicated test DB.

## Handoff

Controller owns final whole-branch tests, independent review, PR and guarded deployment. No full live batch was started. No blocker remains. The unrelated untracked `docs/superpowers/plans/2026-09-20-tourapi-daily-reliability.md` was left untouched/uncommitted.
