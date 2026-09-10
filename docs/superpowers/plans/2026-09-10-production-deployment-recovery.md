# 해뜸 운영 복구 및 배포 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 검색 화면과 최신 로그인 기능을 복구하고, 빌드 실패가 운영 서비스를 손상하지 않는 배포를 만든다.

**Architecture:** Linux x64 GitHub Actions runner에서 동일 커밋의 웹·API 산출물을 생성하고 검증한다. EC2는 버전별 release 디렉터리에 이를 받아 검사 후 전환하며, 기존 서비스 파일을 덮어쓰지 않는다. 데이터베이스와 업로드·환경설정은 release 밖에서 보존한다.

**Tech Stack:** Next.js 16.3.1 standalone, Node 24.19.0, pnpm 10.33.0, NestJS, Prisma, GitHub Actions, Ubuntu EC2, PM2, nginx.

**Spec:** 이 문서의 장애 근거·운영 제약·완료 기준 및 현재 대화의 복구 계획 요청.

## 장애 근거와 아직 확인할 사항

- 운영 EC2: `us-east-1`, `i-07d42e2ae55010efa`, `54.165.95.110`, t3.small.
- 배포 대상 커밋: `d8e3f983a48d00f2d5243e8d731397260d4efa8f`.
- 실패 실행: https://github.com/suu1006/haetteum/actions/runs/34464286952
- 2026-09-10 10:12 UTC 커널 로그에 `Out of memory: Killed process ... next-build`가 기록됨. 배포는 web build에서 137로 종료되어 PM2 재시작에 도달하지 않음.
- 관측 당시 RAM 1,907MB, swap 0, 디스크 여유 약 1.1GB. 기존 `.next`는 289MB이며 `BUILD_ID` 없음.
- 기존 프로세스가 이전 로그인 화면을 제공함. 검색 실패는 불완전한 빌드 파일과 실행 중인 버전의 불일치가 유력하지만, 정확한 브라우저 예외·실패한 asset URL은 추가 수집한다. `/explore` HTTP 200만으로 정상이라고 판단하지 않는다.

## Global Constraints

- 이 단계는 계획 작성이며 서버 재시작, DB 변경, AWS 유료 자원 변경, 배포를 실행하지 않는다.
- 실행 시 운영 디렉터리에서 `next build`, `git pull` 후 덮어쓰기 배포를 하지 않는다.
- 현재 소스·불완전한 `.next`를 정상 rollback 산출물로 취급하지 않는다.
- DB·업로드·환경변수 원문은 저장소나 빌드 artifact에 포함하지 않는다.
- 설치된 Next 문서를 따른다: `apps/web/node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md`, `deploymentId.md`.
- 기존 운영 데이터 삭제, 자동 DB 역마이그레이션, EC2 중지·시작을 복구 기본값으로 사용하지 않는다.
- 디스크 확보나 사양 확대가 비용·데이터에 영향을 주면 구체적인 변경량을 정하고 사용자 승인을 받는다. 1.1GB 여유에 무작정 swap 파일을 만들지 않는다.

## Task 1: 현 상태 보존과 복구 기준 확보

**Files:** 운영 nginx·PM2 설정(실제 경로 확인), `/home/ubuntu/haetteum/logs/`, 이 문서.

- [ ] GitHub 배포 상태와 서버 HEAD, PM2의 실제 cwd/script/port, nginx upstream과 정적 파일 경로를 읽는다. 비밀값이 포함되는 `pm2 env` 전체 출력은 저장하지 않는다.
- [ ] 브라우저에서 홈 → 검색을 재현하고 최초 console exception 및 실패한 JS/CSS 응답을 수집한다. `/login` 직접 접속과 클라이언트 이동을 각각 확인한다.
- [ ] 기존 환경설정과 업로드 위치·용량·소유권을 확인한다. 새 release 전환 뒤에도 같은 데이터 경로를 사용하도록 연결 방식을 기록한다.
- [ ] 이전 성공 커밋 `3aa8523`과 그 당시 공개 빌드 설정을 확보한다. 남아 있는 정상 빌드 artifact가 있는지 확인한다.
- [ ] 없다면 이전 커밋을 CI에서 재빌드하여 rollback 후보를 만든다. 기존 DB에 대한 읽기·로그인·업로드 경로 호환성 검사 후에만 정상 후보로 지정한다.
- [ ] 새 artifact 압축·해제 크기를 측정한다. 전송 파일 + 새 release + 정상 rollback release + 운영 여유 공간을 모두 확보하지 못하면 전송을 중단한다. 확인된 재생성 가능 캐시 정리만 검토하고, 부족하면 EBS 증설량과 비용 승인을 요청한다.

**검증:** 운영 프로세스 파일을 변경하지 않은 상태에서 장애 증거, 정상 rollback 후보 확보 방법, 공간 요구량을 문서화한다.

