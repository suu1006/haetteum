# 해뜸 Terraform 순차 도입 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 기존 운영 EC2를 유지하면서 인프라를 순차적으로 Terraform 관리에 편입한다.

**Architecture:** 현황 조사와 기본 구성을 먼저 완료하고, 상태 저장 방식을 결정한 뒤 기존 자원을 편입한다. S3는 현재 사용 중인 자원이 아니며, 사용자가 관리용 신규 도입을 선택했다. 앱 배포·DB migration은 기존 GitHub Actions가 유지한다.

**Tech Stack:** Terraform 1.14.9, AWS provider 6.x 및 커밋된 lockfile, GitHub Actions 정적 검증.

**Spec:** 기존 EC2 유지 및 “현황 조사 → Terraform 기본 구성 → 상태 저장 방식 확정 → 기존 자원 편입”에 대한 사용자의 승인.

## 순서와 완료 기준

1. **현황 조사 — 진행 중**
   - [x] 미국 동부 리전 운영 EC2, SG, root EBS, IAM profile, EIP 유무를 읽기 전용으로 조회한다.
   - [x] 결과를 `infra/terraform/inventory.md`에 기록한다.
   - [x] 사용자 확인과 도메인 대조로 us-east-1의 i-07d42e2ae55010efa를 운영 대상으로 확정한다.
   - [ ] DB 위치, uploads, 백업 복원 근거 및 공유 자원 소유권을 확인한다.
2. **Terraform 기본 구성**
   - [x] production root, Terraform 버전 고정, 계정 제한 provider, 입력 검증을 추가한다.
   - [x] state·plan·비밀 tfvars 제외 규칙과 자격증명 없는 정적 검증 CI를 추가한다.
   - [x] format/init/validate 및 macOS ARM64/Linux AMD64 공식 체크섬 lockfile 검증을 완료했다. bootstrap mock 테스트 3개가 통과했다.
3. **상태 저장 방식 확정 — 관리용 S3 선택**
   - [x] 관리용 S3 신규 도입을 선택했다.
   - [x] bootstrap S3 정의와 mock 기반 검증을 작성한다.
   - [x] 정확한 버킷에만 제한한 1시간 STS 임시 세션으로 S3 관련 6개를 생성했다.
   - [x] AWS 응답으로 암호화·버저닝·퍼블릭 차단·소유권·HTTPS 정책을 확인했다.
   - [x] 15분 전파 대기 후 원격 state 이전과 잠금 생성/해제, No changes를 확인했다.
   - 최초 bootstrap은 임시 로컬 state로 실행하고 버킷 확인 후 S3로 이전한다.
   - 세 root 모두 별도 S3 state key를 사용한다.
4. **실행 권한 준비와 기존 자원 편입**
   - [x] GitHub OIDC 역할을 생성했다. 실제 workflow 인증 검증은 후속 단계다.
   - [x] SG → EC2/root EBS를 차례로 편입했다. 별도 EBS/attachment 자원으로 중복 관리하지 않는다.
   - EIP는 운영 리전에 없으므로 새로 추가하지 않는다. HaetteumBedrockRole은 서울 EC2도 공유하므로 import하지 않고 기존 profile 이름만 참조한다.
   - 각 묶음은 import 외 생성·변경·삭제가 없어야 하고 적용 후 No changes여야 한다.
5. **운영 자동화 — 편입 완료 이후**
   - [ ] 상태 공유 방식이 지원하는 범위에서 OIDC plan/apply 권한과 검토한 plan 적용을 구성한다.
   - S3 state 이전과 잠금 확인을 마친 뒤 CI apply를 구성한다.
   - [ ] 수동 변경 탐지와 state/인프라 복구 절차를 검증한다.

## 변경 경계

- production은 기존 EC2/SG만 편입한다. bootstrap은 S3, access는 OIDC 실행 권한을 관리한다.
- S3 상태 저장소와 전용 OIDC 실행 권한을 신규 도입한다. RDS, ECS, ALB, 업로드 이전은 범위 밖이다.
- 현재 AMI와 서버 설정을 보존한다. 태그·SG 개선·디스크 변경은 import와 분리한다.
- EC2 root EBS/attachment의 중복 소유를 피하고 교체나 삭제가 발생하는 계획은 적용하지 않는다.
- TourAPI는 `docs/tourapi-calls.md`를 따른다. 실제 수집과 migration을 검증에 사용하지 않는다.
- 기존 사용자의 수정은 보존한다. 각 단계 후 변경 파일·AWS 반영 여부·검증 결과·남은 조건을 보고한다.

