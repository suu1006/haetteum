# Kakao provider_unavailable Investigation and Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운영 카카오 로그인 실패 단계를 확인하고 해당 원인을 수정하여 세션 생성과 로그인 유지를 검증한다.

**Architecture:** 로그인 시작 → 카카오 인가 → 토큰 교환 → 프로필 조회 → 사용자 저장 → 세션 생성 순서로 실패 경계를 식별한다. 외부에는 안전한 오류 안내를 유지하고 서버에는 단계와 허용된 오류 코드만 기록한다. 실제 운영 증거에 따라 설정 또는 코드를 최소 변경한다.

**Tech Stack:** NestJS, Prisma/PostgreSQL, Kakao OAuth, PM2, Next.js.

**Spec:** 사용자 요청은 첨부 오류 확인 및 수정계획 제시이다. 이 문서는 실행 전 계획이다. 인증 설계는 `../specs/2026-08-26-kakao-login-server-session-design.md`를 참고한다.

## 확인한 사실과 한계

- 2026-09-07 운영 `/api/v1/auth/kakao/start` 직접 조회 결과 302 및 `https://kauth.kakao.com/oauth/authorize` 이동을 확인했다. redirect_uri는 `https://haetteum.com/api/v1/auth/kakao/callback`이며 `__Secure-haetteum_oauth_state` 쿠키가 발급된다. 키, state, 쿠키 값은 출력하지 않았다.
- 쿠키 없는 운영 `/api/v1/auth/me` 요청은 401이다. 웹 `loadCurrentUser()`는 이를 비로그인 상태인 null로 처리한다. 이 응답만으로 로그인 실패 원인을 알 수 없다.
- `auth.controller.ts`는 시작 설정 누락, 카카오 인가 오류(access_denied 제외), 로그인 완료 처리 예외를 모두 provider_unavailable로 표시한다. 현재 시작 요청에서는 설정 누락 분기가 재현되지 않았다.
- `auth.service.ts`는 토큰 교환, 프로필 조회, 사용자 upsert, 세션 생성의 모든 예외를 AUTH_LOGIN_FAILED로 바꾼다. 컨트롤러도 예외를 잡고 리다이렉트하므로 일반 예외 필터만으로는 원인을 기록할 수 없다.
- `.github/workflows/deploy.yml`에는 마이그레이션 적용 단계가 없다. 수동 적용 여부와 운영 스키마 상태는 미확인이다. 이것을 실제 원인으로 단정하지 않는다.
- API는 production에서 `.env.production`을 읽지만 `prisma.config.ts`는 `dotenv/config`를 사용한다. Prisma CLI가 같은 운영 DB를 대상으로 하는지 확인해야 한다.
- 실제 계정 인가·콜백, 운영 프로세스 환경, 카카오 앱 설정, 서버 로그와 DB는 아직 확인하지 않았다. 시작 경로 정상만으로 로그인 성공을 판단하지 않는다.

## 제약

- 현재 요청 범위에서는 애플리케이션 코드 및 운영 설정을 변경하지 않는다.
- 기존 미추적 error.tsx, global-error.tsx, production-kakao-redirect 계획은 보존한다.
- 코드 작성 시 적용 대상 AGENTS.md와 관련 설치 패키지 문서를 읽는다. Next.js 코드를 수정한다면 설치된 `node_modules/next/dist/docs/`를 먼저 확인한다.
- 로그에는 인가 코드, 토큰, 쿠키, 프로필, DB 접속 문자열, 원본 요청 URL이나 원본 오류 본문을 남기지 않는다.

## Task 1: 실패 단계 식별

**확인/수정 대상:** `apps/api/src/auth/auth.controller.ts`, `auth.service.ts`, `kakao-auth.client.ts`, 각 대응 `.spec.ts`.

