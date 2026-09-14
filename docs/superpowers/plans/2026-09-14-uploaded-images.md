# Uploaded Images Implementation Plan

> **For agentic workers:** Use executing-plans to implement this plan task-by-task in the current session.

**Goal:** Store validated user images as WebP bytes in PostgreSQL and serve them through a binary endpoint.

**Architecture:** A shared ImagesModule owns conversion, persistence and retrieval. Review and profile upload controllers use this module; existing URL response contracts remain compatible.

**Tech Stack:** NestJS, Sharp, heic-convert, Prisma Bytes @db.ByteA, PostgreSQL, Jest.

**Spec:** docs/superpowers/specs/2026-09-14-uploaded-images-design.md

## Global Constraints

- Preserve existing working-tree changes and legacy URLs.
- 5 MiB input; 40,000,000 pixels; WebP quality 80; review 2,048px and profile 512px maximum edge.
- No live DB migration or TourAPI calls.

## Tasks

- [x] Conversion: write real-image tests for invalid data, false MIME, pixel/byte limits, orientation, metadata removal, JPEG/PNG/WebP and profile HEIC; observe failure, implement ImageProcessor.convert(file, purpose), rerun.
- [x] Storage: add uploaded_images and nullable relation columns through an additive migration; implement ImagesService.store(ownerId,file,purpose) returning {id,url} with data excluded from creation results. Implement binary GET with UUID validation, 404 and nosniff.
- [x] Integration: replace disk upload with memory upload in review/profile controllers; atomically link profile image; validate review attachment ownership and purpose. Preserve existing review URLs during edits and static legacy routes.
- [x] Verification: test HTTP uploads and binary retrieval with real Sharp and a disposable PostgreSQL schema; verify bytea type, no persistence for rejected input, ownership, legacy compatibility and no bytes in list responses. Run API unit tests, API build, changed-file lint, and relevant web checks.
- [x] Documentation: describe deployment migration, public origin configuration, limits, legacy behavior and verification evidence.

## Verification results (2026-09-14)

- API unit tests: 89 suites, 645 tests passed.
- Image-specific PostgreSQL/HTTP integration: 7 tests passed, including profile transaction rollback and owner deletion cascade.
- Web profile mapping: 23 tests passed; web TypeScript check passed.
- API build passed. Changed-file API/web lint passed.
- Full E2E run against the disposable migrated database: 73 passed, 18 failed, 8 skipped (before adding two further image tests). Failures are in preexisting reviews/reviews-auth fixtures missing current required title/minimum content, auth response/redaction assertions, and ranking response expectations. No changes were made to those unrelated tests or contracts for this task.
- Read-only reviewer confirmed Kakao re-login avatar overwrite; reproduced and fixed with transactional preservation of uploaded image links.
- No production/development DB migration, deployment or TourAPI calls were performed.

웹 프로덕션 빌드: `next build --webpack` 통과. 기본 Turbopack 빌드는 실행 환경의 내부 포트 생성 제한(`Operation not permitted`)으로 완료되지 않았다. 프로젝트 기본 빌드 설정은 변경하지 않았다. 일회용 PostgreSQL 테스트 컨테이너는 검증 후 삭제했다.