## PR 단위

1. 인벤토리와 기본 구성·정적 검증.
2. 선택한 state 방식과 실행 권한·복구 절차.
3. SG의 순차 편입과 공유 IAM 조회.
4. EC2·디스크 편입과 서비스 확인.
5. 선택한 state 방식에 맞는 운영 자동화.

공식 근거: [Terraform import](https://developer.hashicorp.com/terraform/language/import), [S3 backend](https://developer.hashicorp.com/terraform/language/backend/s3), [민감정보](https://developer.hashicorp.com/terraform/language/manage-sensitive-data).

## 이번 단계 검증 결과

Terraform 1.14.9와 HashiCorp 서명 검증된 AWS provider 6.66.0을 사용했다. 두 root의 init/validate, fmt, workflow YAML 파싱, Git 제외 규칙을 확인했다. bootstrap mock 테스트 3개가 통과했다. Linux provider 실행은 로컬 macOS에서 수행하지 않았으며 공식 Linux archive 체크섬이 lockfile에 포함됨을 확인했다. GitHub Actions 실제 실행은 push 이후 확인한다. 이 기록은 기본 구성 단계의 검증 결과다. 후속 S3 생성 단계는 아래 실행 기록을 따른다.

## S3 구축 실행 기록 — 완료

관리용 버킷과 보호 설정 6개를 생성했다. 기존 EC2·DB·IAM 자원 변경은 없다. 최초 실행은 IAM 역할 대신 정확한 버킷에만 제한한 STS federated 세션으로 수행했다. backend 추가 이후 새 디렉터리에서 두 root의 validate와 mock 테스트 3개가 통과했고 별도 정적 리뷰에서 지적 사항이 없었다. 원격 이전은 버저닝 활성화 확인 후 15분이 지난 다음 실행했다.


- `bootstrap/terraform.tfstate`로 기존 state를 이전하고 production backend를 별도 key로 초기화했다.
- 원격 state의 자원 6개·출력 및 metadata 이외 모든 필드가 로컬 백업과 동일했다.
- 원격 state는 AES256 암호화와 유효한 S3 version ID가 있으며, `.tflock` 생성 버전과 최신 삭제 마커로 잠금 생성·해제를 확인했다.
- remote backend를 사용한 `terraform plan -detailed-exitcode`는 종료 코드 0, No changes였다.
- Terraform 1.14.9의 신규 S3 default state 초기화 과정에서 lineage/serial이 재생성됐다. 공식 소스와 별도 리뷰로 원인을 확인했으며 강제 덮어쓰기는 하지 않았다.
- 빈 로컬 state와 적용 완료 plan은 삭제했다. 이전 로컬 백업은 조사 근거로 Git 제외·0600 권한 상태로 보존했다. 상시 실행 IAM/OIDC 역할 구성은 후속 단계다.

이전 내용 비교 SHA-256(lineage/serial 제외): `d0c8dad5cd1a39b770bb10d1656bbe9d28238817aaaa2b58a673a0990c4b128b`.

## OIDC 및 운영 자원 편입 실행 기록 — 완료

- 사용자에게 콘솔 생성 자원이며 다른 IaC 소유가 없음을 확인했다.
- GitHub OIDC 제공자 1개, 전용 역할·정책 4개를 생성했다. access의 후속 plan은 No changes였다.
- SG와 EC2를 각각 1 imported, 0 added, 0 changed, 0 destroyed로 편입했다. 최종 production plan은 EC2/SG 모두 no-op이고 import 작업도 남아 있지 않다.
- Terraform validate, fmt, mock 테스트 4개, workflow YAML 파싱과 diff whitespace 검증이 통과했다. 별도 리뷰에서 발견한 CI 테스트 경로 오류를 수정했다.
- 운영 서버 설정, 앱 배포, DB migration, 공유 IAM profile은 변경하지 않았다.
- 남은 단계: GitHub OIDC workflow 실제 인증·실행, 운영 변경 전 DB/uploads 백업·복원 확인. 아직 main 병합이나 앱 배포를 실행하지 않았다.
