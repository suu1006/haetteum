# Haetteum NestJS 모노레포 백엔드 기반 설계

**상태:** 최종 문서 검토 준비 완료
**작성일:** 2026-08-20
**범위:** pnpm Workspace 전환, NestJS REST API, PostgreSQL Docker Compose, Prisma 7, 공유 Zod 계약

## 1. 배경

Haetteum은 현재 Next.js 16 App Router 기반의 단일 프런트엔드 프로젝트다.
디자인 시스템과 여행 표현 컴포넌트가 작업 중이지만 API Route, 독립 서버,
데이터베이스, 인증, 도메인 API는 아직 없다.

이번 작업은 현재 저장소를 pnpm Workspace 모노레포로 전환하고, 독립 NestJS
서버가 PostgreSQL에 연결되어 REST API 기반을 제공하는 데 목적이 있다. 기존
Next.js 코드와 미커밋 디자인 시스템 변경은 내용 수정 없이 `apps/web`으로
이동한다.

## 2. 목표

- 기존 Next.js 애플리케이션을 `apps/web`으로 안전하게 이전한다.
- `apps/api`에 독립 NestJS REST API를 구성한다.
- `packages/contracts`에서 Next와 Nest가 공유할 Zod 계약을 관리한다.
- PostgreSQL만 Docker Compose로 실행한다.
- Prisma 7로 PostgreSQL 연결, Client 생성, 향후 migration 흐름을 준비한다.
- 환경변수를 서버 시작 시 검증한다.
- `/api/v1` URI 버전과 제한된 CORS를 구성한다.
- 성공 응답은 직접 반환하고 오류는 RFC 9457 Problem Details로 통일한다.
- 실제 PostgreSQL 연결을 포함하는 health endpoint를 제공한다.
- workspace 전체 lint, test, build와 API 통합 검증을 제공한다.

## 3. 비목표

이번 단계에서는 다음을 구현하지 않는다.

- 회원가입, 로그인, 세션, 권한
- 사용자, 여행지, 후기, 일정 등 도메인 모델과 CRUD
- seed 데이터
- Swagger 또는 OpenAPI 문서 생성
- Redis, 큐, 스케줄러, 백그라운드 작업
- 운영용 Dockerfile, 배포 설정, CI/CD
- Git 커밋 또는 푸시

## 4. 저장소 구조

```text
haetteum/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   ├── public/
│   │   ├── components.json
│   │   ├── next.config.ts
│   │   ├── postcss.config.mjs
│   │   ├── eslint.config.mjs
│   │   ├── tsconfig.json
│   │   ├── vitest.config.mts
│   │   ├── .env.example
│   │   ├── AGENTS.md
│   │   └── package.json
│   └── api/
│       ├── prisma/
│       │   └── schema.prisma
│       ├── src/
│       │   ├── common/
│       │   ├── generated/prisma/
│       │   ├── health/
│       │   ├── prisma/
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── test/
│       ├── prisma.config.ts
│       ├── .env.example
│       └── package.json
├── packages/
│   └── contracts/
│       ├── src/
│       │   ├── health.ts
│       │   ├── problem-details.ts
│       │   └── index.ts
│       └── package.json
├── compose.yaml
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── .nvmrc
├── .env.example
├── .gitignore
├── README.md
├── DESIGN.md
├── docs/
└── AGENTS.md
```

`CLAUDE.md`는 애플리케이션 실행에 필요하지 않고 현재 `AGENTS.md`를 Claude
Code에 전달하는 호환 파일일 뿐이므로 제거한다. 루트 `AGENTS.md`는 저장소
전체 지침으로 유지한다. Next.js 16이 `apps/web`에서 `CLAUDE.md`를 다시
생성하지 않도록 동일한 최신 Next.js agent-rules 블록을 `apps/web/AGENTS.md`에
둔다. `next.config.ts`의 agent rules 기능 자체는 끄지 않는다.

## 5. Workspace와 의존 방향

패키지 이름은 다음으로 고정한다.

- `@haetteum/web`
- `@haetteum/api`
- `@haetteum/contracts`

의존 방향은 다음과 같다.

```text
@haetteum/web ──→ @haetteum/contracts ←── @haetteum/api
                                               │
                                               ↓
                                      Prisma → PostgreSQL
```

- `contracts`는 React, Nest, Prisma에 의존하지 않는다.
- `web`은 Prisma Client와 API 내부 모듈을 가져오지 않는다.
- `api`만 Prisma 스키마와 데이터베이스 연결을 소유한다.
- Prisma가 생성한 타입을 HTTP 계약으로 사용하지 않는다.
- 루트는 앱 런타임 의존성을 직접 소유하지 않고 workspace 실행 명령만 조정한다.

