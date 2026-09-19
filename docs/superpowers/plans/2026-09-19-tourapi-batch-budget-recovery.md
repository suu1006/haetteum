# TourAPI 배치 호출 예산 복구 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관광지 상세 보강이 공용 호출 예산을 독점하지 않도록 하고, 축제 수집 및 잔여 상세 수집을 날짜에 걸쳐 진행한다.

**Architecture:** TourApiClient와 PostgreSQL 기반 공용 한도·잠금을 유지한다. 배치별 예산 중단과 실제 오류를 구분하며, 기존 원본 버전별 상세 완료 상태를 이어받는다.

**Tech Stack:** NestJS, TypeScript, PostgreSQL, Prisma, Jest, Notion API.

**Spec:** `docs/tourapi-calls.md`; 이 문서의 조사 결과와 수정 요구사항.

## 확인한 사실 — 2026-09-19 KST

- Notion 9/17·18·19 배치는 각각 03:30 시작, 03:46:41 종료, 실패. 최신 기록: https://app.notion.com/p/3dfdb076677a81fba32eee1d20cee236
- 운영 `haetteum-shared/logs/api-error.log`에서 세 실행 모두 `TOUR_API_DAILY_LIMIT` 확인. 최신 오류는 `getPlaceIntro → enrichPlaceDetails → enrichPendingPlaceDetails` 경로에서 발생했다.
- READ ONLY DB 조회 결과 9/15~19 일별 호출이 모두 1,000회. 환경파일에는 한도/간격 override가 없고 배포 코드 기본값은 1,000회/일, 1,000ms이다. 조사 후 사용자가 실제 제공자 승인 한도도 1,000회/일임을 확인했다.
- 최근 관광지 INCREMENTAL 목록 작업은 SUCCEEDED, 조회 항목 0건, 약 68초. 목록 체크포인트도 갱신됨. 상세 보강은 이후 별도로 실패한다.
- 관광지 4,607곳 모두 노출 상태. 현재 원본 버전 상세 완료 870곳, 미완료 3,737곳. 과거 일별 완료 건수는 이번 조회만으로 알 수 없다.
- 상세 한 곳은 common/intro/repeat/images 최소 4회 호출 후 하나의 DB 트랜잭션으로 완료 버전을 저장한다. 남은 상세 최소 요청량은 14,948회이며 목록·재시도·변경 발생량은 별도다. 현 한도에서 이론적으로도 15일 이상의 일일 예산이 필요하다.
- 이후 04:30 축제 배치는 같은 공용 예산이 소진되어 첫 목록 요청부터 실패한다. 최근 DB 기록에서도 FESTIVAL_FULL FAILED / fetched_count=0 확인.
- 운영 release는 `d01a766909f0282fcef441bb384b97fadf3ac351`. 이 버전의 Notion 기록은 제목과 본문만 작성한다. 로컬 `751d106`의 상태·날짜·실패 건수 매핑이 미배포여서 Notion 상태가 `시작 전`, 오류 요약이 빈 값이다.

## 공통 제약

- 실제 TourAPI HTTP 요청은 TourApiClient만 담당하고 정해진 배치 문맥에서만 실행한다.
- 재시도를 포함한 모든 요청을 공용 DB 예산에 반영한다. 한도 카운터 초기화나 제한 우회 금지.
- 날짜·지역·showflag 필터는 실제 API 동작 검증 없이 제거하지 않는다.
- 승인 한도 확인 전 단순히 환경변수 한도를 높이지 않는다.
- 초기 조사는 읽기 전용으로 수행했다. 이후 사용자 승인에 따라 아래 실행 기록을 추가한다.

## Task 1: 배치별 예산 배분 및 다음 날 재개

**Files:** `apps/api/src/tourism/tour-api-policy.ts`, `tourism-sync.service.ts`, `tourism-sync.scheduler.ts`, `festival-sync.service.ts`, `festival-sync.scheduler.ts`, `apps/api/src/config/environment.ts`, 해당 단위 테스트 및 `apps/api/test/tour-api-policy.e2e-spec.ts`.

- [x] 제공자 포털의 실제 승인 일일 한도와 최근 성공한 축제 목록 수집의 페이지 수를 확인한다. 축제 목록 및 필수 작업 예산을 먼저 산정하고 관광지 상세 보강 예산을 나머지로 설정한다. 축제 상세도 자체 예산으로 제한하여 역방향 독점을 막는다.
- [x] 공용 한도가 1,000일 때 관광지 배치가 배정된 예산에서 멈추고, 이어지는 축제 배치가 남은 예산을 사용할 수 있는 회귀 테스트를 먼저 작성한다. 재시도도 예산을 소비하며 두 프로세스의 총 요청은 1,000을 넘지 않아야 한다.
- [x] `TourApiPolicy`의 기존 DB 잠금과 카운터 안에서 배치 예산을 적용한다. 개별 상세의 최소 요청량을 시작 전에 고려하고 재시도 중 소진도 정상적으로 처리한다. 단순 잔여량 조회만으로 전역 한도 보장을 대체하지 않는다.
- [x] 예산 중단 시 이미 완료한 상세는 유지하고 미완료 버전만 다음 날 처리한다. `enrichPendingPlaceDetails`의 완료/실패/잔여 건수를 예외가 발생해도 반환 또는 보존한다. 예산 소진은 `DEFERRED`, 제공자·데이터·DB 오류는 `FAILED`로 구분한다.
- [x] 축제 목록이 끝나기 전에 중단되면 누락 축제를 비노출로 만들지 않는 기존 경계를 유지한다. 목록 체크포인트와 상세 완료 상태를 혼동하지 않는다.
- [x] 재실행 테스트: 완료된 동일 버전은 호출 0회, 중단된 상세는 재처리, 원본 변경 시 재수집, 정책 밖 호출은 거절.

