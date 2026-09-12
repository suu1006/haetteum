name: deploy-production
description: Use when deploying Haetteum web or API changes to the production EC2 environment.
----------------------------------------------------------------------------------------------

# Haetteum Production Deployment

## 1) Scope & precheck
- web 변경, api 변경, prisma 변경, 환경변수 변경, dependency 변경을 먼저 구분한다.
- 실제 배포 스크립트/워크플로우를 기준으로 진행한다.
  - `scripts/deploy/activate-release.sh`
  - `scripts/deploy/smoke-release.sh`
  - `scripts/deploy/rollback-release.sh`
  - `.github/workflows/deploy-to-ec2.yml`

## 2) Validation before deployment
- 최소 실행: 타입체크/배포 대상 lint/test/build
- API/웹 공통/패키지 단위로 검증 실패 시 배포 단계로 넘기지 않는다.

## 3) Release packaging and switch
- 기존 운영 디렉터리를 직접 덮어쓰지 않고 release 전환 방식을 사용한다.
- 릴리스 패키지 생성 → 원격 수신 → `activate-release.sh`에서 candidate 검증 후 현재 릴리스 전환.

## 4) Post switch verification
- process 상태 점검: PM2 상태 및 웹/API 동시 확인
- 라우팅/헬스 점검: `/api/v1/health`, 웹 메인/탐색 경로, 인증 경로
- 정적/빌드 아티팩트가 새 릴리스에서 로딩되는지 확인

## 5) Failure handling
- 실패 원인을 먼저 분류한다. (릴리스 실패 / DB 미반영 / 외부 의존성 불안정)
- 새 릴리스가 불안정하면 검증된 이전 릴리스로 롤백한다.
- Prisma 변경이 동반되면 rollback 가능성 및 DB 호환성 재확인 후 복구 여부 결정한다.

## 6) Completion report
- 실행한 검증 항목, 미실행 항목, 결과, 남은 위험을 모두 기록한다.