Turborepo와 Nest CLI 네이티브 모노레포 모드는 사용하지 않는다. 두 앱이 각각
독립 설정을 갖는 pnpm Workspace가 Next와 Nest의 경계를 가장 명확하게
유지한다.

## 6. 런타임과 포트

| 프로세스 | 주소 | 실행 위치 |
|---|---|---|
| Next.js | `http://localhost:3000` | 호스트 |
| NestJS | `http://localhost:4000` | 호스트 |
| PostgreSQL | `localhost:5432` | Docker Compose |

프로젝트의 유일한 Node.js 버전은 `24.19.0`으로 고정한다. 루트 `.nvmrc`와
`package.json`의 `engines.node`가 모두 정확히 `24.19.0`을 가리키게 하며,
개발·검증·향후 CI도 같은 버전을 사용한다. Node 24는 현재 LTS이고 Prisma 7과
Next.js 16의 요구사항을 모두 만족한다. pnpm은 기존 `10.33.0`으로 고정한다.
Nest API와 Prisma Client는 ESM으로 구성한다.

## 7. 서버 부팅 흐름

```text
환경변수 로드
  → API 전용 Zod 스키마 검증
  → Nest 애플리케이션 생성
  → Prisma Client 생성 및 PostgreSQL 연결
  → 요청 ID, CORS, 전역 prefix, URI versioning, 예외 필터 설정
  → shutdown hook 활성화
  → localhost:4000 listen
```

필수 환경변수가 없거나 형식이 잘못되면 Nest는 listen 전에 종료한다. Prisma는
초기화 과정에서 PostgreSQL에 연결하므로 DB가 준비되지 않은 상태에서 서버가
정상 부팅된 것처럼 보이지 않는다. 종료 시 Prisma 연결을 정리한다.

## 8. 환경변수와 비밀정보

환경변수는 Docker Compose와 API 용도를 분리한다.

```text
/.env.example
/.env                    # Compose용, Git 제외
/apps/api/.env.example
/apps/api/.env           # Nest와 Prisma용, Git 제외
```

루트 예시는 다음 값을 제공한다.

```dotenv
POSTGRES_DB=haetteum
POSTGRES_USER=haetteum
POSTGRES_PASSWORD=local-development-only
POSTGRES_PORT=5432
```

API 예시는 다음 값을 제공한다.

```dotenv
NODE_ENV=development
API_PORT=4000
WEB_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://haetteum:local-development-only@localhost:5432/haetteum
```

예시 자격증명은 로컬 개발 전용이다. 실제 로컬 `.env`와 운영 비밀정보는
커밋하지 않는다. API의 Zod 환경 스키마는 `NODE_ENV`, 포트 범위, origin URL,
PostgreSQL URL을 검증하고 변환된 typed config만 애플리케이션에 제공한다.

루트 `.gitignore`는 모든 실제 `.env`를 계속 제외하되 루트와 workspace의
`.env.example`만 명시적으로 허용한다. 또한 기존 루트 전용 ignore 패턴을
모노레포 경로에 맞춰 조정해 `apps/web/.next`, workspace별 coverage,
`apps/api/src/generated/prisma`, `next-env.d.ts`, `tsconfig.tsbuildinfo`가 Git에
추적되지 않도록 한다.

## 9. PostgreSQL Docker Compose

Compose는 PostgreSQL 서비스 하나만 실행한다.

- 공식 PostgreSQL 이미지의 고정 major version을 사용한다.
- 이름 있는 volume으로 데이터를 보존한다.
- `pg_isready` health check를 설정한다.
- 포트와 자격증명은 루트 `.env`에서 받는다.
- `db:down`은 컨테이너만 중지하며 volume을 삭제하지 않는다.
- 데이터 삭제 명령은 이번 범위에서 제공하지 않는다.

Next와 Nest는 호스트에서 실행하여 개발 HMR을 유지한다.

## 10. Prisma 7

Prisma는 `apps/api`가 단독 소유한다.

- generator는 `prisma-client`를 사용한다.
- 출력 경로는 `../src/generated/prisma`로 명시한다.
- PostgreSQL 연결에는 `@prisma/adapter-pg`와 `pg`를 사용한다.
- datasource URL은 `prisma.config.ts`에서 `DATABASE_URL`로 제공한다.
- `PrismaModule`과 `PrismaService`가 Client 생성과 lifecycle을 캡슐화한다.
- 생성 코드는 직접 수정하지 않고 generation 결과로 취급하며 Git에서 제외한다.
- API build와 test는 필요한 경우 먼저 `prisma generate`를 실행하도록 명령
  의존성을 둔다.

