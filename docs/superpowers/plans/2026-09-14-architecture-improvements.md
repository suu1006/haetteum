# 아키텍처·코드 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 데이터 손실·업로드 권한·계정 캐시·배치 복구 문제를 먼저 해결하고 운영 검증 체계를 보강한다.

**Architecture:** 기존 Next.js/NestJS/Prisma 모노레포를 유지한다. 공통 Asset 소유권 경계, 사용자별 query key, 영속 수집 진행 상태를 추가한다. 아래 작업은 구현 제안이며 제품 코드에는 아직 적용하지 않았다.

**Tech Stack:** Node 24.19.0, pnpm 10.33.0, Next.js 16.3.1, NestJS 11, Prisma 7, PostgreSQL, Zod, Jest, Vitest.

**Spec:** [2026-09-14 리뷰 및 개선 요구사항](../../architecture-review-2026-09-14.md).

## Global Constraints

- TourAPI 직접 호출은 `TourApiClient` 외에는 금지한다.
- 수집은 배치에서만 실행하며 사용자 요청 경로는 저장된 관광 데이터를 조회한다.
- 재시도와 재시작도 기존 DB 호출 예산 및 advisory lock을 공유한다.
- 날짜·지역·showflag 필터는 공급자 동작 확인 없이 축소하지 않는다.
- Next.js 코드 작성 전 설치된 `node_modules/next/dist/docs/`의 관련 문서를 읽는다.
- 운영 DB에 테스트용 마이그레이션·fixture를 적용하지 않는다. DB 검증은 격리 환경에서 수행한다.
- 각 작업은 회귀 테스트 → 최소 수정 → 관련 검증 → 독립 커밋 순서로 수행한다.

## 작업 순서와 의존성

| 단계 | 작업 | 의존성 | 완료 기준 |
|---|---|---|---|
| 1 | 사진 보존 및 업로드 검증 | 없음 | 정상 편집으로 파일이 사라지지 않고 위장 파일이 차단됨 |
| 1 | 개인 캐시 격리 | 없음 | A→B 계정 전환 데이터 분리 |
| 2 | Asset 소유권 | 사진 보존 수정 | 타인 파일 연결·삭제 차단 |
| 2 | TourAPI 본문 타임아웃 | 없음 | 본문 지연에도 제한 시간 종료 |
| 2 | 배치 진행 상태 | 없음 | 일일 예산을 나눠 여러 날에 걸쳐 수집 완료 |
| 3 | 코스 상태·노출 정책, 캐시 상한 | 없음 | 경쟁 요청·비노출·메모리 경계 검증 |
| 3 | 후보 배포 및 CI | 없음 | 후보 간 통신, PR 검증, 격리 DB e2e |
| 4 | 배치 실행 분리·조회 규모·관측성 | 정확성 수정 후 | 측정 기반 성능·운영 개선 |

일정은 외부 저장소 전환과 DB 마이그레이션 범위에 따라 달라지므로 확정하지 않는다. 단계마다 독립 PR로 검토할 수 있다.

## Task 1: 유지 사진 보존과 안전한 이미지 저장

**Files:**
- Modify: `apps/api/src/reviews/reviews.service.ts`
- Modify: `apps/api/src/reviews/review-images.controller.ts`
- Modify: `apps/api/src/profile/profile.controller.ts`
- Create: `apps/api/src/media/image-processing.service.ts`
- Test: 기존 `reviews.service.spec.ts`, `review-images.controller.spec.ts`, `profile.controller.spec.ts` 및 새 이미지 처리 서비스 spec.

**Interfaces:** 이미지 서비스는 입력 Buffer를 받아 `{ bytes: Buffer, extension: '.webp', contentType: 'image/webp' }`를 반환한다. sharp 디코딩 실패나 픽셀/파일 상한 초과는 400 계열 오류로 변환한다. 기존 URL 응답 형태는 이 단계에서 유지한다.

