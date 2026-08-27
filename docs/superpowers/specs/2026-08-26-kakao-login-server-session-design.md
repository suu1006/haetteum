# Haetteum 카카오 로그인과 서버 세션 설계

**상태:** 설계 승인 · 구현 전  
**작성일:** 2026-08-26  
**인증 제공자:** Kakao 단일 제공자  
**세션:** PostgreSQL 기반 opaque server session  
**웹:** Next.js 16.3 App Router  
**API:** NestJS 11 REST `/api/v1`

## 1. 목표

Haetteum에 카카오 소셜 로그인을 추가한다. 공개 여행지·축제 탐색은 로그인 없이
허용하고, 개인 데이터가 필요한 화면과 변경 요청은 NestJS가 소유한 서버 세션으로
보호한다.

카카오는 사용자 인증만 담당한다. Haetteum은 카카오 사용자 식별자, 닉네임, 프로필
이미지를 조회한 뒤 자체 사용자를 만들거나 갱신하고, PostgreSQL에 Haetteum 세션을
생성한다. 카카오 액세스 토큰과 리프레시 토큰은 프로필 조회 후 저장하지 않는다.

## 2. 승인된 제품 결정

- 비로그인 사용자는 여행지·축제 등 공개 탐색 기능을 사용할 수 있다.
- `/mypage`, `/reviews`, `/trips`와 개인 데이터 변경 기능은 로그인이 필요하다.
- 보호 기능 진입 시 `/login?returnTo=<internal-path>` 로그인 안내 화면을 거친다.
- 로그인 성공 후 원래 내부 경로로 복귀하지만 직전 변경 작업을 자동 재실행하지 않는다.
- 카카오에서는 사용자 식별자, 닉네임, 프로필 이미지만 사용하며 이메일은 요청하지 않는다.
- 카카오 닉네임과 프로필 이미지는 로그인할 때마다 최신 값으로 갱신한다.
- 로그인은 14일 유지하며 남은 기간이 7일 미만일 때 만료를 14일로 연장한다.
- 로그아웃은 현재 브라우저의 Haetteum 세션만 종료하며 카카오 로그인 상태에는 영향을
  주지 않는다.
- 1차 범위는 로그인, 현재 사용자 조회, 로그아웃까지다. 회원 탈퇴와 카카오 연결 해제는
  후속 범위다.
- 현재 고정 `TEST` 사용자와 seed는 인증 구현 완료 시 제거한다. 테스트는 매번 독립적인
  임시 사용자를 만든다.
- 실제 저장 데이터가 없는 사용자 통계는 목 값으로 표시하지 않고 숨기거나 0으로 표시한다.
- 이용약관과 개인정보처리방침은 아직 없으며 운영 공개 전 별도 준비가 필요하다.

## 3. 선택한 아키텍처

NestJS가 OAuth와 Haetteum 서버 세션을 모두 소유한다.

```text
/login?returnTo=/reviews
  → GET /api/v1/auth/kakao/start
  → Kakao authorization endpoint
  → GET /api/v1/auth/kakao/callback
  → authorization code를 Kakao token으로 교환
  → GET /v2/user/me로 최소 프로필 조회
  → User upsert
  → PostgreSQL Session 생성
  → HttpOnly 세션 쿠키 설정
  → /reviews로 redirect
```

Next.js는 로그인 화면과 사용자 경험을 담당하고, NestJS는 인증과 권한의 최종 경계다.
Next.js 화면 리다이렉트나 Zustand 상태만으로 API를 보호하지 않는다.

공식 Kakao Login 흐름:

- <https://developers.kakao.com/docs/en/kakaologin/rest-api>
- <https://developers.kakao.com/docs/en/kakaologin/prerequisite>
- <https://developers.kakao.com/docs/en/kakaologin/common>
- <https://developers.kakao.com/docs/en/kakaologin/utilize>

## 4. OAuth 시작과 callback

### 4.1 시작

`GET /api/v1/auth/kakao/start?returnTo=/reviews`는 다음을 수행한다.

