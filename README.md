# Haetteum

Haetteum은 Next.js 웹, NestJS API, 공유 계약 패키지를 pnpm Workspace로 관리합니다.

## 프로젝트 문서

- [전체 기술 아키텍처](./ARCHITECTURE.md): 프론트엔드·백엔드 구조, 의존 방향과 데이터 흐름
- [디자인 시스템](./DESIGN.md): UI/UX 원칙, 디자인 토큰과 컴포넌트 소유권
- [관광 데이터 ERD](./docs/ERD.md): 지역·시군구·관광지·동기화 실행 관계와 제약

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
- 로그인: [http://localhost:3000/login](http://localhost:3000/login)
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
- `pnpm test:e2e`: API e2e 테스트를 실행합니다. 현재 로컬 검증에서는
  `DATABASE_URL`을 `apps/api/.env`와 같은 값으로 명시해 실행해야 전체 API e2e가
  통과했습니다.
- `pnpm db:up`: Docker Compose의 PostgreSQL을 시작하고 준비 상태까지 기다립니다.
- `pnpm db:down`: PostgreSQL 컨테이너와 네트워크를 중지하고 제거합니다. 이름 있는 Docker volume은 삭제하지 않으므로 데이터가 보존됩니다.
- `pnpm db:generate`: Prisma Client를 생성합니다.
- `pnpm db:migrate`: 개발 환경에서 새 Prisma migration을 만들고 적용합니다.
- `pnpm db:deploy`: 이미 존재하는 Prisma migration을 적용합니다.
- `pnpm db:studio`: Prisma Studio를 실행합니다.
- `pnpm tourism:smoke`: DB를 변경하지 않고 TourAPI 네 operation의 JSON 응답을 확인합니다.
- `pnpm tourism:sync -- --mode=full`: 다섯 지역의 시군구와 현재 표출 관광지를 전체 동기화합니다.
- `pnpm tourism:sync -- --mode=incremental`: 마지막 성공 시점 이후의 변경·비표출 관광지를 동기화합니다.
- `pnpm tourism:enrich -- --content-id=<id>`: 특정 관광지의 공통·소개·반복정보와 공식 이미지를 원자적으로 보강합니다.
- `pnpm tourism:enrich-ranked`: 현재 세대별 순위에 매칭된 고유 관광지를 순차 보강합니다.
- `pnpm ranking:import -- --directory="/absolute/path/to/download-directory"`:
  한국관광 데이터랩 공식 CSV 다운로드 폴더를 검증한 뒤 세대별 인기관광지 순위
  스냅샷을 적재합니다.

## 현재 데이터베이스 범위

API 공통 기반과 함께 관광 지역·시군구·관광지·축제·동기화 실행 이력·세대별
인기관광지 순위를 위한 Prisma 모델과 migration이 존재합니다. migration은
서울·경기·강원·부산·제주 기준 지역을 생성하며, 구현 테이블과 모든 컬럼에
PostgreSQL comment를 설정합니다. 시군구는 `regionId + providerCode`, 관광지와
축제는 `source + externalId`를 중복 방지 기준으로 사용합니다.

## TourAPI 연동

`apps/api/.env`에는 값을 문서나 Git에 기록하지 않고 다음 환경변수 이름만
관리합니다.

- `END_POINT`
- `SERVICE_KEY`
- `TOURISM_SYNC_ENABLED`

TourAPI client는 `_type=json`으로 `ldongCode2`, `areaBasedList2`,
`areaBasedSyncList2`, `detailCommon2`, `detailIntro2`, `detailInfo2`,
`detailImage2`를 호출합니다. 응답이 JSON이 아니거나
provider 성공 코드가 아니면 적재를 중단하며, 키·전체 URL·원본 응답 본문은
로그에 남기지 않습니다.

자동 증분 동기화는 매일 `03:30 Asia/Seoul`에 실행되며,
`TOURISM_SYNC_ENABLED`로 활성화합니다. provider 장애 시 실행 이력은
`FAILED`로 남지만 기존 관광지를 삭제하지 않으며, 조회 API는 마지막으로
성공한 PostgreSQL 데이터를 계속 제공합니다.

```http
GET /api/v1/places?region=jeju&page=1&pageSize=20&q=
```

이 endpoint는 요청 시 TourAPI를 호출하지 않고 DB에서 `isVisible=true`인 관광지를
제목과 ID 순으로 반환합니다.

```http
GET /api/v1/places/{placeId}
GET /api/v1/places/{placeId}/nearby?category=attraction&limit=10
```

상세 endpoint는 PostgreSQL에 보강된 소개·이용·공식 이미지 정보만 반환합니다.
주변 endpoint는 서버에 Kakao 키가 설정된 경우에만 Kakao Local을 호출하며, 키 누락이나
provider 장애는 장소 상세와 분리된 `unavailable` 응답으로 반환합니다. Kakao
Local 주변 검색도 서버의 `KAKAO_REST_API_KEY`를 사용하며, 브라우저로 키를
전달하지 않습니다.

```http
GET /api/v1/festivals/discovery?region=all&page=1&pageSize=20
```

이 endpoint는 요청 시 TourAPI를 호출하지 않고 DB에 동기화된 축제 discovery
목록과 상위 ranking 항목을 반환합니다.

```http
GET /api/v1/place-rankings?audience=all&limit=10
```

이 endpoint는 한국관광 데이터랩 공식 다운로드 CSV에서 적재한 최신 전국
스냅샷의 상위 10개 순위를 반환합니다. 데이터랩 페이지를 스크래핑하지 않으며,
조회 시 한국관광 데이터랩이나 TourAPI를 호출하지 않습니다. 2026-08-25 현재 초기
스냅샷은 `2025-08-01`부터 `2026-07-31`까지의 전국 데이터 180행이며, 기존
TourAPI 관광지와 정확히 매칭된 행은 57건, 미매칭으로 보존된 행은 123건입니다.
웹은 `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1` 기준으로 이 API를
호출하고, API 이미지가 없는 순위 항목은
`/images/explore/categories/popular-attraction.png` 로컬 이미지를 fallback으로
표시합니다.

2026-08-24 실 provider·PostgreSQL 검증 결과는 지역 5건, 시군구 116건,
표출 관광지 4,602건입니다. 연속 전체 동기화의 두 번째 실행은 신규 0건이고
관광지 UUID를 보존했으며, 같은 KST 날짜의 증분 동기화는 변경 0건으로
성공했습니다.

## Kakao 로그인과 서버 세션

Kakao 로그인, 서버 세션, 현재 사용자 조회, 현재 세션 로그아웃과 리뷰 소유권
검사는 구현되어 있습니다. 웹의 `/reviews`와 `/mypage`는 서버 세션으로 현재
사용자를 확인하고, API의 리뷰 endpoint는 세션 사용자 기준으로 본인 리뷰만 조회,
생성, 수정합니다. 로그아웃은 현재 Haetteum 세션만 삭제하며 Kakao 계정 연결을
해제하지 않습니다.

`apps/api/.env`에는 값을 문서나 Git에 기록하지 않고 다음 Kakao Login 환경변수
이름만 관리합니다.

- `KAKAO_REST_API_KEY`
- `KAKAO_CLIENT_SECRET`
- `KAKAO_REDIRECT_URI`

로컬 Kakao Login Redirect URI는 Kakao Developers의 **카카오 로그인 Redirect URI**에
아래 값과 정확히 같게 등록해야 합니다.

```text
http://localhost:4000/api/v1/auth/kakao/callback
```

`apps/web/.env.local`에는 API 공개 base URL과 Kakao 지도 JS 키를 둡니다.

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_KAKAO_JS_KEY=
```

`NEXT_PUBLIC_KAKAO_JS_KEY`는 관광지 상세 화면의 "가까운 코스로 둘러보기" 지도에
사용됩니다. Kakao Developers 앱의 **JavaScript 키**이며(REST API 키와 다름,
클라이언트에 노출되어도 되는 키), 값이 비어 있으면 지도만 조용히 숨겨지고
나머지 기능은 정상 동작합니다.

회원 탈퇴, Kakao unlink, 모든 기기 로그아웃, 개인정보처리방침·운영 정책 문서화는
아직 구현 범위 밖입니다.

## 검증 상태 메모

2026-08-27 기준 실 Kakao 브라우저 흐름은 `/reviews` 보호 라우트 → 로그인 →
Kakao consent/callback → `/reviews` 복귀 → 새로고침 세션 유지 → `/mypage` 실제
프로필 표시 → 현재 세션 로그아웃 → `/reviews` 재보호까지 확인했습니다. Zustand
상태는 브라우저에서 직접 노출해 검사하지 않았고, 실제 navigation/logout 동작과
집중 store 테스트로만 뒷받침합니다.

자동화 caveat는 별도로 유지합니다.

- 전체 API e2e는 `DATABASE_URL`을 명시적으로 공급하면 통과합니다.
- 전체 web test에는 auth와 무관한 `theme-travel-section.test.tsx`의 `평점순`
  option 조회 실패 1건이 남아 있습니다.