- [ ] 회귀 fixture로 `old=[A,B]`, `new=[B,C]`를 구성하고 B가 남아야 함을 검증한다. DB update 실패 시 unlink 호출이 없어야 한다.
- [ ] 유지 URL을 제외한 정리 목록을 계산한다.

```ts
const retained = new Set(input.images);
const removed = existingReview.images
  .map(({ url }) => url)
  .filter((url) => !retained.has(url));
await deleteUploadedImages(removed);
```

- [ ] MIME만 JPEG인 HTML Buffer와 손상 이미지가 디코더에서 거절되는 테스트를 먼저 추가한다. 기존 디스크 직행 저장을 제한된 메모리 입력 → 디코딩 → WebP 재인코딩 → 서버 생성 이름 저장으로 바꾼다. 공개 URL은 신뢰하는 설정에서 생성한다.
- [ ] `pnpm --filter @haetteum/api test -- reviews.service review-images.controller profile.controller image-processing` 실행. 정상 파일, 악성 입력, 파일 보존을 모두 검증하고 커밋한다.

## Task 2: 사용자별 개인 query cache

**Files:**
- Modify: `apps/web/src/features/places/favorite-place-query.ts`
- Modify: `apps/web/src/features/trips/saved-course-query.ts`
- Modify: `apps/web/src/components/travel/my-page-menu-list.tsx`
- Modify: `apps/web/src/components/patterns/login-screen.tsx`
- Create: `apps/web/src/features/query/private-query-keys.ts`
- Test: 기존 `favorite-place-query.test.tsx`, `saved-course-query.test.tsx`와 계정 전환 통합 컴포넌트 테스트.

**Interfaces:** 개인 key의 첫 두 요소는 `['private', userId]`로 통일한다. 조회·낙관적 갱신·무효화가 같은 factory를 사용한다.

```ts
export const privateKeys = {
  root: (userId: string) => ['private', userId] as const,
  favorites: (userId: string) => ['private', userId, 'favorites'] as const,
  courses: (userId: string) => ['private', userId, 'saved-courses'] as const,
};
```

- [ ] A 코스를 미리 캐시에 저장한 뒤 B initialData로 mount하는 테스트를 추가한다. A 데이터가 표시되면 실패시킨다.
- [ ] 위 key factory를 적용하고 인증 전환 때 이전 사용자 prefix에 대해 `cancelQueries` 후 `removeQueries`를 실행한다. 지연 응답의 재삽입까지 검사한다.
- [ ] 비로그인 찜 selector는 캐시 유무와 관계없이 false를 반환하도록 한다.
- [ ] `pnpm --filter @haetteum/web test`와 계정 전환 브라우저 검증을 수행한 후 커밋한다.

## Task 3: 업로드 소유권과 생명주기

**Files:**
- Modify: `apps/api/prisma/schema.prisma`, 새 migration
- Create: `apps/api/src/media/media.module.ts`, `media.service.ts`
- Modify: 리뷰·프로필 controller/service, `packages/contracts/src/reviews.ts`
- Modify: 웹 리뷰 업로드 adapter와 편집 화면
- Test: `apps/api/test/reviews-auth.e2e-spec.ts` 및 media service spec

**Interfaces:** 업로드 응답은 `{ assetId, url }`, 리뷰 입력은 소유한 `assetId` 목록으로 전환한다. `UploadedAsset`은 `id`, `ownerId`, `storageKey`, `contentType`, `createdAt`, `status`를 기록한다. URL은 출력용이며 권한 판정 입력으로 쓰지 않는다.