1. `returnTo`를 내부 경로로 검증한다.
2. 암호학적으로 안전한 일회용 `state`를 생성한다.
3. 원본 state와 안전하게 검증된 return path를 짧은 수명의 HttpOnly 쿠키에 저장한다.
4. 카카오 authorization endpoint로 리다이렉트한다.

OAuth 임시 쿠키는 10분 만료, `HttpOnly`, `SameSite=Lax`, callback 경로로 제한하며
production에서는 `Secure`를 사용한다. `returnTo`는 `/`로 시작하는 상대 경로만 허용하고
`//`, scheme, host가 포함된 값은 거부해 open redirect를 막는다.

### 4.2 callback

`GET /api/v1/auth/kakao/callback`은 다음을 수행한다.

1. query state와 임시 쿠키 state를 타이밍 안전 비교한다.
2. state를 성공 여부와 관계없이 일회성으로 삭제한다.
3. authorization code를 NestJS 서버에서 token으로 교환한다.
4. access token으로 Kakao user info를 한 번 조회한다.
5. `provider=KAKAO`, `providerUserId=<Kakao id>`로 사용자를 upsert한다.
6. 표시 이름과 프로필 이미지를 최신 값으로 갱신한다.
7. Haetteum 세션을 만들고 HttpOnly 쿠키를 설정한다.
8. 검증된 내부 return path로 리다이렉트한다.

카카오 nickname이 없으면 `카카오 여행자`, 이미지가 없으면 `null`을 사용한다. Kakao token과
authorization code, 전체 provider 응답은 DB 또는 로그에 남기지 않는다.

Kakao OIDC discovery metadata는 PKCE `S256`을 광고하지만 현재 공식 REST API 가이드의
authorization-code 예시에는 PKCE request shape가 명확히 설명되지 않는다. 1차 구현은
server-side code exchange, state 검증, client secret으로 보호하며 PKCE는 공식 지원 계약이
확인될 때 후속 적용한다.

## 5. 데이터 모델

### 5.1 User

```text
User
- id: UUID PK
- provider: String(32), 현재 KAKAO
- providerUserId: String(191)
- displayName: String(100)
- profileImageUrl: Text nullable
- lastLoginAt: timestamptz
- createdAt: timestamptz
- updatedAt: timestamptz

UNIQUE(provider, providerUserId)
```

`providerUserId`는 공유 API 응답에 노출하지 않는다. 이메일, Kakao token, 비밀번호는 저장하지
않는다.

### 5.2 Session

```text
Session
- id: UUID PK
- userId: UUID FK → User
- tokenHash: Char(64) unique
- expiresAt: timestamptz
- lastSeenAt: timestamptz
- createdAt: timestamptz
- updatedAt: timestamptz

INDEX(expiresAt)
INDEX(userId, expiresAt)
```

브라우저에는 256-bit 이상의 임의 세션 토큰 원본을 전달하고, DB에는 SHA-256 해시만 저장한다.
사용자 삭제 시 세션은 cascade 삭제한다. 현재 로그아웃은 현재 token hash에 해당하는 세션 행만
삭제한다.

유효 세션의 남은 기간이 7일 미만일 때 `expiresAt`과 쿠키 만료를 현재 시각 기준 14일로
연장한다. 만료 세션은 조회 시 제거하고 하루 한 번 정리 작업으로 일괄 삭제한다.

## 6. 쿠키 정책

Haetteum session cookie:

- HttpOnly: true
- SameSite: Lax
- Path: `/`
- Max-Age/Expires: 14일
- Secure: production에서 true, localhost development에서 false
- Domain: 설정하지 않아 host-only로 유지

production에서는 `__Host-` prefix를 사용할 수 있도록 환경별 cookie 이름을 지원한다. API와
웹이 서로 다른 사이트가 되는 배포는 이번 설계에 포함하지 않는다. 운영 배포 주소가 정해지면
same-site 여부와 cookie 전달을 다시 검증한다.

