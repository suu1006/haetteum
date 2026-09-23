# Terraform 상태 저장소 운영

## 구성과 책임

- 계정: `637551067348`, 리전: `us-east-1`.
- 상태 버킷: `haetteum-terraform-state-637551067348-us-east-1`.
- bootstrap state: `bootstrap/terraform.tfstate`.
- access state: `access/terraform.tfstate`.
- production state: `production/terraform.tfstate`.
- 각 state의 `.tflock` 객체로 잠근다. DynamoDB는 사용하지 않는다.
- Terraform 1.14.9, AWS provider 6.66.0을 사용한다. lockfile 변경은 별도 검토한다.
- 기존 운영 EC2, 애플리케이션 배포, DB migration, TourAPI 실행은 이번 저장소 구축 범위와 별개다.

## 최초 구축의 실행 인증

기존 CLI 프로필이 루트 계정뿐이어서, 루트 자격증명으로 STS GetFederationToken을 호출하여 **해당 버킷에만 제한한 1시간 임시 세션**을 발급했다. Terraform의 실제 S3 작업은 `federated-user/haetteum-tf-bootstrap`으로 실행했다. 비밀값은 하위 프로세스 환경에만 전달했으며 파일·로그·Terraform 설정에 저장하지 않았다.

이 세션은 IAM 역할이 아니며 상시 실행 방식으로 사용하지 않는다. 이후 GitHub OIDC 실행 역할을 생성했다. 다른 서비스의 기존 Bedrock 역할을 재사용하거나 권한을 확장하지 않는다.

임시 세션 권한 범위:

- 정확한 상태 버킷 ARN: 생성, 버킷 조회, 목록/버전 조회, 태그·퍼블릭 차단·소유권·버저닝·암호화·버킷 정책 설정.
- 위 두 state key와 대응 lock key: GetObject/PutObject.
- 대응 lock key만 DeleteObject.
- DeleteBucket, state 객체 삭제, EC2, RDS, IAM 변경 권한 없음.

최초 버저닝 설정 후 AWS 권고대로 15분을 기다린 뒤 첫 state 객체를 기록한다. 최초 세션 생성에 사용한 기존 루트 자격증명은 변경하거나 새로 발급하지 않았다.

## 정상 사용

1. 실행 역할의 단기 세션으로 `aws sts get-caller-identity`를 확인한다. account가 위 계정과 일치해야 한다.
2. 각 root의 실제 tfvars는 Git 제외 파일로 보관한다. 인증정보는 tfvars에 넣지 않는다.
3. `terraform init -input=false -lockfile=readonly`로 backend와 provider를 초기화한다.
4. `terraform plan -out=review.tfplan`으로 정확한 변경 계획을 검토한다. 운영 EC2 import에는 import 외 생성·변경·삭제가 없어야 한다.
5. 동일한 저장 plan을 적용한다. plan이 stale이면 다시 생성하고 재검토한다.
6. 재계획이 No changes인지 확인하고 생성된 plan을 안전하게 정리한다.

production은 기존 SG와 EC2 및 루트 디스크를 관리한다. bootstrap state는 S3 관련 6개 자원만 관리한다. backend를 bootstrap이 관리하는 버킷에 둔다고 해서 버킷을 임의로 재생성하거나 bootstrap destroy를 실행하지 않는다.

## 잠금과 상태 복구

- 잠금 오류 시 실행 중인 Terraform 작업이 있는지 먼저 확인한다. 다른 작업이 살아 있으면 잠금을 해제하지 않는다.
- 실행이 종료됐다는 근거와 lock ID를 확인한 경우에만 해당 root에서 force-unlock을 수행한다. state JSON과 lock JSON을 공개 로그에 붙이지 않는다.
- state 복구 전 현재 원격 version ID와 파일을 접근 제한된 위치에 백업한다. state에는 비밀정보가 포함될 수 있다.
- S3 이전 version을 복원하기 전 lineage·serial·자원 주소와 실제 AWS 구성을 대조한다. 적용 이후 생성/변경된 자원을 잃는 과거 state로 무조건 되돌리지 않는다.
- state 복원은 실제 자원 복원이 아니다. 버킷이나 EC2가 삭제됐다면 별도 자원 복구가 필요하다.
- 잘못된 import는 주소/ID 소유권을 조사한 후 매핑을 교정한다. state rm을 자원 삭제 대용으로 사용하지 않는다.

## CI 경계

현재 workflow는 AWS 인증 없이 init(-backend=false), validate, mock test만 실행한다. 실제 AWS plan/apply 권한은 없다. fork PR에도 운영 자격증명을 제공하지 않는다.

GitHub OIDC 역할은 아래 environment로 trust subject를 제한하고 plan/apply 권한을 분리했다. 일반 production 역할에 bootstrap 버킷 정책 변경이나 IAM 관리 권한을 주지 않는다.

## 이전 검증 기록

2026-09-22: 원격 자원 6개 및 metadata 이외 state 전체 내용 일치, 유효한 S3 version ID와 AES256 암호화, plan No changes, `.tflock` 생성/삭제 이력을 확인했다.