- [ ] A 업로드를 B가 연결하려는 요청, 이미 연결된 파일 삭제, 미연결 업로드 만료 정리의 DB 테스트를 추가한다.
- [ ] 연결 트랜잭션 안에서 asset ID와 소유자·상태를 함께 확인하고 잘못된 연결은 거부한다. 파일 삭제는 DB에서 삭제 가능 상태로 전환한 후 idempotent 정리 작업으로 처리한다.
- [ ] 기존 URL 레코드의 소유자를 Review→User 관계로 backfill한다. 여러 소유자에게 연결된 URL은 자동으로 소유권을 추정하지 말고 정리 대상에서 제외해 검토 목록을 만든다.
- [ ] 계약→API→웹을 호환 가능한 순서로 배포하고 기존 URL 입력을 중단한다. 직접 URL→basename unlink 경로를 제거한다.
- [ ] 격리 PostgreSQL에서 이행 전후 데이터·권한 테스트를 통과시킨 뒤 커밋한다.

## Task 4: TourAPI 전체 응답 제한 시간

**Files:** `apps/api/src/tourism/tour-api.client.ts`, `tour-api.client.spec.ts`, `test/tour-api-policy.e2e-spec.ts`.

**Interfaces:** 요청 결과는 기존 `TourApiPage`를 유지한다. 타임아웃은 헤더와 body를 모두 포함하며 기존 `TourApiError('TIMEOUT')` 및 재시도 정책을 유지한다.

- [ ] 즉시 헤더를 반환하고 끝나지 않는 body를 가진 mock response를 만들고 fake timer로 시간 제한 실패를 검증한다.
- [ ] abort controller의 `finally` 범위를 본문 소비까지 확장한다.

```ts
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
try {
  const response = await this.fetch(url, { signal: controller.signal });
  const body = await response.text();
  // 기존 status와 body 검증은 이 범위 안에서 실행한다.
} finally {
  clearTimeout(timer);
}
```

- [ ] 성공·429·5xx 본문 지연 모두 동일하게 제한하고 스트림 바이트 상한 초과 시 abort한다.
- [ ] `pnpm --filter @haetteum/api test -- tour-api.client` 및 격리 DB lock 해제 테스트를 수행한 뒤 커밋한다.

## Task 5: 재개 가능한 목록 수집

**Files:** `apps/api/prisma/schema.prisma`, 새 migration, `tourism-sync.service.ts`, `tourism-sync.command.ts`, `tourism-sync.scheduler.ts`, 관련 spec/e2e.

**Interfaces:** 수집 실행은 고정된 시작·종료 범위와 cursor `{ modifiedDate, regionId, showflag, pageNo }`를 가진다. 재시도는 진행 중 실행의 범위를 재사용하며 완료 후 기존 checkpoint를 전진시킨다.

- [ ] 17지역×30일×2상태, 1,000회 예산으로 중단되는 fixture를 작성한다. 두 번째 프로세스 실행이 최초 날짜부터 반복하면 실패시킨다.
- [ ] 페이지 데이터 upsert와 다음 cursor 저장을 같은 DB transaction으로 처리한다. 예산 소진은 재개 가능한 중단 사유로 기록한다.
- [ ] 페이지 목록이 변할 수 있음을 고려해 완료 경계의 재조회와 중복 upsert를 허용한다. 날짜·지역·showflag는 유지한다. 범위 전체 완료 전에는 전역 성공 checkpoint를 이동하지 않는다.
- [ ] 프로세스 강제 중단, 예산 소진, 다음 날 재개, 같은 페이지 중복, 비노출 변경 테스트를 격리 DB에서 수행한다.
- [ ] `docs/tourapi-calls.md`에 새 운영 재개 절차를 반영하고 커밋한다.

## Task 6: 코스 경쟁 요청·노출 정책·캐시 용량

**Files:** `apps/web/src/features/courses/course-editor.tsx`, `apps/api/src/place-courses/place-courses.service.ts`, `apps/api/src/common/cache/ttl-cache.ts`, 각 회귀 테스트.

**Interfaces:** 코스 생성 결과 계약은 유지한다. 캐시는 생성자에 `maxEntries` 옵션을 추가하고 항상 용량 이하를 보장한다.