OAuth state cookie는 callback 경로로만 제한해야 하므로 production에서
`__Secure-haetteum_oauth_state`를 사용한다. `__Host-` prefix는 `Path=/`을 요구해 callback 전용
경로와 함께 사용할 수 없다. OAuth state cookie도 Domain은 설정하지 않고 HttpOnly,
SameSite=Lax, Secure 정책을 적용한다.

## 7. REST API와 공유 계약

```http
GET  /api/v1/auth/kakao/start?returnTo=/reviews
GET  /api/v1/auth/kakao/callback?code=...&state=...
GET  /api/v1/auth/me
POST /api/v1/auth/logout
```

`GET /auth/me` 성공 응답:

```json
{
  "id": "user-uuid",
  "displayName": "해뜸 여행자",
  "profileImageUrl": "https://..."
}
```

- 로그인하지 않았거나 세션이 무효면 기존 Problem Details 형식의 `401 UNAUTHENTICATED`를
  반환한다.
- logout 성공은 `204 No Content`다.
- `SessionAuthGuard`가 세션을 검증하고 `@CurrentUser()`가 내부 user ID를 Controller에
  전달한다.
- 인증된 모든 unsafe HTTP 요청은 허용된 `WEB_ORIGIN`의 `Origin`인지 확인한다.
- 기존 후기 고정 사용자 resolver를 제거하고 세션 user ID로 교체한다.
- 성공 데이터만 공유 Zod 계약에 노출하며 Prisma, session token, Kakao 내부 타입은 노출하지
  않는다.

## 8. Next.js 보호 경로와 데이터 전달

- `/mypage`, `/reviews`, `/trips` Server Component는 Nest `/auth/me`를 호출해 세션을 확인한다.
- Next.js 서버에서 Nest로 요청할 때 incoming `Cookie`를 명시적으로 전달하고 `cache:
  "no-store"`를 사용한다.
- 브라우저에서 Nest로 보내는 쓰기 요청은 `credentials: "include"`를 사용한다.
- 인증되지 않은 보호 화면은 `/login?returnTo=<internal-path>`로 리다이렉트한다.
- root layout에서 세션을 조회하지 않아 모든 공개 페이지를 불필요하게 동적 렌더링하지 않는다.
- 후기 작성·수정, 저장·찜, 일정 저장·수정, 개인화 AI 요청은 화면 보호 여부와 관계없이 Nest
  API에서 세션과 소유권을 재검증한다.
- 클라이언트 요청이 `401`을 받으면 인증 store를 비우고 로그인 화면으로 이동한다.

## 9. 승인된 로그인 UI

Visual Companion v3 방향을 구현 기준으로 사용한다.

- 모바일은 전체 화면, 데스크톱은 중앙 카드다.
- `해뜸` 왼쪽 브랜드 마크는 보라색 둥근 track과 오른쪽 흰색 knob를 가진 ON toggle 형태다.
- 제목은 `여행 기록을 이어서 관리해보세요`다.
- 카카오 로그인 버튼 하나에 집중한다.
- 카카오 식별자, 닉네임, 프로필 이미지만 사용한다는 안내를 표시한다.
- `로그인 후 내 후기로 돌아가요` 안내 chip은 표시하지 않는다.
- 존재하지 않는 약관·개인정보처리방침 링크는 만들지 않는다.
- 뒤로가기는 사용 가능한 history가 있으면 이전 화면, 없으면 `/`로 이동한다.
- 로그인 실패나 취소 시 같은 화면 안에 간결한 오류와 재시도 동작을 제공한다.

설계 시안:

`/.superpowers/brainstorm/65287-1787720518/content/login-responsive-direction-v3.html`

이 파일은 설계 참고 자료이며 제품 번들에 포함하지 않는다.

## 10. Zustand 인증 상태

Zustand에는 화면 표시용 최소 사용자 정보만 메모리로 보관한다.

```ts
type AuthUser = {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
};

type AuthState =
  | {
      status: "unknown";
      user: null;
    }
  | {
      status: "anonymous";
      user: null;
    }
  | {
      status: "authenticated";
      user: AuthUser;
    };
```

