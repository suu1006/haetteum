# Terraform 운영 기반

기존 미국 EC2를 유지하며 관리용 S3를 신규 도입한다. 운영 리전은 `us-east-1`이다. [인벤토리](inventory.md)와 [운영 절차](../../docs/runbooks/terraform.md)를 참고한다.

## 관리 범위

- `bootstrap`: 상태 전용 S3와 암호화·버저닝·퍼블릭 접근 차단·HTTPS 강제·ACL 비활성화·삭제 보호. 버킷과 보호 설정 6개를 생성했다.
- `access`: GitHub OIDC 제공자와 production plan/apply 역할·정책을 관리한다.
- `environments/production`: 기존 SG와 EC2(루트 EBS 포함)를 관리한다. VPC/subnet은 조회하고 공유 IAM profile은 이름만 참조한다.
- bucket: `haetteum-terraform-state-637551067348-us-east-1`.
- state key: `bootstrap/terraform.tfstate`, `access/terraform.tfstate`, `production/terraform.tfstate`로 분리한다. `use_lockfile=true`로 S3 잠금을 사용한다.
- bootstrap state의 S3 이전과 No changes 검증을 완료했다. production의 SG와 EC2 편입 후에도 두 자원 모두 no-op임을 확인했다.

## 검증

Terraform은 `.terraform-version`의 1.14.9, AWS provider는 각 root의 lockfile에 기록된 6.66.0을 사용한다. PR 정적 검증에는 AWS 자격증명을 전달하지 않는다. 운영 plan workflow는 OIDC 단기 세션을 사용한다.

```sh
terraform fmt -check -recursive infra/terraform
terraform -chdir=infra/terraform/bootstrap init -backend=false -input=false -lockfile=readonly
terraform -chdir=infra/terraform/bootstrap validate
terraform -chdir=infra/terraform/bootstrap test
terraform -chdir=infra/terraform/environments/production init -backend=false -input=false -lockfile=readonly
terraform -chdir=infra/terraform/environments/production validate
```

mock 테스트는 AWS에 접근하지 않는다. 실제 운영 디렉터리와 분리된 새 checkout에서 CI 검증을 실행한다. 이미 초기화된 운영 backend를 정적 검증용으로 재설정하지 않는다.

## 실행 인증과 다음 단계

최초 버킷 생성은 루트 자격증명에서 발급한 버킷 한정 STS 임시 세션으로 실행했다. 이는 IAM 역할이 아니다. 비밀값은 프로세스 환경에서만 사용했으며 새 장기 키를 만들지 않았다. GitHub OIDC 역할을 구성했다. 실제 Actions 인증 실행 검증은 아직 남아 있다.

사용자는 기존 EC2/SG를 콘솔에서 생성했고 다른 IaC가 관리하지 않음을 확인했다. 편입에는 EC2 조회와 production state 쓰기만 가능한 STS 세션을 사용한다. 운영 설정을 변경하기 전 DB·uploads·백업 복원 절차를 별도로 확인해야 한다. 기존 관리자 /32 주소는 Git 제외 tfvars와 승인된 GitHub environment secret으로 관리한다.

state·plan·실제 tfvars는 Git에서 제외하고 lockfile은 커밋한다. 앱 배포와 DB migration은 기존 workflow가 담당한다. TourAPI 실제 수집은 인프라 검증에서 실행하지 않는다.