이번 범위에는 도메인 모델이 없으므로 가짜 `User`, `Health`, `Metadata` 테이블이나
의미 없는 빈 migration을 만들지 않는다. `db:generate`, `db:migrate`,
`db:deploy`, `db:studio` 명령과 migration 디렉터리 규칙을 준비하고, 첫 migration
파일은 첫 실제 도메인 모델이 승인될 때 생성한다.

## 11. REST API와 URI 버전

Nest의 전역 prefix는 `api`, URI 기본 버전은 `1`로 설정한다.

```text
http://localhost:4000/api/v1/health
```

컨트롤러가 별도 버전을 선언하지 않으면 기본 버전 1을 사용한다. 이후 호환성을
깨는 변경은 `/api/v2`를 병행할 수 있다.

성공 응답은 `{ data }`, `{ success }` 같은 공통 envelope로 감싸지 않는다.
각 endpoint의 Zod 응답 계약에 맞는 JSON을 직접 반환하고 HTTP 상태 코드를
의미대로 사용한다.

## 12. 공유 Zod 계약

`@haetteum/contracts`가 런타임 스키마와 TypeScript 타입의 단일 기준이다.

- `HealthResponseSchema`: 정상 health 결과
- `ValidationIssueSchema`: 잘못된 필드의 path와 message
- `ProblemDetailsSchema`: 공통 오류 응답

Nest 전용 generic `ZodValidationPipe`는 `apps/api/src/common`에 두고 공유
스키마를 받아 body, params, query를 검증한다. 계약 패키지에는 Nest decorator나
Prisma 타입을 넣지 않는다. Swagger 변환 기능은 추가하지 않는다.

## 13. 오류 응답

오류 응답은 `application/problem+json`과 RFC 9457 Problem Details 구조를
사용한다.

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "요청값이 올바르지 않습니다.",
  "instance": "/api/v1/example",
  "code": "VALIDATION_ERROR",
  "requestId": "f2e09553-1b48-40de-8d6e-a3d68a0d9636",
  "errors": [
    {
      "path": "body.name",
      "message": "필수 값입니다."
    }
  ]
}
```

- 표준 필드는 `type`, `title`, `status`, `detail`, `instance`다.
- Haetteum 확장 필드는 `code`, `requestId`, 선택적 `errors`다.
- request ID는 서버가 `crypto.randomUUID()`로 생성하고 `X-Request-Id` 응답
  헤더에도 넣는다.
- 프런트는 변경 가능한 `detail` 대신 안정적인 `code`로 분기한다.
- 알려진 4xx와 예상하지 못한 5xx를 전역 예외 필터가 같은 구조로 변환한다.
- 500 응답에는 stack, SQL, 환경변수, 내부 예외 메시지를 노출하지 않는다.
- 내부 로그에는 request ID와 원본 오류를 남겨 응답과 연관시킨다.

## 14. CORS

CORS는 `WEB_ORIGIN`과 정확히 일치하는 origin만 허용한다.

- 개발 기본값: `http://localhost:3000`
- wildcard `*`는 사용하지 않는다.
- 향후 HttpOnly 쿠키 인증을 고려해 `credentials: true`를 설정한다.
- 허용되지 않은 origin에는 CORS 허용 헤더를 반환하지 않는다.

프런트가 사용하는 API base URL은 `apps/web/.env.example`에
`NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1`로 문서화하되, 이번
단계에서는 실제 여행 API 호출을 추가하지 않는다.

## 15. Health endpoint

`GET /api/v1/health`는 Nest가 요청을 처리할 수 있는지와 Prisma를 통해
PostgreSQL이 응답하는지를 확인한다.

- 정상: `200`, Terminus 기반 직접 health 결과
- DB 오류: `503`, 공통 Problem Details 응답
- 성공 응답은 `HealthResponseSchema`로 검증한다.
- 실패 응답은 `ProblemDetailsSchema`로 검증한다.
- health 결과에 자격증명, 연결 문자열, SQL 오류를 포함하지 않는다.

Nest Terminus와 shutdown hook을 사용하며 health endpoint 자체가 응답한다는
사실로 API 프로세스 상태를 확인하고 별도 `api: up` 필드는 중복해 넣지 않는다.

## 16. 테스트 전략

테스트 도구는 각 프레임워크의 현재 흐름을 유지한다.

- `apps/web`: 기존 Vitest
- `packages/contracts`: Vitest
- `apps/api`: Nest 기본 Jest와 Supertest
- DB 통합: Docker Compose PostgreSQL과 실제 Prisma 연결

필수 검증은 다음과 같다.