## Task 2: EC2 밖에서 실행 가능한 산출물 만들기

**Files:** Modify `apps/web/next.config.ts`; Create `scripts/deploy/package-release.sh`; Modify `.github/workflows/deploy.yml`.

- [ ] Linux x64 runner에서 Node `24.19.0`, pnpm `10.33.0`를 사용한다. Mac에서 생성한 node_modules를 서버에 복사하지 않는다.
- [ ] 웹 설정에 아래 항목을 추가한다. 경로 API는 기존 config의 모듈 방식에 맞춰 import한다.

```ts
output: "standalone",
outputFileTracingRoot: path.resolve(process.cwd(), "../.."),
deploymentId: process.env.GITHUB_SHA,
```

- [ ] 실제 빌드는 `apps/web` cwd에서 실행하고 tracing root가 저장소 루트인지 검사한다. 산출물 안에서 `apps/web/server.js` 위치와 workspace contracts 포함 여부를 확인한다.
- [ ] CI 빌드 환경은 `NEXT_PUBLIC_*` 공개 설정과 비밀 런타임 설정을 분리한다. 공개 API 주소·카카오 지도 키 등 현재 사용 키를 검색하여 명시적으로 주입한다. 빌드 시 정적 렌더가 요구하는 API 접근도 확인하며 운영 DB 자격증명을 통째로 옮기지 않는다.
- [ ] 다음 순서로 설치·테스트·빌드한다.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

- [ ] standalone 루트 전체를 패키징하고 `apps/web/public` 및 `.next/static`을 standalone의 해당 `apps/web` 위치에 복사한다. `.next/BUILD_ID`, server.js, CSS/JS, 이미지가 존재하는지 확인한다.
- [ ] API의 `dist`, runtime dependencies, workspace contracts, Prisma 생성물·schema·migrations·CLI를 포함한다. pnpm deploy 사용 여부는 설치된 pnpm 명령 도움말과 isolated smoke test로 확인하고, 깨진 외부 symlink가 있으면 패키징 실패로 처리한다.
- [ ] bcrypt·Prisma·sharp 등 native 모듈의 Linux 실행 가능 여부를 검증한다. `onlyBuiltDependencies` 정책을 우회하여 전체 install script를 허용하지 않는다.
- [ ] `release.json`에 커밋 SHA·Node 버전·생성 시각을 기록하고 artifact checksum을 생성한다. 비밀 환경파일이 포함되면 실패 처리한다.

**검증:** 원본 checkout을 참조할 수 없는 임시 디렉터리에 압축을 풀어 웹·API를 시작한다. CI의 임시 PostgreSQL에 migration을 적용하고 API health가 성공해야 한다. 웹 `/`, `/explore`, `/login`과 실제 static asset을 확인한다.

## Task 3: 버전별 배포·복구 스크립트

**Files:** Create `scripts/deploy/activate-release.sh`, `scripts/deploy/smoke-release.sh`, `scripts/deploy/rollback-release.sh`; Modify `ecosystem.config.js`, `.github/workflows/deploy.yml`.

**경로 계약:** `/home/ubuntu/haetteum-releases/<sha>/`는 불변 artifact, `/home/ubuntu/haetteum-shared/`는 환경설정·업로드·로그, `/home/ubuntu/haetteum-current`는 현재 release 링크로 사용한다. 기존 운영 경로의 최초 이관은 별도 checkpoint로 수행한다.

- [ ] 전송 전 checksum과 여유 공간을 검사한다. 임시 폴더에 해제하고 artifact 구조 검사를 통과한 후 release 경로로 이동한다.
- [ ] PM2는 명시적인 Node 경로로 standalone server.js 및 API dist/main.js를 실행한다. 실행 cwd에 의존하는 업로드·환경파일 위치를 shared로 연결하고 nginx 경로도 확인한다.
- [ ] API와 웹을 후보 포트 `4001`, `3001`에서 검사한다. 후보 API의 스케줄러가 운영 batch 작업을 중복 실행하지 않도록 현재 활성화 조건을 확인하고 비활성화 경로를 마련한다. 자원이 부족하면 동시 구동 대신 짧은 전환 시간을 합의한다.
- [ ] 후보 검사 후 기존 프로세스를 전환한다. 링크 교체만으로 무중단이라고 표현하지 않는다. PM2가 새 release의 실제 cwd/script로 시작되었는지 확인한다.
- [ ] 새 버전 health·검색·로그인 실패 시 정상 검증된 이전 release로 링크와 프로세스를 되돌린다. 이전 artifact가 없는 최초 복구에서는 검증된 Task 1 artifact를 사용한다.
- [ ] 운영 전환은 배포 lock으로 직렬화하고, 전환 도중 새 배포가 기존 작업을 취소하지 않도록 `cancel-in-progress: false`를 적용한다.
- [ ] SHA가 같은 release를 다시 배포해도 데이터가 중복 생성되지 않고, 다른 SHA 파일을 덮어쓰지 않도록 한다.