- [ ] 브라우저 Network의 All 및 Preserve log로 새 로그인 1회를 추적한다. 콜백에 카카오 error가 왔는지, code 교환 후 내부 실패인지 구분한다. 공유 자료에서 code/state를 제거한다.
- [ ] 같은 시점의 API 로그를 확인한다. 현재 로그로 식별할 수 없다면 단계별 진단을 먼저 구현한다.
- [ ] 토큰 교환, 프로필 조회, 사용자 저장, 세션 생성에 각각 실패를 주입한 테스트를 추가한다. 테스트는 해당 단계만 기록되고 비밀값이 포함되지 않으며 다음 단계가 실행되지 않음을 검증한다.
- [ ] 진단 구현 시 기존 requestId와 `token_exchange`, `profile_fetch`, `user_upsert`, `session_create` 단계를 연결한다. HTTP 상태, 사전 정의된 오류 종류, 검증된 카카오 오류 코드 또는 Prisma 오류 코드만 기록한다. 외부 오류 메시지는 그대로 안전하게 유지한다.
- [ ] 테스트 통과 후 진단 버전에서 새 로그인을 재현하여 실패 단계와 오류 코드를 확보한다.

## Task 2: 확인된 원인만 수정

**대상:** 운영 API 환경 및 카카오 앱 설정, `apps/api/prisma.config.ts`, `.github/workflows/deploy.yml`; 코드 원인이 확인된 경우 해당 인증 파일.

- [ ] 토큰 교환 실패라면 실행 중 API의 REST API 키와 Client Secret이 동일 카카오 앱에 대응하는지, Secret 활성화 상태 및 등록 Redirect URI가 실제 요청과 일치하는지 확인한다. 비밀값은 출력하지 않는다. 네트워크 오류/타임아웃이면 API 서버에서 외부 연결을 확인한다.
- [ ] 프로필 조회 실패라면 HTTP 상태와 응답 스키마 실패를 구분한다. 실제 응답의 민감정보를 제거한 최소 fixture로 재현한 뒤 필요한 파싱 수정만 한다.
- [ ] DB 단계 실패라면 API와 Prisma CLI가 같은 운영 DB를 바라보는지 확인하고 아래 읽기 전용 명령으로 마이그레이션 상태를 확인한다. `.env.production` 사용은 먼저 운영 파일 위치와 DB 대상을 확인한 뒤 수행한다.

```sh
DOTENV_CONFIG_PATH=.env.production pnpm --filter @haetteum/api exec prisma migrate status
```

- [ ] 인증 마이그레이션 `20260826190000_add_kakao_auth_sessions` 적용 여부와 users의 profile_image_url/last_login_at, sessions 테이블을 확인한다. 미적용이라면 대기 마이그레이션의 SQL과 데이터 변경 영향을 먼저 검토한다. 이 인증 마이그레이션에는 TEST 사용자 삭제도 포함된다.
- [ ] 미적용이 원인으로 확인되면 검토한 마이그레이션을 운영 DB에 적용한다. 배포 자동화에도 같은 운영 DB 환경으로 `prisma migrate deploy`를 실행하고 실패 시 재시작하지 않는 단계를 추가한다. 이미 적용되어 있다면 권한·연결·제약 오류를 확보한 코드에 맞춰 해결한다.
- [ ] 코드 수정이 필요한 경우 확인한 실패를 먼저 테스트로 재현하고 최소 수정한다. 원인 미확정 상태에서 쿠키 정책 변경이나 무조건 재시도를 추가하지 않는다.

## Task 3: 회귀 및 실제 로그인 검증

- [ ] 인증 변경에 대한 회귀 테스트를 실행한다.

```sh
pnpm --filter @haetteum/api test -- auth.controller.spec.ts auth.service.spec.ts kakao-auth.client.spec.ts auth-cookie.service.spec.ts oauth-state.service.spec.ts session.service.spec.ts
```

- [ ] 별도 테스트 DB가 구성된 환경에서 `pnpm --filter @haetteum/api test:e2e -- auth.e2e-spec.ts`를 실행한다. 운영 DB를 테스트 대상으로 사용하지 않는다.
- [ ] 운영에서 새 로그인 후 haetteum.com 세션 쿠키 발급, `/auth/me` 200, `/mypage` 이동 및 새로고침 시 로그인 유지를 확인한다.
- [ ] 취소는 cancelled, 잘못된 state는 invalid_request, 실제 제공자 실패는 안전한 재시도 안내로 이어지는지 확인한다.
- [ ] 로그아웃 후 `/auth/me` 401을 확인하고 진단 로그에 민감정보가 없는지 확인한다.

**완료 기준:** 실패 원인이 운영 증거로 식별되고 수정 후 실제 로그인 및 세션 유지가 성공하며 관련 회귀 테스트가 통과한다. 현재 문서 작성만 완료했으며 수정·배포·로그인 성공 검증은 수행하지 않았다.
