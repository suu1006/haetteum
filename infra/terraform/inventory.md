# 운영 인프라 조사 기록 — 2026-09-22

사용자가 미국 리전 운영 EC2임을 확인했다. `us-east-1`의 아래 EC2 공인 IP가 `haetteum.kr` DNS와 일치한다. 모든 조회는 읽기 전용이며 비밀값·user data·서버 환경파일은 조회하지 않았다.

| 대상 | 확인 결과 | 편입 판단 |
| --- | --- | --- |
| 리전 | `us-east-1` (버지니아 북부) | production provider를 이 리전으로 제한 |
| EC2 | `i-07d42e2ae55010efa`, Name `hatteum`, running, `t3.small` | 설정 변경 없이 편입 완료 |
| 공인 IP / DNS | 둘 모두 `54.165.95.110` | EIP 신규 생성이나 IP 재연결 없음 |
| AMI | `ami-0f8a61b66d1accaee` | 현재 값 유지 |
| VPC | `vpc-0da1c0cf56d04ff06`, 기본 VPC | 공유 기반 자원으로 data source 사용 |
| Subnet | `subnet-087d1cdca7bdb2a0a` | 우선 data source, 소유권 확인 필요 |
| SG | `sg-066daae9d81d7eb4c`, `launch-wizard-1` | 조회한 연결 ENI는 위 EC2의 `eni-07b5738f6b8be351e` 한 개 |
| IAM profile / role | `HaetteumBedrockRole` | 서울 EC2도 같은 profile 사용. 공유 자원으로 우선 조회만 수행 |
| Root EBS | `vol-0c3644b02a366ca82`, `/dev/sda1`, gp3 20 GiB, 암호화 꺼짐, 종료 시 삭제 | EC2 root 블록과 중복 관리하지 않음 |
| EIP | 미국 동부 리전 describe-addresses 결과 없음 | EIP 자원 추가하지 않음 |
| SG inbound | TCP 22/80/443 전체 IPv4, 3000/4000은 동일한 특정 IPv4 /32 | 원래 규칙 유지. 제한 주소는 편입 시 비공개 인벤토리로 재확인 |
| SG outbound | 전체 프로토콜, IPv4 전체 | 원래 규칙 유지 |
| S3 | 사용하지 않는다는 사용자 확인 | 사용자가 state 전용 신규 도입 선택 |
| DB / uploads / 백업 | 저장소에 shared 경로 운영 문서 존재 | 실제 DB 위치·복원 가능성 추가 확인 필요 |

## 대상에서 제외한 서버

로컬 AWS CLI의 기본 리전은 서울이었다. 서울의 `i-0cc0302701b161831` (`server`, `t4g.micro`)는 이번 production 편입 대상에서 제외한다. 이 서버도 동일한 Bedrock instance profile을 사용하므로 IAM을 미국 서비스 전용 자원으로 가져오지 않는다.

현재 CLI 인증은 루트 계정이었다. 실제 변경 실행에는 별도 IAM 역할의 단기 자격증명을 준비한다. 계정 ID는 검증 후 로컬 tfvars에 입력한다.

us-east-1의 RDS 인스턴스 조회 결과는 비어 있었다. 이것만으로 EC2 내부 PostgreSQL 사용을 확정하지 않으며 서버 환경은 별도로 확인한다.

## 남은 확인

- 사용자가 EC2/SG를 콘솔에서 만들었고 다른 IaC가 관리하지 않음을 확인했다. VPC/subnet은 조회만 한다.
- GitHub 배포 대상, 실제 DB 위치, uploads 경로와 백업 복원 근거 확인.
- GitHub OIDC 실제 workflow 인증 및 No changes plan 검증 완료(2026-09-23).

후속 단계에서 관리용 S3 버킷과 보호 설정만 신규 생성했다. GitHub OIDC 제공자와 역할·정책 5개도 생성했다. 기존 SG와 EC2(루트 EBS 포함)를 각각 1 import, 0 add/change/destroy로 편입했고 최종 plan에서 두 자원 모두 no-op임을 확인했다.