**실패 주입 검증:** CI 빌드 실패 → SSH 배포 미실행; checksum 불일치·공간 부족 → 기존 release 유지; 후보 HTTP 실패 → 전환 안 함; 전환 후 health 실패 → 이전 release 복원. 테스트는 임시 디렉터리와 mock 프로세스 제어로 수행하고 운영 장애를 의도적으로 발생시키지 않는다.

## Task 4: 로그인 DB와 환경설정 반영

**Files:** Existing `apps/api/prisma/migrations/`, `apps/api/src/config/environment.ts`, `apps/api/.env.example`; Modify 배포 스크립트의 migration 단계.

- [ ] 운영 DB의 migration status를 확인하고 신규 로그인·프로필 migration SQL을 읽어 기존 버전과의 호환성을 검사한다.
- [ ] 적용할 DB 백업을 생성하고 복원 가능성을 확인한다. 백업 공간은 Task 1 계산에 포함한다.
- [ ] 검증된 새 artifact와 공간이 준비된 후, 새 API 전환 전에 `prisma migrate deploy`를 실행한다. 실패하면 서비스 전환을 하지 않는다.
- [ ] 이전 API와 호환되지 않는 migration은 자동 rollback 계획에서 제외하고 별도 변경 절차를 합의한다. 앱 rollback 시 DB migration을 자동 되돌리지 않는다.
- [ ] SMTP_HOST/PORT/USER/PASS/FROM, API origin, 쿠키·카카오 callback 설정의 존재와 일관성을 확인한다. 값 원문을 로그로 출력하지 않는다.
- [ ] 메일 발송은 사용자가 지정한 테스트 주소로 허용받아 한 번 검증한다. SMTP 미설정 시 로그만 출력되는 현재 동작을 실제 발송 성공으로 오인하지 않는다.

## Task 5: 최초 복구 실행 및 최종 검증

**Files:** Create `docs/runbooks/production-deployment.md`; Update 이 계획의 실행 결과.

- [ ] 위 변경을 별도 `codex/production-deployment-recovery` 브랜치에서 검증한다. 최초 CI 빌드는 배포 없는 수동 실행으로 산출물과 용량을 먼저 확인한다.
- [ ] Task 1의 정상 구버전 artifact를 먼저 복구하거나, 새 버전의 모든 readiness 조건이 충족되면 검증된 새 artifact로 직접 복구한다. 복구 목표는 새 로그인까지 정상 동작하는 상태다.
- [ ] 승인된 복구 배포를 실행하고 public HTTPS와 내부 health를 모두 확인한다. DNS 조회가 안 되는 진단 환경에서는 `curl --resolve`와 일반 브라우저 검증 결과를 구분한다.
- [ ] 새 세션에서 홈 → 검색 → 장소 상세, 로그인 직접 접속, 이메일 로그인·회원가입·프로필 화면을 확인한다. `/auth/me`의 비로그인 401은 단독 장애 지표로 사용하지 않는다.
- [ ] 기존 브라우저 탭에서도 검색 이동을 검증한다. 새 배포 ID와 함께 JS/CSS 404, chunk 로드 오류, hydration 오류가 없는지 확인한다.
- [ ] 운영 응답의 배포 식별자와 PM2 실행 경로가 새 SHA인지 확인한다. HTTP 200만으로 배포 완료 처리하지 않는다.
- [ ] 재배포 절차, 이전 release 복구 명령, 보존 정책을 runbook에 남긴다. 현 release와 정상 rollback release는 삭제하지 않는다.

## 완료 기준

- 홈·검색이 정상이며 최신 이메일 로그인 UI가 보인다.
- API health와 DB migration 상태가 정상이며 승인된 인증 시나리오가 통과한다.
- EC2에서 production build를 수행하지 않는다.
- 실패한 새 빌드가 현 서비스 파일을 변경하지 않는다.
- 복구 가능한 이전 artifact와 검증된 rollback 절차가 있다.
- 운영 SHA·CI 결과·브라우저 검증·잔여 제한을 보고한다.

## 예상 순서와 판단

1. 상태/공간/rollback 후보 확인 → 2. CI artifact 검증 → 3. 격리 배포·DB 준비 → 4. 서비스 복구 → 5. 실패 복구 검증과 운영 문서화.

메모리 증설이나 swap만으로 배포를 재시도하는 방법은 운영 파일 덮어쓰기 문제를 해결하지 못한다. 서버 사양 변경은 artifact 공간과 실행 메모리를 측정한 후 별도로 결정한다. 실제 작업 시간은 최초 CI 빌드, 공개 빌드 환경 확보, 디스크 확보 여부에 따라 달라진다.
