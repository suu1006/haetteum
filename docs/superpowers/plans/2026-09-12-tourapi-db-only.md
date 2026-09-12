# TourAPI DB 조회 전환 Implementation Plan

> **For agentic workers:** Use subagent-driven-development for delegated tasks and execute remaining tasks inline. Track steps below.

**Goal:** TourAPI 수집은 배치에서만 수행하고 모든 서비스 기능은 영속 데이터를 조회한다.
**Architecture:** 기존 수집 서비스를 유지하되 공통 배치 실행 경계와 DB 기반 호출 예산을 적용한다. 상세 완료 버전을 저장하여 변경·실패 건만 보강한다.
**Tech Stack:** NestJS, Prisma, PostgreSQL, Jest.
**Spec:** docs/tourapi-calls.md

## Global Constraints
- TourAPI 직접 호출은 `TourApiClient` 외에는 금지한다.
- 기존 작업 파일과 스키마 변경을 보존한다. 공유 main의 기존 변경을 포함한 커밋/리셋은 수행하지 않는다.
- 사용자 요청에서 TourAPI 폴백을 허용하지 않는다.
- API 필터 의미가 검증되지 않으면 기존 날짜/노출 필터를 유지한다.

### Task 1: 랭킹 DB 매칭 및 이미지
Files: ranking-place-link.service.ts 및 두 ranking import service/spec.
- [x] 기존 외부 검색 시나리오를 DB 일치/모호/누락 테스트로 변경하고 실패 확인.
- [x] `resolvePlaceId({placeName, areaCode})`는 지역과 정규화 이름으로 유일한 DB 장소만 반환. 생성/외부 검색 제거.
- [x] 이미지 보강은 DB 장소의 이미지와 저작권만 사용. 빈 결과는 null 유지.
- [x] 해당 Jest 테스트 실행 및 검토.

### Task 2: 축제 상세 영속화 및 주간 추천 DB 검증
Files: festivals.service/spec, festival-sync service/repository/spec, weekly-recommendations service/spec, schema migration.
- [x] 축제 상세 DB 데이터 반환 및 캐시 누락 시 외부 미호출 테스트 작성, 실패 확인.
- [x] 축제 상세 JSON/원본 버전 저장, 배치에서 신규·변경·실패 상세 수집.
- [x] 주간 추천은 Place 상세 및 PlaceImage 데이터로 검증. 상세 미수집은 명시적 제외.
- [x] 기존 응답 계약 및 관련 테스트 검증.

### Task 3: 공통 호출 예산과 배치 경계
Files: tour-api.client/spec, new tour-api-policy service/spec, tourism module, sync commands/schedulers.
- [x] 배치 밖 호출 차단 및 재시도별 예산 테스트 작성, 실패 확인.
- [x] AsyncLocalStorage 배치 문맥, PostgreSQL advisory lock 기반 중복 배치 차단, DB 호출 카운터/간격 적용.
- [x] 수집 command/scheduler만 문맥 생성. 조회 모듈에 raw TourAPI 포트 export 제거.
- [x] 호출 한도/간격 설정을 환경 변수로 제공하고 오류는 fail closed.

### Task 4: 관광지 상세 버전과 재개
Files: tourism-sync service/spec, schema migration.
- [x] 동일 버전 생략, 변경 후 재수집, 실패 후 재처리 테스트 작성, 실패 확인.
- [x] 상세 완료 원본 버전 별도 저장. 기본 목록 저장 후 미완료 상세 배치 처리.
- [x] 성공 기준은 실행 시작 시각으로 고정하여 수집 도중 변경 누락 방지.
- [x] 기존 콘텐츠 ID 이동/비노출/실패 처리를 유지.

### Task 5: 통합 검증 및 운영 문서
- [x] Prisma generate, API build, 관련 및 전체 단위 테스트, lint 실행.
- [x] 새 DB 정책의 실제 PostgreSQL 경합/영속화 검증 가능한 환경 확인.
- [x] 전체 호출 경계 코드 리뷰 후 수정.
- [x] docs/tourapi-calls.md에 migration, 초기 상세 수집, 한도 설정, 검증 결과 기록.

## 검증 결과 (2026-09-12)

- API build 통과.
- 전체 API 단위 테스트: 86 suites / 619 tests 통과.
- 관련 PostgreSQL 통합 테스트: 7 suites / 33 tests 통과. 별도 임시 DB에서 최신 마이그레이션부터 적용.
- TourAPI·축제·랭킹·코스·주간 추천 및 변경한 통합 테스트 파일 ESLint 통과.
- 전체 API lint: 이번 변경 밖 places/reviews/saved-courses 파일의 오류 24건으로 실패. 해당 파일을 정리하기 위한 별도 변경은 하지 않음.
- 최종 코드 리뷰 지적 모두 반영: DB 연결 종료 처리, 호출 직전 배치 상태 재확인, 동일 버전 코스의 DB 연결 복구, 상세 완료 후보 우선 선정, 부분 실패 종료 코드.
- 운영/개발 DB 및 실제 TourAPI에는 접근/반영하지 않음. 날짜·지역·showflag 필터는 외부 API 동작을 확인하지 않은 상태에서 제거하지 않고 유지.