Terraform 1.14.9는 비어 있는 S3 default workspace로 최초 이전할 때 lineage/serial을 재생성할 수 있다. 이번에는 자원/출력을 포함한 나머지 필드가 모두 동일함을 직접 확인했다. 비교 스크립트의 “lineage가 항상 유지된다” 가정이 잘못된 것이므로 원격 state를 강제 수정하지 않았다. [해당 버전의 원격 state 구현](https://github.com/hashicorp/terraform/blob/v1.14.9/internal/states/remote/state.go)을 참고한다.

빈 로컬 state와 적용 완료 plan은 삭제했다. 이전 백업은 Git에서 제외하고 0600 권한으로 유지한다. 백업을 재사용할 때는 옛 lineage가 현재 원격 lineage와 다름을 고려해야 하며, 강제 push하지 않는다.

공식 근거: [S3 backend](https://developer.hashicorp.com/terraform/language/backend/s3), [버저닝 전파](https://docs.aws.amazon.com/AmazonS3/latest/userguide/manage-versioning-examples.html), [STS GetFederationToken](https://docs.aws.amazon.com/STS/latest/APIReference/API_GetFederationToken.html).

## OIDC 및 기존 자원 편입

OIDC 최초 생성은 기존 관리자 프로필로 실행했다. 제공자 1개와 역할/정책 4개를 생성했으며 access plan은 No changes였다. EC2/SG import는 EC2 Describe와 production state/lock 접근만 허용한 별도 STS 세션으로 실행한다.

- Plan 역할: `HaetteumTerraformProductionPlan`, environment `terraform-plan`.
- Apply 역할: `HaetteumTerraformProductionApply`, environment `terraform-production`.
- 두 environment 모두 main 브랜치만 허용한다. production은 저장소 소유자 검토를 요구하며 관리자 우회를 허용하지 않는다. 단일 운영자가 자신의 실행을 승인할 수 있도록 self-review는 허용한다.
- 실제 저장소의 immutable OIDC subject인 `repo:suu1006@83828512/haetteum@1335645577:environment:<environment>`와 audience `sts.amazonaws.com`을 정확히 제한했다.
- 두 역할 모두 us-east-1 EC2 조회와 기존 instance profile 조회만 가능하다. plan은 production state 읽기, apply는 읽기/쓰기가 가능하며 양쪽 모두 해당 lock 객체만 삭제할 수 있다.
- 현재 apply 역할에는 EC2 변경 권한이 없다. 향후 운영 변경 시 검토한 자원과 작업에 한해서 권한을 추가한다. bootstrap/access state와 IAM 관리 권한은 없다.
- 실제 OIDC workflow 실행은 아직 검증하지 않았다. 현재 CI는 정적 검증만 실행한다. 공개 저장소에 원본 Terraform plan/state나 관리자 CIDR을 로그·artifact로 게시하지 않는다.
- main에 병합하면 기존 앱 deploy workflow가 실행되므로 인프라 코드 병합 시에도 앱 배포 일정을 확인한다.

공식 근거: [GitHub OIDC subject 형식](https://docs.github.com/en/actions/reference/security/oidc), [AWS OIDC 연동](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws).

2026-09-22 편입 결과: SG와 EC2를 각각 1 import, 0 add/change/destroy로 등록했다. 최종 production plan에서 두 자원 모두 no-op이고 남은 import는 없었다. 실제 서버 설정은 변경하지 않았다.

## GitHub production plan 실행

`terraform-plan.yml`은 `terraform-plan` environment의 조회 역할로 S3 state와 실제 AWS 구성을 비교한다. PR 검증은 AWS 인증 없는 `terraform-validate.yml`이 담당하며, 운영 plan은 main의 관련 경로 push 또는 수동 실행에서만 실행한다. 최초 연결 검증 동안만 전용 구현 브랜치를 임시 허용한 뒤 제거한다.

필요한 environment secret은 `TERRAFORM_EXISTING_ADMIN_IPV4_CIDR` 하나다. 기존 보안그룹의 관리자 /32 주소를 사용한다. AWS 장기 키를 GitHub에 저장하지 않는다.

공개 로그와 job summary에는 변경 개수·알려진 자원 주소·동작만 표시한다. 원본 plan은 runner의 접근 제한 임시 디렉터리에서 만들고 작업 종료 시 삭제한다. state/plan artifact를 게시하지 않는다. 오류 진단도 값을 포함할 수 있어 원문을 숨긴다. 실패 시 승인된 로컬 단기 세션에서 같은 commit으로 plan을 재현해 비공개로 진단한다.

`Changes detected`는 변경 감지 결과이고 apply를 실행했다는 의미가 아니다. 실제 속성 차이는 로컬에서 검토한다. 변경 plan도 성공 종료하며 summary에서 차이를 확인한다. Terraform 오류는 실패 종료한다. workflow에는 apply 단계가 없으며 plan 역할은 state 쓰기와 EC2 변경이 금지되어 있다.