- `persist` middleware, localStorage, sessionStorage를 사용하지 않는다.
- `AuthStoreProvider`가 브라우저별 store instance를 만든다. 서버 전역 singleton store를 만들지
  않는다.
- 앱 최초 진입 시 `/auth/me`로 사용자 상태를 한 번 확인한다.
- 확인 전에는 `unknown`으로 유지해 잘못된 로그인·로그아웃 UI가 깜박이지 않게 한다.
- 보호 화면은 서버에서 검증한 사용자를 먼저 렌더링하고 store에도 동기화한다.
- 로그인 성공 시 `/auth/me` 응답으로 authenticated 상태를 설정한다.
- logout 성공 또는 `401` 수신 시 anonymous 상태로 전환한다.
- store는 UI 편의용이며 권한 판정 근거로 사용하지 않는다.

## 11. 마이페이지

- profile card의 이름과 이미지는 실제 Kakao 사용자 정보로 교체한다.
- 실제 저장 API에서 계산 가능한 후기 수만 실제 값으로 표시한다.
- 여행, 찜 등 저장 구현이 없는 통계는 숨기거나 0으로 표시한다.
- 기존 목 사용자 이름, 목 프로필 이미지, 목 개인 통계를 실사용 정보처럼 표시하지 않는다.

## 12. 오류 처리와 로그

| 상황 | 사용자 동작 | 서버 동작 |
|---|---|---|
| 카카오 로그인 취소 | `/login?error=cancelled` | 세션 미생성, 임시 state 삭제 |
| state 불일치·만료 | 안전한 재시도 안내 | `invalid_request`, 세션 미생성 |
| Kakao token/profile 장애 | 제공자 오류와 재시도 안내 | `provider_unavailable`, provider 본문 비노출 |
| DB user/session 오류 | 잠시 후 재시도 안내 | 쿠키 미발급, 안전한 500 |
| 세션 없음·변조·만료 | 로그인 화면 이동 | 401, 가능한 경우 cookie 제거 |
| logout 실패 | 현재 화면 유지와 재시도 | DB와 cookie 상태 불일치 방지 |

로그에는 request ID, 내부 오류 종류, provider HTTP status처럼 진단에 필요한 최소 정보만 남긴다.
authorization code, access/refresh token, session token, 전체 Kakao profile body는 기록하지 않는다.

## 13. 환경변수

### 13.1 API `.env`

```dotenv
NODE_ENV=development
API_PORT=4000
WEB_ORIGIN=http://localhost:3000
DATABASE_URL=postgresql://haetteum:local-development-only@localhost:5432/haetteum

# Kakao Developers > 앱 > 앱 키 > REST API 키
KAKAO_REST_API_KEY=

# Kakao Developers > 카카오 로그인 > 보안 > Client Secret
KAKAO_CLIENT_SECRET=

# Kakao Developers에 동일한 문자열을 Redirect URI로 등록
KAKAO_REDIRECT_URI=http://localhost:4000/api/v1/auth/kakao/callback
```

`KAKAO_REST_API_KEY`는 현재 Kakao Local API에도 사용하는 서버 값이다. 같은 Kakao 앱을
사용하면 하나의 REST API 키를 함께 쓸 수 있다. 별도 앱을 사용해야 하는 운영 요구가 생기면
환경변수를 `KAKAO_LOCAL_REST_API_KEY`와 `KAKAO_LOGIN_REST_API_KEY`로 분리한다.

`KAKAO_CLIENT_SECRET`은 서버 전용 비밀값이다. `.env.example`에는 이름만 두고 실제 값은
commit하지 않는다. `KAKAO_REDIRECT_URI`는 비밀이 아니지만 Kakao Developers에 등록한 값과
scheme, host, port, path가 정확히 일치해야 한다.

