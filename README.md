# Haetteum

Haetteum은 Next.js 웹, NestJS API, 공유 계약 패키지를 pnpm Workspace로 관리합니다.

## 프로젝트 문서

- [전체 기술 아키텍처](./ARCHITECTURE.md): 프론트엔드·백엔드 구조, 의존 방향과 데이터 흐름
- [디자인 시스템](./DESIGN.md): UI/UX 원칙, 디자인 토큰과 컴포넌트 소유권

## 요구사항

- Node.js 24.19.0
- pnpm 10.33.0
- Docker와 Docker Compose

## 처음 실행하기

저장소 루트에서 프로젝트가 고정한 Node.js 버전을 활성화하고 의존성을 설치합니다.

```bash
nvm use
pnpm install
```

로컬 개발용 환경 변수 예시를 복사합니다. 예시 값은 로컬 개발용이며 운영 비밀값을
포함하지 않습니다. 실제 비밀값을 `.env.example` 파일에 기록하거나 Git에 커밋하지
마세요.

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

PostgreSQL을 시작하고 Prisma Client를 생성한 다음 웹과 API 개발 서버를 함께
실행합니다.

```bash
pnpm db:up
pnpm db:generate
pnpm dev
```

## 로컬 주소

- 웹: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:4000](http://localhost:4000)
- 데이터베이스 health check: [http://localhost:4000/api/v1/health](http://localhost:4000/api/v1/health)
- PostgreSQL: `localhost:5432` (`.env.example`에 커밋된 로컬 기본값)

## Workspace 소유권

- `apps/web`: Next.js 16 App Router 웹 애플리케이션과 UI·디자인 시스템
- `apps/api`: NestJS REST API, Prisma schema와 생성 Client, 데이터베이스 연결
- `packages/contracts`: 웹과 API가 공유하는 Zod 스키마와 TypeScript 계약

## 루트 명령어

- `pnpm dev`: 공유 계약과 Prisma Client를 생성한 뒤 웹과 API 개발 서버를 병렬 실행합니다.
- `pnpm dev:web`: 웹 개발 서버만 실행합니다.
- `pnpm dev:api`: 공유 계약과 Prisma Client를 생성한 뒤 API 개발 서버만 실행합니다.
- `pnpm build`: 공유 계약, API, 웹을 순서대로 프로덕션 빌드합니다.
- `pnpm lint`: 모든 workspace의 lint 명령을 실행합니다.
- `pnpm test`: 모든 workspace의 단위 테스트를 실행합니다.
- `pnpm test:e2e`: API e2e 테스트를 실행합니다.
- `pnpm db:up`: Docker Compose의 PostgreSQL을 시작하고 준비 상태까지 기다립니다.
- `pnpm db:down`: PostgreSQL 컨테이너와 네트워크를 중지하고 제거합니다. 이름 있는 Docker volume은 삭제하지 않으므로 데이터가 보존됩니다.
- `pnpm db:generate`: Prisma Client를 생성합니다.
- `pnpm db:migrate`: 개발 환경에서 새 Prisma migration을 만들고 적용합니다.
- `pnpm db:deploy`: 이미 존재하는 Prisma migration을 적용합니다.
- `pnpm db:studio`: Prisma Studio를 실행합니다.

## 현재 foundation 범위

이번 foundation 단계에는 인증이나 여행 도메인 테이블과 migration이 없습니다. 현재
Prisma schema는 PostgreSQL 연결과 Client 생성 기반만 제공하며, 실제 도메인 모델과
첫 migration은 후속 작업에서 추가합니다.
