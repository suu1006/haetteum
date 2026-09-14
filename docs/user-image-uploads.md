# 사용자 이미지 업로드

후기와 프로필의 **신규 업로드**는 WebP로 변환한 뒤 PostgreSQL `uploaded_images.data`의 `bytea` 컬럼에 저장한다. Prisma에서는 `Bytes @db.ByteA`를 사용하며 저장 시 `Uint8Array`, HTTP 응답 시 `Buffer`로 다룬다. Base64 변환이나 신규 디스크 파일 저장은 하지 않는다.

## 처리 및 제한

1. 로그인 세션과 SameOriginGuard를 검증한다.
2. Multer memory storage에서 파일 1개, 최대 5 MiB를 제한하고 MIME을 검사한다.
3. Sharp가 실제 형식과 크기를 검사한다. MIME과 실제 형식이 다르거나 손상된 파일, 애니메이션/다중 페이지 파일, 40,000,000 픽셀 초과 파일은 거절한다.
4. EXIF 방향을 보정하고 비율을 유지해 축소한다. 작은 이미지는 확대하지 않는다.
5. 후기 긴 변 최대 2,048px, 프로필 긴 변 최대 512px, 품질 80 WebP로 인코딩한다. EXIF/ICC 등 원본 메타데이터는 저장하지 않는다.
6. 변환 완료 후 바이너리와 폭·높이·바이트 수·소유자·용도를 저장한다. DB에도 출력 크기와 `octet_length(data)` 제약을 둔다.

후기는 JPEG/PNG/WebP, 프로필은 여기에 HEIC/HEIF를 추가로 지원한다. HEIC는 Sharp로 헤더의 해상도·페이지 수를 먼저 검증하고 `heic-convert`로 JPEG 디코딩 후 공통 WebP 변환에 전달한다.

## API와 관계

- `POST /api/v1/reviews/images`: 기존 `{url}` 응답 유지.
- `POST /api/v1/profile/photo`: 기존 `{profileImageUrl}` 응답 유지. 이미지 생성과 회원의 `profile_image_id`·URL 갱신을 한 트랜잭션에서 실행한다.
- `GET /api/v1/images/:id`: 공개 이미지 조회. `Content-Type: image/webp`, `X-Content-Type-Options: nosniff`, `Cache-Control: public, max-age=3600`. UUID가 잘못되면 400, 없으면 404.
- 후기 저장 시 소유자와 `REVIEW` 용도를 확인하고 `review_images.uploaded_image_id`를 연결한다. 다른 사람의 업로드나 프로필 이미지는 새 후기 첨부로 사용할 수 없다.
- 일반 회원·후기 조회에는 바이너리를 포함하지 않는다. 기존 URL 필드로 이미지를 표시한다.
- 카카오 재로그인 시 직접 업로드한 프로필 이미지가 있으면 유지한다.

## 설정 및 배포

배포 전에 새 마이그레이션 `20260914040000_uploaded_images_bytea`를 적용한다.

```sh
pnpm --filter @haetteum/api db:deploy
```

이 명령은 운영 배포 절차에서 실행한다. 개발 작업 중 운영/개발 DB에는 적용하지 않는다.

`UPLOADED_IMAGE_PUBLIC_ORIGIN`은 API의 공개 origin(예: `https://haetteum.kr`)이다. 경로·사용자 정보·쿼리·fragment를 포함할 수 없다. 미설정 시 개발/테스트에서는 `http://localhost:<API_PORT>`, 운영에서는 `WEB_ORIGIN`의 origin을 사용한다. 요청의 Host/프로토콜로 URL을 만들지 않는다.

웹의 `NEXT_PUBLIC_API_BASE_URL` origin과 맞춰 설정한다. 웹은 해당 origin의 `/api/v1/images/**` 및 기존 업로드 경로를 Next Image에 허용한다. nginx 등의 프록시는 기존 `/api/v1` 전달 경로와 5 MiB 파일에 multipart 오버헤드를 더한 요청 크기를 허용해야 한다.

## 기존 이미지와 보관

- 기존 URL과 `/uploads/reviews`, `/uploads/profile-photos` 정적 파일 제공은 유지한다. 자동 변환·이관하지 않는다.
- 기존 후기를 수정할 때 이미 연결돼 있던 URL은 유지할 수 있다. 새 첨부는 본인이 새 API로 업로드한 이미지여야 한다.
- 수정 시 유지한 기존 디스크 사진을 삭제하지 않는다.
- 사용자가 작성을 취소한 업로드, 교체한 프로필 등 미참조 바이너리의 주기적 정리는 이번 범위에 포함하지 않는다. DB 백업에 이미지 바이너리도 포함되므로 저장 용량과 백업 크기를 함께 관찰한다.
- 이미지 URL은 공개 조회용이다. UUID는 로그인 대체 수단이나 비공개 파일 권한으로 사용하지 않는다.

## 검증

- 실제 이미지 디코딩/리사이즈/EXIF 제거, 잘못된 MIME과 손상 파일, 입력 크기·픽셀 제한, HEIC 변환을 단위 테스트한다.
- `test/uploaded-images.e2e-spec.ts`는 별도 임시 스키마에 전체 마이그레이션을 적용해 `pg_typeof(data) = bytea`, WebP HTTP 응답, 소유권, 프로필 연결, 재로그인, 기존 URL 호환성을 검증한다.

검증 결과(2026-09-14): API 단위 테스트 645개, 이미지 통합 테스트 7개, 웹 프로필 테스트 23개 통과. API 빌드와 변경 파일 린트, 웹 타입 검사 통과. 전체 E2E는 기존 후기 입력/인증 응답·로그/랭킹 기대값 관련 실패 18건이 있어 전체 통과로 보고하지 않는다. 이미지 전용 통합 테스트는 별도로 모두 통과했다.

웹 프로덕션 빌드: `next build --webpack` 통과. 기본 Turbopack 빌드는 실행 환경의 내부 포트 생성 제한(`Operation not permitted`)으로 완료되지 않았다. 프로젝트 기본 빌드 설정은 변경하지 않았다. 일회용 PostgreSQL 테스트 컨테이너는 검증 후 삭제했다.

후속 수정: 위에 기록한 기존 E2E 실패 18건은 이후 해결했다. 격리 DB 전용 테스트까지 포함해 전체 103개가 통과했다. 상세 내용은 [E2E 검증 기록](e2e-verification.md)을 참고한다.