### 13.2 Web `.env.local`

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
```

Web에는 Kakao key 또는 Client Secret을 추가하지 않는다. 로그인 버튼은 Nest의
`/auth/kakao/start`로 이동한다.

### 13.3 env로 만들지 않는 값

- Kakao authorization/token/user-info endpoint는 공식 고정 HTTPS endpoint를 코드 상수로 둔다.
- session TTL 14일과 refresh threshold 7일은 승인된 제품 정책 상수로 둔다.
- development/production cookie secure 여부는 `NODE_ENV`에서 파생한다.
- 무작위 session token은 실행 시 생성하므로 별도 session secret이 필요하지 않다.

## 14. Kakao Developers 설정 전제

사용자가 직접 Kakao Developers 계정에서 다음을 설정해야 한다.

1. 애플리케이션 생성
2. 카카오 로그인 활성화
3. Redirect URI 등록:
   `http://localhost:4000/api/v1/auth/kakao/callback`
4. Client Secret 활성화와 값 복사
5. 동의 항목에서 닉네임과 프로필 이미지 사용 확인
6. REST API 키와 Client Secret을 `apps/api/.env`에 저장

키와 secret은 채팅, 문서, Git diff, 로그에 붙여 넣지 않는다. 현재 공식 문서는 localhost
redirect URI의 별도 예외 규칙을 명시하지 않고 정확한 등록·일치를 요구하므로 실제 콘솔에서
로컬 URI 등록 가능 여부를 구현 전 확인한다.

## 15. 테스트와 검증

### 15.1 Contracts

- `AuthUser` 성공 응답 파싱
- 내부 provider ID와 token이 계약에 포함되지 않음
- 인증 오류 code 파싱

### 15.2 API 단위 테스트

- 환경변수 필수·형식 검증
- internal return path 허용과 open redirect 거부
- OAuth state 생성, 일치, 불일치, 만료, 일회성 소비
- Kakao token request와 user-info mapping
- user upsert와 로그인 시 profile 갱신
- 원본 session token 비저장과 hash 조회
- 14일 생성과 7일 threshold refresh
- logout 현재 세션 삭제
- cookie flags와 민감정보 로그 비노출

### 15.3 API E2E

외부 Kakao 호출은 fake client로 대체한다.

- start → callback → session cookie → `/auth/me` → logout 전체 흐름
- cookie 없음, 변조, 만료, 삭제 세션의 401
- 서로 다른 사용자 후기 소유권 격리
- 고정 TEST 사용자와 seed가 존재하지 않음
- 허용되지 않은 Origin의 unsafe 요청 거부

### 15.4 Web 단위 테스트

- 승인된 로그인 v3 UI와 접근성 이름
- 로그인 취소·실패 상태와 재시도
- 보호 경로 returnTo 생성과 내부 경로 제한
- Server Component 요청의 Cookie 전달과 `no-store`
- 브라우저 요청의 `credentials: "include"`
- `AuthState` 세 상태 전이와 타입 좁히기
- logout·401에서 anonymous 초기화
- 저장소 persistence 미사용

### 15.5 실제 브라우저

유효한 Kakao app 설정과 test account가 준비된 뒤 검증한다.

1. 비로그인 공개 탐색
2. 보호 경로 접근 → `/login`
3. Kakao 로그인 → 원래 경로 복귀
4. 실제 nickname/profile image 표시
5. 새로고침 후 로그인 유지
6. 후기 생성과 사용자 소유권
7. logout 후 보호 경로 재접근 차단
8. 로그인 취소·provider 오류 화면
9. 브라우저 console 오류와 network cookie 확인

## 16. 범위 제외와 운영 전 차단 조건

이번 구현 범위에서 제외한다.

- 회원 탈퇴와 Kakao unlink
- 모든 기기 logout
- 이메일 수집
- Kakao token 영구 저장
- 복수 OAuth provider
- 약관·개인정보처리방침 작성
- 운영 도메인 cookie 검증
- 미구현 여행·찜·AI 저장 기능 자체의 구현

운영 공개 전에는 개인정보처리방침, 회원 탈퇴와 데이터 삭제, Kakao unlink, 실제 운영
도메인의 redirect URI와 cookie 정책, 운영 secret 저장소를 별도 승인·구현·검증해야 한다.