- [ ] A/B deferred 응답을 B→A로 완료시켜 B가 남아야 하는 테스트와 초기화 후 늦은 응답 테스트를 추가한다.
- [ ] `useRef` 요청 세대 번호를 증가시키고 await 뒤 번호가 현재와 다르면 상태 적용을 중단한다. 초기화·unmount에서도 세대를 무효화한다.
- [ ] 비노출 기준 장소가 404인 테스트를 추가하고 `where: { id: placeId, isVisible: true }`로 조회한다. 비노출 경유지의 공개 여부를 리뷰 문서의 정책에 맞춰 테스트한다.
- [ ] 캐시 용량 초과 및 시간이 지난 키 축출을 검증하고 LRU/만료 정리를 구현한다.
- [ ] 관련 API/web 테스트 후 세 책임을 별도 커밋으로 남긴다.

## Task 7: 후보 배포 연결 및 CI 게이트

**Files:** `scripts/deploy/activate-release.sh`, `scripts/deploy/test_activation.py`, `.github/workflows/deploy.yml`, 새 `.github/workflows/ci.yml`.

**Interfaces:** 후보 웹 서버의 private API URL은 후보 API의 4001 포트로 강제한다. PR workflow는 배포 비밀값 없이 placeholder와 격리 DB를 사용한다.

- [ ] 후보 서버 실행 env를 검사하는 activation 테스트에 `API_BASE_URL=http://127.0.0.1:4001/api/v1` 기대값을 추가한다.
- [ ] 후보 웹 실행 env를 수정하고 API sentinel 응답을 웹 경유로 읽는 smoke를 추가한다.
- [ ] PR CI에 `pnpm lint`, `pnpm test`, `pnpm build`, 격리 PostgreSQL 대상 `pnpm test:e2e`를 구성한다. 기존 패키지 smoke를 유지한다.
- [ ] CI PostgreSQL major를 운영 환경 확인 후 맞춘다. 현재 Compose는 18, CI는 16이다.
- [ ] 실패 fixture로 병합/배포가 차단되는지 검증하고 커밋한다.

## Task 8: 운영 개선 후속 작업

정확성 수정 이후 별도 작은 설계·PR로 진행한다.

- [ ] AppModule의 HTTP 진입점과 batch 진입점을 분리한다. HTTP 실행은 스케줄러를 비활성화하고 worker가 정책 lock을 공유하게 한다. 두 HTTP 인스턴스 실행 시 배치가 추가 등록되지 않는 테스트로 확인한다.
- [ ] `ReviewsService.listForPlace`에 cursor/limit 계약을 추가하고 상세 보강은 SQL 버전 비교 및 keyset page로 읽는다. 대표 데이터에서 응답 크기·DB plan을 측정한다.
- [ ] API 오류율·지연, 수집 마지막 성공 시각·진척·예산, 업로드 정리 실패를 계측한다. 공급자 키·사용자 대화는 로그에서 제외한다.
- [ ] 이메일 로그인 제한이 edge에서 보장되는지 확인한다. 없다면 계정/IP별 공유 제한을 추가하고 여러 API 인스턴스 합산 시도 테스트를 수행한다.
- [ ] ARCHITECTURE.md, README, ERD의 현재 구현 상태를 코드에 맞게 갱신한다.

## 최종 검증

- [ ] 모든 회귀 테스트, 전체 단위 테스트, lint, production build 통과.
- [ ] 격리 DB migration/e2e 통과.
- [ ] A/B 계정 전환, 사진 유지 수정, 이미지 업로드 거부, 코스 역순 응답을 브라우저에서 확인.
- [ ] 일일 예산 초과 후 재시작으로 수집 완료 확인(가짜 공급자 사용).
- [ ] 후보 릴리스 간 연결·실패 시 복귀 smoke 통과 후 배포 검토.
