# Production Kakao Redirect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 배포 카카오 로그인 후 HTTPS 웹으로 복귀하고 보호 페이지에서 세션을 유지한다.

**Architecture:** 먼저 운영 WEB_ORIGIN을 바로잡는다. 이후 웹 도메인의 /api/v1을 Nest로 프록시하여 로그인 시작·콜백·세션 조회를 동일 호스트로 통일하는 방안을 권장한다. 실제 nginx 설정 확인 후 적용하며 기존 API 경로와 쿼리, Set-Cookie를 보존한다.

**Tech Stack:** NestJS, Next.js, nginx, PM2, Kakao OAuth.

**Spec:** 사용자 요청은 원인 확인 및 수정계획이다. 이 문서는 실행 전 계획이며 원래 인증 설계는 ../specs/2026-08-26-kakao-login-server-session-design.md를 참고한다.

## Evidence and constraints

- 2026-09-07 배포 GET /api/v1/auth/kakao/callback 응답: 302, Location http://54.165.95.110:3000/login?error=invalid_request.
- error=access_denied 요청도 같은 IP:3000의 /login?error=cancelled로 302.
- https://haetteum.com/login은 200.
- auth.controller.ts의 webLocation은 WEB_ORIGIN을 사용한다. 운영 환경파일 및 PM2 실효 환경은 아직 직접 확인하지 않았다.
- auth-cookie.service.ts의 운영 세션은 Domain 없는 __Host-haetteum_session이다. API 호스트에서 발급하면 웹 호스트의 SSR 요청에 포함되지 않는다. auth-server.ts는 웹 요청의 Cookie를 전달한다.
- 실제 계정의 인가 코드 교환과 로그인 성공은 재현하지 않았다. 첨부 화면은 카카오 계속하기 화면이며 Fetch/XHR 필터만으로 문서 리다이렉트 실패를 판정할 수 없다.
- 기존 미추적 error.tsx, global-error.tsx는 수정하지 않는다. 코드 작성 전 설치된 Next.js 문서를 읽는다.

## Task 1: 운영 복귀 주소 교정

**Files:** 운영 apps/api/.env.production 또는 PM2가 실제 공급하는 환경; apps/api/src/auth/auth.controller.ts는 근거 확인 대상.

- [ ] 운영 WEB_ORIGIN의 공급원과 PM2 덮어쓰기를 확인하고 https://haetteum.com으로 설정한다. 비밀 키는 출력하지 않는다.
- [ ] API 프로세스에 환경을 재적용한다.
- [ ] 아래 읽기 전용 요청을 재실행하여 Location이 HTTPS 웹 도메인인지 확인한다.

```sh
curl -sS -D - -o /dev/null 'https://api.haetteum.com/api/v1/auth/kakao/callback?error=access_denied'
```

예상: 302 및 https://haetteum.com/login?error=cancelled. 변경 전에는 위 IP 주소를 반환했다.

## Task 2: 세션 호스트 통일

**Files:** 운영 nginx 웹 virtual host 설정(서버에서 정확한 경로 확인), 운영 웹 빌드 환경, 운영 API 환경, 카카오 앱 Redirect URI 설정.

- [ ] nginx 웹 호스트의 /api/v1/ 경로를 기존 Nest upstream으로 연결할 수 있는지 확인한다. 로그인 시작과 콜백을 함께 이동해야 state 쿠키도 일치한다.
- [ ] https://haetteum.com/api/v1/auth/kakao/callback을 카카오 Redirect URI에 등록한다. 기존 URI는 전환 검증까지 보존한다.
- [ ] KAKAO_REDIRECT_URI=https://haetteum.com/api/v1/auth/kakao/callback, NEXT_PUBLIC_API_BASE_URL=https://haetteum.com/api/v1로 통일한다. 서버에서 이 URL로 접근 가능한지도 검증한다.
- [ ] nginx -t 성공 후 reload, 웹 재빌드 및 API 환경 재적용을 수행한다. __Host 쿠키의 Secure, HttpOnly, Path=/, Domain 미설정을 유지한다.
- [ ] 배포 후 새 로그인 시도에서 state와 session이 모두 haetteum.com에 저장되는지 확인한다.

## Task 3: 실제 브라우저 검증 및 실패 분기

**Files:** apps/api/src/auth/auth.controller.spec.ts, apps/api/src/auth/auth-cookie.service.spec.ts는 기존 회귀 검증 대상.

- [ ] DevTools Network를 All, Preserve log로 설정하고 로그인 시작 → 카카오 → callback → 원래 returnTo를 추적한다. code/state/token은 보고서에 기록하지 않는다.
- [ ] /mypage에서 로그인 완료 후 원래 화면으로 복귀하고 새로고침해도 유지되는지 확인한다. /auth/me 200, 로그아웃 후 401을 확인한다.
- [ ] 취소 시 cancelled, 잘못된 state 시 invalid_request 화면을 확인한다.
- [ ] 콜백이 카카오에서 발생하지 않으면 카카오 문서 요청·스크립트 실패 및 등록 URI를 조사한다. 콜백 이후 provider_unavailable이면 토큰 교환·사용자 조회·DB 단계를 분리 조사한다. 현재 catch는 세부 오류를 숨기므로 필요시 비밀값 없는 단계/오류종류/request ID 로깅을 별도 추가한다.
- [ ] 인증 코드 변경이 필요해지면 실패 사례를 먼저 테스트로 재현하고 최소 수정 후 아래 회귀 테스트를 실행한다.

```sh
pnpm --filter @haetteum/api test -- auth.controller.spec.ts auth-cookie.service.spec.ts oauth-state.service.spec.ts kakao-auth.client.spec.ts
```

완료 기준: HTTPS 웹 복귀, 보호 페이지 SSR 세션 유지, 취소/실패 안내, 로그아웃 정상 동작. 운영 변경은 아직 수행하지 않았다.
