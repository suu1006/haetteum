<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## TourAPI 호출 규칙 — 매 작업 시작 시 필수 확인

모든 에이전트는 이 저장소에서 작업을 시작할 때 [TourAPI 호출 구조 및 규칙](docs/tourapi-calls.md)을 반드시 읽는다. TourAPI 관련 구현·리뷰에서는 해당 문서를 기준으로 호출 경계를 확인한다.

TourAPI 직접 호출은 `TourApiClient` 외에는 금지한다. TourAPI 수집은 정해진 `tourism-sync` 배치에서만 실행하고, 서비스의 랭킹·검색·AI 코스는 PostgreSQL에 저장된 TourAPI 데이터를 조회한다. 상세 기준은 위 문서를 따른다.