1. 이동 전 기존 web 테스트, lint, build 결과를 기록한다.
2. 이동 후 동일한 web 테스트, lint, build가 통과한다.
3. contracts의 정상·실패 Zod schema 테스트가 통과한다.
4. API 환경변수 parser가 정상 값을 변환하고 잘못된 값을 거부한다.
5. Zod validation 오류가 정해진 Problem Details로 변환된다.
6. 알 수 없는 API 경로가 Problem Details 형식의 404를 반환한다.
7. 예상하지 못한 오류가 내부 정보를 숨긴 500으로 변환된다.
8. 허용된 origin의 preflight는 성공하고 다른 origin은 허용되지 않는다.
9. PostgreSQL health check가 준비 상태를 보고한다.
10. Prisma Client가 생성되고 실제 DB 연결이 성공한다.
11. DB 연결 중 `GET /api/v1/health`는 200을 반환한다.
12. DB 중단 시 health endpoint는 503 Problem Details를 반환한다.
13. 루트 lint, test, build 명령이 모든 workspace를 검사한다.

## 17. 루트 명령

루트 `package.json`은 다음 책임의 명령을 제공한다.

```text
dev            Next와 Nest를 병렬 실행
dev:web        Next만 실행
dev:api        Nest만 실행
lint           모든 workspace lint
test           모든 workspace test
build          contracts → api → web 순서로 build
db:up          PostgreSQL 시작
db:down        PostgreSQL 중지, volume 보존
db:generate    Prisma Client 생성
db:migrate     개발 migration 실행
db:deploy      기존 migration 적용
db:studio      Prisma Studio 실행
```

루트 `pnpm dev`는 PostgreSQL을 자동으로 시작하지 않는다. DB lifecycle은 명시적
명령으로 유지하여 개발자가 컨테이너 생성과 종료 시점을 알 수 있게 한다.

## 18. 안전한 전환 순서

1. 현재 branch, `git status`, 기존 변경 파일과 baseline 검증 결과를 기록한다.
2. Node.js `24.19.0`으로 전환한 뒤 루트 workspace 설정과 빈 `apps`,
   `packages` 경계를 만든다.
3. 기존 Next 전용 source와 config를 `apps/web`으로 이동한다.
4. 기존 파일의 내용과 상태가 이동 전과 일치하는지 확인한다.
5. 루트 `AGENTS.md`를 유지하고 `apps/web/AGENTS.md`를 추가한 뒤
   `CLAUDE.md`를 제거한다.
6. `@haetteum/contracts`를 구성하고 단독 build/test를 통과시킨다.
7. `@haetteum/api`와 환경변수 검증을 구성한다.
8. Compose PostgreSQL과 Prisma를 연결한다.
9. versioning, CORS, request ID, 예외 필터, health endpoint를 구성한다.
10. README와 `.env.example`을 갱신한다.
11. web, contracts, api, 실제 DB 순서로 검증한다.
12. 전체 workspace lint, test, build를 최종 실행한다.

기존 사용자 변경은 되돌리거나 덮어쓰지 않는다. `next-env.d.ts`, `.next`,
`tsconfig.tsbuildinfo` 같은 생성물은 `apps/web`에서 재생성하고, 새 위치의 검증이
끝난 뒤 루트의 오래된 생성 캐시만 정리한다.

## 19. 완료 조건

다음 조건을 모두 만족해야 백엔드 기반 구성이 완료된 것으로 본다.

- 기존 Next UI와 디자인 시스템 파일이 `apps/web`에서 보존된다.
- `.nvmrc`, `engines.node`, 실제 검증 런타임이 모두 `24.19.0`으로 일치한다.
- `pnpm install` 후 workspace 의존성이 하나의 lockfile로 재현된다.
- 문서대로 환경변수 예시를 복사해 PostgreSQL을 시작할 수 있다.
- Nest가 잘못된 환경변수와 DB 연결 실패를 부팅 전에 감지한다.
- `/api/v1/health`가 실제 PostgreSQL 상태에 따라 200 또는 503을 반환한다.
- 모든 오류가 정의된 Problem Details 계약을 따른다.
- 허용된 web origin만 API에 접근할 수 있다.
- web, contracts, api의 lint, test, build가 모두 통과한다.
- 인증이나 여행 도메인 코드가 이번 변경에 섞이지 않는다.
- 구현 과정에서 Git commit 또는 push를 수행하지 않는다.

## 20. 공식 참고자료

- [Node.js release schedule](https://nodejs.org/en/about/previous-releases)
- [NestJS Workspaces](https://docs.nestjs.com/cli/monorepo)
- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)
- [NestJS URI Versioning](https://docs.nestjs.com/techniques/versioning)
- [NestJS CORS](https://docs.nestjs.com/security/cors)
- [NestJS Health Checks](https://docs.nestjs.com/recipes/terminus)
- [Prisma with NestJS](https://docs.prisma.io/docs/guides/frameworks/nestjs)
- [Prisma Client generation](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/generating-prisma-client)
- [Prisma system requirements](https://docs.prisma.io/docs/orm/reference/system-requirements)
- [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html)