## Task 2: 실패 원인과 진행 상황을 정확히 기록

**Files:** `apps/api/src/tourism/notion-batch-recorder.ts`, `notion-batch-recorder.spec.ts`, `tourism-sync.scheduler.ts`, `tourism-sync.scheduler.spec.ts`, `festival-sync.scheduler.ts`, `festival-sync.scheduler.spec.ts`, `docs/tourapi-calls.md`.

- [ ] 이미 구현된 `751d106` 속성 매핑을 포함해 배포한다. 새 `보류` 상태를 도입할 때 Notion 상태 옵션과 기록 타입을 함께 맞춘다. 기존 행은 자동으로 덮어쓰지 않는다.
- [x] 실행 결과에 배치명, 목록/상세 단계, 허용된 오류 코드, 소비 요청 수, 완료·실패·잔여 상세 수를 포함한다. `TOUR_API_DAILY_LIMIT`과 일반 장애를 구분해 요약한다. 토큰·URL 쿼리·오류 원문은 전송하지 않는다.
- [x] 관광지뿐 아니라 축제 배치도 결과를 기록한다. 부분 진행은 성공으로 표시하지 않고 다음 날 이어질 작업량을 보여준다.
- [x] 예산 중단·개별 상세 오류·목록 오류·성공별 속성과 본문 테스트를 추가한다. Notion 기록 실패가 원래 배치 결과를 바꾸지 않는 테스트를 유지한다.

## Task 3: 검증과 운영 복구

- [x] 관련 단위 테스트: `pnpm --filter @haetteum/api test -- --runTestsByPath src/tourism/tour-api-policy.spec.ts src/tourism/tourism-sync.service.spec.ts src/tourism/tourism-sync.scheduler.spec.ts src/tourism/festival-sync.service.spec.ts src/tourism/festival-sync.scheduler.spec.ts src/tourism/notion-batch-recorder.spec.ts`.
- [x] 별도 임시 PostgreSQL에서 공용 한도·중복 배치·날짜 전환·다음 실행 재개를 통합 검증한다. 운영 DB로 테스트하지 않는다.
- [ ] `pnpm --filter @haetteum/api build` 및 `pnpm --filter @haetteum/api lint` 실행. 실제 제공자 호출 없이 검증한 후 기존 배포 절차로 반영한다.
- [ ] 오늘은 이미 1,000회를 사용했으므로 같은 설정의 즉시 재실행은 복구책이 아니다. 다음 KST 날짜의 예산으로 정기 배치를 실행하고, 축제 목록 성공·잔여 상세 감소·Notion 상태 일치를 확인한다.
- [x] 승인 한도가 1,000보다 큰 것으로 확인된 경우만 `TOUR_API_DAILY_LIMIT` 조정을 별도 반영한다. 속도 제한과 배치별 예산은 유지한다.

## 완료 기준

1. 관광지 상세 backlog가 있어도 축제 목록 수집에 예산이 남는다.
2. 공용 한도와 배치 잠금이 재시작·다중 프로세스에서도 유지된다.
3. 완료된 상세는 중복 수집하지 않고 미완료 상세는 날짜에 걸쳐 감소한다.
4. Notion에 성공·실패·예산 보류와 진행 건수가 실제 실행 결과에 맞게 표시된다.

## 실행 기록

- 작업 브랜치: `codex/tourapi-batch-budget`, 기준 커밋 `d668881`.
- 1단계: `5afad8f` 작업별 영구 예산, `5e51da0` DB 연결 장애 보강. 정책 리뷰 승인. 기본 관광지 700 / 축제 300, 전역 1,000회 유지.
- 테스트 전용 PostgreSQL에 새 마이그레이션 적용. 정책 통합 6개, 초기 전체 API 692개, 수정 후 정책/서비스 50개 통과.
- 별도 기존 린트 정리: `4469b23` 장소 테스트 matcher 타입 단언. 장소 테스트 10개와 전체 API 린트 통과.
- 공용 계약 51개와 웹 725개 테스트 통과.
- Notion 실측 스키마는 실패 건수가 NUMBER다. 코드도 숫자/null로 전환한다. 보류 상태 옵션을 UI에서 추가했으며 기존 행은 변경하지 않았다.
- 배포 준비: 최신 배포 중단 원인은 이전 SHA에 고정된 마이그레이션 호환성 검토 변수. 최종 코드/마이그레이션 리뷰 후 정확한 배포 SHA로 반영해야 한다.
- 2단계 기록 개선: `9bc2f12`. API 단위 697개, 별도 DB 통합 120개, API 빌드·전체 린트 통과. 실제 TourAPI 호출 없이 검증했다.
- 최종 보강 `73fbf7b`: 축제 상세 이후 실행 상태 DB 저장이 실패해도 원래 오류와 진행량을 보존한다. 회귀 테스트 30개와 관련 86개, 보강 후 API 전체 700개 통과. 빌드·변경 파일 린트 통과.
- 최종 구현 리뷰와 추가형 마이그레이션 호환성 승인. 코드 구현 완료, 운영 배포와 다음 정기 실행 관찰은 별도 단계다.
- 승인 한도 1,000회가 확인되어 한도 상향은 하지 않는다. 다음 날짜의 실제 정기 배치 검증은 배포 후에만 가능하다.
